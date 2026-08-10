# CHANGELOG —— commit-draft 变更历史

<!-- 记录 commands/commit-draft/ 的每次变更。 -->

## v0.1.2（2026-08-10）

- 修复中文场景下偶发输出 U+FFFD 乱码：信息收集阶段提示识别乱码来源（GBK 文件按 UTF-8 读取），新增"输出自检"流程（检查 → 排查 → 重写 → 复检），乱码内容不复述进 commit。

## v0.1.1（2026-08-10）

- 完善 README：新增功能表、前置依赖、部署与使用说明，文档结构对齐统一模块 README 规范（参照 openspec）。

## v0.1.0（2026-08-09）

- 初始版本：根据暂存区（回退全部变更）、会话上下文与命令参数总结 Conventional Commits 格式的 commit message，单代码块输出。
