# format-keeper

> 提交前统一格式化：先暂存全部改动，再优先执行项目 `prettier:auto`，没有则用 `lc-build prettier`，失败才回退到 `package.json` 的暂存区脚本。

`format-keeper` 解决“提交前统一格式”这一步。它优先适配内部开发环境的工作流：不再按 Prettier / ESLint / Biome 配置文件自行选型，而是**项目有 `prettier:auto` 就直接跑，没有就用 `lc-build prettier` 处理本次全部 `git diff` 文件，两者都报错才分析 `package.json` 里作用于当前暂存区的脚本**。没有可用命令时报告跳过，不阻塞提交流程。

## 功能

| 能力 | 说明 |
| --- | --- |
| 统一范围 | 先 `git add -A`，再格式化 `git diff HEAD` 的全部变更文件（排除删除），不区分暂存/未暂存/未跟踪 |
| 内部工作流优先 | `npm run prettier:auto` → `lc-build prettier -- --write` |
| 失败才回退 | 主命令报错后，只接受 `package.json` 中作用于当前暂存区的脚本（`lint-staged`、`*:staged`、`git diff --cached`） |
| 安全边界 | 冲突文件、未跟踪敏感文件暂停；不创建配置、不安装依赖、不改语义 |
| 可内嵌 | 输出 `formatted / no_changes / skipped / failed` 状态，供 `/gitflow:commit` 判断停或继续 |
| 与 keeper 分工 | 纯格式化；命名/魔法数字/结构交给 `style-keeper`，乱码交给 `mojibake-fixer` |

## 前置依赖

| 依赖 | 说明 |
| --- | --- |
| Node.js / npm | 读取 `package.json`、执行 `prettier:auto`；`meta.json` 中为必需依赖 |
| `lc-build`（内部 CLI） | 没有 `prettier:auto` 时执行 `lc-build prettier`；`meta.json` 中标记为可选，缺失时走回退或跳过 |

目标项目侧的 `prettier:auto` 脚本与 `lc-build` 环境由项目/开发机提供，本技能不自动安装。

## 部署

```bash
claude-lab deploy format-keeper
```

部署后：`dist/skills/format-keeper/SKILL.md` → `~/.claude/skills/format-keeper/SKILL.md`

## 使用

- **自动触发**：对话中出现“格式化代码”“统一格式”“提交前跑一下格式化”等意图时使用。
- **手动调用**：`/format-keeper`。

```text
/format-keeper
```

执行顺序：

```text
git add -A
→ package.json 有 prettier:auto ? npm run prettier:auto
                              : git diff HEAD --name-only --diff-filter=d | xargs lc-build prettier -- --write
→ git add -A
→ 命令报错时才分析 package.json 的暂存区脚本；没有则 skipped
```

执行后会把工作区所有变更加入暂存区并格式化。输出摘要包含：状态、来源（`prettier:auto` / `lc-build` / package 脚本）、目标文件数、主命令错误、回退结果。

> 本技能会改写暂存区；如果只想检查而不暂存/写入，当前版本不提供 `--check`，请手动执行只读命令或先备份改动。

## 内嵌到提交流水线

`/gitflow:commit` 按以下顺序调用本技能（技能内提供可引用的规则片段）：

```text
git add . → format-keeper → mojibake-fixer → git add . → commit-draft → git commit → git push
```

- `format-keeper` 内部也会执行 `git add -A`，调用方的暂存步骤可以保留，重复执行无副作用
- `formatted` / `no_changes` / `skipped` → 继续
- `failed` → 停摆，先解决格式化错误再提交

## 与其他模块的关系

- [style-keeper](../style-keeper/README.md)：TS 风格治理（命名、魔法数字、结构）；本技能只做纯格式化
- [mojibake-fixer](../../commands/mojibake-fixer/README.md)：乱码扫描与修复；本技能不处理乱码
- [commit-draft](../../commands/commit-draft/README.md)：生成 commit message；本技能不提交
