# feedback —— 使用反馈

<!-- 记录配置使用过程中发现的问题与改进建议。 -->

## 2026-09-18

- `~/.claude/projects/` 会话记录膨胀至约 2GB，且多为长期无用的历史对话 → `cleanupPeriodDays` 由 60 降至 30
- 记忆系统价值低：每会话自动总结耗时，沉淀的多为代码中可见的 bug/需求变更，无法迭代更新 → 关闭 `autoMemoryEnabled`，知识固化统一走 CLAUDE.md
