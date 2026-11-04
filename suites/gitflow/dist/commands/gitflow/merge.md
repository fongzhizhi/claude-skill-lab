---
name: "gitflow:merge"
description: 为任务分支创建合入所属环境的 GitLab MR：fetch 后校验推送状态，用 git merge-tree 做只读冲突预检并注明快照，按命令行 → 仓库配置 → 全局配置解析审核人，生成 MR 标题/描述（优先复用仓库模板），通过 glab 创建并输出链接。支持 --repo 操作配置中的兄弟仓库；执行前检测其他仓库改动，仅提示不阻断，不同分支的改动直接忽略。审核人未配置时不弹确认、不阻断；有冲突、未推送、环境不匹配或 glab 不可用时停摆，不自动解决冲突。
category: git
---
# /gitflow:merge

为当前任务分支创建合入环境分支的 MR，并在创建前做只读冲突预检。**执行前必须先读取 `~/.claude/skills/gitflow-core/SKILL.md`**。

> 本命令只创建“任务分支 → 所属环境”的 MR。环境链提升（如 4.1 → dev）由 `/gitflow:promote` 完成：从目标环境新建任务分支、cherry-pick 原提交后再创建 MR，不在本命令内自动执行。

## 参数

| 参数 | 说明 |
| --- | --- |
| `--repo <name>` | 操作配置 `repos` 中的指定仓库，无需切换目录；缺省为当前仓库 |
| `--to <环境>` | 指定目标环境；缺省为分支名中的所属环境。跨环境直合会先停摆确认（与链式模型不一致） |
| `--reviewer @name` | 指定审核人；可重复。未指定时按 core §1.4 读取 `repos.<name>.reviewers`，再回退 `mr.reviewers`；都没有则留空，不弹确认 |
| `--no-reviewer` | 强制不指定审核人；与 `--reviewer` 同时出现 → 停摆 |
| `--draft` | 创建 Draft MR |
| `--remove-source-branch` | 合并后删除源分支（默认取配置 `mr.remove_source_branch`，缺省 `false`） |
| `--dry-run` | 只做检查和生成 MR 内容，不创建 |

```text
/gitflow:merge
/gitflow:merge --repo pro-pcb
/gitflow:merge --reviewer @zhangsan
/gitflow:merge --no-reviewer
/gitflow:merge --to dev --dry-run
```

## 流程

1. **读取共享规则与配置**：读取 core，按第 1 节定位操作目标与配置。

2. **解析操作仓库**：按 core §2.1 确定 `<root>`；`--repo` 指向的仓库必须在配置中且是 Git 仓库根目录。

3. **前置检查**：按 core §2.2 检查工作区、§2.3 检查进行中的 Git 操作与 detached HEAD。工作区不干净 → 停摆。

4. **解析当前分支**：按 `branch_pattern` 得到 `{type}`、`{version}`、`{ticket}`。非任务分支 / 保护分支 → 停摆。

5. **多仓库改动检测（仅提示，不阻断）**：按 core §2.5 扫描配置中的其他仓库；同任务分支有未提交改动 → 在输出中注明“未处理，需要时运行 `/gitflow:commit`”；其他分支的改动直接忽略。不询问、不停摆。

6. **确定目标环境**：

   - 缺省：分支名中的 `{version}`
   - `--to <env>`：必须在 `active` 中且有 `envs` 映射
   - `--to` 与分支所属环境不同 → **停摆确认**：“当前分支基于 X，直接合入更高环境 Y 会绕过链式提升，是否继续？”
   - 目标环境分支不存在于配置或远端 → 停摆

7. **解析审核人**：按 core §1.4 解析，并记录来源：

   - 命令行 `--reviewer`（可重复）优先；`--no-reviewer` 强制为空，两者同时出现 → 停摆
   - 未传时读取 `repos.<操作仓库>.reviewers`；字段存在即生效，`[]` 表示显式不指定
   - 仓库未配置时回退 `mr.reviewers`；仍未配置则为空
   - 未配置**不弹确认、不阻断**：继续创建 MR，结果中注明“未配置审核人，依赖 CODEOWNERS”
   - 用户名去掉开头 `@`、去重后用于 `glab` 与 `{{reviewers}}`；输出展示时加 `@`

8. **同步远端并校验目标分支**（必须早于推送状态比较）：

   ```bash
   git -C <root> fetch <remote> --prune
   git -C <root> ls-remote --exit-code --heads <remote> <env-branch>
   ```

   - fetch 失败或分支不存在 → 停摆
   - 此时 `<remote>/<env-branch>` 是本次 fetch 的最新快照，后续比较与预检都基于它

9. **校验分支已完整推送**（fetch 之后执行，避免使用过期的 remote-tracking 快照）：

   ```bash
   git -C <root> rev-parse --abbrev-ref --symbolic-full-name '@{u}'
   git -C <root> rev-list --count '@{u}..HEAD'
   git -C <root> rev-list --count 'HEAD..@{u}'
   ```

   - 无上游 → 停摆，提示先 `/gitflow:commit`
   - 本地领先（未推送）→ 停摆，提示先 push
   - 远端领先（本地落后）→ 停摆，提示先处理远端任务分支
   - 仅当本地与上游一致才继续

