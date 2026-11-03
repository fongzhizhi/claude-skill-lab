# git-flow 配置参考

`git-flow` 套件读取项目的环境链、仓库映射与 MR 默认值。配置文件放在**仓库根目录或工作区根目录**：

```text
<repo>/.claude/git-flow.json          单仓库
<workspace>/.claude/git-flow.json     多仓库工作区
```

建议用 `/git-flow-init` 自动生成草稿（扫描兄弟仓库、探测远端环境分支），确认后落盘。生成逻辑不猜测无法自动匹配的分支名；遇到 `pro-api/0.3` 这类非同构映射会停摆询问。

建议把配置提交到仓库，让团队共享同一套环境分支映射；个人差异（用户名、审核人）可放全局默认。工作区根目录不在任何仓库内时无法提交，如需共享可复制到各仓库的 `.claude/git-flow.json`。

## 查找与合并顺序

1. 环境变量 `GIT_FLOW_CONFIG` 指向的文件（临时覆盖）
2. 当前仓库根目录的 `.claude/git-flow.json`（当前目录不在仓库内时查当前目录）
3. 向上最多 3 层的 `.claude/git-flow.json`
4. 全局默认：`~/.claude/settings.json` 的 `gitFlow` 字段

第 2、3 步只采用与操作目标匹配的配置：

- 无 `--repo` 且当前目录在 Git 仓库内：配置中有 `path` 解析后等于当前仓库根目录的条目
- 无 `--repo` 且当前目录不在 Git 仓库内：直接采用第 2 步找到的配置（随后必须用 `--repo` 指定操作仓库）
- 有 `--repo <name>`：配置的 `repos` 中有该名字的条目

**路径基准目录（base）**：配置文件所在目录；若目录名为 `.claude`，取上一级。`repos.*.path` 一律相对 base 解析：

- `<repo>/.claude/git-flow.json` → base = `<repo>`，写 `"path": "."`
- `<workspace>/.claude/git-flow.json` → base = `<workspace>`，写 `"path": "pro-ui"`

同一份工作区配置由此可以在任意仓库内执行，不随当前目录变化。

全局默认与配置深度合并，配置优先；数组整体替换，`repos` 按仓库名合并。

> 全局默认建议写在 `claude-skill-lab/settings/profiles/_base.json` 的 `gitFlow` 字段中，由 `claude-lab switch` 合并进 `~/.claude/settings.json`。直接改 `~/.claude/settings.json` 会在下次 `switch` 时丢失（仅 token/api_key 会被保留）。

全局默认示例（只放个人/团队固定项，`repos` 仍放仓库/工作区配置）：

```json
{
  "gitFlow": {
    "chain": ["3.1", "3.2", "4.1", "4.2", "dev"],
    "active": ["4.1", "4.2", "dev"],
    "default_env": "dev",
    "branch_pattern": "{user}/{type}/{version}-{ticket}",
    "branch_types": { "PRO": "feat", "BUG": "fix" },
    "mr": { "remove_source_branch": false }
  }
}
```

## 完整示例（单仓库）

```json
{
  "version": 2,
  "remote": "origin",
  "chain": ["3.1", "3.2", "4.1", "4.2", "dev"],
  "active": ["4.1", "4.2", "dev"],
  "default_env": "dev",
  "user": "jiangshun",
  "branch_pattern": "{user}/{type}/{version}-{ticket}",
  "branch_types": { "PRO": "feat", "BUG": "fix" },
  "protected": ["main", "master"],
  "repos": {
    "pro-ui": {
      "path": ".",
      "envs": {
        "dev": "pro-ui/dev",
        "4.2": "pro-ui/4.2",
        "4.1": "pro-ui/4.1"
      }
    }
  },
  "mr": {
    "remove_source_branch": false,
    "draft": false,
    "reviewers": []
  }
}
```

## 多仓库示例（工作区根目录）

配置文件放在多仓库工作区根目录，`path` 写兄弟目录名（相对 base，即工作区根目录）：

```json
{
  "version": 2,
  "remote": "origin",
  "chain": ["3.1", "3.2", "4.1", "4.2", "dev"],
  "active": ["4.1", "4.2", "dev"],
  "default_env": "dev",
  "repos": {
    "pro-ui": {
      "path": "pro-ui",
      "envs": {
        "dev": "pro-ui/dev",
        "4.2": "pro-ui/4.2",
        "4.1": "pro-ui/4.1"
      }
    },
    "pro-pcb": {
      "path": "pro-pcb",
      "envs": {
        "dev": "pro-pcb/dev",
        "4.2": "pro-pcb/4.2",
        "4.1": "pro-pcb/4.1"
      }
    }
  }
}
```

- 在 `pro-ui` 或 `pro-pcb` 内执行命令都能匹配到同一份工作区配置
- `/git-flow-commit --repo pro-pcb` 可显式操作兄弟仓库，无需切换目录
- 多仓库模式下，commit / sync / merge 会先检测其他仓库的未提交改动与同名任务分支，命中即停摆提醒

## 环境分支名不同构（pro-api 类）

`envs` 是“环境名 → 完整远端分支名”的显式映射，**不要求各仓库同构**。远端分支编号与版本号不一致时直接写映射即可：

