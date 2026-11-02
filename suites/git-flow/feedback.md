# feedback

<!-- 记录使用过程中发现的问题与改进建议。 -->

## 初始创建（2026-11-02）

- 需求来源：[project-docs/plans/git-flow.md](../../project-docs/plans/git-flow.md)；经评估后用户确认：环境分支采用链式同步、未指定环境默认链式顶端（通常 `dev`）、异常停摆询问用户、指令名改为 `git-flow-*`、提交前走“add → 格式化 → 乱码修复 → add → commit-draft → commit → push”。
- 决策：
  - 采用聚合套件 + `git-flow-core` 共享技能，避免四个命令复制规则。
  - 配置以仓库 `.claude/git-flow.json` 为主，全局默认放 `settings.json#gitFlow`（由 `_base.json` 维护）；不直接依赖 `~/.claude/settings.json` 的手工改动。
  - v0.1 只做“任务分支 → 所属环境”的 MR，环境链提升留待 `/git-flow-promote`；避免一次实现过多未验证逻辑。
  - MR 自动创建依赖 `glab`；不可用时停摆并给出手动入口，不用 `git push -o merge_request.create` 兜底（分支已推送时 push 是 no-op）。
  - 冲突只预检不解决；破坏性操作一律不自动执行。
- 待实测确认项：
  - 实际 ONES 粘贴格式（多行、链接、标题）的解析准确率
  - `glab mr create/list` 的参数名随版本变化，需在真实环境核对 `--help`
  - Windows 下 `merge-tree` 输出解析、长路径、中文路径
  - 多仓库工作区配置匹配（`path` 解析、嵌套仓库）
  - 提交流水线在 Prettier/ESLint/Biome 项目中的实际表现，以及 `skipped` 是否可接受
  - 链式环境提升的真实操作顺序与 MR 目标分支
