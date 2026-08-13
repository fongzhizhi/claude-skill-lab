# type-keeper

> 按 TS 类型安全规范修复存量代码：清除 any、替换 @ts-ignore、消除非空断言、外部数据运行时校验，tsc --noEmit 全绿为交付门禁。

存量代码的类型安全漏洞往往以"绕过"形态存在：`any` 随手用、`@ts-ignore` 频繁出现、非空断言泛滥——编译器抓不到 bug，开发者习惯了绕过。本技能调用时对照 `~/.claude/docs/ts-types-guide.md`（详细指南）与 `~/.claude/rules/ts-types.md`（强制规则）逐文件扫描，改动按风险分级：编译期语义（import type、@ts-ignore 替换、泛型约束）直接做；`any → unknown` 收窄需行为等价验证后做；新增运行时校验（Zod）只出方案由用户决策。所有改动以 `tsc --noEmit` 全绿为交付门禁。改动范围默认取 git diff 变更的 TS/TSX 文件，也可手动指定文件或目录。

## 前置依赖

| 依赖 | 说明 |
| --- | --- |
| TS 类型安全指南文档（软依赖） | `~/.claude/docs/ts-types-guide.md`，缺失时提示 `lab deploy docs/ts-code-guide`，不拦截 |

## 部署

```bash
lab deploy type-keeper
```

部署后：`dist/skills/type-keeper/SKILL.md` → `~/.claude/skills/type-keeper/SKILL.md`

## 使用

- **自动触发**：对话中出现"修复类型安全""清理 any""执行类型规范""消除 @ts-ignore"等意图时使用。
- **手动调用**：`/type-keeper`，可附参数指定范围：
  - 无参数：处理 git diff 变更的 TS/TSX 文件
  - `/type-keeper 文件路径` / `/type-keeper 目录路径`：处理指定范围

示例：`/type-keeper src/api` → 清除 any、替换 @ts-ignore、收窄非空断言，跑 tsc 全绿后输出逐文件摘要与待确认清单。
