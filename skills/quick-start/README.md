# quick-start

> 快速测试功能或新改动：理解诉求后自动注入测试代码（便捷入口、硬编码、mock 数据、console.log 埋点），减少操作步骤，验证功能与数据是否符合预期，验证完清除全部注入代码恢复原状。

触发入口深、甚至没有入口的功能，人工验证要走很多步骤或根本没法触发。本技能自动注入测试代码：暴露快捷入口、mock 数据、硬编码参数、埋点打印数据——任何手段，目的是让用户能快速测试、验证功能或数据。与 live-debugger 同引擎（浏览器 MCP + 闭环），但目标是**验证**而非修复：验证完清场走人，不留测试痕迹。

## 前置依赖

| 依赖 | 说明 |
| --- | --- |
| 浏览器控制 MCP（软依赖） | chrome-devtools / playwright / puppeteer 任一，用于打开/刷新页面、读取 console 埋点。缺失时降级为"纯代码注入 + 用户手动复现"，不拦截部署 |

## 部署

```bash
lab deploy quick-start
```

部署后：`dist/skills/quick-start/SKILL.md` → `~/.claude/skills/quick-start/SKILL.md`

## 使用

- **自动触发**：对话中出现"快速验证/测试功能""入口太深/没有入口""mock 数据"等意图时使用。
- **手动调用**：`/quick-start`，附上验证诉求（要验证什么 + 预期结果 + 可选 URL）。

核心约定（与 live-debugger 对齐）：

- 硬性限额：每轮分析 Read ≤ 5 / Grep ≤ 10，超限兜底为入口与数据流转关键位置
- 注入手段选择矩阵：入口深 → 快捷入口；依赖数据 → mock；特定状态 → 硬编码；验证数据 → 埋点
- 注入代码统一打标：单行埋点 `console.log('[quick-start][<context>]', { vars })`；多行代码块用 `// [quick-start] begin/end` 标记对包裹，收尾按标记精确清除
- 可逆性原则：注入必须局部、可逆，清理后代码行为完全恢复；收尾 grep 确认 `[quick-start]` 零残留
- 默认页面 URL：`http://localhost/editor?cll=debug`（用户提供 URL 时优先）

示例：`/quick-start "验证导出 Excel 功能，但菜单入口没做好，直接帮我触发并确认导出的数据对不对"` → 注入触发入口 + mock 数据 + 埋点 → 刷新页面 → 用户确认 → 收集数据比对 → 符合预期后清场并输出验证报告。
