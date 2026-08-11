# design —— ts-code-guide

## 定位

`docs/` 类型的第一个模块。遵循 Claude Code 官方推荐的文档分层策略：**导航放 CLAUDE.md、约束放 rules/、长手册放 docs/（不自动加载，按需引用）**。

## 设计决策

1. **docs 作为独立模块类型**：新增 `docs` 类型（lab.js `TYPES` + manifest.json `types` 映射），`dist/docs/` 镜像 `~/.claude/docs/`。文档可被任意模块（rules/skills/agents）引用，故独立成模块而非绑定在某个规则模块内。
2. **全局部署**：部署到 `~/.claude/docs/`（用户级），所有项目的 Claude Code 均可引用，与 lab 的"全局生产环境"哲学一致。
3. **不自动加载**：长文档只在被 `@` 引用时读取，不占用每会话上下文。
4. **文件名保留中文原名**：与既有文档心智一致；中文路径在现代文件系统与 Claude Code 中无兼容问题。
5. **依赖协调**：引用方模块通过 `meta.json` 软依赖（`required: false`）提示 docs 未部署，不拦截部署；`lab deploy --all` 一键全部署。

## 版本历史

- v0.1.0：初始导入（TypeScript 代码注释规范指南 v1.3）