10. **检查是否已合入**：

    ```bash
    git -C <root> merge-base --is-ancestor HEAD <remote>/<env-branch>
    ```

    退出码 `0` → 报告“当前分支已包含在目标环境分支中，无需创建 MR”，结束。

11. **冲突预检**（只读，不碰工作区，要求 Git ≥ 2.38）：

    ```bash
    git -C <root> version
    git -C <root> rev-parse <remote>/<env-branch>
    git -C <root> merge-tree --write-tree --name-only <remote>/<env-branch> HEAD
    ```

    - 退出码 `0` → 无冲突，继续
    - 退出码 `1` → 有冲突：列出第一行（结果树 OID）之后的冲突文件名，**停摆**，不创建 MR
    - 退出码 `>1` → 预检失败（历史不相关、对象缺失等）→ 停摆并输出原始错误
    - Git 版本低于 2.38 → 停摆，说明该命令依赖新版 `merge-tree`
    - 报告中必须注明快照，例如：

      ```text
      冲突预检: 无冲突（基于 origin/pro-ui/4.1 @ a1b2c3d 的 fetch 快照；
                服务端合并时目标分支可能已前进，预检结论仅对该时点成立）
      ```

12. **生成 MR 标题与描述**：

    - 收集待合入提交：`git log --oneline <remote>/<env-branch>..HEAD`
    - 工单：从分支名提取单号；会话中有 ONES 标题/链接时一并使用，不编造。**有链接时必须写成 Markdown 链接**，提交后可直接点击：
      - 链接 + 标题：`[PRO-159115 【标题】](<链接>)`
      - 仅链接：`[PRO-159115](<链接>)`
      - 无链接：`PRO-159115 【标题】`（无标题时只写单号）
      - 多个工单每行一个，可用 `- ` 列表，避免挤成一段
    - 审核人取第 7 步结果；`{{reviewers}}` 填 `@a @b`。审核人为空时**删除整条 `/assign_reviewer` 行**，依赖 CODEOWNERS，不留空指令
    - `{{merge_type}}` 填实际类型（当前环境 / 链式同步 / 用户指定）；模板中紧跟其后的候选说明只用于提示可选值，写入 MR 时一并替换，不保留括号列表
    - 若仓库存在 `.gitlab/merge_request_templates/cross-version.md`，读取并填充占位符：`{{ticket}}`、`{{summary}}`、`{{source_branch}}`、`{{target_branch}}`、`{{merge_type}}`、`{{reviewers}}`
    - **自测条目按实际范围裁剪**：`## 自测情况` 只保留本次真正适用的条目，不保留“（如有）”之类的空占位。本次改动没有新增或修改测试文件（按 `git diff --name-only <remote>/<env-branch>...HEAD` 匹配 `*.test.*`、`*.spec.*`、`__tests__/`、`test/`、`tests/`）时，删除“单元测试”行；有测试改动时保留或追加 `- [ ] 单元测试通过`。仓库模板中的同类空占位也按此规则删除
    - 无模板时使用以下结构（**`## 合并链路` 内每行之间留空行**，否则 GitLab 会把连续行渲染成同一段）：

      ```markdown
      ## 关联工单
      [PRO-159115 【标题】](<链接>)

      ## 变更说明
      <提交摘要>

      ## 合并链路
      源分支：<source>

      目标分支：<target>

      本次合并为：<merge_type>（当前环境 / 链式同步 / 用户指定）

      ## 自测情况
      - [ ] 本地验证通过

      /assign_reviewer @<reviewer1> @<reviewer2>
      ```

    - **不输出 `## 审核人` 标题**：GitLab 提交后执行 `/assign_reviewer` 并移除指令行，保留标题只会剩下一个空章节
    - 没有审核人时不输出 `/assign_reviewer` 行，依赖 CODEOWNERS
    - 模板占位符未填充完整 → 停摆，不创建半成品 MR
    - 描述是多行 markdown：**写入系统临时目录的 UTF-8 文件**（不写入仓库），提交后删除；不直接在命令行里拼多行字符串

13. **检查是否已有 MR**（需要 `glab` 可用且已认证）：

    ```bash
    (cd <root> && glab auth status)
    (cd <root> && glab mr list --help)   # 先确认当前版本的 source/target 参数名
    (cd <root> && glab mr list --source-branch <branch> --target-branch <env-branch> --state opened)
    ```

    - **所有 `glab` 命令必须在 `<root>` 下执行**（或使用等价的 `-R` 指定仓库）；`--repo` 模式尤其注意，否则会操作会话当前仓库而不是操作仓库

    - 已有打开的 MR → 结束（不重复创建）；链接按第 15 步的规则单独输出原始 URL
    - 参数名以 `--help` 为准，不猜测；不支持 `--state opened` 时在结果中自行过滤已关闭/已合并的 MR
    - `glab auth status` 失败时，按第 14 步的“glab 不可用”分支停摆

