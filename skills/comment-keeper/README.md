# comment-keeper

> 按 TS 注释规范指南统一调整代码注释：核对、增删改注释，补录错误和不合适的注释，必要时调整代码结构使其自解释。

存量代码的注释往往不符合已落地的 TS 注释规范（标签体系、JSDoc、层次标记等）。本技能在调用时按 `~/.claude/docs/ts-comments-guide.md`（详细指南）与 `~/.claude/rules/ts-comments.md`（强制规则）逐项核对目标代码，统一注释风格。改动范围默认取 git diff 变更的 TS/TSX 文件，也可手动指定函数、文件或目录。

## 前置依赖

| 依赖 | 说明 |
| --- | --- |
| TS 注释规范指南文档（软依赖） | `~/.claude/docs/ts-comments-guide.md`，缺失时提示 `lab deploy docs/ts-code-guide`，不拦截 |

## 部署

```bash
lab deploy comment-keeper
```

部署后：`dist/skills/comment-keeper/SKILL.md` → `~/.claude/skills/comment-keeper/SKILL.md`

## 使用

- **自动触发**：对话中出现"整理/统一/修复代码注释""执行注释规范""清理过期注释"等意图时使用。
- **手动调用**：`/comment-keeper`，可附参数指定范围：
  - 无参数：处理 git diff 变更的 TS/TSX 文件
  - `/comment-keeper 函数名`：只处理该函数及其上下文
  - `/comment-keeper 文件路径` / `/comment-keeper 目录路径`：处理指定范围

示例：`/comment-keeper src/utils/format.ts` → 按规范调整该文件注释，输出逐文件修改摘要。