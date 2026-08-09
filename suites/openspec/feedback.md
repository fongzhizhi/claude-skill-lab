# feedback

## 基线（v1.8.0，2026-08-09）

- 来源：`npm install -g @fission-ai/openspec@latest`（1.8.0）后执行 `openspec init` 生成。
- 状态：成品文件原样接管，未做任何内容修改；仅重组目录为 lab 规范结构并新增 manifest 与文档。
- 校验：命令 frontmatter 均含 `allowed-tools: Bash(openspec:*)`，依赖全局 openspec CLI；部署前请确认 `openspec --version` 可用。

## 迭代建议（待验证）

- [ ] 部署后实测 `/opsx:propose` 全流程（propose → apply → sync → archive）是否与上游一致。
- [ ] 在多仓库场景验证 store 机制（`openspec store list`）下的命令行为。
- [ ] 上游 openspec 发版后，对照官方 `openspec init` 输出 diff，决定是否同步升级。
