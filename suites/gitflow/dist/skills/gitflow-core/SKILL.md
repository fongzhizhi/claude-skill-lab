---
name: gitflow-core
description: gitflow 套件的共享规则：唯一全局配置的读取与校验、操作仓库解析、环境链、工作区前置检查、多仓库改动检测（同名分支自动提交）、内嵌技能上下文、ONES 工单解析、分支命名与反解、环境提升的提交识别（源任务分支相对目标环境的未合入提交，不依赖源环境合并状态）与受限 cherry-pick 冲突解决、历史任务分支清理（先列后删、删除前复核）、远端 URL 推导与 Git 安全边界。执行 /gitflow:start、/gitflow:sync、/gitflow:commit、/gitflow:merge、/gitflow:promote、/gitflow:clean 前必须先读取本技能；/gitflow:init 复用本文件的配置校验规则，并在首次初始化时自动探测环境链（全流程非交互）。单个命令只描述自身流程，通用规则以本文件为准。
version: 0.6.0
---
# gitflow-core

gitflow 套件的**单一规则来源**。六个执行命令执行前先读取本文件并遵循；命令文档只写该命令独有的步骤。`/gitflow:init` 负责在配置缺失时生成配置，只复用 §1.2 / §1.3 的字段与校验规则。

## 1. 配置

### 1.1 唯一配置

gitflow 只有一份配置：`~/.claude/gitflow.json`。

- 不读取项目/工作区 `.claude/gitflow.json`，不读取 `settings.json#gitflow`，不支持环境变量覆盖
- 不创建任何项目/工作区配置文件；配置只由 `/gitflow:init` 新增或增量更新
- 配置文件不存在 → **停摆**，输出：

```text
未找到 ~/.claude/gitflow.json。
请在当前仓库运行 /gitflow:init 添加/更新当前仓库配置（首次会自动探测环境链）；
或运行 /gitflow:init --all 扫描当前工作区的全部仓库。
```

**base（路径基准）**：`repos.*.path` 相对**工作区目录**解析——当前目录在 Git 仓库内时取当前仓库根目录的上一级；当前目录不在 Git 仓库内（仅使用 `--repo` 时可能）取当前目录。

`repos.*.path` 缺省为**仓库键名**，即 `<workspace>/<name>`。标准兄弟布局可省略 `path`。

> 同一份全局配置适用于任意具有相同兄弟目录布局的本地工作区；配置可以包含当前工作区没有的仓库，检测时跳过。

### 1.2 关键字段

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `version` | 是 | 配置版本，当前为 `2` |
| `chain` | 是 | 环境链，从低到高排列，如 `["3.1","3.2","4.1","dev"]`；由 `/gitflow:init` 自动探测或显式指定 |
| `active` | 否 | 当前在用的环境子集；缺省等于 `chain`。命令只接受 `active` 中的环境 |
| `default_env` | 否 | 未指定环境时的默认值；缺省取 `active`（或 `chain`）的最后一个，即链式顶端 |
| `remote` | 否 | 远端名，缺省 `origin` |
| `user` | 否 | 分支名前缀用户；缺省从 `user_source` 推导 |
| `user_source` | 否 | 推导用户的命令，缺省 `git config user.name` |
| `branch_pattern` | 否 | 缺省 `{user}/{type}/{version}-{ticket}` |
| `branch_types` | 否 | ONES 前缀 → 分支类型映射，缺省 `{"PRO":"feat","BUG":"fix"}` |
| `protected` | 否 | 额外保护分支名（完整名或短名），与所有环境分支一起禁止直接提交 |
| `repos` | 是 | 仓库映射，见下 |
| `mr` | 否 | MR 默认值：`remove_source_branch`（缺省 `false`）、`reviewers`（全局默认审核人）、`draft` |
| `commit.checks` | 否 | 预留字段（字符串数组）：提交前附加检查命令；当前版本不执行，未来按项目启用 |

`repos` 每个条目：

