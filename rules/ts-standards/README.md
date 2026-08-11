# ts-standards

> TypeScript 主流必备规范集合：注释、编码风格、类型安全、错误处理、测试，一次部署生效。

为全局 Claude Code 提供一套精简的 TS 项目约束（5 条路径作用域规则），覆盖日常开发最常出问题的五个维度。规则只写"必须做什么"，详细指南放在独立参考文档中按需引用，不占上下文。

## 规则清单

| 规则文件 | 作用域 | 约束内容 |
| --- | --- | --- |
| `ts-comments.md` | `**/*.ts, **/*.tsx` | 注释标签体系、JSDoc、编译器指令管控（详见 `~/.claude/docs/TypeScript 代码注释规范指南.md`） |
| `ts-coding-style.md` | `**/*.ts, **/*.tsx` | 命名约定、格式统一、文件组织 |
| `ts-types.md` | `**/*.ts, **/*.tsx` | strict、禁 any、类型隔离 |
| `ts-error-handling.md` | `**/*.ts, **/*.tsx` | 异步错误、异常语义、边界校验 |
| `ts-testing.md` | `**/*.test.ts, **/*.spec.ts` | AAA 结构、行为命名、关键路径覆盖 |

## 前置依赖

| 依赖 | 说明 |
| --- | --- |
| 无外部 CLI | 纯文本规则，无需安装 |
| TS 注释规范指南文档（软依赖） | `ts-comments` 规则引用 `~/.claude/docs/TypeScript 代码注释规范指南.md`，缺失时部署仅提示不拦截 |

## 部署

```bash
lab deploy ts-standards
# 落点：~/.claude/rules/ts-*.md（5 个规则文件）

# 若提示缺少注释指南文档：
lab deploy docs/ts-code-guide
```

## 使用

规则按 `paths` 自动生效：处理 `**/*.ts` / `**/*.tsx`（测试规则为 `.test.ts` / `.spec.ts`）文件时自动加载，其他文件不占用上下文。需查看详细指南时 AI 会主动引用 `@~/.claude/docs/TypeScript 代码注释规范指南.md`。
