# CHANGELOG —— format-keeper 变更历史

<!-- 记录 skills/format-keeper/ 的每次变更。 -->

## v0.2.0（2026-11-02）

- 改为内部工作流优先：`npm run prettier:auto` → `lc-build prettier -- --write` → 仅报错时回退 `package.json` 暂存区脚本
- 统一范围：先 `git add -A`，再对 `git diff HEAD --diff-filter=d` 的全部变更文件格式化，不再区分暂存/未暂存/未跟踪
- 格式化成功后再次 `git add -A`，技能会改写暂存区；调用方无需重复暂存
- 移除通用 Prettier/ESLint/Biome/语言工具检测，以及文件/目录/`--staged`/`--check` 参数
- 新增未跟踪敏感文件与冲突文件前置检查；回退脚本只接受 `lint-staged`、`*:staged`、`git diff --cached` 等暂存区命令
- 新增 `meta.json`：npm 为必需依赖，`lc-build` 为可选依赖

## v0.1.0（2026-11-02）

- 初始版本：纯格式化 skill，默认处理 git 变更文件（暂存 + 未暂存 + 未跟踪），支持指定文件/目录、`--staged`、`--check`
- 按项目已有工具检测执行：package 脚本 / Prettier / ESLint `--fix` / Biome / rustfmt / gofmt / clang-format / ruff / black / shfmt
- 只格式化目标文件，不仓库级、不创建配置、不安装依赖、不改语义
- 无可用工具时报告 `skipped`，工具执行失败 `failed` 即停；提供 `/git-flow-commit` 内嵌引用片段
