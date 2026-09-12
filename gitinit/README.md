# gitinit

> `~/.claude` 本地 git 追踪的初始化配置模块：`claude-lab gitinit` 把仓库中的 `.gitignore.template` 覆盖到 `~/.claude/.gitignore`（与 `switch` 覆盖 `settings.json` 同款语义）。

`claude-lab deploy` / `switch` 会直接覆盖 `~/.claude` 的文件，变化难以追踪。本模块提供 `claude-lab gitinit` 命令：在 `~/.claude` 建本地 git 仓库（仅本地、不推送远程），并用仓库模板生成 `.gitignore`，之后 `git status` / `git diff` 即可实时观察每次覆盖。

## 功能

| 能力 | 说明 |
| --- | --- |
| 幂等 git init | 已存在 `.git` 仓库时自动跳过 |
| 模板覆盖 | 每次执行都把 `gitinit/.gitignore.template` 覆盖到 `~/.claude/.gitignore`，与 switch 覆盖 settings.json 行为一致 |
| 安全忽略 | 模板忽略含 API Key 的 `settings.json` 与会话/历史/缓存等动态目录，追踪范围聚焦 lab 部署产物 |

## 前置依赖

- **git**：`git init` 依赖，需已安装（https://git-scm.com/downloads）

## 部署

本模块不入 `lab deploy` 体系（与 `settings/` 同属特殊配置模块）：`claude-lab` 全局命令经 npm link 指向仓库源码，`gitinit/` 模板改后即时生效，无需部署。

## 使用

```bash
claude-lab gitinit
```

执行后：git init（已存在则跳过）+ 覆盖生成 `~/.claude/.gitignore`。

**迭代方式**：修改 `gitinit/.gitignore.template`（如新增忽略规则）→ 重新执行 `claude-lab gitinit` 同步到本地。

首次初始化后建立追踪基线（一次性）：

```bash
cd ~/.claude && git add -A && git commit -m "chore: 初始化 ~/.claude 本地 git 追踪"
```

后续追踪：

```bash
cd ~/.claude && git status   # 查看 deploy/switch 后的变化
cd ~/.claude && git diff     # 查看具体改动
```