```json
{
  "pro-ui": {
    "path": "pro-ui",
    "reviewers": ["zhangsan"],
    "envs": {
      "dev": "pro-ui/dev",
      "4.1": "pro-ui/4.1",
      "3.2": "pro-ui/3.2"
    }
  }
}
```

- `path`：仓库路径，相对 **base**（工作区目录）解析，缺省为仓库键名（即 `<workspace>/<name>`）。标准兄弟布局写 `"path": "pro-ui"`，或直接省略。
- `reviewers`：该仓库的审核人（GitLab 用户名数组，可带 `@`），可多人。MR 解析顺序见 §1.4；`[]` 表示该仓库显式不指定，不再回退到 `mr.reviewers`。
- `envs`：环境名 → **远端环境分支完整名**。同一环境名在不同仓库可以指向完全不同的分支名，不要求同构（如 `"4.1": "pro-api/0.3"`）。缺少当前所需环境 → 停摆并指出缺哪个键。
- 多个条目同时匹配（仓库嵌套）时取 `path` 最长者；没有匹配 → 停摆并列出已配置路径。

### 1.3 校验

配置读取后逐项校验，任一失败即停摆并指出文件、字段：

- `version` 必须为 `2`；其他版本停摆，提示用 `/gitflow:init` 重新生成
- `chain` 非空、无重复
- `chain` 中每个 token 要么是 `X.Y` 版本号（`^\d+\.\d+$`，如 `3.2`），要么是环境名（如 `dev`、`main`）；多段数字版本号（`^\d+(\.\d+){2,}$`，如 `3.2.0918`、`5.1.2`）非法 → 停摆，提示改为 `X.Y` 或环境名
- `active` 非空且必须是 `chain` 的子集
- `repos` 非空，操作仓库条目必须存在；`~/.claude/gitflow.json` 是唯一配置来源，不与其他文件合并
- 操作仓库的 `path` 解析后必须是 Git 仓库根目录（`git -C <root> rev-parse --show-toplevel` 等于该路径）
- 其他条目的 `path` 在 §2.5 检测阶段核对；不可用时跳过（可能属于其他本地工作区），不阻断配置加载
- `default_env` 若存在，必须在 `active` 中
- 操作仓库条目必须有 `envs`，且 `envs` 中每个环境名都在 `chain` 中
- `branch_pattern` 必须包含 `{user}`、`{type}`、`{version}`、`{ticket}`
- `mr.reviewers` 若存在，必须是字符串数组；元素去掉 `@` 并 trim 后不能为空。`[]` 合法
- `repos.*.reviewers` 若存在，必须是字符串数组；规则同上。`[]` 合法，表示该仓库显式不指定审核人
- `commit.checks` 若存在，必须是非空字符串数组

### 1.4 审核人解析（`/gitflow:merge`、`/gitflow:promote`）

`/gitflow:merge` 与 `/gitflow:promote` 创建 MR 时，按以下顺序解析审核人：

1. 命令行 `--reviewer <name>`（可重复）
2. `repos.<操作仓库>.reviewers`（字段存在即生效，包括 `[]`）
3. `mr.reviewers`
4. 空（不指定审核人，依赖 CODEOWNERS）

- `--no-reviewer` 强制为空；与 `--reviewer` 同时出现 → **停摆**
- `repos.<repo>.reviewers: []` 表示该仓库显式不指定，**不再**回退到 `mr.reviewers`
- 用户名规范化：trim、去掉开头 `@`、按出现顺序去重；规范化后为空 → 停摆并指出配置字段
- 输出必须写明解析来源（命令行 / `repos.<仓库>.reviewers` / `mr.reviewers` / 未配置）
- 审核人为空不阻断 MR 创建；**不弹确认、不自行猜测、不主动 @ 人**

## 2. 通用前置检查

所有 Git 命令使用 `git -C <操作仓库根目录>`（下文记作 `<root>`）；路径含空格或中文时加引号。

### 2.1 操作仓库

