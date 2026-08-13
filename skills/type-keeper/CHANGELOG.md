# CHANGELOG

## v0.1.0 (2026-08-13)

- 初始版本。按 TS 类型安全规范修复存量代码：清除 any（unknown + 收窄）、替换 @ts-ignore、消除非空断言、import type、type/interface 场景校正、泛型约束、外部数据运行时校验建议
- 改动风险三分级：编译期语义直接做、行为等价验证后做、运行时校验/tsconfig 只列清单
- 硬门禁：项目有 tsconfig 时 `tsc --noEmit` 必须全绿
- 声明软依赖 `docs/ts-code-guide`（类型安全指南文档）
