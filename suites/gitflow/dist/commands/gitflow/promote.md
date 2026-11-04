---
name: "gitflow:promote"
description: 将已合入源环境的任务分支提升到更高环境：解析源/目标环境，识别原 MR 涉及的提交（merge 提交、唯一 squash 提交或显式 --commits），从目标环境新建任务分支，逐一 cherry-pick（限额内自动解决冲突，无法解决则停摆），推送后按 /gitflow:merge 创建 MR。支持 --repo / --repos 逐仓库处理，兄弟仓库用临时 worktree 不切换主工作区；未合入、提交范围不明、分支已存在、冲突超限或 MR 失败时停摆。
category: git
---
# /gitflow:promote

把**已经合入源环境**的任务分支提升到更高环境。核心流程：从目标环境新建任务分支 → 逐一 cherry-pick 原任务分支的提交 → 按 `/gitflow:merge` 创建 MR。**执行前必须先读取 `~/.claude/skills/gitflow-core/SKILL.md`**。

> 每次提升都使用独立的新任务分支（分支名中的 `{version}` 换成目标环境），不复用源任务分支，也不直接操作环境分支。冲突在提升分支上解决，不影响已经合入的源环境。

## 参数

| 参数 | 说明 |
| --- | --- |
| `[环境]` | 目标环境，如 `dev`。缺省为 `chain` 中源环境之后的第一个 `active` 环境 |
| `--repo <name>` | 操作配置 `repos` 中的指定仓库；缺省为当前仓库。该仓库当前必须检出源任务分支，执行时会切换其主工作区到新分支 |
| `--repos <a,b,c\|all>` | 在操作仓库之外，依次处理指定的兄弟仓库；`all` 展开为配置中当前工作区可用、存在源任务分支的仓库，能否提升由逐仓库识别判断。兄弟仓库使用临时 worktree，**不切换主工作区** |
| `--commits <base>..<head>` | 显式指定待 cherry-pick 范围；也可只给一个 `<sha>`（如 squash 提交）。仅允许单仓库执行 |
| `--reviewer @name` | 传给 MR 创建流程；可重复 |
| `--no-reviewer` | 强制不指定审核人；与 `--reviewer` 同时出现 → 停摆 |
| `--draft` | 创建 Draft MR |
| `--remove-source-branch` | MR 合并后删除提升分支（默认取配置 `mr.remove_source_branch`；链式提升建议保持 `false`，便于下一级继续识别提交） |
| `--dry-run` | 只解析并输出提交清单、分支计划与预检结果，不创建分支、不 cherry-pick、不创建 MR |

```text
/gitflow:promote dev
/gitflow:promote dev --repo pro-pcb
/gitflow:promote dev --repos pro-pcb,pro-api
/gitflow:promote dev --repos all --dry-run
/gitflow:promote dev --commits 3a1b2c3..9f8e7d6
/gitflow:promote dev --commits 4c5d6e7
```

## 流程

1. **读取共享规则与配置**：读取 core，按第 1 节定位配置；按 §2.1 确定操作仓库。`--repo` 指向的仓库必须在配置中且是 Git 仓库根目录。

2. **前置检查（操作仓库）**：按 core §2.2 检查主工作区、§2.3 检查进行中的 Git 操作与 detached HEAD。工作区不干净 → 停摆，**不得**先切分支。

3. **解析源分支与源环境**：操作仓库的当前分支（`git -C <root> branch --show-current`）必须能按 core §4.3 反解为任务分支，得到 `{user}`、`{type}`、`{version}`、`{ticket}`。非任务分支、保护分支或 `{version}` 不在 `active` 中 → 停摆。源环境 = `{version}`，源任务分支 = 该分支。

4. **确定目标环境**：

   - 显式 `[环境]`：必须在 `active` 中、在 `chain` 中高于源环境；与源环境相同或更低 → 停摆
   - 缺省：`chain` 中源环境之后的第一个 `active` 环境；没有 → 停摆“已在链式顶端”
   - 显式环境跳过中间 `active` 环境 → 输出“跳过中间环境 X”的警告，`merge_type` 记为“用户指定”；直接相邻则记为“链式同步”

