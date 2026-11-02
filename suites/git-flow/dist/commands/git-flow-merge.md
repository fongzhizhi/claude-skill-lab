---
name: git-flow-merge
description: 为任务分支创建合入所属环境的 GitLab MR：校验工作区与远端同步状态，用 git merge-tree 做只读冲突预检，生成 MR 标题/描述（优先复用仓库模板），通过 glab 创建并输出链接。有冲突、未推送、环境不匹配或 glab 不可用时停摆，不自动解决冲突。
category: git
---
# /git-flow-merge

为当前任务分支创建合入环境分支的 MR，并在创建前做只读冲突预检。**执行前必须先读取 `~/.claude/skills/git-flow-core/SKILL.md`**。

> v0.1 只创建“任务分支 → 所属环境”的 MR。环境链提升（4.1 → 4.2 → dev）属于后续 `/git-flow-promote`，不在本命令内自动执行。

## 参数

| 参数 | 说明 |
| --- | --- |
| `--to <环境>` | 指定目标环境；缺省为分支名中的所属环境。跨环境直合会先停摆确认（与链式模型不一致） |
| `--reviewer @name` | 指定审核人；可重复。未指定时依赖 CODEOWNERS，不主动 @ 人 |
| `--draft` | 创建 Draft MR |
| `--remove-source-branch` | 合并后删除源分支（默认取配置 `mr.remove_source_branch`，缺省 `false`） |
| `--dry-run` | 只做检查和生成 MR 内容，不创建 |

```text
/git-flow-merge
/git-flow-merge --reviewer @zhangsan
/git-flow-merge --to 4.2 --dry-run
```

## 流程

1. **读取共享规则与配置**：按 core 第 1 节定位仓库与配置。

2. **前置检查**：按 core 第 2 节检查工作区、进行中的 Git 操作、detached HEAD。工作区不干净 → 停摆。

3. **解析当前分支**：按 `branch_pattern` 得到 `{type}`、`{version}`、`{ticket}`。非任务分支 / 保护分支 → 停摆。

4. **确定目标环境**：

   - 缺省：分支名中的 `{version}`
   - `--to <env>`：必须在 `active` 中且有 `envs` 映射
   - `--to` 与分支所属环境不同 → **停摆确认**：“当前分支基于 X，直接合入更高环境 Y 会绕过链式提升，是否继续？”
   - 目标环境分支不存在于配置或远端 → 停摆

5. **校验分支已完整推送**：

   ```bash
   git -C <root> rev-parse --abbrev-ref --symbolic-full-name '@{u}'
   git -C <root> rev-list --count '@{u}..HEAD'
   git -C <root> rev-list --count 'HEAD..@{u}'
   ```

   - 无上游 → 停摆，提示先 `/git-flow-commit`
   - 本地领先（未推送）→ 停摆，提示先 push
   - 远端领先（本地落后）→ 停摆，提示先处理远端任务分支
   - 仅当本地与上游一致才继续

6. **同步远端并校验目标分支**：

   ```bash
   git -C <root> fetch <remote> --prune
   git -C <root> ls-remote --exit-code --heads <remote> <env-branch>
   ```

   失败或分支不存在 → 停摆。

7. **检查是否已合入**：

   ```bash
   git -C <root> merge-base --is-ancestor HEAD <remote>/<env-branch>
   ```

   退出码 `0` → 报告“当前分支已包含在目标环境分支中，无需创建 MR”，结束。

8. **冲突预检**（只读，不碰工作区，要求 Git ≥ 2.38）：

   ```bash
   git -C <root> merge-tree --write-tree --name-only <remote>/<env-branch> HEAD
   ```

   - 退出码 `0` → 无冲突，继续
   - 退出码 `1` → 有冲突：列出第一行（结果树 OID）之后的冲突文件名，**停摆**，不创建 MR。报告冲突文件、建议人工确认；不提供 ours/theirs 自动选择
   - 退出码 `>1` → 预检失败（历史不相关、对象缺失等）→ 停摆并输出原始错误
   - Git 版本低于 2.38 → 停摆，说明该命令依赖新版 `merge-tree`

