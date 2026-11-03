# feedback —— 使用反馈

<!-- 记录配置使用过程中发现的问题与改进建议。 -->

## 2026-11-03

- 全局 `~/.claude/CLAUDE.md` 此前游离于版本管理之外，误删/换机即丢失，且内容与仓库模块演进脱节 → 收编到 `settings/CLAUDE.md`，由 `deploy settings` 部署；`status` 报告漂移
- 确认 `CLAUDE.md` 不与 `switch` 绑定：切模型与全局指令更新节奏无关，deploy 负责纯静态文件，switch 继续只管 `settings.json`

## 2026-09-18

- `~/.claude/projects/` 会话记录膨胀至约 2GB，且多为长期无用的历史对话 → `cleanupPeriodDays` 由 60 降至 30
- 记忆系统价值低：每会话自动总结耗时，沉淀的多为代码中可见的 bug/需求变更，无法迭代更新 → 关闭 `autoMemoryEnabled`，知识固化统一走 CLAUDE.md
