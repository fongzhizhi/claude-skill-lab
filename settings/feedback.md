# feedback —— 使用反馈

<!-- 记录配置使用过程中发现的问题与改进建议。 -->

## 2026-11-07（PowerShell 权限）

- 现象：`permissions.allow` 仅放行裸 `Bash`，Git Bash 执行不再弹窗，但 Windows 下切到 PowerShell 工具仍逐条确认
- 采纳：allow 增加裸 `PowerShell`，与 `Bash` 同为整工具放行
- 注意：deny 列表仍只有 `Bash(...)` 规则，`Remove-Item -Recurse -Force` 等 PowerShell 破坏性命令不会被现有 deny 命中；若需要对称防护，应补充对应 `PowerShell(...)` deny

## 2026-11-03（additionalDirectories 可移植）

- 现象：为让 `/gitflow:init` 直接写入 `~/.claude/gitflow.json`，在 `_base.json` 加入 `permissions.additionalDirectories: ["C:\\Users\\win10\\.claude"]`；该路径硬编码用户名，且与当前机器实际用户 `jiangshun` 不符，换账号/换机器即失效
- 采纳：profile 中改写 `"{HOME}/.claude"`，`claude-lab switch` 在写入前展开为 `os.homedir()`；同时兼容以 `~` 开头的路径
- 决策：不依赖 Claude Code 对 `additionalDirectories` 的 `~` 展开（schema 未文档化该字段的 `~` 支持），由仓库侧展开成绝对路径，跨版本行为确定
- 注意：放行整个 `~/.claude` 后，配合现有裸 `Write`/`Edit`，`settings.json`、`.credentials.json` 等也会进入自动写入范围；按“直接放开权限”的意愿保留，后续如需收窄可加 deny/ask 规则

## 2026-11-03

- 全局 `~/.claude/CLAUDE.md` 此前游离于版本管理之外，误删/换机即丢失，且内容与仓库模块演进脱节 → 收编到 `settings/CLAUDE.md`，由 `deploy settings` 部署；`status` 报告漂移
- 确认 `CLAUDE.md` 不与 `switch` 绑定：切模型与全局指令更新节奏无关，deploy 负责纯静态文件，switch 继续只管 `settings.json`

## 2026-09-18

- `~/.claude/projects/` 会话记录膨胀至约 2GB，且多为长期无用的历史对话 → `cleanupPeriodDays` 由 60 降至 30
- 记忆系统价值低：每会话自动总结耗时，沉淀的多为代码中可见的 bug/需求变更，无法迭代更新 → 关闭 `autoMemoryEnabled`，知识固化统一走 CLAUDE.md
