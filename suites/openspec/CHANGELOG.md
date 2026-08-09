# CHANGELOG

## v1.8.0 — 2026-08-09

**接管外部导入**：`openspec init`（`@fission-ai/openspec@1.8.0`）生成的 Claude Code 资产原样接管为聚合套件。

- 迁移成品文件至 `dist/`：
  - `dist/commands/opsx/`：6 个命令（propose / apply / update / sync / archive / explore）
  - `dist/skills/openspec-*/`：6 个技能（propose / apply-change / update-change / sync-specs / archive-change / explore）
- 新增 `manifest.json`：命令映射至 `~/.claude/commands/opsx/`，技能逐个映射至 `~/.claude/skills/openspec-*/`。
- 保留 `openspec/config.yaml` 作为项目级配置模板（不参与部署）。
- 补齐套件文档：README / design / CHANGELOG / feedback。
- 命令与技能文件内容与上游一致，未做修改。
