# CHANGELOG

## v0.1.0 (2026-08-13)

- 初始版本。按 TS 错误处理规范修复存量代码：语义等价改动直接做（catch 变量 unknown 化、静默 catch 补日志、throw 裸值改 Error 实例并核对调用方、补 cause、console.log → console.error）
- 控制流改动只列清单：补 try/catch、新增边界校验、循环内 catch 后中断/跳过、错误分层、日志体系建议
- 最保守设计：任何改变程序行为的改动都不直接做
- 声明软依赖 `docs/ts-code-guide`（错误处理指南文档）
