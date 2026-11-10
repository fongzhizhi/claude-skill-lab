# CHANGELOG —— 配置变更历史

<!-- 记录 settings/ 下的每次配置变更。 -->

## 2026-11-10

- `vscode/settings.json` 的 `claudeCode.useTerminal` 由 `true` 改为 `false`：切换到 Claude Code 原生 UI 模式，`claude-vscode.*` 命令的快捷键（如 `ctrl+alt+n` 打开编辑器面板）才会生效
- 新增 `vscode/keybindings.json`，作为 VSCode 自定义快捷键的仓库记录源：
  - `ctrl+shift+c`（编辑器/非编辑器上下文）复制相对路径，并解绑默认的 `ctrl+k ctrl+shift+c`
  - `ctrl+alt+n` 在原生 UI 下打开 Claude Code 编辑器面板，同时解绑默认的 `ctrl+shift+escape`
  - `ctrl+k r` 关闭右侧编辑器组、`ctrl+k o` 关闭其他编辑器
  - 保留既有的终端 `shift+enter` 发送 ESC+CR
- 顶层 `manifest.json` 与 `project-docs/design.md` 补充 `vscode/keybindings.json` 的 `{VSCodeKeybindings}` 目标映射
- 新增 `claude-lab vscode` 命令：把 `settings/vscode/*` 同步到本地 VSCode User 目录（按平台解析：Windows `%APPDATA%/Code/User`、macOS `~/Library/Application Support/Code/User`、Linux `~/.config/Code/User`），`--check` 仅检查差异并以退出码 1 表示不一致；`package.json` 同步新增 `npm run vscode` 薄封装
- 设计取舍：VSCode 配置不并入 `deploy settings` / `deploy --all`，避免一键部署时误覆盖编辑器本地设置；`vscode/` 为纯静态覆盖，不做 JSONC 合并

## 2026-11-07

- `profiles/_base.json` 的 `permissions.allow` 新增裸 `PowerShell`：Windows 下 Claude Code 使用 PowerShell 工具执行命令时不再逐条弹权限确认，与裸 `Bash` 的整工具放行对齐
- 本地 `~/.claude/settings.json` 由 `claude-lab switch deepseek` 重新生成同步（`ANTHROPIC_AUTH_TOKEN` 按占位符保护机制沿用原值）
- 说明：`permissions.deny` 仍为 Bash 专用规则，PowerShell 侧暂无对应危险命令拦截；如需对称防护，可后续补充 `PowerShell(...)` deny 规则

## 2026-11-06

- `profiles/_base.json` 新增 `hooks.UserPromptSubmit`：以 exec 形式（`command: "node"` + `args`）注册 `session-keeper` 的每轮标题检查 hook，`args` 使用 `{HOME}` 占位
- `claude-lab switch` 的 `{HOME}` 展开从仅 `permissions.additionalDirectories` 扩展到 `hooks`（递归展开对象/数组中的字符串），保证 hook 脚本路径跨用户、跨机器可移植，且切换 profile 不会丢失 hook 注册
- 理由：`switch` 是整体覆盖写入 `~/.claude/settings.json`，hook 若只写本地会在下次切 profile 时被冲掉；与 mcpServers 同理，hooks 统一放基座

## 2026-11-03

- `profiles/_base.json` 的 `permissions.additionalDirectories` 由硬编码 `C:\Users\win10\.claude` 改为 `{HOME}/.claude`：原路径与当前用户 `jiangshun` 不符，换用户名/换机器即失效
- `claude-lab switch` 新增 `{HOME}` 与开头 `~` 的展开（仅作用于 `permissions.additionalDirectories`），写入 `~/.claude/settings.json` 前解析为当前用户主目录
- `settings/CLAUDE.md` 收编 `~/.claude/CLAUDE.md`：全局个人指令首次入仓，成为唯一事实来源；按规划拆分，嘉立创EDA 环境知识留在全局版，仓库自身章节（三层规范体系、模块体系、Git 策略、settings.json 要点）去重后并入项目级 `CLAUDE.md`
- CLI 新增 settings 部署通道：`claude-lab deploy settings` 静态复制 `settings/CLAUDE.md` → `~/.claude/CLAUDE.md`；`deploy --all` 一并执行；`status` 做字节一致性检查；`list` 展示配置模块；`remove settings` 明确拒绝
- `settings.json` 永久排除于 deploy（归 `switch` 管，模板含占位符）；`profiles/*` 与 `vscode/` 暂不激活

## 2026-09-18

- `profiles/_base.json` 会话保留周期 `cleanupPeriodDays` 60 → 30：`~/.claude/projects/` 会话记录累积约 2GB，缩短保留窗口控制磁盘增长（Claude Code 启动时按阈值自动清理旧 transcript，旧文件在下次启动一次性收口）
- `profiles/_base.json` 新增 `autoMemoryEnabled: false`：关闭自动记忆管线（不再每会话自动总结/写入，也不再自动召回）；值得固化的知识统一落到 CLAUDE.md，bug/需求变更信息以代码为准，避免记忆系统冗余且不可迭代
- 本地 `~/.claude/settings.json` 由 `claude-lab switch deepseek` 重新生成同步

## 2026-09-01

- `profiles/_base.json` mcpServers 新增 **playwright**（`npx @playwright/mcp@latest`），与 chrome-devtools 并存：live-debugger v0.2.0 起自动复现以 playwright 为首选（无障碍快照 + ref 确定性交互），chrome-devtools 保留用于网络/性能分析等场景
- 理由：`lab switch` 为整体覆盖写入，不会合并本地 mcpServers——手动往 `~/.claude/settings.json` 加的 MCP 会在下次切 profile 时丢失，故 MCP 统一放基座。本地 `~/.claude/settings.json` 已同步追加（保守编辑，仅动 mcpServers 键）
