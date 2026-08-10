# CHANGELOG —— mojibake-fixer 变更历史

<!-- 记录 commands/mojibake-fixer/ 的每次变更。 -->

## v0.1.0（2026-08-10）

- 初始版本：Command 形态，默认扫描 git diff 变更文件（暂存 + 未暂存并集），支持指定文件/目录；U+FFFD 结合上下文推断修复，无法推断的列出报告，编码错位只报告不自动转换。