# commit-flow

> 通用提交流水线：敏感文件检查 → 代码格式化 → 乱码检测与修复 → 生成提交信息 → 提交并推送。

面向单仓库、无 MR 流程的项目。不依赖 gitflow 配置，不校验任务分支与保护分支，在 `master` / `main` 上也能直接提交；把提交前真正有价值的检查（防泄密、格式化、中文乱码）和执行动作（commit + push）串成一条命令。

## 功能

| 能力 | 说明 |
| --- | --- |
| 敏感文件检查 | 暂存前扫描未跟踪文件中的 `.env`、私钥、`credentials*` 等，命中则询问处理方式 |
| 代码格式化 | 调用 format-keeper：优先 `prettier:auto`，否则 `lc-build prettier`，最后回退暂存区格式化脚本 |
| 乱码检测 | 调用 mojibake-fixer 扫描本次变更文件中的 U+FFFD，结合上下文修复，存疑项报告不猜改 |
| 提交信息 | 调用 commit-draft 基于暂存区 diff 与会话上下文生成 Conventional Commits 信息 |
| 提交与推送 | 本地提交后推送当前分支；无上游时自动 `push -u origin HEAD`，可用 `--no-push` 关闭 |

## 与 gitflow:commit 的区别

| 维度 | commit-flow | gitflow:commit |
| --- | --- | --- |
| 前置配置 | 无 | `gitflow.json`（chain / envs / user / 单号） |
| 分支模型 | 任意分支，master/main 只提示不拦截 | 必须任务分支，保护分支禁止提交 |
| 多仓库 | 只操作当前仓库 | 检测配置内的兄弟仓库 |
| 工单 | 不要求，不编造 | 必须解析单号用于分支名 |
| 推送 | 直接推送当前分支 | 校验上游不是环境分支 |

## 前置依赖

无外部 CLI 依赖，但会调用以下 Claude Code 模块（未部署时运行到对应步骤会停摆并提示）：

| 模块 | 用途 | 部署命令 |
| --- | --- | --- |
| `format-keeper`（skill） | 代码格式化 | `claude-lab deploy format-keeper` |
| `mojibake-fixer`（command） | 乱码检测与修复 | `claude-lab deploy mojibake-fixer` |
| `commit-draft`（command） | 生成提交信息 | `claude-lab deploy commit-draft` |

以上依赖由命令在运行时读取并遵循其规则，因此不写入 `meta.json`（`meta.json` 面向外部 CLI 检测）。

## 部署

```bash
lab deploy commit-flow
```

部署后，命令落点为 `~/.claude/commands/commit-flow.md`，在 Claude Code 对话中以 `/commit-flow` 调用。

## 使用

```text
/commit-flow                    # 检查 → 格式化 → 乱码 → 提交 → 推送
/commit-flow --no-push          # 只提交
/commit-flow --message "fix: 修复登录页跳转错误"
```

典型的停摆场景：有进行中的 merge/rebase、detached HEAD、命中敏感文件未确认、格式化失败、存在无法推断的乱码、提交信息为空、推送被拒绝。停摆时已产生的格式化/乱码修复改动会保留在工作区，不自动回滚。
