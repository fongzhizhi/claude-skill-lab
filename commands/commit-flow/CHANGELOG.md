# CHANGELOG —— commit-flow 变更历史

<!-- 记录 commands/commit-flow/ 的每次变更。 -->

## v0.1.0（2026-11-06）

- 初始版本：通用提交流水线，面向单仓库、无 MR 流程的项目。
- 流程：敏感文件检查 → `git add -A` → format-keeper → mojibake-fixer → `git add -A` → commit-draft → `git commit` → `git push`。
- 不依赖 gitflow 配置，不校验任务分支与保护分支，`master` / `main` 只提示不拦截。
- 支持 `--no-push`（只提交）与 `--message`（跳过 commit-draft）。
