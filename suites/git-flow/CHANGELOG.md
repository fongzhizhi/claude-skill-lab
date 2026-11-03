# CHANGELOG —— git-flow 变更历史

<!-- 记录 suites/git-flow/ 的每次变更。 -->

## v0.1.1（2026-11-02）

- `/git-flow-commit` 对齐 format-keeper v0.2.0：格式化步骤内部会执行 `git add -A`，并优先 `prettier:auto` / `lc-build`

## v0.1.0（2026-11-02）

- 初始版本：4 个命令 + 共享核心技能 + 配置参考文档
- `/git-flow-start`：ONES 工单解析、链式默认顶端环境、`--no-track` 创建任务分支、同名分支停摆
- `/git-flow-sync`：fetch → 落后提交比较 → merge 环境分支，冲突停摆
- `/git-flow-commit`：`git add -A` → format-keeper → mojibake-fixer → `git add -A` → commit-draft → commit → push
- `/git-flow-merge`：推送状态校验、`merge-tree` 冲突预检、glab 创建合入所属环境的 MR
- `git-flow-core`：配置查找/校验、环境链、前置检查、ONES 解析、保护分支与安全边界
- 配置：仓库 `.claude/git-flow.json` + 全局 `settings.json#gitFlow` 默认值
- v0.1 不含 TS 类型检查、单元测试、环境链提升与冲突自动解决
