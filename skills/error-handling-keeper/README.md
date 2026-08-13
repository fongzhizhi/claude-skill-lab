# error-handling-keeper

> 按 TS 错误处理规范修复存量代码：语义等价改动直接做（catch 变量 unknown 化、补错误日志、throw 裸值改 Error 实例、保留 cause），控制流改动只列清单。

错误处理是软件健壮性的基石，但存量代码的典型问题恰恰相反：空 `catch {}` 静默吞错、`throw` 裸字符串、异步错误无人处理、错误链丢失根因。本技能是 keeper 家族中最保守的一个——错误处理改动大多是控制流改动，**不擅自改变程序行为**：语义等价修复（补日志、throw 实例化、补 cause、catch 变量 unknown 化）直接做；控制流改动（补 try/catch、新增边界校验、catch 后中断或跳过）只输出清单与建议处理方式，由用户确认后决定是否落地。改动范围默认取 git diff 变更的 TS/TSX 文件，也可手动指定文件或目录。

## 前置依赖

| 依赖 | 说明 |
| --- | --- |
| TS 错误处理指南文档（软依赖） | `~/.claude/docs/ts-error-handling-guide.md`，缺失时提示 `lab deploy docs/ts-code-guide`，不拦截 |

## 部署

```bash
lab deploy error-handling-keeper
```

部署后：`dist/skills/error-handling-keeper/SKILL.md` → `~/.claude/skills/error-handling-keeper/SKILL.md`

## 使用

- **自动触发**：对话中出现"修复错误处理""消除静默 catch""执行错误处理规范""补充异常日志"等意图时使用。
- **手动调用**：`/error-handling-keeper`，可附参数指定范围：
  - 无参数：处理 git diff 变更的 TS/TSX 文件
  - `/error-handling-keeper 文件路径` / `/error-handling-keeper 目录路径`：处理指定范围

示例：`/error-handling-keeper src/services` → 直接修复语义等价问题（补日志、throw 实例化、catch unknown 化），同时输出控制流改动清单供你确认。
