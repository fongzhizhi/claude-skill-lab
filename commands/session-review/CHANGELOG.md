# CHANGELOG —— session-review 变更历史

<!-- 记录 commands/session-review/ 的每次变更。 -->

## v0.1.0（2026-08-11）

- 初始版本：根据会话上下文（最高优先，改动未实施也能复盘）与 git diff（补充核对关键改动）生成技术复盘报告（背景 / 根因分析 / 解决方案 / 关键改动 / 验证与结果 / 经验与后续），单个 markdown 代码块输出，供复制归档。
- 内置乱码自检：继承 commit-draft 的 U+FFFD 处理经验，输出前检查、重写、复检。
