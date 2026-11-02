# git-flow 配置参考

`git-flow` 套件读取项目的环境链、仓库映射与 MR 默认值。配置文件放在**项目仓库根目录**：

```text
<repo>/.claude/git-flow.json
```

建议提交到仓库，让团队共享同一套环境分支映射；个人差异（用户名、审核人）可放全局默认。

## 查找与合并顺序

1. 环境变量 `GIT_FLOW_CONFIG` 指向的文件（临时覆盖）
2. 当前仓库根目录 `.claude/git-flow.json`
3. 向上最多 3 层的 `.claude/git-flow.json`（多仓库工作区，需匹配当前仓库路径）
4. 全局默认：`~/.claude/settings.json` 的 `gitFlow` 字段

全局默认与仓库配置深度合并，仓库配置优先；数组整体替换，`repos` 按仓库名合并。

> 全局默认建议写在 `claude-skill-lab/settings/profiles/_base.json` 的 `gitFlow` 字段中，由 `claude-lab switch` 合并进 `~/.claude/settings.json`。直接改 `~/.claude/settings.json` 会在下次 `switch` 时丢失（仅 token/api_key 会被保留）。

全局默认示例（只放个人/团队固定项，`repos` 仍放仓库配置）：

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
  "version": 1,
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

## 多仓库示例

配置文件放在多仓库工作区根目录，每个仓库一个条目；在哪个仓库执行命令，就匹配哪个 `path`：

```json
{
  "version": 1,
  "remote": "origin",
  "chain": ["3.1", "3.2", "4.1", "4.2", "dev"],
  "active": ["4.1", "4.2", "dev"],
  "default_env": "dev",
  "repos": {
    "pro-ui": {
      "path": "../pro-ui",
      "envs": {
        "dev": "pro-ui/dev",
        "4.2": "pro-ui/4.2",
        "4.1": "pro-ui/4.1"
      }
    },
    "pro-pcb": {
      "path": "../pro-pcb",
      "envs": {
        "dev": "pro-pcb/dev",
        "4.2": "pro-pcb/4.2",
        "4.1": "pro-pcb/4.1"
      }
    }
  }
}
```

`path` 相对**当前仓库根目录**解析（`git rev-parse --show-toplevel`）；解析结果与当前仓库根目录相同的条目即为当前仓库。单仓库写 `"."`，多仓库工作区写兄弟目录（如 `"../pro-pcb"`），不受配置文件放在哪一层影响。多个条目同时匹配时取路径最长者。

## 字段说明

| 字段 | 必填 | 缺省 | 说明 |
| --- | --- | --- | --- |
| `version` | 是 | — | 配置版本，当前固定 `1` |
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
| `mr` | 否 | 见上 | MR 默认值 |

`repos.<name>`：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `path` | 否 | 仓库路径，相对当前仓库根目录；缺省 `.` |
| `envs` | 是 | 环境名 → 远端环境分支**完整名**（如 `pro-ui/4.1`，不是 `4.1`） |

`mr`：

| 字段 | 缺省 | 说明 |
| --- | --- | --- |
| `remove_source_branch` | `false` | 合并后是否删除任务分支；链式提升前建议保留 |
| `draft` | `false` | 是否默认创建 Draft MR |
| `reviewers` | `[]` | 默认审核人（GitLab 用户名，不带 `@`） |

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
- 环境之间的提升按 `chain` 顺序逐级进行（后续 `/git-flow-promote`）
- 未指定环境时取 `default_env`，即链式顶端
- `active` 用于临时停用某个环境；停用后命令拒绝该环境

## 配置检查清单

1. `chain` 从低到高排列，`active` 是它的子集
2. `default_env` 在 `active` 中
3. 每个 `repos.*.envs` 的键都在 `chain` 中，值是远端已存在的完整分支名
4. `branch_pattern` 四个占位符齐全
5. 分支名符合 `git check-ref-format --branch`（不要有空格、`~^:?*[` 等）
6. 保护分支包含所有环境分支（环境分支由 `envs` 自动加入，无需重复写）
7. 多仓库配置中 `path` 指向正确的仓库根目录
