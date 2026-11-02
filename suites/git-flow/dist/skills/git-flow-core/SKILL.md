---
name: git-flow-core
description: git-flow 套件的共享规则：配置读取、环境链解析、工作区前置检查、ONES 工单解析、分支命名与 Git 安全边界。执行 /git-flow-start、/git-flow-sync、/git-flow-commit、/git-flow-merge 前必须先读取本技能；单个命令只描述自身流程，通用规则以本文件为准。
version: 0.1.0
---
# git-flow-core

git-flow 套件的**单一规则来源**。四个命令执行前先读取本文件并遵循；命令文档只写该命令独有的步骤。

## 1. 配置

### 1.1 查找顺序

1. 环境变量 `GIT_FLOW_CONFIG` 指向的绝对路径（临时覆盖，优先级最高）
2. 当前仓库根目录的 `.claude/git-flow.json`
3. 从仓库根目录向上最多 3 层，查找 `<dir>/.claude/git-flow.json`；仅当其 `repos` 中存在 `path` 解析后等于当前仓库根目录的条目时采用（多仓库工作区）
4. 全局默认：`~/.claude/settings.json` 的 `gitFlow` 字段（由 `settings/profiles/_base.json` 维护，`claude-lab switch` 会保留）

**合并规则**：全局 `gitFlow` 提供默认值，仓库配置覆盖；对象深度合并，数组整体替换。`repos` 按仓库名合并。

找不到任何配置，或配置无法匹配当前仓库 → **停摆**，输出：

```text
未找到可用的 git-flow 配置。
请在仓库根目录创建 .claude/git-flow.json（模板见 ~/.claude/docs/git-flow-config.md），
或设置 GIT_FLOW_CONFIG 指向配置文件。
```

### 1.2 关键字段

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `version` | 是 | 配置版本，当前为 `1` |
| `chain` | 是 | 环境链，从低到高排列，如 `["3.1","3.2","4.1","4.2","dev"]` |
| `active` | 否 | 当前在用的环境子集；缺省等于 `chain`。命令只接受 `active` 中的环境 |
| `default_env` | 否 | 未指定环境时的默认值；缺省取 `active`（或 `chain`）的最后一个，即链式顶端 |
| `remote` | 否 | 远端名，缺省 `origin` |
| `user` | 否 | 分支名前缀用户；缺省从 `user_source` 推导 |
| `user_source` | 否 | 推导用户的命令，缺省 `git config user.name` |
| `branch_pattern` | 否 | 缺省 `{user}/{type}/{version}-{ticket}` |
| `branch_types` | 否 | ONES 前缀 → 分支类型映射，缺省 `{"PRO":"feat","BUG":"fix"}` |
| `protected` | 否 | 额外保护分支名（完整名或短名），与所有环境分支一起禁止直接提交 |
| `repos` | 是 | 仓库映射，见下 |
| `mr` | 否 | MR 默认值：`remove_source_branch`（缺省 `false`）、`reviewers`、`draft` |

`repos` 每个条目：

```json
{
  "pro-ui": {
    "path": ".",
    "envs": {
      "dev": "pro-ui/dev",
      "4.2": "pro-ui/4.2",
      "4.1": "pro-ui/4.1"
    }
  }
}
```

- `path`：仓库路径，相对**当前仓库根目录**（`git rev-parse --show-toplevel`）解析；缺省 `"."`。解析结果等于当前仓库根目录的条目即为当前仓库。这样单仓库写 `"."`，多仓库工作区写兄弟目录（如 `"../pro-pcb"`），不受配置文件放在哪一层影响。
- `envs`：环境名 → **远端环境分支完整名**。缺少当前所需环境 → 停摆并指出缺哪个键。
- 多个条目同时匹配（仓库嵌套）时取 `path` 最长者；没有匹配 → 停摆并列出已配置路径。

### 1.3 校验

配置读取后逐项校验，任一失败即停摆并指出文件、字段：

- `version` 必须为 `1`
- `chain` 非空、无重复
- `active` 非空且必须是 `chain` 的子集
- `repos` 非空，当前仓库条目必须存在
- `default_env` 若存在，必须在 `active` 中
- 当前仓库条目必须有 `envs`，且 `envs` 中每个环境名都在 `chain` 中
- `branch_pattern` 必须包含 `{user}`、`{type}`、`{version}`、`{ticket}`

