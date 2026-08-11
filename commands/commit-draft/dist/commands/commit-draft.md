---
name: commit-draft
description: 根据仓库暂存区/变更文件与当前会话上下文，总结 Conventional Commits 规范的 commit message，输出单个代码块供直接复制。可附带需求/bug 链接作为参考。
category: git
---
# /commit-draft

根据仓库变更状态与当前会话内容，生成一条符合 Conventional Commits 规范的 commit message，**用单个代码块包裹输出**，方便用户直接复制。

## 信息收集（按优先级）

**第 1 优先级 —— 仓库变更（必做）**

- 执行 `git diff --cached --name-status` 查看暂存区变更；若暂存区为空，改用 `git diff --name-status` 获取所有变更文件。
- 执行 `git diff --cached --stat`（或 `git diff --stat`）了解变更统计。
- 需要理解改动细节时，查看具体文件的 diff；必要时读取文件内容辅助总结。
- 读取 diff / 文件内容时留意乱码：若出现 `�`（U+FFFD 替换字符）或明显编码错位的字符（Windows 下 GBK 编码文件被按 UTF-8 读取时常见），结合上下文推断该文件的真实改动意图，**不要复述乱码原文**。

**第 2 优先级 —— 会话上下文**

- 从当前会话中提取与本次改动相关的信息：正在写的需求、修的 bug、改动涉及的文件与说明。
- 会话中提到的需求 ID、bug 编号、ticket 链接等，作为补充信息加入 commit（便于溯源）。
- 会话中出现 ONES 单粘贴内容（如 `PRO-156328 【需求测试】... http://ones.xxx.com/project/#/team/xxx/issue/PRO-156328`）时，按下方"ONES 单解析规则"解析出单 ID / 类型 / 标题 / 链接，写入 footer。

**第 3 优先级 —— 命令参数**

- 用户执行 `/commit-draft` 时附带的参数（如需求链接、相关说明），原样作为参考信息加入 commit。
- 参数中的 ONES 单同样按"ONES 单解析规则"解析并写入 footer。

## ONES 单解析规则

ONES 工单的解析规则与 `ones-parser` 技能保持一致：

- **以链接为锚点**：从链接 hash 末尾提取正式单 ID（`PRO-156328`、`WIKI-2048`）；`#/team/<TeamId>` 中的 base62 团队标识是冗余信息，不是单号。
- **ID 前缀 → 单类型**：PRO=需求、WIKI=文档、TASK=任务、BUG=缺陷、SUBTASK=子任务；未知前缀不臆测。
- **标题提取**：单行格式取 ID 与链接之间的文本；两行格式取 ID 行去掉前缀后的部分；Markdown 链接取 `[...]` 内文本。
- **不编造**：解析不到标题则留空；ID 与链接冲突时以链接为准。

## 格式要求

严格遵循 Conventional Commits 主流结构：

```text
<type>(<scope>): <subject>

<body>

<footer>
```

- **type**：feat（新功能）/ fix（修复）/ docs（文档）/ style（格式）/ refactor（重构）/ perf（性能）/ test（测试）/ build（构建）/ ci（CI）/ chore（杂项）/ revert（回滚），按实际改动归类。
- **scope**：可选，填写受影响的功能模块或文件范围。
- **subject**：动词开头、不超过 50 字符、结尾不加句号，概括本次改动。
- **body**：说明"做了什么 + 为什么"，简洁分段，不要罗列代码细节。
- **footer**：存在需求/bug 来源时追加 `Refs: <链接或编号>`，如 `Refs: #123`、`Refs: https://example.com/ticket/123`。
- **footer（ONES 单）**：来源为 ONES 单时，每单输出两行，`Title:` 在上、`Refs:` 在下（`Title:` 为 git trailer 格式，便于 `git log --grep=<单号>` 检索）：

  ```text
  Title: PRO-156328 【需求测试】切换到自定义单还未选择参考点的模式下，在左侧区域按钮没有置灰
  Refs: http://ones.xxx.com/project/#/team/xxx/issue/PRO-156328
  ```

  - `Refs:` 只输出纯链接，不拼单 ID（单 ID 已由 `Title:` 行体现）。
  - 解析不到标题时只保留 `Refs:` 纯链接行，不编造标题。
  - 多个 ONES 单逐单追加 `{Title, Refs}` 对。

## 输出要求

- **只输出一个代码块**，内容为完整的 commit message（含 subject、body、footer），方便直接复制。
- 代码块内不要写 git 命令（不要 `git commit` 等）。
- 语言风格跟随仓库现有提交（本仓库默认中文）。
- **不编造引用**：footer 中的链接/编号必须来自会话或参数中真实提供的信息；`Title:` 行只写解析出的真实标题，解析不到则不写。
- 若暂存区与工作区均无变更，直接告知用户"没有可提交的变更"，不生成 commit message。

## 输出自检（防乱码）

生成 commit message 后、输出代码块前，必须完成自检：

1. **乱码检查**：逐字检查代码块内容，确认不含 `�`（U+FFFD 替换字符）及其他乱码（如 `锟斤拷`、`Ã©` 等编码错位符号）；中文场景下重点检查 subject 与 body。
2. **来源排查**：发现乱码时，定位来源——通常是 diff / 文件内容本身的编码问题（GBK 编码的中文文件被按 UTF-8 读取），而非输出故障。
3. **修正重写**：不将乱码文本带入 commit。对该改动改用 ASCII 描述（如"更新 XXX 文件的中文文案"），或基于上下文推断真实含义；无法推断时用通用中性描述。
4. **重新自检**：修正后再次检查，确认无乱码才输出。若多次重写仍无法消除乱码，如实告知用户乱码来自文件编码问题，建议先修复源文件编码再提交，不要强行输出。