5. **解析参与仓库**：

   - 操作仓库始终处理（当前仓库，或 `--repo` 指定仓库）
   - `--repos <a,b,c>`：按给定顺序追加；名字不在配置中 → 停摆；显式列出的仓库不可用或源分支不存在 → 记录该仓库失败并继续其他仓库
   - `--repos all`：展开为配置中除操作仓库外、路径可用、存在源任务分支的仓库；是否已合入、能否识别提交由第 6 步逐仓库判断，不满足的跳过并列出原因
   - 去重；显式列表包含操作仓库时忽略并注明
   - 解析出参与仓库后，立即校验每个仓库的 `envs` 都有源环境与目标环境映射；操作仓库缺失 → 整体停摆，兄弟仓库缺失 → 记录该仓库失败并继续
   - 无 `--repos` 时只处理操作仓库；**不因为兄弟仓库检出同名分支就自动提升**

6. **逐仓库识别待提升提交**（对每个参与仓库依次执行）。本步的 `<root>` 指**当前正在处理的仓库根目录**（操作仓库或兄弟仓库主工作区）；第 7 步创建 worktree 后，分支内操作改用 `<work-root>`：

   1. 同步远端：

      ```bash
      git -C <root> fetch <remote> --prune
      ```

   2. 校验源环境分支存在：

      ```bash
      git -C <root> ls-remote --exit-code --heads <remote> <source-env-branch>
      ```

      退出码 `2` → 该仓库失败；其他非零 → 停摆并输出原始错误。

   3. 确定源分支 tip 与合入状态：

      ```bash
      git -C <root> rev-parse --verify --quiet refs/heads/<source-branch>
      git -C <root> rev-parse --verify --quiet refs/remotes/<remote>/<source-branch>
      git -C <root> merge-base --is-ancestor <source-tip> <remote>/<source-env-branch>
      ```

      - 选择顺序：
        1. 对本地 tip 与远端 tip 分别判断是否为源环境祖先
        2. 两个都已合入：若一方是另一方祖先，取**较新的后代 tip**；若已分叉 → 该仓库失败，要求用 `--commits` 指定
        3. 只有一个已合入 → 取该 tip
        4. 都未合入 → 优先远端 tip，远端不存在时用本地 tip（`source_tip_merged=false`，可能是 squash/rebase）
      - 本地与远端都不存在 → 该仓库失败，提示先完成 `/gitflow:merge`
      - `source_tip_merged=false` **不立即失败**：继续本步第 4/5 小步，由 `--commits` 或 squash 提交识别决定；两条路径都无法识别时才失败
      - 选择远端 tip 或 `source_tip_merged=false` 时，在输出中注明

   4. 若指定 `--commits`（仅单仓库）：

      - 含 `..`：校验 `base`、`head` 存在，`base` 是 `head` 祖先，`head` 是 `source-tip` 祖先或等于 `source-tip`；然后 `git -C <root> rev-list --reverse --no-merges <base>..<head>`。范围内若有 merge 提交，统计数量并在输出中警告“merge 提交被排除”
      - 单个 `<sha>`：校验对象存在且**不是 merge 提交**（`git rev-list --parents -n 1` 只有两个字段）；作为唯一待 pick 提交。该提交不是 `source-tip` 祖先时允许（通常是从源环境取到的 squash 提交），但输出中注明
      - 任一校验失败或结果为空 → 停摆

   5. 未指定 `--commits` → 按以下顺序识别“本次合并涉及的提交”：

      - **merge 提交**（仅 `source_tip_merged=true` 时尝试）：在 `<remote>/<source-env-branch>` 最近 200 条 merge 提交中，查找父提交包含 `<source-tip>` 的提交，取最新一条：

        ```bash
        git -C <root> log --merges -n 200 --format='%H %P' <remote>/<source-env-branch>
        # 在输出中匹配父提交列表包含 <source-tip> 的第一行，第一列为 merge 提交
        git -C <root> rev-list --parents -n 1 <merge>
        ```

        提交清单为：

        ```bash
        git -C <root> rev-list --reverse --no-merges <merge>^1..<source-tip>
        ```

        找不到父提交包含 `<source-tip>` 的 merge 提交 → 进入“无法自动识别”。同时统计范围内被跳过的 merge 提交数；大于 0 时在输出中警告“源分支包含合并提交，其冲突解决改动不会自动重放”。

      - **squash 提交**（`source_tip_merged=false` 时）：在源环境最近 50 条提交中按 `{ticket}` 搜索 subject（`-n 50` 限制遍历条数，`grep -F` 做字面匹配）：

        ```bash
        git -C <root> log -n 50 --format='%H%x09%s' <remote>/<source-env-branch> | grep -F -- '<ticket>'
        ```

        恰好 1 条 → 以该提交为唯一待 pick 提交；多于 1 条 → 该仓库失败并列出候选，要求用 `--commits` 指定；0 条 → 按下一条失败。

      - **无法自动识别**（快进合并、rebase 合并、squash 提交标题不含单号等）→ 该仓库失败，输出：

        ```text
        无法自动识别本次合并涉及的提交。请显式指定：
          /gitflow:promote <环境> --repo <仓库> --commits <base>..<head>
        - head 通常是 <source-tip 短 hash>
        - base 可用 git reflog show <remote>/<source-env-branch> 查找合并前的环境 tip，
          或从 MR 页面获取提交范围
        ```

   6. 过滤已存在于目标环境的提交：

      - 祖先判断：

        ```bash
        git -C <root> merge-base --is-ancestor <sha> <remote>/<target-env-branch>
        ```

        退出码 `0` → 跳过并记录
      - 等效补丁判断（merge 提交路径）：`git -C <root> cherry <remote>/<target-env-branch> <source-tip>`，输出中 `- <sha>` 的提交跳过并记录；squash 路径只做祖先判断
      - 提交清单为空 → 该仓库失败“没有可提升的提交”

   7. 输出提交清单（短 hash + subject）、跳过项与无法识别的合并提交；`--dry-run` 在完成所有仓库的提交识别后停止。

