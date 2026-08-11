# Feedback

（此文件用于记录用户反馈及处理情况）

## 2026-08-10

- **反馈**：套件（`suites/`）的 `dist/` 与本地 `~/.claude/` 目录是一对一镜像，而单模块的 `dist/` 不是（skills 整目录复制、其余单文件复制），认知模型不统一；希望单模块也生成一对一结构，方便扩展和直接复制。
- **处理**：v0.4.0 统一单模块 `dist/` 为"`~/.claude/` 的相对路径镜像"——`dist/commands/commit-draft.md` → `~/.claude/commands/commit-draft.md`、`dist/skills/<name>/SKILL.md` → `~/.claude/skills/<name>/SKILL.md`（skills 部署目标为整目录，镜像中多一层），lab deploy/status/remove 统一为全量镜像复制/核对/删除，单模块可附带 references/ 等辅助文件。现有 4 个单模块已对齐。

## 2026-08-10

- **反馈**：skill-forge 与 commit-draft 的 README 偏简单；openspec 的 README（简介、依赖、部署、使用等模块）更规范。要求先修复 skill-forge：生成新模块时的 README 应规范化，至少包含部署与使用说明。
- **处理**：v0.3.0 新增"模块 README 模板"（简介 / 功能 / 前置依赖 / 部署 / 使用），创建与接管流程均按此生成 README；同时完善了 skill-forge 与 commit-draft 两个模块的 README。

## 2026-08-09

- **反馈**：lab 新增 meta.json 依赖机制后，用户手动创建模块还需自行编写 meta.json，违背"自动化"的设计初衷；要求 skill-forge 在创建模块时根据用户描述/实现方案自动判断是否生成。
- **处理**：v0.2.0 新增"meta.json 生成规则"（含依赖判断表、字段说明、模板），创建单模块/聚合套件、迭代、接管外部导入四条流程均自动维护 meta.json，无外部 CLI 依赖时正常不创建。
