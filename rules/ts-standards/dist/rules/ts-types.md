---
description: TypeScript 类型安全约束——strict、禁 any、类型隔离
paths: "**/*.ts, **/*.tsx"
---

# TS 类型安全

## 强制要求

1. tsconfig 必须开启 `strict` 模式（及 `noImplicitAny`）
2. 禁止显式 `any`：需要动态类型时使用 `unknown` 并在使用前收窄（`typeof` / 类型守卫 / 判别联合）
3. 仅作类型引用时使用 `import type` 导入（如 `import type { User } from "./user"`）
4. 联合类型/交叉类型/映射类型用 `type` 别名；对象结构契约（可被实现/扩展）用 `interface`
5. 禁止滥用非空断言 `!`：先通过收窄或运行时校验消除 `undefined` / `null` 可能
6. 泛型使用 `extends` 约束；禁止 `any` 作为泛型默认值

## 禁止行为

- `@ts-ignore` 掩盖类型问题（用 `@ts-expect-error` + FIXME 说明，见 ts-comments 规则）
- `any` 传播：`any` 返回值不得继续传入其他函数/组件
- 双重断言 `as unknown as X`（确有必要时须附注释说明原因）
- 用 `any` 冒充"快速开发"（类型问题应在源头解决）

## 参考文档

详细指南（快速参考卡片、类型收窄策略、运行时校验、反模式示例）请查阅：`~/.claude/docs/ts-types-guide.md`
