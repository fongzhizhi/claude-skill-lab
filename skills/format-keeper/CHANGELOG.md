# CHANGELOG —— format-keeper 变更历史

<!-- 记录 skills/format-keeper/ 的每次变更。 -->

## v0.1.0（2026-11-02）

- 初始版本：纯格式化 skill，默认处理 git 变更文件（暂存 + 未暂存 + 未跟踪），支持指定文件/目录、`--staged`、`--check`
- 按项目已有工具检测执行：package 脚本 / Prettier / ESLint `--fix` / Biome / rustfmt / gofmt / clang-format / ruff / black / shfmt
- 只格式化目标文件，不仓库级、不创建配置、不安装依赖、不改语义
- 无可用工具时报告 `skipped`，工具执行失败 `failed` 即停；提供 `/git-flow-commit` 内嵌引用片段