## 2. 通用前置检查

除 `/git-flow-commit` 外，任何会改变分支或工作区的命令（start / sync / merge）执行前必须完成以下检查。所有 Git 命令使用 `git -C <仓库根目录>` 或先确认工作目录正确。

### 2.1 工作区

```bash
git -C <root> status --porcelain=v1
```

- 输出为空 → 通过
- 有任何输出（暂存、未暂存、未跟踪）→ **停摆**，最多列出 30 条，给出选项：

```text
当前工作区有未提交改动：
  M  src/components/ColorPicker.tsx
  ?? src/utils/color.ts

请选择：
  [1] 先提交（仅当当前分支是任务分支，调用 /git-flow-commit）
  [2] 暂存改动（git stash push -u）——需你明确确认后执行
  [3] 手动处理后再继续
```

- **绝不自动** 执行 `git checkout -- .`、`git clean`、`git reset --hard`
- `git stash push -u` 只在用户明确选择后执行，执行前展示将暂存的文件清单
- 未跟踪文件属于本次任务时，不擅自加入 `.gitignore`；交给用户决定

### 2.2 进行中的 Git 操作与 HEAD 状态

```bash
for f in MERGE_HEAD CHERRY_PICK_HEAD REVERT_HEAD; do
  p=$(git -C <root> rev-parse --git-path "$f"); [ -f "$p" ] && echo "in-progress: $f"
done
for d in rebase-merge rebase-apply; do
  p=$(git -C <root> rev-parse --git-path "$d"); [ -d "$p" ] && echo "in-progress: $d"
done
git -C <root> symbolic-ref -q --short HEAD || echo DETACHED
```

- 任一进行中状态或 detached HEAD → **停摆**，报告当前状态，让用户先处理

### 2.3 远端

需要比较远端的分支时先：

```bash
git -C <root> fetch <remote> --prune
```

- fetch 失败（网络、认证、远端不存在）→ **停摆**，原样输出错误，不重试
- 检查远端分支是否存在：

```bash
git -C <root> ls-remote --exit-code --heads <remote> <branch>
```

退出码 `0` 存在；`2` 不存在；其他 → 停摆并输出错误。

## 3. 环境解析（链式）

`chain` 从低到高排列，索引越大版本越高；链式同步只能沿链向上。

解析顺序：

1. 命令显式参数（如 `/git-flow-start ... 4.1`、`/git-flow-sync 4.1`）
2. 用户文本中明确提到的环境（如“4.1 环境的缺陷”）；同时提到多个且无法确定 → 停摆
3. 配置 `default_env`
4. `active`（或 `chain`）的最后一个，即**链式顶端**（通常是 `dev`）

选定后必须校验：

- 环境在 `active` 中；不在 → 停摆并列出可选环境
- 当前仓库 `envs` 有该环境的映射；没有 → 停摆
- 显式参数与用户文本冲突 → 停摆询问

输出中必须写明“目标环境 + 选择依据”（显式 / 文本 / 默认顶端）。

## 4. 身份、工单与分支名

### 4.1 用户

1. 配置 `user`
2. 否则执行 `user_source`（缺省 `git config user.name`）
3. 为空则取 `git config user.email` 的 `@` 前部分
4. 规范化：转小写，`[^a-z0-9]+` 替换为 `-`，去掉首尾 `-`，合并连续 `-`
5. 规范化后为空（如中文用户名且无邮箱）→ **停摆**，让用户配置 `user`

### 4.2 ONES 工单

优先遵循 `ones-parser` 技能；未安装时使用以下规则：

- 以链接为锚点：从链接 hash 末尾提取正式单号（`PRO-159115`、`BUG-123`）
- 单号格式 `[A-Za-z]+-\d+`，统一转大写
- 标题：单行取单号与链接之间的文本；两行取单号行去掉单号后的文本
- 分支类型按以下优先级判断：
  1. 命令显式 `--type`
  2. 用户措辞：“缺陷/修复/报错/丢失/异常/bug” → `fix`；“需求/新增/支持/功能/优化” → `feat`
  3. `branch_types` 前缀映射：`PRO`→`feat`、`BUG`→`fix`
  4. 仍无法确定，或措辞同时指向两类 → **停摆**