```json
{
  "version": 2,
  "remote": "origin",
  "chain": ["3.1", "3.2", "4.1", "4.2", "dev"],
  "active": ["4.1", "4.2", "dev"],
  "default_env": "dev",
  "repos": {
    "pro-ui": {
      "path": "pro-ui",
      "envs": {
        "dev": "pro-ui/dev",
        "4.2": "pro-ui/4.2",
        "4.1": "pro-ui/4.1"
      }
    },
    "pro-api": {
      "path": "pro-api",
      "envs": {
        "dev": "pro-api/0.5",
        "4.2": "pro-api/0.4",
        "4.1": "pro-api/0.3"
      }
    }
  }
}
```

- 同一环境名在不同仓库可以指向完全不同的分支名
- 允许多个环境指向同一分支（如 `4.1`、`4.2` 都映射到 `pro-api/0.3`）
- 分支名写**完整远端名**（如 `pro-api/0.3`），不是 `0.3`

## 字段说明

| 字段 | 必填 | 缺省 | 说明 |
| --- | --- | --- | --- |
| `version` | 是 | — | 配置版本，当前固定 `2`（`1` 为旧路径语义，已不兼容） |
| `remote` | 否 | `origin` | 远端名 |
| `chain` | 是 | — | 环境链，从低到高。链式提升只能沿此顺序向右 |
| `active` | 否 | 等于 `chain` | 当前在用的环境子集；命令只接受其中的环境 |
| `default_env` | 否 | `active` 最后一项 | 未指定环境时的默认值，即链式顶端（通常 `dev`） |
| `user` | 否 | 由 `user_source` 推导 | 分支名里的用户前缀 |
| `user_source` | 否 | `git config user.name` | 推导用户的命令 |
| `branch_pattern` | 否 | `{user}/{type}/{version}-{ticket}` | 必须包含四个占位符 |
| `branch_types` | 否 | `{"PRO":"feat","BUG":"fix"}` | ONES 前缀兜底映射；用户措辞/`--type` 优先 |
| `protected` | 否 | `["main","master"]` | 额外保护分支，禁止直接提交/推送 |
| `repos` | 是 | — | 仓库映射，见下 |
| `mr` | 否 | 见下 | MR 默认值 |
| `commit` | 否 | `{}` | 提交相关配置，见下 |

`repos.<name>`：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `path` | 否 | 仓库路径，相对配置 base（`.claude` 的上一级）；缺省 `.` |
| `envs` | 是 | 环境名 → 远端环境分支**完整名**（如 `pro-ui/4.1`，不是 `4.1`） |

`mr`：

| 字段 | 缺省 | 说明 |
| --- | --- | --- |
| `remove_source_branch` | `false` | 合并后是否删除任务分支；链式提升前建议保留 |
| `draft` | `false` | 是否默认创建 Draft MR |
| `reviewers` | `[]` | 默认审核人（GitLab 用户名，不带 `@`） |

`commit`：

| 字段 | 缺省 | 说明 |
| --- | --- | --- |
| `checks` | `[]` | **预留**：提交前附加检查命令（字符串数组）。v0.2 不执行，未来按项目启用 TS 检查/单测等，只需改配置 |

## 分支命名

```text
{user}/{type}/{version}-{ticket}
```

| 占位符 | 来源 | 示例 |
| --- | --- | --- |
| `{user}` | `user`，否则 `user_source` 输出，规范化小写/连字符 | `jiangshun` |
| `{type}` | `--type` > 用户措辞 > `branch_types` 前缀映射 | `fix` |
| `{version}` | 目标环境名 | `4.1` |
| `{ticket}` | ONES 单号，统一大写 | `PRO-159115` |

示例：`jiangshun/fix/4.1-PRO-159115`

## 链式模型

```text
3.1 → 3.2 → 4.1 → 4.2 → dev
```

- 任务分支从**所属环境**拉出，开发完成后只合回该环境
- `/git-flow-sync` 的方向是**环境分支 → 任务分支**（把环境最新改动合入任务分支）
- 环境之间的提升按 `chain` 顺序逐级进行（后续 `/git-flow-promote`）
- 未指定环境时取 `default_env`，即链式顶端
- `active` 用于临时停用某个环境；停用后命令拒绝该环境

## 手动 MR 入口

`/git-flow-merge` 在 glab 不可用时给出手动入口。Web 地址由远端 URL 推导：

| 远端形式 | Web 地址 |
| --- | --- |
| `git@<host>:<group>/<repo>.git` | `https://<host>/<group>/<repo>` |
| `ssh://git@<host>[:<port>]/<group>/<repo>.git` | `https://<host>/<group>/<repo>`（丢弃 SSH 端口） |
| `https://<host>/<group>/<repo>.git` | `https://<host>/<group>/<repo>`（去掉 `.git`） |

```text
<web-url>/-/merge_requests/new?merge_request[source_branch]=<source>&merge_request[target_branch]=<target>
```

分支名中的 `/` 必须编码为 `%2F`。

## 配置检查清单

1. `version` 为 `2`（从 v0.1 升级时用 `/git-flow-init` 重新生成或按新路径语义迁移）
2. `chain` 从低到高排列，`active` 是它的子集
3. `default_env` 在 `active` 中
4. 每个 `repos.*.path` 相对配置 base 正确指向仓库根目录
5. 每个 `repos.*.envs` 的键都在 `chain` 中，值是远端已存在的完整分支名
6. 不同仓库的 `envs` 可以不同构（`4.1` → `pro-api/0.3` 是合法配置）
7. `branch_pattern` 四个占位符齐全
8. 分支名符合 `git check-ref-format --branch`（不要有空格、`~^:?*[` 等）
9. 保护分支包含所有环境分支（环境分支由 `envs` 自动加入，无需重复写）