7. **创建提升分支**（逐仓库，紧接第 6 步）。这一步等价于 `/gitflow:start` 从目标环境准备分支（同一 `branch_pattern`、同一 `--no-track` 规则），但复用第 3 步已反解的身份与工单，不重新解析工单：

   - 新分支名：按 `branch_pattern` 用反解出的 `{user}`、`{type}`、`{ticket}` 与**目标环境**重新生成；与源分支相同 → 失败
   - 校验：

     ```bash
     git -C <root> check-ref-format --branch "<new-branch>"
     git -C <root> show-ref --verify --quiet refs/heads/<new-branch>
     git -C <root> ls-remote --exit-code --heads <remote> <new-branch>
     ```

     本地已存在（退出码 `0`）或远端已存在 → 该仓库失败，**不覆盖、不复用、不删除**；`ls-remote` 其他非零 → 停摆
   - 新分支等于任一环境分支或 `protected` → 失败
   - **操作仓库**（主工作区）：

     ```bash
     git -C <root> checkout --no-track -b <new-branch> <remote>/<target-env-branch>
     ```

     创建后确认上游为空；意外存在上游 → 停摆，不自动 `--unset-upstream`。本仓库后续的 `<work-root>` = `<root>`。

   - **`--repos` 兄弟仓库**（临时 worktree，不切换主工作区）：

     ```bash
     git -C <sibling-root> branch --no-track <new-branch> <remote>/<target-env-branch>
     git -C <sibling-root> worktree add <temp-dir> <new-branch>
     ```

     临时目录使用系统临时目录下**尚不存在**的唯一路径（如 `<tmp>/gitflow-promote-<repo>-<timestamp>`）并记录。`worktree add` 失败 → 该仓库失败并保留已创建分支；创建后确认 worktree 上游为空。本仓库后续的 `<work-root>` = `<temp-dir>`。

8. **逐一 cherry-pick**（在新分支所在工作区 `<work-root>`，从旧到新）：

   ```bash
   git -C <work-root> cherry-pick <sha>
   ```

   - 成功 → 继续下一个
   - 冲突（`git -C <work-root> diff --name-only --diff-filter=U` 非空）→ 按 core §5.5 处理：
     1. 统计冲突文件/冲突块/冲突行；超出限额、二进制、锁文件、生成物、敏感文件、子模块、`DD/AU/UA/DU/UD` → **停摆该仓库**，保留现场
     2. 限额内读取 base/ours/theirs（base = `<sha>^`，ours = 提升分支，theirs = `<sha>`）并按意图合并；不得整段选边
     3. 清除冲突标记，完成 core §5.5.3 的校验
     4. `git -C <work-root> add <已解决文件>` → `GIT_EDITOR=true git -C <work-root> cherry-pick --continue`
     5. 记录解决摘要；**不逐次询问**，继续后续提交
   - 非冲突失败、空提交（`git cherry-pick` 提示 previous cherry-pick is now empty）→ **停摆该仓库**，输出原始错误；不自动 `--skip`、`--abort`、`reset`
   - 全部完成后 `git -C <work-root> status --porcelain=v1` 必须为空；非空 → 停摆该仓库

9. **推送提升分支**：

   ```bash
   git -C <work-root> push -u <remote> HEAD
   ```

   推送失败 → 停摆该仓库；不 force、不自动 pull/rebase。推送后确认上游为 `<remote>/<new-branch>`。

