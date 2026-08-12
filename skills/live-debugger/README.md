# live-debugger

> 模拟人工 debugger 流程定位前端 bug：分析代码找疑点 → console.log 埋点 → 等编译 → 打开/刷新页面 → 读取 console 数据 → 闭环迭代直至修复。

前端定位 bug 最快最准的方式是 debugger——看调用栈判断流程是否符合预期，看数据判断状态是否符合预期。本技能把这个人工过程自动化：结合浏览器控制 MCP（chrome-devtools 等），重复执行"埋点 → 复现 → 看数据 → 收敛"循环，一步步缩小范围直到根因，修完后自动清除埋点并输出根因与修复方案报告。

## 前置依赖

| 依赖 | 说明 |
| --- | --- |
| 浏览器控制 MCP（软依赖） | chrome-devtools / playwright / puppeteer 任一，用于打开/刷新页面、读取 console 埋点。缺失时降级为"纯代码分析 + 用户手动复现"，不拦截部署 |

## 部署

```bash
lab deploy live-debugger
```

部署后：`dist/skills/live-debugger/SKILL.md` → `~/.claude/skills/live-debugger/SKILL.md`

## 使用

- **自动触发**：对话中出现前端 bug 描述，要求"定位/调试/排查/修复"问题时使用。
- **手动调用**：`/live-debugger`，附上 bug 描述与复现步骤（可选 URL）。

核心约定：

- 埋点统一使用 `console.log('[live-debugger][<context>]', { vars })` 前缀格式，方便识别、过滤与精确清除
- 硬性限额：每轮排查 Read ≤ 5 / Grep ≤ 10，防止无时间概念的空转
- 默认页面 URL：`http://localhost/editor?cll=debugger`（用户提供 URL 时优先）
- 收尾自动清除全部埋点、保留修复代码，输出根因 + 修复方案报告

示例：`/live-debugger "编辑器里上传图片后缩略图不显示，点完上传按钮就没有反应"` → 分析定位 → 埋点 → 刷新页面 → 用户复现 → 读取数据 → 闭环至修复。
