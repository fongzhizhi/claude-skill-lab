# CHANGELOG —— 配置变更历史

<!-- 记录 settings/ 下的每次配置变更。 -->

## 2026-09-01

- `profiles/_base.json` mcpServers 新增 **playwright**（`npx @playwright/mcp@latest`），与 chrome-devtools 并存：live-debugger v0.2.0 起自动复现以 playwright 为首选（无障碍快照 + ref 确定性交互），chrome-devtools 保留用于网络/性能分析等场景
- 理由：`lab switch` 为整体覆盖写入，不会合并本地 mcpServers——手动往 `~/.claude/settings.json` 加的 MCP 会在下次切 profile 时丢失，故 MCP 统一放基座。本地 `~/.claude/settings.json` 已同步追加（保守编辑，仅动 mcpServers 键）
