# format-keeper

> 按项目已有工具统一代码格式：默认只处理 git 变更文件，可独立运行，也可内嵌到 git-flow 提交流水线。

`format-keeper` 解决“提交前统一格式”这一步：它不替项目决定用什么工具，只检测项目已有的 Prettier / ESLint / Biome / 语言 formatter，并**只对目标文件**执行。仓库级格式化、创建配置、自动安装依赖都不在范围内；没有可用工具时报告跳过，不阻塞流程。

## 功能

| 能力 | 说明 |
| --- | --- |
| 默认范围 | git 变更文件（暂存 + 未暂存 + 未跟踪），开箱即用 |
| 指定目标 | 文件 / 目录 / `--staged` / `--check` |
| 项目驱动 | 按 package 脚本、配置文件、语言项目文件自动选择工具 |
| 安全边界 | 只格式化目标文件；不仓库级、不创建配置、不安装依赖、不改语义 |
| 可内嵌 | 输出 `formatted / no_changes / skipped / failed` 状态，供 `/git-flow-commit` 判断停或继续 |
| 与 keeper 分工 | 纯格式化；命名/魔法数字/结构交给 `style-keeper`，乱码交给 `mojibake-fixer` |

## 前置依赖

无强制外部 CLI 依赖。运行时使用目标项目已有的格式化工具：

- JS/TS：Prettier、ESLint、Biome（项目内安装即可）
- 其他语言：rustfmt、gofmt、clang-format、ruff/black、shfmt 等（按项目存在情况）
- 无可用工具时报告跳过，不自动安装、不创建配置

因此不生成 `meta.json`：工具随目标项目变化，不适合声明为全局前置依赖。

## 部署

```bash
lab deploy format-keeper
```

部署后：`dist/skills/format-keeper/SKILL.md` → `~/.claude/skills/format-keeper/SKILL.md`

## 使用

- **自动触发**：对话中出现“格式化代码”“统一格式”“跑一下 prettier/eslint --fix”等意图时使用。
- **手动调用**：`/format-keeper`，可附参数：

```text
/format-keeper                     # 格式化本次 git 变更文件
/format-keeper src/utils           # 格式化指定目录
/format-keeper src/app.ts          # 格式化指定文件
/format-keeper --staged            # 只格式化已暂存文件
/format-keeper --check             # 只检查不写入
```

输出摘要包含：工具、目标文件数、已格式化/无变化/跳过/失败、变更文件清单、失败原因。

## 内嵌到提交流水线

`/git-flow-commit` 按以下顺序调用本技能（技能内提供可引用的规则片段）：

```text
git add . → format-keeper → mojibake-fixer → git add . → commit-draft → git commit → git push
```

- `formatted` / `no_changes` / `skipped` → 继续
- `failed` → 停摆，先解决格式化错误再提交

## 与其他模块的关系

- [style-keeper](../style-keeper/README.md)：TS 风格治理（命名、魔法数字、结构）；本技能只做纯格式化，两者边界清晰
- [mojibake-fixer](../../commands/mojibake-fixer/README.md)：乱码扫描与修复；本技能不处理乱码
- [commit-draft](../../commands/commit-draft/README.md)：生成 commit message；本技能不提交
