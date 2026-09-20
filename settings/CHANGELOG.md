# CHANGELOG —— 配置变更历史

<!-- 记录 settings/ 下的每次配置变更。 -->

## 2026-09-18

- `profiles/_base.json` 会话保留周期 `cleanupPeriodDays` 60 → 30：`~/.claude/projects/` 会话记录累积约 2GB，缩短保留窗口控制磁盘增长（Claude Code 启动时按阈值自动清理旧 transcript，旧文件在下次启动一次性收口）
- `profiles/_base.json` 新增 `autoMemoryEnabled: false`：关闭自动记忆管线（不再每会话自动总结/写入，也不再自动召回）；值得固化的知识统一落到 CLAUDE.md，bug/需求变更信息以代码为准，避免记忆系统冗余且不可迭代
- 本地 `~/.claude/settings.json` 由 `claude-lab switch deepseek` 重新生成同步

## 2026-09-01

- `profiles/_base.json` mcpServers 新增 **playwright**（`npx @playwright/mcp@latest`），与 chrome-devtools 并存：live-debugger v0.2.0 起自动复现以 playwright 为首选（无障碍快照 + ref 确定性交互），chrome-devtools 保留用于网络/性能分析等场景
- 理由：`lab switch` 为整体覆盖写入，不会合并本地 mcpServers——手动往 `~/.claude/settings.json` 加的 MCP 会在下次切 profile 时丢失，故 MCP 统一放基座。本地 `~/.claude/settings.json` 已同步追加（保守编辑，仅动 mcpServers 键）