- 注意：前缀只是兜底。用户明确说是“缺陷”时，即使单号是 `PRO-*` 也创建 `fix` 分支（与计划中的 `jiangshun/fix/4.1-PRO-159115` 示例一致）
- 一个任务只对应一个单号；出现多个单号 → 停摆，让用户指定主单
- 解析不到单号 → **停摆**，不编造

### 4.3 分支名

按 `branch_pattern` 替换：

- `{user}`：4.1 的结果
- `{type}`：`feat` 或 `fix`
- `{version}`：目标环境名（如 `4.1`、`dev`）
- `{ticket}`：大写单号

示例：`jiangshun/fix/4.1-PRO-159115`

校验：

```bash
git check-ref-format --branch "<branch>"
```

失败 → 停摆并指出非法字符。`branch_pattern` 替换后仍含 `{` → 停摆。

创建前检查：

- 本地已存在同名分支 → 停摆，询问“切换到该分支继续”还是“放弃”
- 仅远端存在同名分支 → 停摆，询问“复用远端分支（git checkout --track）”还是“放弃”
- 绝不覆盖、绝不删除已有分支

创建命令必须 **不跟踪环境分支**：

```bash
git -C <root> checkout --no-track -b <branch> <remote>/<env-branch>
```

创建后确认上游为空：

```bash
git -C <root> rev-parse --abbrev-ref --symbolic-full-name '@{u}'
```

若非空 → 停摆报告（正常情况下 `--no-track` 不会设置上游）。

## 5. 保护分支与安全边界

### 5.1 保护分支

以下分支禁止直接提交、禁止直接 push 提交：

- 当前仓库 `envs` 的所有值（完整远端分支名）
- 配置 `protected` 中的名字
- `main`、`master`（作为兜底）

任务分支的判定：匹配 `branch_pattern` 且 `{type}` 为 `feat` / `fix`、`{ticket}` 形如 `[A-Z]+-\d+`。不匹配 → 视为非任务分支，`/git-flow-commit` 停摆。

### 5.2 允许自动执行

- `git fetch --prune`
- `git status` / `log` / `diff` / `rev-list` / `merge-base` / `ls-remote`
- `git checkout --no-track -b`
- `git merge --no-edit <env-branch>`（仅 `/git-flow-sync`）
- `git merge-tree --write-tree --name-only`（只读预检，不碰工作区）
- `git add -A`（仅 `/git-flow-commit`，按命令流程）
- `git commit`（仅 `/git-flow-commit`）
- `git push` / `git push -u`（非强制，仅命令流程明确要求时）

### 5.3 未经用户明确要求绝不执行

- `git push --force` / `--force-with-lease`
- `git reset --hard`、`git clean`、`git checkout -- .`
- `git rebase`、`git commit --amend`
- `git branch -D`、删除远端分支
- `git stash pop/drop`（`push` 也仅在用户选择后）
- `git merge --abort`（冲突时先报告，是否 abort 由用户决定）
- `--no-verify` 跳过 hooks
- 自动解决冲突、自动选择 ours/theirs、自动挑选 cherry-pick

### 5.4 失败与异常

- 任何命令非零退出 → **立即停摆**，输出：执行的命令、退出码、原始错误、已完成的步骤、未执行的步骤
- push 被拒绝（非快进、保护分支、权限、认证）→ 停摆；**不** force、**不** 自动 pull/rebase
- merge 冲突 → 停摆，列出冲突文件；工作区保持冲突状态，由用户决定解决或 `git merge --abort`
- 状态与预期不符（分支已被移动、远端分支消失、上游不一致、同名 MR 已存在等）→ 停摆询问
- **不猜测、不重试、不绕过**；按用户要求，AI 不能快速解决的异常一律停摆

## 6. 输出约定

每次执行输出统一结构：

```text
## git-flow <command>
- 仓库: <根目录>
- 当前分支: <branch>
- 目标环境: <env>（选择依据）
- 远端: <remote>

### 执行
1. ...
2. ...

### 结果
- 状态: 成功 / 停摆
- 分支: <branch>（如适用）
- 提交: <hash + subject>（如适用）
- 推送: <remote/branch> / 未推送
- 下一步: <建议命令或操作>
```

停摆时必须说明“发生了什么、哪些动作没有执行、可选方案”，不把异常包装成成功。
