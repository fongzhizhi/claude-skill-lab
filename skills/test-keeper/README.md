# test-keeper

> 按 TS 测试规范补充与修复单元测试：判定当前业务模块，无测试时启动 openspec-propose 编写方案，有测试时审查质量（注水、漏洞、覆盖率、断言质量），问题多走方案、问题少直接优化。

存量代码的单元测试往往缺失或注水：要么一个测试文件都没有，要么测试从未红过、只测恰好路径。本技能调用时先按 git diff 判定当前业务模块，再分两条路径处理——**无测试** → 自动启动 `openspec-propose` 编写测试方案供用户预览执行；**有测试** → 对照 `~/.claude/docs/ts-testing-guide.md`（详细指南）与 `~/.claude/rules/ts-testing.md`（强制规则）逐项审查质量，问题多时输出报告并建议方案、问题少时直接优化。

## 功能 / 内容

- **范围判定**：默认 git diff 归并业务模块（`src/` 等源码根下首层目录），无法判定 / 多模块时由用户指定文件、目录或模块
- **分支一 · 无测试**：自动启动 `openspec-propose`，参考测试规范编写测试方案，等待用户预览执行
- **分支二 · 有测试**：按质量门禁审查——红线问题一票否决（注水、Mock 被测模块自身、大型组件快照、异步漏 await），常规问题逐项核对（断言测实现、表驱动缺失、时间/熵值未锁定、Mock 分层错误、命名、共享状态、覆盖率、AAA）
- **分级处理**：问题多 → 报告 + 建议 `/opsx:propose` 方案（拒绝则仅报告不动手）；问题少 → 直接优化并总结结论

## 前置依赖

| 依赖 | 说明 |
| --- | --- |
| TS 测试规范指南文档（软依赖） | `~/.claude/docs/ts-testing-guide.md`，缺失时提示 `lab deploy docs/ts-code-guide`，不拦截 |
| openspec CLI（软依赖） | 仅"无测试 / 问题多需方案"分支使用；缺失时降级为提示用户三选一，不拦截部署 |

## 部署

```bash
lab deploy test-keeper
```

部署后：`dist/skills/test-keeper/SKILL.md` → `~/.claude/skills/test-keeper/SKILL.md`

## 使用

- **自动触发**：对话中出现"补充/修复/审查单元测试""执行测试规范""清理注水测试""分析测试质量"等意图时使用。
- **手动调用**：`/test-keeper`，可附参数指定范围：
  - 无参数：按 git diff 判定当前业务模块
  - `/test-keeper 文件路径` / `/test-keeper 目录路径` / `/test-keeper 模块名`：处理指定范围

示例：`/test-keeper src/modules/order` → 审查该模块测试质量，无测试则启动 openspec-propose 编写方案，有问题则输出报告或直接优化。
