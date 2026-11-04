# gitflow

> AI 执行 Git 环境分支工作流的套件：生成配置、创建任务分支、同步、提交、创建 MR、环境提升、清理历史分支，正常流程自动跑，异常一律停摆交给人。

环境分支（`dev` / `4.1` / `3.2` / ...）长期存在、只通过 MR 合入；每个任务从所属环境拉出 `{user}/{feat|fix}/{version}-{ticket}` 任务分支，开发完成后合回该环境。`gitflow` 把这条链路上的重复操作交给 AI，把需要业务判断的异常留给人。

面向**多仓库工作区**：一次会话同时修改多个仓库时，命令会检测兄弟仓库的遗漏改动；可用 `--repo` 切换操作仓库、`--repos` 创建对齐任务分支，不需要离开当前目录。

## 内容

| 类型 | 名称 | 说明 |
| --- | --- | --- |
| 命令 | `/gitflow:init` | 默认扫描当前仓库，`--all` 扫描父目录下全部兄弟仓库；只识别 `<仓库名>/` 下 `X.Y` 版本号或环境名且一年内活跃的分支（多段数字版本号如 `3.2.0918` 排除），自动探测环境链并应用漂移；未解析映射只有唯一候选时自动映射，否则留空并在摘要列出；未配置 `reviewers` 的仓库从默认环境分支最近 10 条 merge 推断第一名审核人并静默写入；全程不询问，创建或增量更新 `~/.claude/gitflow.json` 后直接落盘 |
| 命令 | `/gitflow:start` | 从 ONES 工单创建任务分支；未指定环境时用链式顶端（通常 `dev`），`--no-track` 避免误跟踪环境分支；`--repos` 为兄弟仓库创建同名对齐分支；开发中发现其他仓库也要改时用 `--repo <name> --branch <当前分支>` 先建分支 |
| 命令 | `/gitflow:sync` | 把所属环境分支的最新改动合入当前任务分支（fetch → 比较 → merge）；冲突时可在限额内由 AI 尝试解决，确认后提交，否则停摆 |
| 命令 | `/gitflow:commit` | `git add -A` → mojibake-fixer → format-keeper → `git add -A` → commit-draft → commit → push；其他仓库与当前分支同名时自动提交同一任务，不同分支的改动忽略 |
| 命令 | `/gitflow:merge` | fetch 后校验推送状态 → `merge-tree` 冲突预检（注明快照）→ 按命令行/仓库配置/全局配置解析审核人 → 用 glab 创建合入所属环境的 MR |
| 命令 | `/gitflow:promote` | 把任务分支的改动提升到更高环境，**不要求源分支已合入源环境**：以源任务分支相对目标环境的未合入提交作为 cherry-pick 清单（`--commits` 可覆盖）→ 从目标环境新建任务分支 → 逐一 cherry-pick（限额内自动解决冲突，无法解决则停摆）→ 推送并按 `/gitflow:merge` 创建 MR；`--repos` 逐仓库处理，兄弟仓库用临时 worktree |
| 命令 | `/gitflow:clean` | 按用户名前缀扫描历史任务分支：最后提交早于 `--days`（默认 30 天）的本地/远端分支列成候选（含最后提交时间与摘要），**第一阶段只列不删**；用户明确回复“全部删除 / 保留 N / 只删 N / 只删本地或远端”后才删除，删除前复核 SHA，分支更新或消失则跳过；`--repo` / `--repos` 逐仓库扫描 |
| 技能 | `gitflow-core` | 共享规则：配置、操作仓库、环境链、前置检查、多仓库检测、ONES 解析、分支命名、远端 URL 推导、安全边界 |
| 文档 | `gitflow-config` | 配置参考（部署到 `~/.claude/docs/`，按需引用） |

## 前置依赖

| 依赖 | 说明 |
| --- | --- |
| Git ≥ 2.38 | `/gitflow:merge` 使用新版 `git merge-tree --write-tree` 做只读冲突预检 |
| `format-keeper` 技能 | `/gitflow:commit` 的格式化步骤；未部署时 commit 停摆 |
| `mojibake-fixer` 命令 | `/gitflow:commit` 的乱码检查步骤；未部署时 commit 停摆 |
| `commit-draft` 命令 | `/gitflow:commit` 生成提交信息；未部署时 commit 停摆 |
| `glab`（可选） | `/gitflow:merge` 自动创建 MR；自建 GitLab 需 `glab auth login --hostname <内网域名>` 或设置 `GITLAB_HOST`。不可用时停摆并给出手动创建入口与完整标题/描述 |

