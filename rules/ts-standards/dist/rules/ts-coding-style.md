---
description: TypeScript 编码风格与命名约定
paths: "**/*.ts, **/*.tsx"
---

# TS 编码风格

## 强制要求

1. 代码格式由 ESLint + Prettier 统一：项目已有配置时严格遵循项目配置；配置缺失时按本规则执行
2. 命名：变量/函数/参数 `camelCase`；类/接口/类型别名/枚举 `PascalCase`；常量 `UPPER_SNAKE_CASE`；组件（.tsx）`PascalCase`
3. 布尔变量使用 `is` / `has` / `should` / `can` 前缀（如 `isValid`、`hasError`）
4. 文件名使用 `kebab-case`（如 `user-service.ts`、`login-form.tsx`）
5. 禁止魔法数字/字符串：业务含义的字面量必须提取为命名常量
6. 单文件单一职责：超过约 300 行或职责混杂时拆分

## 禁止行为

- 无意义缩写（`usr`、`btn`），除非行业通用（`id`、`url`、`http`）
- 单字母变量名（循环计数器 `i` 除外）
- 冗余前缀/后缀（`userService` 内的 `userData`、`Data` 后缀堆叠）
