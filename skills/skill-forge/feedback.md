# Feedback

（此文件用于记录用户反馈及处理情况）

## 2026-08-10

- **反馈**：skill-forge 与 commit-draft 的 README 偏简单；openspec 的 README（简介、依赖、部署、使用等模块）更规范。要求先修复 skill-forge：生成新模块时的 README 应规范化，至少包含部署与使用说明。
- **处理**：v0.3.0 新增"模块 README 模板"（简介 / 功能 / 前置依赖 / 部署 / 使用），创建与接管流程均按此生成 README；同时完善了 skill-forge 与 commit-draft 两个模块的 README。

## 2026-08-09

- **反馈**：lab 新增 meta.json 依赖机制后，用户手动创建模块还需自行编写 meta.json，违背"自动化"的设计初衷；要求 skill-forge 在创建模块时根据用户描述/实现方案自动判断是否生成。
- **处理**：v0.2.0 新增"meta.json 生成规则"（含依赖判断表、字段说明、模板），创建单模块/聚合套件、迭代、接管外部导入四条流程均自动维护 meta.json，无外部 CLI 依赖时正常不创建。