`ones-parser` 技能可选：已部署时优先使用其解析规则，否则使用 `gitflow-core` 内置规则。

部署依赖模块：

```bash
claude-lab deploy format-keeper
claude-lab deploy mojibake-fixer
claude-lab deploy commit-draft
claude-lab deploy gitflow
```

## 配置

gitflow 只有一份配置 `~/.claude/gitflow.json`，由 `/gitflow:init` 创建或增量更新：

```text
/gitflow:init                     # 首次自动探测环境链；已有配置沿用并自动应用漂移
/gitflow:init --all               # 扫描父目录下全部兄弟仓库，链级增删判断更完整
/gitflow:init --envs 3.1,3.2,4.1,dev   # 显式指定环境链，跳过探测
/gitflow:init --all --dry-run
```

- 默认只扫描当前仓库；`--all` 才遍历当前仓库父目录下的直接子仓库
- 首次未传 `--envs`：只读取 `<仓库名>/*` 中 `X.Y` 版本号/常见环境名且最近 365 天有提交的分支，探测环境链；已有配置：沿用 `chain`，自动应用新增/疑似移除的环境
- 裸 `<env>`、多段数字版本号（如 `3.2.0918`）、人名与任务分支不参与探测；已有映射指向裸分支且没有对应的 `<仓库名>/<环境>` 时按未解析处理
- 文件不存在 → 创建；已存在 → 只更新本次涉及的仓库条目，保留其他仓库与手工字段
- 单仓库 init 不主动删除链级环境；`--all` 才基于全部目标仓库的映射证据移除
- 已有配置时，新增环境不会自动加入 `active`；需要启用时显式传 `--active`
- 不创建项目/工作区 `.claude/gitflow.json`，不读取 `settings.json#gitflow`，没有多文件优先级
- **init 全程不询问**：链级增删、未解析映射、`active`/`default_env` 修正都按推荐方案自动处理，结果写入摘要后直接落盘；`--dry-run` 只预览
- 未解析映射：目标环境只有唯一候选分支时自动映射；多个候选或无候选时留空，摘要列出候选，不猜测
- 对未配置 `repos.<name>.reviewers` 的仓库，从默认环境分支最近 10 条 merge 提交推断第一名审核人并静默写入；已有值（包括 `[]`）不覆盖，`--no-infer-reviewers` 可跳过

`repos.*.path` 相对当前工作区目录（当前仓库根的上一级）解析，缺省为仓库键名；标准兄弟布局可以省略 `path`。配置可同时包含多个本地工作区的仓库，当前工作区没有的条目会被跳过。完整字段、多工作区与非同构分支示例见部署后的 `~/.claude/docs/gitflow-config.md`（本套件 `dist/docs/gitflow-config.md`）。

最小配置示例（配置版本 `2`）：

```json
{
  "version": 2,
  "chain": ["3.1", "3.2", "4.1", "dev"],
  "active": ["4.1", "dev"],
  "default_env": "dev",
  "repos": {
    "pro-ui": {
      "envs": {
        "dev": "pro-ui/dev",
        "4.1": "pro-ui/4.1",
        "3.2": "pro-ui/3.2",
        "3.1": "pro-ui/3.1"
      }
    }
  }
}
```

> 从 v0.3.x 升级：配置只认 `~/.claude/gitflow.json`；旧的项目/工作区 `.claude/gitflow.json` 不再读取。进入任一工作区的仓库运行 `/gitflow:init --all` 重新生成，然后删除旧文件。

> 从 v0.1/v0.2 升级：配置版本需为 `2`；命令已统一为 `/gitflow:*`，旧命令 `/git-flow-*` 与旧配置 `.claude/git-flow.json` 不再识别。用 `/gitflow:init` 重新生成最省事。

## 部署

```bash
claude-lab deploy gitflow          # 或 claude-lab deploy suites/gitflow
```

部署后：

- 7 个命令 → `~/.claude/commands/gitflow/*.md`（调用为 `/gitflow:init` 等）
- 共享技能 → `~/.claude/skills/gitflow-core/SKILL.md`
- 配置参考 → `~/.claude/docs/gitflow-config.md`

