# style-keeper

> 按 TS 编码风格规范统一存量代码：命名规约、魔法数字提取、单文件职责，优先 ESLint/Prettier 自动兜底，改名按安全分级处理。

存量代码的风格问题往往积累已久：无意义缩写、魔法数字、命名不规范。本技能在调用时优先用项目已有的 ESLint/Prettier 自动修复（自动化 > 人工约束），工具修不了的按 `~/.claude/docs/ts-coding-style-guide.md`（详细指南）与 `~/.claude/rules/ts-coding-style.md`（强制规则）手工核对——命名调整按安全分级（局部符号直接改、导出符号核对全项目引用、公共 API 只列清单），结构拆分只出建议不动手。改动范围默认取 git diff 变更的 TS/TSX 文件，也可手动指定文件或目录。

## 前置依赖

| 依赖 | 说明 |
| --- | --- |
| TS 编码风格指南文档（软依赖） | `~/.claude/docs/ts-coding-style-guide.md`，缺失时提示 `lab deploy docs/ts-code-guide`，不拦截 |
| ESLint / Prettier（软依赖） | 目标项目已有配置时自动运行兜底；无配置时手工调整并提示落地工具，不拦截 |

## 部署

```bash
lab deploy style-keeper
```

部署后：`dist/skills/style-keeper/SKILL.md` → `~/.claude/skills/style-keeper/SKILL.md`

## 使用

- **自动触发**：对话中出现"统一/修复代码风格""执行编码风格规范""整理命名""清理魔法数字"等意图时使用。
- **手动调用**：`/style-keeper`，可附参数指定范围：
  - 无参数：处理 git diff 变更的 TS/TSX 文件
  - `/style-keeper 文件路径` / `/style-keeper 目录路径`：处理指定范围

示例：`/style-keeper src/utils` → 先跑 ESLint/Prettier 自动修复，再手工核对命名与魔法数字，输出逐文件摘要与待确认清单。
