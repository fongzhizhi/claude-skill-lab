# CHANGELOG —— skill-forge 变更历史

<!-- 记录 skills/skill-forge/ 的每次变更。 -->

## v0.4.0（2026-08-10）

- 统一单模块 `dist/` 为"`~/.claude/` 的相对路径镜像"：`dist/commands/commit-draft.md` → `~/.claude/commands/commit-draft.md`，`dist/skills/<name>/SKILL.md` → `~/.claude/skills/<name>/SKILL.md`（skills 部署目标为整目录，镜像中多一层），与套件"dist/ 即部署位置"的认知模型对齐。
- 底层 `lab deploy/status/remove` 统一为全量镜像复制/核对/删除：`dist/` 下所有文件（含 references/ 等辅助文件）均复制，单模块无需声明即可附带额外资源。
- 更新单模块成品文件命名表与模板示例（Skill / Command）为 `~/.claude/` 镜像结构。

## v0.3.0（2026-08-10）

- 新增"模块 README 模板"：创建/接管模块时 README 遵循统一规范（简介、功能、前置依赖、部署、使用），对齐 openspec 等成熟模块的文档结构，保证新模块开箱即可读。
- 创建单模块与聚合套件流程均接入 README 模板规范。
- 完善 skill-forge 自身 README：新增功能表、前置依赖、部署与使用说明。

## v0.2.0（2026-08-09）

- 新增 `meta.json` 自动生成：创建/迭代/接管模块时，按"meta.json 生成规则"自动判断并声明外部 CLI 前置依赖（`name`/`check`/`install`/`required`），无依赖时不创建。
- 工作流程接入：创建单模块/聚合套件均新增"按需生成 meta.json"步骤；迭代时同步维护依赖声明；接管外部导入时核对或生成 `meta.json`。
- 新增示例对话：依赖 openspec CLI 的套件生成 `meta.json`；纯文本逻辑的模块明确不生成。

## v0.1.0（2026-08-09）

- 初始版本：通过自然语言对话创建单模块（skills/agents/commands/rules/hooks/workflows）与聚合套件（suites/），自动生成目录、文档及 `dist/` 成品文件。
- 迭代维护：修改成品文件时同步更新 design/CHANGELOG/feedback。
- 接管外部导入：补全缺失文档，为套件生成 `manifest.json`。