部署只安装命令、技能与文档，**不创建也不更新** `~/.claude/gitflow.json`；配置文件只由 `/gitflow:init` 维护。

## 使用

```text
/gitflow:init
/gitflow:init --all
/gitflow:init --envs 3.1,3.2,4.1,dev

/gitflow:start PRO-159115【冒烟测试】显示颜色设置背景色之后，重新打开PCB，背景色丢失
heep:ones.lceda.com/project/#team/TkSb58GQ/issue/PRO-159115
4.1环境的缺陷

/gitflow:start PRO-159115 4.1环境的缺陷 --repos pro-pcb,pro-api
/gitflow:sync 4.1
/gitflow:commit
/gitflow:commit --repo pro-pcb
/gitflow:merge --reviewer @zhangsan
/gitflow:merge --no-reviewer
/gitflow:merge --repo pro-pcb --dry-run

/gitflow:promote dev
/gitflow:promote dev --repo pro-pcb
/gitflow:promote dev --repos pro-pcb,pro-api
/gitflow:promote dev --repos all --dry-run
/gitflow:promote dev --commits 3a1b2c3..9f8e7d6

/gitflow:clean
/gitflow:clean --days 14
/gitflow:clean --days 30 --repo pro-pcb
/gitflow:clean --days 14 --repos pro-pcb,pro-api
/gitflow:clean --repos all --local-only
```

### 链式模型

```text
3.1 → 3.2 → 4.1 → dev
```

- 任务分支从**所属环境**拉出，只合回该环境
- 未指定环境 → `default_env`（链式顶端，通常 `dev`）
- `/gitflow:sync` 的方向是**环境分支 → 任务分支**：把所属环境的最新改动合入任务分支
- 环境之间的提升用 `/gitflow:promote`：从目标环境新建任务分支 → cherry-pick 原提交 → 再走 `/gitflow:merge`；每次提升使用独立分支，源环境 MR 未合并也可以直接提升，两侧合入互不阻塞

### 环境提升

运行 `/gitflow:promote [环境]` 把当前任务分支的改动提升到更高环境，**不要求源环境 MR 已合并**：

1. **确定源/目标**：源环境取自当前任务分支的 `{version}`；目标缺省为 `chain` 中源环境之后的第一个 `active` 环境，也可显式指定（跳过中间环境会警告）
2. **生成提交清单**：取源任务分支 tip（本地/远端较新者，分叉则停摆），用 `git rev-list --reverse --no-merges --right-only --cherry-pick <remote>/<目标环境分支>...<source-tip>` 得到“源分支上尚未进入目标环境”的提交；`--commits <base>..<head>` 或单个 `<sha>` 可覆盖。该规则不读取源环境分支的 merge/squash 状态——源环境 MR 未合并、已合并、squash、rebase、fast-forward 都适用
3. **新建提升分支**：按 `branch_pattern` 把 `{version}` 换成目标环境，从 `<remote>/<目标环境分支>` 创建并 `--no-track`；源分支与目标分支都保持不动
4. **逐一 cherry-pick**：从旧到新重放提交；冲突在 core §5.5 限额内自动解决并 `--continue`，超出限额或非冲突失败则停摆并保留现场
5. **创建 MR**：推送提升分支后按 `/gitflow:merge` 的流程创建目标 MR，`merge_type` 记为“链式同步”或“用户指定”；输出的 MR 链接单独一行，只给原始 URL

已存在于目标环境或补丁等价的提交会跳过；清单为空视为该仓库没有可提升内容；`--dry-run` 只输出提交清单与分支计划。多仓库提升用 `--repos <a,b,c|all>` 显式列出，兄弟仓库在临时 worktree 中处理、不切换主工作区；不因为检出同名分支就自动提升。一个仓库失败不阻断其他仓库。

### 历史分支清理

`/gitflow:clean` 清理长期积累的任务分支，分两步，**先列后删**：

1. **扫描列出**：只匹配规范化用户名前缀 `<user>/` 的本地/远端分支，分别检查两侧 tip 的最后提交时间；早于 `--days`（默认 30 天）的列为候选，展示仓库、分支、位置、最后提交时间与摘要。当前分支、保护分支、任何 worktree 检出中的分支不进入候选。
2. **等待明确指令**：第一阶段不删除任何分支；用户回复“全部删除”“保留 2”“只删 1、3”“只删本地/远端”等明确指令后才进入删除。
3. **删除前复核**：重新 fetch 并比对 SHA；分支在列举后更新或消失则跳过；单个分支删除失败只记录，不影响其他分支。