- 无 `--repo`：`<root>` = 当前仓库根目录（`git rev-parse --show-toplevel`）；配置中 `path` 解析后等于 `<root>` 的条目为操作仓库
- `--repo <name>`：`name` 必须是 `repos` 的键；`<root>` = 该条目 `path` 相对 base（工作区目录）解析后的绝对路径；要求它本身是 Git 仓库根目录
- 当前目录不在 Git 仓库内且没有 `--repo` → **停摆**，提示在仓库内运行或显式指定 `--repo`
- `--repo` 指向的仓库与当前目录所在仓库不同时，输出必须写明“操作仓库: `<name>`（`<root>`）”；会话不需要切换目录

### 2.2 工作区

适用：`/gitflow:start`、`/gitflow:sync`、`/gitflow:merge`、`/gitflow:promote`。`/gitflow:commit` 与 `/gitflow:clean` **不执行**本节检查——前者负责提交当前工作区改动；后者只读取分支引用并在用户明确指令后删除引用，不修改工作区。

`/gitflow:promote` 对操作仓库的主工作区执行本节检查；`--repos` 追加的兄弟仓库使用系统临时目录中的独立 worktree，**不要求兄弟仓库主工作区干净**，也不会切换它。临时 worktree 本身必须是新建的干净目录。

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
  [1] 先提交（仅当当前分支是任务分支，调用 /gitflow:commit）
  [2] 暂存改动（git stash push -u）——需你明确确认后执行
  [3] 手动处理后再继续