10. **创建提升 MR**：读取 `~/.claude/commands/gitflow/merge.md`，按其第 7-15 步执行，目标环境固定为第 4 步结果。执行时把 merge 命令中的 `<root>` 替换为本仓库的 `<work-root>`（兄弟仓库即临时 worktree）：

    - 所有 `glab` 命令在对应仓库工作区执行：`(cd <work-root> && glab ...)`；`--repo`/worktree 模式下尤其不能依赖会话当前目录
    - 审核人、Draft、删除源分支参数沿用本命令；审核人解析按 core §1.4
    - `{{merge_type}}`：相邻环境为“链式同步”，跳过中间环境为“用户指定”
    - `{{summary}}` 在上述内容前加一行“从 `<源环境>` 提升”，并列出原提交清单（短 hash + subject）与 cherry-pick 后的提交
    - 已有 MR → 报告链接并视为该仓库完成；冲突预检失败、glab 不可用或创建失败 → 该仓库失败，输出 merge 命令的完整手动创建信息

11. **兄弟仓库 worktree 收尾**：

    - MR 创建成功、已有 MR，或推送成功后 MR 创建失败但 worktree 干净 → `git -C <sibling-root> worktree remove <temp-dir>`，不加 `--force`
    - cherry-pick 冲突/失败、推送失败、worktree 不干净 → **保留 worktree**，在输出中给出路径与恢复命令
    - 移除失败 → 保留并报告，不强制删除

12. **输出结果**：源/目标环境、每个仓库的提交清单与跳过项、新分支、冲突解决摘要、MR 链接、失败仓库与保留的 worktree 路径。仓库之间相互隔离：一个仓库失败不阻断其他仓库；操作仓库失败也继续处理已列出的兄弟仓库。

    - 操作仓库停摆时注明：主工作区已切换到提升分支、是否处于 cherry-pick 进行中，以及用户可选的 `git cherry-pick --continue` / `--skip` / `--abort`（不自动执行）
    - 兄弟仓库停摆时给出保留的 worktree 路径与对应恢复命令
    - 最后给出下一个环境（若有）或完成提示

## 停摆条件

通用停摆条件见 core §2（工作区 / 进行中操作 / 远端）、§5（保护分支 / 命令失败 / 状态不符）。本命令特有：

- 操作仓库当前分支不是任务分支、指向保护分支，或 `{version}` 不在 `active`
- 目标环境非法、等于/低于源环境、已在链式顶端、`chain` 中没有下一个 `active` 环境
- `--repos` 中出现配置里不存在的仓库名
- 操作仓库工作区不干净、进行中操作或 detached HEAD
- 源分支不存在，或既不是源环境祖先、也无法通过 `--commits` / 唯一 squash 提交识别（显式列出的兄弟仓库记录失败后继续）
- 无法自动识别提交范围、`--commits` 非法、单提交模式用于多仓库、提交清单为空
- 新分支本地或远端已存在、分支名非法或指向保护分支
- 临时 worktree 创建失败、冲突超出 core §5.5 限额、cherry-pick 非冲突失败/空提交
- 推送失败、MR 冲突预检失败、glab 不可用或创建失败
- `--reviewer` 与 `--no-reviewer` 同时使用

## 输出示例

```text
## gitflow:promote
- 操作仓库: pro-pcb（D:/Code/GitEditor/editor-pro/pro-pcb）
- 当前分支: jiangshun/fix/4.1-CHML-151021
- 源环境: 4.1（分支名）
- 目标环境: dev（链式下一个 active 环境）
- 远端: origin

### 提交识别
- 源分支 tip: a1b2c3d（本地，已合入 origin/pro-pcb/4.1）
- 合并提交: d4e5f6a（父提交 a1b2c3d）
- 待 cherry-pick:
  1. 1111111 fix: 修复背景色持久化
  2. 2222222 fix: 补充颜色设置单测
- 已存在于 dev 跳过: 无
- 源分支中的合并提交: 无

### 执行
1. 创建: jiangshun/fix/dev-CHML-151021 ← origin/pro-pcb/dev（--no-track）
2. cherry-pick: 2/2 成功
3. push: origin/jiangshun/fix/dev-CHML-151021
4. MR: https://gitlab.example.com/pro-pcb/-/merge_requests/124
   - 审核人: @zhangsan（来源: repos.pro-pcb.reviewers）
   - 类型: 链式同步

### 结果
- 状态: 成功
- 下一步: 合并 MR 后，如需继续提升到更高环境，再次运行 /gitflow:promote
```