`--days 14` 可缩短到两周；`--repo` / `--repos` 支持逐仓库扫描，`--local-only` / `--remote-only` 限定范围。本命令**不检查 GitLab MR 状态**，删除前请自行确认；远端分支删除后不可恢复。

### 审核人

审核人按**仓库**配置：`repos.<name>.reviewers`，全局回退 `mr.reviewers`。`/gitflow:merge` 的解析顺序为命令行 `--reviewer` → 仓库配置 → 全局配置 → 空；`--no-reviewer` 强制置空，仓库级 `[]` 表示显式不指定、不回退。

`/gitflow:init` 在字段缺失时自动推断：读取默认环境分支最近 10 条 merge 提交，按作者邮箱计数取第一名，不排除自己或 bot，不覆盖已有配置，不弹确认。推断结果在最终摘要中列出；不符合实际分工时直接编辑配置，删除该字段可重新推断。

### MR 描述

`/gitflow:merge` 优先复用仓库的 `.gitlab/merge_request_templates/cross-version.md`；无模板时使用默认结构：关联工单、变更说明、合并链路、自测情况。

- 关联工单有链接时写成可点击的 `[单号 标题](链接)`，不再把标题和链接拆成两行纯文本
- 合并链路每行之间留空行，避免 GitLab 把源分支/目标分支/合并类型渲染成同一段
- `/assign_reviewer` 直接放在描述末尾，不加「审核人」标题——它是提交后即执行的 quick action，标题会只剩空章节；审核人为空时整行省略
- `## 自测情况` 只保留本次实际适用的条目：没有测试改动时删除“单元测试”行，不留下“（如有）”空占位
- 命令输出中的 MR 链接**单独一行、只给原始 URL**，不拼接中文、全角括号或“已创建”等说明——浏览器会把紧邻字符并入链接，导致打不开

### 冲突处理

`/gitflow:sync` 冲突时先停下列出冲突文件与范围，由你选择：

1. **AI 尝试解决**：仅在 core §5.5 限额内（≤5 文件 / ≤10 冲突块 / ≤300 冲突行，仅文本源码）；AI 读取 base/ours/theirs 与两侧提交意图合并，不整段选边，解决后展示摘要与风险，确认后才提交并推送
2. **保持冲突，手动解决**：解决后 `git add <文件>` + `git commit --no-edit` 完成合并，再运行 `/gitflow:sync` 推送
3. **放弃本次合并**：`git merge --abort`，需明确确认

`/gitflow:promote` 的 cherry-pick 冲突使用同一套限额，但**不逐次询问**：限额内自动解决并 `cherry-pick --continue`，记录解决摘要；超出限额、非冲突失败或空提交则停摆该仓库并保留现场。base 取被 pick 提交的父提交，ours 为提升分支，theirs 为该提交。

锁文件、生成物、二进制、敏感文件、子模块、增删/改删冲突一律不自动处理，直接停摆。`/gitflow:merge` 仍只做 `merge-tree` 只读预检，不碰工作区。

### 提交流水线

```text
git add -A → mojibake-fixer → format-keeper → git add -A
           → commit-draft → git commit → git push
```

- 先修乱码再格式化：乱码修复会改写文本（可能改变行长/字符宽度），格式化最后执行以重新归一，避免修复后的内容破坏格式
- 乱码检查失败或格式化 `failed` → 停摆，不提交；格式化 `skipped` → 记录警告后继续
- 疑似敏感文件（`.env`、`*.key` 等）→ 停摆确认
- 推送非快进/权限失败 → 停摆，绝不 force
- 当前版本不执行 TS 类型检查与单元测试；配置 `commit.checks` 为预留位

## 多仓库协同

