# ones-parser

> 解析 ONES 项目管理平台复制的工单内容（需求 / 文档 / 任务 / 缺陷），输出规范的结构化结果，作为对话上下文与 commit 引用的单一事实来源。

公司使用 ONES 记录需求、缺陷、任务等开发事宜，对话中经常粘贴 ONES 复制出来的单链接。本技能固化 ONES 复制格式的解析规则（单行 / 两行 / Markdown 链接等变体、ID 前缀与单类型映射、冗余 team id 识别），输出统一结构，供 commit-draft 等下游工具消费，避免各工具各自理解导致格式漂移。

## 前置依赖

无（纯文本解析，不发起网络请求，不依赖外部 CLI）。

## 部署

```bash
lab deploy ones-parser
```

部署后：`dist/skills/ones-parser/SKILL.md` → `~/.claude/skills/ones-parser/SKILL.md`

## 使用

- **自动触发**：对话中出现 ONES 链接 / 工单粘贴内容（如 `PRO-156328`、`WIKI-2048`）时，按规则解析并输出结构化结果。
- **供其他模块引用**：需要解析 ONES 内容的 skill / command，将 `SKILL.md` 中的"引用片段"嵌入其指令，保持解析规则单一来源。例如 commit-draft 的 footer 可引用为 `Refs: PRO-156328 (<链接>)`。

示例输入：

```text
PRO-156328 【需求测试】切换到自定义单还未选择参考点的模式下，在左侧区域按钮没有置灰 http://ones.com/project/#/team/Tkdsads78/issue/PRO-156328
```

输出：

```text
ONES 工单解析：
- ID: PRO-156328
- 类型: 需求
- 标题: 【需求测试】切换到自定义单还未选择参考点的模式下，在左侧区域按钮没有置灰
- 链接: http://ones.com/project/#/team/Tkdsads78/issue/PRO-156328
```
