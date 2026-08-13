# ts-code-guide

> TypeScript 规范参考文档模块（5 份指南），部署后供全局 Claude Code 按需引用。

将详细规范文档（非自动加载的长参考手册）部署到 `~/.claude/docs/`，供 `rules/`（如 ts-standards）、skills、agents 等模块按需 `@` 引用，避免长文档占用上下文。

## 内容

| 文件 | 说明 |
| --- | --- |
| `ts-comments-guide.md` | 注释规范 v1.3：标签体系（核心 8 + 扩展）、JSDoc 规范、TODO/FIXME、AI 生成标识、反模式与审查清单 |
| `ts-coding-style-guide.md` | 编码风格指南 v3.1：命名规约全量表、格式自动化兜底（ESLint/Prettier）、反模式示例 |
| `ts-types-guide.md` | 类型安全指南 v1.2：快速参考卡片、strict/收窄策略、运行时校验（Zod）、反模式示例 |
| `ts-error-handling-guide.md` | 错误处理指南 v1.0：错误分层与分类、传播与包装、日志规范、审查清单 |
| `ts-testing-guide.md` | 单元测试指南：测试奖杯策略、契约思维、Mock 分层决策、Vitest 实战技巧、断言规则、质量门禁 |

## 前置依赖

无

## 部署

```bash
lab deploy docs/ts-code-guide
# 落点：~/.claude/docs/ts-*.md（5 份指南）
```

## 使用

- AI 需要时通过 `@~/.claude/docs/ts-*.md` 主动查阅（不自动加载，省 token）
- [rules/ts-standards](../../rules/ts-standards/README.md) 的 5 条规则分别引用对应指南作为详细指南
- 后续新增规范文档：在 `dist/docs/` 下新增文件并重新部署
