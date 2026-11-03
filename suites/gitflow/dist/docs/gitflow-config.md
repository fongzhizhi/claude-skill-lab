# gitflow 配置参考

gitflow 只有一份配置：

```text
~/.claude/gitflow.json
```

不创建项目/工作区 `.claude/gitflow.json`，不读取 `settings.json#gitflow`，不支持环境变量覆盖，也没有多文件优先级。所有命令读取同一份全局配置。

## 生成与更新

配置由 `/gitflow:init` 创建或增量更新：

```text
/gitflow:init --envs 3.1,3.2,4.1,4.2,dev     # 只处理当前仓库
/gitflow:init --all --envs 3.1,3.2,4.1,4.2,dev  # 扫描父目录下全部兄弟仓库
/gitflow:init                                # 已有配置时沿用 chain，只更新当前仓库
/gitflow:init --all --dry-run                # 只预览，不写文件
```

- 默认只扫描当前仓库，不遍历父目录
- `--all` 扫描当前仓库根目录的父目录下所有直接子仓库
- 文件不存在 → 创建；已存在 → 只更新本次涉及的仓库条目，保留其他仓库条目与手工字段
- 落盘前展示草稿与变更摘要，确认后写入
- 无法自动匹配的远端分支停摆询问，不猜测

`claude-lab deploy gitflow` 只部署命令、技能与本文档，**不创建也不更新** `~/.claude/gitflow.json`；配置文件只由 `/gitflow:init` 维护。

## 路径基准

`repos.*.path` 相对**工作区目录**解析：

- 当前目录在 Git 仓库内：工作区目录 = 当前仓库根目录的上一级
- 当前目录不在仓库内（仅 `--repo` 场景可能）：工作区目录 = 当前目录

`path` 缺省为仓库键名，即 `<workspace>/<repo-name>`。标准兄弟布局可以省略 `path`：

```json
{
  "repos": {
    "pro-ui": { "envs": { "dev": "pro-ui/dev" } },
    "pro-pcb": { "path": "pro-pcb", "envs": { "dev": "pro-pcb/dev" } }
  }
}
```

同一份配置适用于任意具有相同兄弟目录布局的本地工作区。某个克隆的目录名不同时，在该克隆运行 `/gitflow:init` 会新增/更新对应目录名的条目，已有条目不受影响。

## 完整示例

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

`repos` 中可以同时包含多个本地工作区的仓库。命令只操作当前工作区存在的仓库；配置中存在但当前工作区没有的条目会被跳过，不会导致停摆。

## 字段说明

| 字段 | 必填 | 缺省 | 说明 |
| --- | --- | --- | --- |
| `version` | 是 | — | 配置版本，当前固定 `2` |
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
| `path` | 否 | 仓库路径，相对工作区目录；缺省为仓库键名 |
| `envs` | 是 | 环境名 → 远端环境分支**完整名**（如 `pro-ui/4.1`，不是 `4.1`） |

`envs` 是“环境名 → 完整远端分支名”的显式映射，**不要求各仓库同构**。远端分支编号与版本号不一致时直接写映射：

```json
{
  "repos": {
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

`mr`：

| 字段 | 缺省 | 说明 |
| --- | --- | --- |
| `remove_source_branch` | `false` | 合并后是否删除任务分支；链式提升前建议保留 |
| `draft` | `false` | 是否默认创建 Draft MR |
| `reviewers` | `[]` | 默认审核人（GitLab 用户名，不带 `@`） |

`commit`：

| 字段 | 缺省 | 说明 |
| --- | --- | --- |
| `checks` | `[]` | **预留**：提交前附加检查命令（字符串数组）。v0.4 不执行，未来按项目启用 TS 检查/单测等，只需改配置 |

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
- `/gitflow:sync` 的方向是**环境分支 → 任务分支**（把环境最新改动合入任务分支）
- 环境之间的提升按 `chain` 顺序逐级进行（后续 `/gitflow:promote`）
- 未指定环境时取 `default_env`，即链式顶端
- `active` 用于临时停用某个环境；停用后命令拒绝该环境

## 手工编辑

可以直接编辑 `~/.claude/gitflow.json`，但必须保持 `version` 为 `2`、字段结构合法。下次运行 `/gitflow:init` 时：

- 本次扫描到的仓库条目会被更新
- 未扫描的仓库条目与未知顶层字段原样保留
- 已失效的环境键可能被移除；摘要中会列出

## 配置检查清单

1. `version` 为 `2`
2. `chain` 从低到高排列，`active` 是它的子集
3. `default_env` 在 `active` 中
4. 每个 `repos.*.path` 相对工作区目录指向仓库根目录；标准兄弟布局可省略
5. 每个 `repos.*.envs` 的键都在 `chain` 中，值是远端已存在的完整分支名
6. 不同仓库的 `envs` 可以不同构（`4.1` → `pro-api/0.3` 是合法配置）
7. `branch_pattern` 四个占位符齐全
8. 分支名符合 `git check-ref-format --branch`（不要有空格、`~^:?*[` 等）
9. 保护分支包含所有环境分支（环境分支由 `envs` 自动加入，无需重复写）
10. 全局只有 `~/.claude/gitflow.json` 一份配置；不创建项目/工作区配置
11. 配置可以包含其他本地工作区的仓库；当前工作区缺失的条目会被跳过
