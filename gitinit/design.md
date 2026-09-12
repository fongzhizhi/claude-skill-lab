# gitinit 设计文档

## 目标

`claude-lab deploy` / `switch` 会直接覆盖 `~/.claude` 的文件，变化难以追踪（谁覆盖了什么、何时覆盖）。`gitinit` 让 `~/.claude` 成为仅本地的 git 仓库，把文件变化纳入版本控制，随时用 `git status` / `git diff` 观察。

## 核心设计：与 switch/settings 同款模式

`claude-lab gitinit` 的语义完全对齐 `claude-lab switch`：

| 环节 | switch / settings | gitinit |
| --- | --- | --- |
| 模板源（入仓，可迭代） | `settings/profiles/*.json` | `gitinit/.gitignore.template` |
| 覆盖目标（本地生成物） | `~/.claude/settings.json` | `~/.claude/.gitignore` |
| 同步方式 | `claude-lab switch <profile>` | `claude-lab gitinit` |
| 迭代方式 | 改 profile → switch | 改模板 → gitinit |

因此 `.gitignore` **每次执行都覆盖**，不做"已存在则跳过"——用户迭代的对象是仓库模板，不是本地文件。这与最初设想（本地手工维护 .gitignore）不同，但更符合"模板入仓、命令同步"的 lab 心智，也与 settings 完全一致。

## 方案对比

| 方案 | 形态 | 评价 |
| --- | --- | --- |
| **独立目录 + 独立指令（采用）** | `gitinit/` 顶层目录（模板源）+ `claude-lab gitinit` 子命令 | 职责独立：git 追踪是 `~/.claude` 的全局上层设施，与配置切换无关；模板可单独迭代 |
| 挂进 settings 随 switch 执行 | 修改 `settings/` 模块 | 只有切配置才触发，而 deploy 同样覆盖文件——触发时机错位；把"追踪变化"塞进"切换配置"模块，职责不内聚 |
| 斜杠命令 `/gitinit` | `commands/` 模块 | 一次性 CLI 工具不是对话指令，且确定性不如脚本；用户明确否掉 |

## 设计原则

- **确定性脚本**：逻辑内聚在 `lab.js` 的 `cmdGitInit()`（单文件、零依赖 CLI），不依赖 AI 对话执行。
- **git init 幂等**：`.git` 已存在则跳过。`git init` 本身非交互且安全（已有仓库时只是 reinit 不破坏），用户口述的 `git init -y` 无此参数，直接调用 `git init` 即满足"已有就跳过"的意图。
- **模板覆盖**：`.gitignore` 每次从模板覆盖写入，不保留本地手工改动——本地 `~/.claude/.gitignore` 是生成物。
- **本地专用**：不配置远程、不 push。`settings.json` 含 API Key，但纯本地追踪不增加暴露面（能访问 `.git` 的进程必然也能直接读 `settings.json` 明文）；若未来配置远程推送，须先 `git rm --cached ~/.claude/settings.json` 再 push，避免密钥永久留在 git 历史（git 历史不可改写）。
- **最小职责**：只做 "git init + 覆盖 .gitignore + 打印基线指引"，不自动 commit（建立基线是一次性动作，打印命令由用户执行，避免脚本替用户做 git 状态变更）。

## .gitignore 模板设计

追踪范围聚焦 **lab 部署产物**（`skills/` `commands/` `rules/` `agents/` `hooks/` `workflows/` `docs/` 与根下静态文件如 `CLAUDE.md`），忽略三类：

1. **本地覆盖配置**：`settings.local.json`（Claude Code 本地覆盖、非 lab 产物）。`settings.json` 是 switch 的覆盖目标，**默认追踪**——忽略它则漏掉 switch 的核心变化
2. **动态数据**：`history/` `sessions/` `projects/` `todos/` `plans/` `telemetry/` `cache/` `shell-snapshots/` 等 Claude Code 运行期高频变化目录（照实拍本地 `~/.claude` 目录归纳，不穷举）
3. **系统文件**：`.DS_Store`、`Thumbs.db`、`*.log`

## 变更理由

- **v0.1.1**：`settings.json` 由忽略改为**默认追踪**。用户指出纯本地场景下 git 追踪不增加暴露面（能访问 `.git` 的进程必然能直接读 `settings.json` 明文），且 `switch` 覆盖 `settings.json` 正是追踪的核心目标，忽略它本末倒置；仅保留 `settings.local.json` 忽略（本地覆盖、非 lab 产物）。
- **v0.1.0**：初始设计。采纳独立目录 + `claude-lab gitinit` 子命令；模板覆盖语义对齐 switch/settings。
