# CHANGELOG —— commit-draft 变更历史

<!-- 记录 commands/commit-draft/ 的每次变更。 -->

## v0.1.4（2026-08-10）

- 调整 ONES footer 顺序与格式：`Title:` 行置于 `Refs:` 上方（更符合阅读习惯）；`Refs:` 只输出纯链接，不再拼 `ID (链接)`（单 ID 由 `Title:` 行体现）。

## v0.1.3（2026-08-10）

- 新增 ONES 单引用：会话/参数中出现 ONES 单时，footer 追加 `Title: <ID> <标题>`（git trailer 格式，`Title:` 行配合 `Refs:`，`git log --grep=<单号>` 可检索到该次提交）。
- 内置 ONES 单解析规则（与 ones-parser 技能保持一致：链接为锚点、ID 前缀→类型、标题提取、不编造）；非 ONES 链接保持原有 `Refs: <链接或编号>`，不影响通用性。

## v0.1.2（2026-08-10）

- 修复中文场景下偶发输出 U+FFFD 乱码：信息收集阶段提示识别乱码来源（GBK 文件按 UTF-8 读取），新增"输出自检"流程（检查 → 排查 → 重写 → 复检），乱码内容不复述进 commit。

## v0.1.1（2026-08-10）

- 完善 README：新增功能表、前置依赖、部署与使用说明，文档结构对齐统一模块 README 规范（参照 openspec）。

## v0.1.0（2026-08-09）

- 初始版本：根据暂存区（回退全部变更）、会话上下文与命令参数总结 Conventional Commits 格式的 commit message，单代码块输出。