9. **生成 MR 标题与描述**：

   - 收集待合入提交：`git log --oneline <remote>/<env-branch>..HEAD`
   - 工单：从分支名提取单号；会话中有 ONES 标题/链接时一并使用，不编造
   - 若仓库存在 `.gitlab/merge_request_templates/cross-version.md`，读取并填充占位符：`{{ticket}}`、`{{summary}}`、`{{source_branch}}`、`{{target_branch}}`、`{{merge_type}}`、`{{reviewers}}`
   - 无模板时使用以下结构：

     ```markdown
     ## 关联工单
     PRO-159115 【标题】
     <链接>

     ## 变更说明
     - <提交摘要>

     ## 合并链路
     源分支：<source>
     目标分支：<target>
     本次合并为：当前环境

     ## 自测情况
     - [x] 本地验证通过
     - [ ] 单元测试通过（如有）

     ## 审核人
     /assign_reviewer @zhangsan
     ```

   - 没有审核人时不输出“审核人”段，依赖 CODEOWNERS
   - 模板占位符未填充完整 → 停摆，不创建半成品 MR

10. **检查是否已有 MR**（需要 `glab`）：

    ```bash
    glab auth status
    glab mr list --help   # 先确认当前版本的 source/target 参数名
    glab mr list --source-branch <branch> --target-branch <env-branch> --state opened
    ```

    已有打开的 MR → 报告链接，结束（不重复创建）。参数名以 `--help` 为准，不猜测；不支持 `--state opened` 时在结果中自行过滤已关闭/已合并的 MR。

11. **创建 MR**：

    - **glab 可用且已认证**：按 `glab mr create --help` 确认参数，创建 MR：

      ```bash
      glab mr create \
        --source-branch <branch> \
        --target-branch <env-branch> \
        --title "<title>" \
        --description "<description>" \
        --yes --no-editor
      ```

      按需追加 `--reviewer`、`--draft`、`--remove-source-branch`。命令失败 → 停摆并输出原始错误，不盲目换参数重试。

    - **glab 不可用或未认证** → **停摆**，输出：
      - 标题、描述全文
      - 手动创建入口：`<GitLab 仓库 URL>/-/merge_requests/new?merge_request[source_branch]=<source>&merge_request[target_branch]=<target>`
      - 安装/登录提示（`glab auth login`），不自动安装

      > 不用 `git push -o merge_request.create` 兜底：分支已完整推送时 push 是 no-op，不会创建 MR。

12. **输出结果**：MR 链接、源/目标分支、冲突预检结果、审核人、是否 Draft、是否删除源分支。若创建了 MR，提示合并后按链式模型处理后续环境提升（后续版本提供 `/git-flow-promote`）。

`--dry-run`：执行到第 10 步前停止，输出预检结果、标题、描述和手动创建入口，不调用 `glab mr create`。

## 停摆条件

- 工作区不干净、进行中的 Git 操作、detached HEAD
- 非任务分支 / 保护分支
- 目标环境非法、跨环境直合未确认、环境分支不存在
- 无上游、本地未推送、远端任务分支领先
- 冲突预检有冲突或预检失败、Git 版本过低
- MR 模板占位符未填充完整
- glab 不可用/未认证、MR 创建失败
- 已有 MR（报告链接，不重复创建）

## 输出示例

```text
## git-flow merge
- 仓库: D:/work/pro-ui
- 当前分支: jiangshun/fix/4.1-PRO-159115
- 目标环境: 4.1（分支名）
- 目标分支: origin/pro-ui/4.1

### 执行
1. 工作区: 干净
2. 推送状态: 本地与上游一致
3. 冲突预检: 无冲突
4. 已有 MR: 无
5. glab mr create: 成功

### 结果
- 状态: 成功
- MR: https://gitlab.example.com/pro-ui/-/merge_requests/123
- 下一步: 合并后按链式模型提升 4.1 → 4.2 → dev（后续版本提供）
```