1. **任务跨仓库时的分支准备**：开发中 AI 判断本次任务还需要修改其他仓库时，先用 `/gitflow:start <单号> --repo <仓库名> --branch <当前任务分支名>` 在对应仓库创建并切换同名对齐分支，再修改文件。只对本次任务确认要改的仓库执行，不依据工作区改动反推任务归属。
2. **多仓库改动检测（默认开启，不打断）**：在配置了多个 `repos` 的工作区，`/gitflow:commit`、`/gitflow:sync`、`/gitflow:merge` 开头会扫描其他仓库。以**当前分支名**判断任务归属：
   - 其他仓库检出**同名任务分支且有未提交改动** → 视为同一任务。`/gitflow:commit`（缺省、未传 `--repo`）会在当前仓库完成后，按下述相同流水线自动提交并推送这些仓库；`/gitflow:sync`、`/gitflow:merge` 只提示“有未提交改动，未处理”，不阻断
   - 其他仓库在**不同分支**上的改动 → 一律忽略，不提示确认、不提交、不切换
   - 同名分支未检出（仅存在分支引用）或处于 detached/merge 等状态 → 不自动处理，记录在结果中
   - 显式 `--repo <name>` → 只处理指定仓库，不自动提交兄弟仓库
3. **`--repo <name>`**：显式操作配置中的某个兄弟仓库（内部用 `git -C`），不切换目录；六个执行命令都支持。commit 的内嵌技能（format-keeper / mojibake-fixer / commit-draft）按 core §2.6 继承操作仓库上下文，不会作用到会话当前仓库。
4. **`--repos <a,b,c|all>`**：`/gitflow:start` 为兄弟仓库创建同名对齐任务分支（同环境、同单号），只创建不切换工作区；`/gitflow:promote` 依次提升指定仓库，兄弟仓库用临时 worktree 处理，不切换主工作区；`/gitflow:clean` 追加扫描指定仓库的历史分支。兄弟仓库工作区不干净只提醒，不阻断。

多仓库的改动靠工单号关联：各仓库分支名包含同一单号，MR 描述中引用同一工单。

> `/gitflow:init` 遇到仓库分支名与版本号不同构时（如 `4.1 → pro-api/0.3`），只有唯一候选分支才自动映射；0 个或多于 1 个候选时留空并在摘要列出，不猜测。链级漂移、`active`/`default_env` 修正同样自动处理并写入摘要；全程不弹确认，发现问题直接编辑 `~/.claude/gitflow.json` 即可。

## 边界

- **冲突处理有明确边界**：`/gitflow:sync` 冲突由用户选择，限额内解决后确认才提交；`/gitflow:promote` 在同样限额内自动解决 cherry-pick 冲突并继续，超出限额即停摆并保留现场；`/gitflow:merge` 只做 `merge-tree` 预检，不碰工作区
- **不直接提交保护分支**：环境分支、`main`/`master`、配置的 `protected` 一律拒绝；`/gitflow:promote` 只操作新建的提升分支
- **不执行破坏性操作**：`reset --hard`、`clean`、`rebase`、`force push`、`--amend`、`cherry-pick --abort/--skip` 均需用户明确要求（当前版本不提供）；分支删除只由 `/gitflow:clean` 在用户明确指令后执行，且只删除已列出的候选
- **分支清理先列后删**：`/gitflow:clean` 第一阶段不删除任何分支；不检查 MR 状态，不删除清单外分支、保护分支、当前分支或检出中的分支；删除前复核 SHA，分支更新或消失即跳过
- **不猜测异常**：配置缺失、工单/环境/类型不确定、`--commits` 非法或提交清单为空、glab 不可用、状态与预期不符 → 停摆询问；例外是 `/gitflow:init`，按推荐方案自动处理并在摘要告知
- **不隐式操作其他仓库（commit 同任务除外）**：跨仓库写操作默认必须显式 `--repo`/`--repos`；`/gitflow:promote` 尤其不依据同名分支自动提升兄弟仓库。唯一例外是 `/gitflow:commit` 缺省模式下，对**当前检出分支与操作仓库完全相同**且存在未提交改动的兄弟仓库自动执行同一提交流水线——这是用户明确要求的“同名分支=同一任务”规则。不同分支、未检出同名分支或状态不安全的仓库一律不处理，也不切换工作区

## 相关

- 设计背景与完整计划：[project-docs/plans/gitflow.md](../../project-docs/plans/gitflow.md)
- 改进建议：[project-docs/plans/gitflow-improvements.md](../../project-docs/plans/gitflow-improvements.md)
- 格式化技能：[skills/format-keeper](../../skills/format-keeper/README.md)
- 乱码修复：[commands/mojibake-fixer](../../commands/mojibake-fixer/README.md)
- 提交信息：[commands/commit-draft](../../commands/commit-draft/README.md)
