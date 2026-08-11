---
description: TypeScript 注释与 JSDoc 规范——统一标签体系、公共 API 文档化、编译器指令管控
paths: "**/*.ts, **/*.tsx"
---

# TS 注释规范

## 强制要求

1. 公共 API（对外暴露的类、函数、接口）必须写 JSDoc：`@param` / `@returns` / `@throws` 逐一说明；类型完全自解释且无副作用时可豁免，仅保留顶部一句话业务意图
2. 注释统一 `标签: 内容` 格式，核心 8 标签：`NOTE:` `WARN:` `TODO:` `FIXME:` `WORKAROUND:` `SECURITY:` `BUSINESS:` `DESIGN:`（全大写 + 冒号 + 空格）
3. TODO/FIXME 必须带负责人：`// TODO(@name): 描述`，推荐关联 Issue：`// TODO(@name): 描述 (关联 #123)`
4. 编译器指令：`@ts-expect-error` 必须附加 `FIXME` 说明原因；**禁止** `@ts-ignore` / `@ts-nocheck`
5. 文件头注释硬性触发条件（满足任一必须添加）：文件含 export 公共 API、含 main 入口或顶级 async 调用、超过 500 行
6. 函数内主要步骤用 `// # 步骤名`；类内方法分组用对称分隔符 `// ============ 分组名 ============`
7. AI 生成的完整模块/文件在文件头 JSDoc 标注 `@ai-generated <模型版本>`（人工审查后追加 `@ai-reviewed <审查人> <日期>`）

## 禁止行为

- 废话注释（重复代码语义）、过时注释（与代码行为不符，需更新或删除）
- 过度装饰：emoji、箭头分隔符（`======>`）、混合格式（`! 重要提示`、`[安全]`）
- 情绪化注释；用注释保留历史代码（用 git 查询）
- `TEST_*` 注释标签（测试逻辑写入真实 `.test.ts` 文件）

## 参考文档

详细指南（标签大全、JSDoc 格式、反模式示例、审查清单）请查阅：`~/.claude/docs/ts-comments-guide.md`