14. **创建 MR**：

    - **glab 可用且已认证**：按 `glab mr create --help` 确认参数与描述文件支持，然后创建：

      ```bash
      (cd <root> && glab mr create \
        --source-branch <branch> \
        --target-branch <env-branch> \
        --title "<title>" \
        --description-file <描述临时文件> \
        --yes)
      ```

      - 当前版本支持 `--description-file`（或等价参数）时优先使用，避免 Windows bash 下多行字符串的引号转义问题；不支持时用 `--description "$(cat <描述临时文件>)"`（双引号包裹、保留换行）
      - 审核人非空时按 `--help` 追加 `--reviewer`（确认是可重复传参还是逗号分隔）；用户名不带 `@`
      - 按 `--help` 按需追加 `--draft`、`--remove-source-branch`、`--no-editor`；不支持的参数不强行添加
      - glab 因审核人不存在或无权限失败 → **停摆**，指出配置中的具体用户名与字段位置（`repos.<仓库>.reviewers` / `mr.reviewers`）；**不**静默去掉审核人重试
      - 其他命令失败 → 停摆并输出原始错误，不盲目换参数重试

    - **glab 不可用或未认证** → **停摆**，输出：
      - 标题、描述全文
      - 安装指引：`winget install glab.glab`，或从 GitLab CLI releases 下载对应平台二进制；内网机器无法访问外网时使用内部软件源
      - 内网 GitLab 登录指引：

        ```bash
        glab auth login --hostname <内网 GitLab 域名>
        # 或先设置环境变量
        GITLAB_HOST=<内网 GitLab 域名> glab auth login
        ```

      - 手动创建入口（按 core §7 从 `git remote get-url` 推导 Web 地址，并对分支名做 URL 编码）：

        ```text
        <web-url>/-/merge_requests/new?merge_request[source_branch]=<source>&merge_request[target_branch]=<target>
        ```

      > 不用 `git push -o merge_request.create` 兜底：分支已完整推送时 push 是 no-op，不会创建 MR。

15. **输出结果**：MR 链接、源/目标分支、冲突预检快照与结果、审核人及来源、是否 Draft、是否删除源分支。若创建了 MR，提示合并后如需继续提升到更高环境，运行 `/gitflow:promote <目标环境>`；已在链式顶端则提示完成。

    - **MR 链接单独一行输出原始 URL**，不加括号、中文标签或说明文字；不要把中文、全角括号紧贴 URL（终端或浏览器会将其并入链接，导致打开被截断）。例如：

      ```text
      https://gitlab.example.com/pro-ui/-/merge_requests/123
      ```

`--dry-run`：执行到第 13 步前停止，输出预检结果、审核人解析结果、标题、描述和手动创建入口，不调用 `glab`。

> **首次接入校准**：先核对 `glab auth status`、`glab mr list --help`、`glab mr create --help` 的实际参数；`/gitflow:merge --dry-run` 只校准套件自身的标题/描述/入口，不调用 glab，不能替代 glab 参数校准。

## 停摆条件

通用停摆条件见 core §2（工作区 / 进行中操作 / 远端）、§5（保护分支 / 命令失败 / 状态不符）。本命令特有：

- 当前分支不是任务分支或指向保护分支
- 目标环境非法、跨环境直合未确认、环境分支不存在
- 无上游、本地未推送、远端任务分支领先
- 冲突预检有冲突或预检失败、Git 版本过低
- `--reviewer` 与 `--no-reviewer` 同时使用；审核人配置不是字符串数组，或规范化后为空
- MR 模板占位符未填充完整
- glab 不可用/未认证、MR 创建失败
- glab 因审核人不存在或无权限失败（不静默去掉审核人重试）
- 已有 MR（单独输出原始 URL，不重复创建）

## 输出示例

```text
## gitflow:merge
- 操作仓库: pro-ui（D:/work/pro-ui）
- 当前分支: jiangshun/fix/4.1-PRO-159115
- 目标环境: 4.1（分支名）
- 目标分支: origin/pro-ui/4.1

### 执行
1. 工作区: 干净
2. 多仓库检测: 无其他改动
3. fetch origin: 成功
4. 推送状态: 本地与上游一致
5. 冲突预检: 无冲突（基于 origin/pro-ui/4.1 @ a1b2c3d 的 fetch 快照）
6. 审核人: @zhangsan、@lisi（来源: repos.pro-ui.reviewers）
7. 已有 MR: 无
8. glab mr create: 成功

### 结果
- 状态: 成功
- MR:
  https://gitlab.example.com/pro-ui/-/merge_requests/123
- 审核人: @zhangsan、@lisi（来源: repos.pro-ui.reviewers）
- 下一步: 合并 MR 后如需提升 4.1 → dev，运行 /gitflow:promote dev
```