```

- **绝不自动** 执行 `git checkout -- .`、`git clean`、`git reset --hard`
- `git stash push -u` 只在用户明确选择后执行，执行前展示将暂存的文件清单
- 未跟踪文件属于本次任务时，不擅自加入 `.gitignore`；交给用户决定

### 2.3 进行中的 Git 操作与 HEAD 状态

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
- `/gitflow:promote` 的兄弟仓库虽然使用临时 worktree，也不得在仓库仍处于 merge/rebase/cherry-pick/revert 时创建新 worktree：这些状态共享仓库引用，先跳过该仓库并记录原因
- `/gitflow:clean` **不执行**本节检查：它不切换、不修改工作区；当前分支与所有 worktree 检出的分支由 `git worktree list --porcelain` 排除，不允许删除

### 2.4 远端

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

### 2.5 多仓库改动检测

适用：`/gitflow:commit`、`/gitflow:sync`、`/gitflow:merge`，在完成分支校验、确定当前任务分支后执行。目的：识别同一任务的兄弟仓库改动，同时**不打断与本次任务无关的其他工作**。

检测本身只读；唯一写操作是 `/gitflow:commit` 对「同任务」仓库的自动提交（见下文）。**不弹窗、不停摆**。

1. 配置只有 1 个 `repos` 条目 → 跳过
2. 对除操作仓库外的每个条目：
   - 解析 `path`；目录不存在或不是 Git 仓库 → 跳过（配置可能包含其他本地工作区才有的仓库，属正常情况）
   - `git -C <path> symbolic-ref -q --short HEAD` → 当前检出分支；失败（detached HEAD）→ 记为「无法自动处理」
   - `git -C <path> status --porcelain=v1` → 非空记为「有未提交改动」
   - 分类：
     - 当前分支 == 当前任务分支 且 有改动 → **「同任务待提交」**
     - 当前分支 == 当前任务分支 且 无改动 → 「同任务已干净」
     - 当前分支 != 当前任务分支 且 有改动 → **「其他任务改动」**
     - 其他 → 忽略
   - 「同任务待提交」仓库若处于 merge/rebase/cherry-pick/revert 中 → 记为「无法自动处理」并附原因
3. 检测结果写入命令输出摘要，不询问用户

**`/gitflow:commit` 的处理**：

- 显式 `--repo <name>` → 只提交该仓库；其他仓库一律不处理，仅汇总忽略数量
- 缺省（操作当前仓库）→ 先完成操作仓库的流水线；成功后，对每个「同任务待提交」仓库逐个执行同一流水线（敏感文件检查 → `git add -A` → mojibake-fixer → format-keeper → `git add -A` → 提交信息 → commit → push）
  - `--message` 与 `--no-push` 同样作用于所有被提交仓库
  - 提交前检查失败（保护分支、进行中操作、detached HEAD、敏感文件未确认）→ **跳过该仓库并记录原因**，不询问
  - 流水线执行失败 → 停止该仓库后续步骤、记录原始错误，继续处理其他仓库；不自动回滚
  - 不切换会话目录，所有命令使用 `git -C <仓库根>`
- 「其他任务改动」一律不处理、不提示确认；输出中列出仓库名与当前分支即可
- 不自动切换分支、不自动 stash、不自动建分支

**`/gitflow:sync`、`/gitflow:merge` 的处理**：

- 检测只写入输出摘要，不影响执行、不停摆
- 「同任务待提交」→ 注明“有未提交改动，未处理；需要时运行 `/gitflow:commit`”
- 「其他任务改动」→ 不处理
- 不自动切换、不自动提交、不自动 stash 其他仓库

**`/gitflow:promote` 的处理**：

- 不套用本节的自动检测：它只按 `--repo` / `--repos` 显式处理仓库，操作仓库始终处理；未列出的兄弟仓库不会因为检出同名分支而被自动提升
- `--repos all` 才展开配置中当前工作区可用、存在源任务分支的兄弟仓库；是否有可提升提交由命令逐仓库生成提交清单判断，不满足的跳过并列出原因
- 兄弟仓库通过临时 worktree 操作，不切换、不 stash、不修改其主工作区

### 2.5.1 任务跨仓库时的分支准备

适用于开发过程：AI 根据需求与代码分析确认本次任务还需要修改配置中的其他仓库时，必须在**修改该仓库文件之前**完成分支准备，而不是等到提交时才发现。

1. 该仓库尚未检出当前任务分支时，复用当前任务分支名创建并切换：

   ```text
   /gitflow:start <单号> --repo <仓库名> --branch <当前任务分支名>
   ```

   - 分支名直接复用当前仓库的任务分支（同 `{user}` / `{type}` / `{version}` / `{ticket}`），保证多仓库同名对齐
   - 命令以 `<仓库名>` 为操作仓库，在其工作区内创建并切换；会话当前目录不变
2. 修改前确认该仓库已检出任务分支：

   ```bash
   git -C <path> symbolic-ref -q --short HEAD
   ```

   （`<path>` 为该仓库条目 `path` 解析后的绝对路径，与 §2.5 一致）

   不是任务分支 → 切换；切换会覆盖或冲突未提交改动 → **停摆询问**，不 stash、不覆盖
3. 只对**本次任务确认要改**的仓库执行。不要因为某个配置仓库存在未提交改动，就推断它属于本任务并自动建分支——那些改动可能来自其他任务或用户手工修改
4. 任务归属由 AI 依据任务内容判断，**不从工作区状态反推**

> 与 §2.5 的分工：§2.5 只处理**已经检出同任务分支**的仓库（commit 自动提交同任务改动，sync/merge 只提示）；本节负责在修改前把兄弟仓库切到同任务分支。两者都不判断“某仓库的改动是否属于当前任务”，只以分支名对齐为准。

### 2.6 内嵌技能与命令的上下文

`/gitflow:commit` 会调用 `format-keeper`、`mojibake-fixer`、`commit-draft`。这些模块默认以“当前目录所在仓库”为工作对象；使用 `--repo <name>` 时会话当前目录可能不是操作仓库，必须显式继承 `<root>`：

- 所有 git 命令改用 `git -C <root>`；模块内写死的 `git diff` / `git add -A` 等，均以 `<root>` 为仓库根执行
- 需要 `npm run` / `lc-build` 的步骤（format-keeper）必须在 `<root>` 下运行，不能只在会话当前目录执行
- 支持文件/目录参数的模块（mojibake-fixer）显式传入 `<root>` 下的变更文件绝对路径，避免扫描错误仓库
- 不支持路径参数、按上下文收集变更的模块（commit-draft），调用时把其信息收集命令替换为 `git -C <root> ...`
- 不依赖上一条命令的 `cd` 状态；每个内嵌步骤都显式带上 `<root>`

## 3. 环境解析（链式）

`chain` 从低到高排列，索引越大版本越高；链式同步只能沿链向上。

解析顺序：

1. 命令显式参数（如 `/gitflow:start ... 4.1`、`/gitflow:sync 4.1`）
2. 用户文本中明确提到的环境（如“4.1 环境的缺陷”）；同时提到多个且无法确定 → 停摆
3. 配置 `default_env`
4. `active`（或 `chain`）的最后一个，即**链式顶端**（通常是 `dev`）

选定后必须校验：

- 环境在 `active` 中；不在 → 停摆并列出可选环境
- 操作仓库 `envs` 有该环境的映射；没有 → 停摆
- 显式参数与用户文本冲突 → 停摆询问

输出中必须写明“目标环境 + 选择依据”（显式 / 文本 / 默认顶端）。

`/gitflow:promote` 的目标环境：

- 源环境取自当前任务分支的 `{version}`，必须在 `active` 中
- 显式 `[环境]` 必须属于 `active`、在 `chain` 中高于源环境；跳过中间环境时输出警告，`merge_type` 记为“用户指定”
- 缺省目标为 `chain` 中源环境之后的第一个 `active` 环境；不存在 → 已在链式顶端，停摆
- 目标环境与源环境相同或更低 → 停摆
- 提交清单由源任务分支与目标环境的对称差计算（`rev-list --right-only --cherry-pick <remote>/<目标环境分支>...<source-tip>`），**不读取源环境分支的 merge/squash 状态**；源环境 MR 是否已合并不影响提升，两侧合入互不阻塞

> `envs` 是“环境名 → 完整远端分支名”的显式映射，不要求各仓库同构。同一环境在不同仓库可指向不同分支名（如 `4.1 → pro-api/0.3`），配置即可覆盖。

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

**从任务分支反解**（`/gitflow:merge`、`/gitflow:promote` 需要）：

- 按 `branch_pattern` 构造锚定正则：字面部分转义，`{user}` / `{type}` / `{version}` / `{ticket}` 各替换为非贪婪捕获组；必须完整匹配
- 每个 token 在 `branch_pattern` 中出现多次，或捕获结果无法通过“用捕获值重新生成分支名并与原分支完全一致”的校验 → 停摆，要求修正配置或显式指定分支（`/gitflow:start --branch`）
- `{version}` 必须是 `active` 中的环境名；不是 → 视为非任务分支或环境未启用，停摆

校验：

```bash
git check-ref-format --branch "<branch>"
```

失败 → 停摆并指出非法字符。`branch_pattern` 替换后仍含 `{` → 停摆。

创建前检查：

- 本地已存在同名分支 → 停摆，询问“切换到该分支继续”还是“放弃”
- 仅远端存在同名分支 → 停摆，询问“复用远端分支（git checkout --track）”还是“放弃”
- 绝不覆盖、绝不删除已有分支

在操作仓库创建当前工作分支时必须 **不跟踪环境分支**：

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

以下分支禁止直接提交、禁止直接 push 提交（按操作仓库的 `envs` 判定）：

- 操作仓库 `envs` 的所有值（完整远端分支名）
- 配置 `protected` 中的名字
- `main`、`master`（作为兜底）

任务分支的判定：匹配 `branch_pattern` 且 `{type}` 为 `feat` / `fix`、`{ticket}` 形如 `[A-Z]+-\d+`。不匹配 → 视为非任务分支，`/gitflow:commit` 停摆。

### 5.2 允许自动执行

- `git fetch --prune`
- `git status` / `log` / `diff` / `rev-list` / `merge-base` / `ls-remote` / `rev-parse` / `cherry` / `for-each-ref` / `worktree list`
- `git checkout --no-track -b`（仅操作仓库；`/gitflow:promote` 也用于主工作区的新提升分支）
- `git branch --no-track <branch> <remote>/<env-branch>`（仅 `/gitflow:start --repos` 为兄弟仓库创建对齐分支，或 `/gitflow:promote` 为兄弟仓库创建提升分支；**不切换**兄弟仓库主工作区）
- `git worktree add <dir> <branch>` / `git worktree remove <dir>`（仅 `/gitflow:promote` 的兄弟仓库；`remove` 不加 `--force`）
- `git merge --no-edit <env-branch>`（仅 `/gitflow:sync`）
- `git cherry-pick <sha>`（仅 `/gitflow:promote`，按命令解析出的提交清单逐个执行）
- `git merge-tree --write-tree --name-only`（只读预检，不碰工作区）
- `git show :1:<path>` / `:2:<path>` / `:3:<path>`（只读，`/gitflow:sync` 与 `/gitflow:promote` 受限冲突解决）
- `git add <冲突文件>`（仅 `/gitflow:sync` 用户确认后，或 `/gitflow:promote` 在 §5.5 限额内解决后）
- `git commit --no-edit`（仅 `/gitflow:sync` 完成冲突合并，用户确认后）
- `GIT_EDITOR=true git cherry-pick --continue`（仅 `/gitflow:promote` 完成受限冲突解决后）
- `git add -A`（仅 `/gitflow:commit`，按命令流程）
- `git commit`（仅 `/gitflow:commit`）
- `git push` / `git push -u`（非强制，仅命令流程明确要求时）

### 5.3 未经用户明确要求绝不执行

- `git push --force` / `--force-with-lease`
- `git reset --hard`、`git clean`、`git checkout -- .`
- `git rebase`、`git commit --amend`
- `git branch -D`、删除远端分支（唯一例外：`/gitflow:clean` 在用户回复明确删除指令后，且只删除已列出的候选；不删除清单外分支、保护分支、当前分支或检出中的分支）
- `git checkout` / `git switch` 其他仓库的工作分支（对齐分支用 `git branch` 创建，不切换）
- `git stash pop/drop`（`push` 也仅在用户选择后）
- `git merge --abort` / `git cherry-pick --abort` / `git cherry-pick --skip`（冲突时先报告，是否 abort/skip 由用户决定）
- `--no-verify` 跳过 hooks
- 超出 §5.5 范围或未经用户明确选择的冲突解决（`/gitflow:promote` 的限额内自动解决除外）
- `git checkout --ours/--theirs`、`git merge -X ours/theirs` 整文件/整段选边
- 未经 `/gitflow:promote` 第 6 步提交清单确认的 cherry-pick
- `git worktree remove --force`

### 5.4 失败与异常

- 任何命令非零退出 → **立即停摆**，输出：执行的命令、退出码、原始错误、已完成的步骤、未执行的步骤（命令文档明确标注为预期失败的除外，如“无上游”“校验发现冲突标记”）
- push 被拒绝（非快进、保护分支、权限、认证）→ 停摆；**不** force、**不** 自动 pull/rebase
- merge 冲突（`/gitflow:sync`）→ 先列出冲突文件与范围；用户未选择 AI 解决、超出 §5.5 限额或无法可靠解决 → 停摆，工作区保持冲突状态，由用户决定解决或 `git merge --abort`
- cherry-pick 冲突（`/gitflow:promote`）→ 在 §5.5 限额内自动解决并继续；超出限额、无法可靠解决或出现空提交 → 停摆，保留 cherry-pick 现场与 worktree，由用户决定解决、`git cherry-pick --continue`、`--skip` 或 `--abort`
- 状态与预期不符（分支已被移动、远端分支消失、上游不一致、同名 MR 已存在等）→ 停摆询问
- `/gitflow:clean` 的单个分支删除失败、分支在列举后更新或消失 → 记录原始错误并继续其他分支，不阻断、不回滚、不强制；删除前的 fetch 失败仍按本节停摆
- **不猜测、不重试、不绕过**；AI 不能快速解决的异常一律停摆

### 5.5 受限冲突解决（/gitflow:sync、/gitflow:promote）

默认行为仍是冲突停摆。只有以下两种冲突现场、且满足本节限额时才进入：

- `/gitflow:sync` 的 merge 冲突，且用户明确选择“AI 尝试解决”
- `/gitflow:promote` 的 cherry-pick 冲突，按命令流程自动尝试

其他命令、其他场景一律不自动解决冲突。

本节命令中的 `<root>` 指**当前解决冲突的工作区根目录**：`/gitflow:sync` 为操作仓库根目录；`/gitflow:promote` 为操作仓库根目录，或兄弟仓库的临时 worktree 路径 `<work-root>`。

#### 5.5.1 可尝试的范围

先收集冲突清单与类型（merge 与 cherry-pick 相同）：

```bash
git -C <root> status --porcelain=v1
git -C <root> diff --name-only --diff-filter=U
git -C <root> diff --numstat --diff-filter=U
```

对每个冲突文件统计冲突块与冲突区域行数：

```bash
awk '/^<<<<<<< /{n++} END{print n+0}' <file>
awk '/^<<<<<<< /{f=1} f{n++} /^>>>>>>> /{f=0} END{print n+0}' <file>
```

出现以下任一情况 → **不尝试**，按 §5.4 停摆并报告原因：

- 冲突文件超过 5 个，或冲突块合计超过 10 个，或冲突区域合计超过 300 行
- 冲突类型为 `DD`、`AU`、`UA`、`DU`、`UD`：双方删除、增删或改删，需要业务判断
- 二进制文件（`git diff --numstat` 显示 `-`）
- 锁文件：`package-lock.json`、`npm-shrinkwrap.json`、`pnpm-lock.yaml`、`yarn.lock`、`bun.lock`、`bun.lockb`、`Cargo.lock`、`go.sum`、`poetry.lock`、`composer.lock`、`Gemfile.lock`
- 生成物：`dist/`、`build/`、`out/`、`coverage/`、`*.min.js`、`*.min.css`、`*.map`
- 敏感文件：`.env`、`.env.*`、`*.key`、`*.pem`、`*.p12`、`*.pfx`、`id_rsa*`
- 子模块、文件模式变更等特殊冲突

#### 5.5.2 解决规则

1. 读取 base / ours / theirs 与两侧意图：

   ```bash
   git -C <root> show :1:<path>   # base
   git -C <root> show :2:<path>   # ours
   git -C <root> show :3:<path>   # theirs
   ```

   - `/gitflow:sync`：ours = 任务分支，theirs = 环境分支；用 `git log --oneline <merge-base>..HEAD -- <path>` 与 `...<remote>/<env> -- <path>` 查看两侧相关提交
   - `/gitflow:promote`：base = 被 pick 提交的父提交 `<sha>^`，ours = 当前提升分支，theirs = 被 pick 的提交 `<sha>`；用 `git -C <root> show <sha> -- <path>` 查看该提交的改动意图，必要时查看 `<sha>^` 与当前分支的相关历史
   - `AA`（双方新增）没有 base，`:1:` 不存在，以空文件为 base
2. 合并双方意图：保留两边新增的行为；接口/签名变化时同步调整调用点。**不得整段选择 ours 或 theirs**，也不得用 `git checkout --ours/--theirs`。
3. 同一段逻辑两边给出互斥语义、需要产品判断 → **停止解决**，保留工作区，报告文件与分歧点。
4. 解决后清除所有冲突标记；`<<<<<<<` 与 `>>>>>>>` 的数量必须为 0。

#### 5.5.3 校验与确认

1. 校验已解决文件：

   ```bash
   git -C <root> diff HEAD --check -- <files>
   awk '/^(<<<<<<<|>>>>>>>|\|\|\|\|\|\|\|)/{print FILENAME":"FNR": "$0}' <files>
   ```

   - awk 输出任何标记 → 停止，不提交
   - `git diff --check` 报告 whitespace 错误时先核对：来自两侧原有格式的只记录、不阻断；无法确认来源或与本次解决编辑相关 → 停止
   - 以上校验的退出码按本节处理，不套用 §5.4 的“非零即停摆”
2. 记录解决摘要：每个文件的冲突块数、环境侧/被 pick 提交改了什么、当前分支侧改了什么、如何合并、风险点；附 `git -C <root> diff --stat HEAD -- <files>`。
3. **`/gitflow:sync`：必须等待用户确认**后才：

   ```bash
   git -C <root> add <已解决的冲突文件>
   git -C <root> commit --no-edit
   ```

   `git add` 只加已解决的冲突文件，不用 `-A`；`commit --no-edit` 使用 merge 预置信息完成合并。
4. **`/gitflow:promote`：不逐次等待确认**。限额内解决并通过校验后直接：

   ```bash
   git -C <root> add <已解决的冲突文件>
   GIT_EDITOR=true git -C <root> cherry-pick --continue
   ```

   `git add` 只加已解决的冲突文件，不用 `-A`；`cherry-pick --continue` 使用原提交信息。解决摘要写入最终输出，继续执行后续提交。
5. `/gitflow:sync` 用户不确认 → 停摆，保留已解决的编辑，不 `git add`、不提交、不 abort；说明可继续手工调整后自行 `git add` + `git commit --no-edit`，或确认后 `git merge --abort`。需要恢复到冲突标记状态时，由用户自行执行 `git checkout --merge -- <file>`，AI 不自动执行。
6. `/gitflow:promote` 的 `cherry-pick --continue` 失败或产生空提交 → 停摆，保留现场并输出原始错误；不自动 `--skip`、`--abort` 或 `reset`。
7. 提交失败 → 停摆并输出错误；不重试、不 reset。

#### 5.5.4 禁止

- `/gitflow:sync` 未经用户选择就尝试解决
- 超出 5.5.1 范围仍强行解决
- `git checkout --ours/--theirs`、`git merge -X ours/theirs` 整文件/整段选边
- 为解决冲突修改与冲突无关的文件
- 自动 `git merge --abort`、`git cherry-pick --abort/--skip`、`git reset --hard`
- `/gitflow:promote` 中为“让流程继续”而跳过无法解决的提交

## 6. 输出约定

每次执行输出统一结构：

```text
## gitflow <command>
- 操作仓库: <repo-name>（<root>）
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

`/gitflow:start --repos` 额外输出对齐仓库表（仓库、分支、是否新建）。停摆时必须说明“发生了什么、哪些动作没有执行、可选方案”，不把异常包装成成功。

**MR 链接**：`/gitflow:merge`、`/gitflow:promote` 输出 MR 时，URL 必须**单独一行、只输出原始链接**。可以保留单独一行的 `MR:` 标签，但 URL 所在行不得拼接中文、全角括号、`（已创建）` 等说明文字——终端/浏览器会把紧邻字符并入链接，导致打不开。

**分支清理**：`/gitflow:clean` 第一阶段只输出候选清单，以“等待指令”结束，明确写出“未删除任何分支”；第二阶段按用户明确指令删除后，逐项输出“已删除 / 跳过 / 失败”与原始原因。不得把候选清单包装成已清理。

## 7. 远端 URL 与手动 MR 入口

创建 MR 的手动入口需要 GitLab Web 地址，由远端 URL 推导：

```bash
git -C <root> remote get-url <remote>
```

推导规则：

| 远端形式 | Web 地址 |
| --- | --- |
| `git@<host>:<group>/<repo>.git` | `https://<host>/<group>/<repo>` |
| `ssh://git@<host>[:<port>]/<group>/<repo>.git` | `https://<host>/<group>/<repo>`（丢弃 SSH 端口；Web 端口非标准时提示用户核对） |
| `https://<host>/<group>/<repo>.git` | `https://<host>/<group>/<repo>`（保留原协议，去掉末尾 `.git`） |
| `http://<host>/<group>/<repo>.git` | `http://<host>/<group>/<repo>`（保留原协议） |

- 去掉末尾 `.git` 与多余 `/`
- 无法解析（本地路径、`file://` 等）→ 停摆，输出原始 URL，请用户提供 GitLab Web 地址

手动创建 MR 入口：

```text
<web-url>/-/merge_requests/new?merge_request[source_branch]=<source>&merge_request[target_branch]=<target>
```

分支名中的 `/` 等字符必须 URL 编码（`/` → `%2F`）。
