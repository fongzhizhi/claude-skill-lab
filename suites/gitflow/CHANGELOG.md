# CHANGELOG —— gitflow 变更历史

<!-- 记录 suites/gitflow/ 的每次变更。 -->

## v0.6.0（2026-11-04）

### 新增

- 新增 `/gitflow:clean`：按用户名前缀扫描历史任务分支，把最后提交早于 `--days`（默认 30 天）的本地/远端分支列成候选，展示最后提交时间、短 SHA 与摘要
- **两阶段，先列后删**：第一阶段只列候选并明确提示“未删除任何分支”，等待用户回复；用户给出“全部删除 / 保留 N / 只删 N / 只删本地或远端 / 分支全名”等明确指令后才进入删除
- 删除前重新 fetch 并复核 SHA；分支在列举后更新或消失则跳过并输出新旧 SHA；单个分支删除失败只记录，不阻断其他分支
- 时间阈值 `--days <n>` 可缩短到两周等；`--local-only` / `--remote-only` 限定位置；`--repo` / `--repos <a,b,c|all>` 支持逐仓库扫描

### 变更

- `/gitflow:merge` 的 `## 自测情况` 按实际范围裁剪：没有新增或修改测试文件时删除“单元测试”行，不再输出“单元测试通过（如有）”空占位；仓库模板中的同类空占位一并删除
- gitflow-core 升级到 0.6.0：§2.2/§2.3 声明 clean 不执行工作区与断点续接检查，§5.2 允许 `for-each-ref`/`worktree list`，§5.3 把 clean 的受控分支删除列为唯一例外，§5.4 增加单分支失败隔离，§6 增加“先列后删、不得包装成已清理”的输出约定
- 套件 README、设计（新增决策 27，已知限制更新）、配置参考、manifest 同步；manifest 与 gitflow-core 版本升到 0.6.0

## v0.5.1（2026-11-04）

### 行为变化

- `/gitflow:promote` 不再要求源任务分支已合入源环境：移除“源环境已合入”校验与 merge/squash 提交识别，源环境 MR 与提升 MR 互不阻塞
- 默认提交清单改为源任务分支相对目标环境的对称差：`git rev-list --reverse --no-merges --right-only --cherry-pick <remote>/<目标环境分支>...<source-tip>`；`--cherry-pick` 排除补丁等价提交，source tip 只比较本地与远端
- `/gitflow:merge`、`/gitflow:promote` 的输出中，MR 链接改为单独一行原始 URL，不再拼接中文、全角括号或“已创建”等说明

### 变更

- promote 命令重写第 6 步（提交清单生成）、第 7 步目标分支校验、第 10 步 MR 链接规则与输出示例；停摆条件改为“源任务分支不存在/分叉、`--commits` 非法、清单为空”
- merge 命令第 13/15 步与输出示例补充 MR 链接原始 URL 规则；core §3 增加“不读取源环境合并状态”，§5.3 引用第 6 步清单，§6 增加 MR 链接输出约定
- README、设计（新增决策 26，已知限制更新）、配置参考、manifest 同步；manifest 与 gitflow-core 版本升到 0.5.1

## v0.5.0（2026-11-04）

### 新增

- 新增 `/gitflow:promote [环境]`：把已合入源环境的任务提升到更高环境。从目标环境新建任务分支 → 逐一 cherry-pick 原提交 → 推送后按 `/gitflow:merge` 创建 MR
- 提交识别支持三种方式：源环境上的 merge 提交（`^1..<source-tip>`）、按工单号找到的唯一 squash 提交、显式 `--commits <base>..<head>` 或单个 `<sha>`
- 自动跳过目标环境已包含或补丁等价的提交；`--dry-run` 输出提交清单与分支计划
- 多仓库提升：操作仓库外可用 `--repos <a,b,c|all>` 显式列出；兄弟仓库在系统临时目录的独立 worktree 中处理，不切换主工作区，失败仓库之间相互隔离
- cherry-pick 冲突在 core §5.5 限额内**自动解决并继续**，记录解决摘要；超出限额、非冲突失败或空提交则停摆并保留现场

### 变更

- gitflow-core 升级到 0.5.0：新增 promote 目标环境规则、分支名反解（锚定正则 + 非贪婪捕获）、`git cherry`/`cherry-pick`/worktree 的允许操作、promote 的自动冲突处理与多仓库规则
- `/gitflow:merge` 明确只负责“任务分支 → 所属环境”，环境提升指向 `/gitflow:promote`；所有 `glab` 命令改为在操作仓库根目录执行，修复 `--repo` 模式下可能操作会话当前仓库的问题
- 套件 README、设计（决策 25）、配置参考、manifest 同步；已知限制补充 promote 的提交识别、worktree 与自动解决风险
- manifest 与 gitflow-core 版本升到 0.5.0

## v0.4.8（2026-11-04）

### 行为变化

- `/gitflow:merge` 的关联工单改为可点击的 Markdown 链接：有链接与标题时输出 `[单号 标题](链接)`，仅链接时输出 `[单号](链接)`，无链接才保留纯文本
- `## 合并链路` 的源分支、目标分支、合并类型之间各留空行，避免 GitLab 渲染时挤成一段
- 移除 `## 审核人` 标题：`/assign_reviewer` 是提交后即被执行的 quick action，保留标题只会留下空章节；审核人为空时整行省略

### 变更

- merge 命令步骤 12 的默认模板与工单/审核人/合并类型填充规则更新，自测项默认未勾选
- 计划文档的 `cross-version.md` 模板同步，并补充链接、空审核人、标题废弃说明
- 设计新增决策 24；manifest 与 gitflow-core 版本升到 0.4.8

## v0.4.7（2026-11-04）

### 行为变化

- `/gitflow:commit` 的多仓库检测不再弹窗：其他仓库在不同分支上的改动一律忽略、不提交；只有其他仓库当前检出分支与操作仓库**完全相同**时，才视为同一任务，自动按相同流水线提交并推送
- 显式 `--repo <name>` 时只提交指定仓库，不触发兄弟仓库自动提交
- 同任务兄弟仓库的敏感文件、流水线或推送失败只跳过该仓库并记录，不阻断操作仓库、不回滚
- `/gitflow:sync`、`/gitflow:merge` 的多仓库检测改为仅提示：同任务未提交改动注明“未处理”，不同分支改动直接忽略，不再停摆

### 变更

- core §2.5 重写：按分支名分类「同任务待提交 / 同任务已干净 / 其他任务改动 / 无法自动处理」，明确 commit 的自动提交与 sync/merge 的只读提示；§2.5.1 分工说明同步
- commit 命令描述、步骤 4、新增步骤 13（同任务兄弟仓库提交）、停摆条件、流水线说明与输出示例更新
- sync / merge 命令的描述、检测步骤与停摆条件同步
- 套件 README 命令表、多仓库协同章节与安全边界更新；设计决策 10/19 更新，新增决策 23，已知限制同步
- manifest 与 gitflow-core 版本升到 0.4.7

## v0.4.6（2026-11-04）

### 行为变化

- `/gitflow:commit` 流水线顺序调整为 `git add -A` → mojibake-fixer → format-keeper → `git add -A` → commit-draft → commit → push
- 先修复乱码再格式化：乱码修复会改写文本、可能改变行长与字符宽度，格式化放在最后可重新归一，避免修复内容破坏格式

### 变更

- commit 命令的描述、流水线图、步骤 7/8、停摆条件与输出示例同步调整
- 套件 README 的提交流水线说明、设计决策 5 更新；format-keeper 的 README/design 同步调用顺序
- manifest 版本升到 0.4.6，gitflow-core 版本同步

## v0.4.5（2026-11-04）

### 行为变化

- `/gitflow:init` 全程不询问：链级增删、未解析映射、`active`/`default_env` 修正都按推荐方案自动处理，结果写入变更摘要；不再有“确认后再写入”
- 未解析映射：目标环境只有唯一候选分支时自动映射；零个或多个候选留空，摘要列出候选，不猜测；留空环境不写入 `envs`，后续命令用到时按 core §1.3 停摆
- 版本号收紧为 `^\d+\.\d+$`：只保留数字.数字结构，`dev`/`main` 等环境名照常识别；多段数字（如 `3.2.0918`、`5.1.2`）探测时排除，已有 `chain` 中的条目自动剔除，显式 `--envs` 传入则报错
- 链级漂移自动应用：新增环境按排序插入，疑似移除按证据删除；单仓库 init 仍不主动删除链级环境
- 没有任何候选时写入占位链 `["dev"]`（或 `--default-env` 指定值）并在摘要提示，不再停摆
- 保留仓库的过期 `envs` 键：未传 `--envs` 时补入 `chain`；显式 `--envs` 时删除并摘要列出；多段数字键直接删除；不再停摆
- 候选分支提交时间读取失败时排除该候选，不再停摆
- 停摆条件收敛为真正的错误：不在 Git 仓库、配置损坏、远端不可达、显式参数非法、目录名重复、草稿校验失败、写入失败

### 变更

- 重写 init 命令第 6/7/9/11/12/13/15 步与「环境探测与漂移」「停摆条件」章节，补充「非交互原则」
- core §1.3 增加 `chain` token 校验：只接受 `X.Y` 版本号或环境名，多段数字版本号非法
- 配置参考、套件 README、设计决策 9/11/18、新增决策 22、已知限制同步；manifest 与 gitflow-core 版本升到 0.4.5

## v0.4.4（2026-11-04）

### 新增

- 审核人按仓库配置：`repos.<name>.reviewers`（主配置）与 `mr.reviewers`（全局回退）；`/gitflow:merge` 按命令行 `--reviewer` → 仓库配置 → 全局配置 → 空解析，新增 `--no-reviewer`
- `/gitflow:merge` 未配置审核人时不再弹确认或阻断：创建不带审核人的 MR，结果注明配置路径；glab 因审核人失败时停摆并指出字段，不静默去掉审核人重试
- `/gitflow:init` 自动推断审核人：对字段缺失的仓库，读取默认环境分支最近 10 条 merge 提交，按邮箱计数取第一名（不排除自己或 bot），静默写入；已有值（包括 `[]`）不覆盖；新增 `--no-infer-reviewers`
- 推断用户名优先取邮箱 `@` 前部分，不合法时退回作者名；无 merge 提交、fetch 失败或无法推导时跳过，不阻断 init

### 变更

- `mr.reviewers` 从“文档存在但 merge 未读取”修正为实际生效的全局回退
- core 新增 §1.4 审核人解析；§1.2/§1.3 增加 `reviewers` 字段与校验
- merge 流程新增“解析审核人”步骤并重排步骤编号；init 流程新增“推断审核人”步骤并重排
- 配置参考新增「审核人」章节（优先级、`[]`、推断、修正方式）；README、设计决策 21、已知限制同步
- manifest 版本升到 0.4.4

## v0.4.3（2026-11-04）

### 新增

- `/gitflow:sync` 冲突时支持受限 AI 解决：用户明确选择后，在 core §5.5 范围内（≤5 文件 / ≤10 冲突块 / ≤300 冲突行，仅文本源码）读取 base/ours/theirs 与两侧提交意图合并；排除锁文件、生成物、二进制、敏感文件、子模块与 `DD/AU/UA/DU/UD` 冲突
- 解决后展示逐文件摘要与风险，用户确认才 `git add <冲突文件>` + `git commit --no-edit`；不确认或无法确定业务取舍时停摆，不自动 abort
- core 新增 §5.5「受限冲突解决」，并更新 §5.2/§5.3/§5.4 的安全边界

### 修复

- `/gitflow:sync` 在“落后 0”时继续比较 `@{u}..HEAD`：merge 已完成但推送失败、或手动解决冲突后重跑时，有领先提交则跳到推送，不再误报“已是最新”而跳过推送
- 修正“手动解决后重新运行 sync”的说明：需先 `git add` + `git commit --no-edit` 完成合并，重跑才会推送

### 变更

- sync 命令描述、停摆条件、输出示例与 README 边界同步更新
- 设计决策 8 更新，新增决策 20；manifest 版本升到 0.4.3

## v0.4.2（2026-11-04）

### 新增

- core 新增 §2.5.1「任务跨仓库时的分支准备」：AI 根据任务分析确认还需修改其他仓库时，在修改文件前用 `/gitflow:start <单号> --repo <仓库名> --branch <当前任务分支名>` 创建并切换同名对齐分支
- 明确只对本次任务确认要改的仓库执行，任务归属由 AI 判断，不从工作区改动反推；不因某仓库有未提交改动就自动建分支或切换

### 变更

- core §2.5 多仓库遗漏检测改为只读兜底：不判断改动来源（可能是其他任务或手工修改），不自动建分支/切换/stash；报告选项区分“属于本次任务则先补建分支”
- commit / sync / merge 修正检测描述：不可用仓库条目跳过、不触发停摆，并引用 §2.5.1
- `/gitflow:start` 文档与输出增加提示：开发中发现其他仓库也要改时，用 `--repo <name> --branch <当前分支>` 先建对齐分支
- manifest 版本升到 0.4.2，描述补充“跨仓库对齐”

## v0.4.1（2026-11-03）

### 行为变化

- 远端分支探测只请求 `<仓库键>/*` 前缀，并只保留版本号（如 `0.1`、`3.2`）或常见环境名（如 `dev`）的 token；人名、任务分支、裸 `<env>`、`release/4.1` 等不再进入候选
- 候选分支增加活跃时间过滤：tip 提交的 committer date 必须在最近 365 天内；只对通过名称过滤的少量候选批量 fetch 读取时间，不拉全量分支
- 时间过滤只作用于候选发现；已有映射只要分支仍存在于 `<仓库键>/*` 前缀列表就沿用，不因超过一年未提交而自动删除
- 裸 `<env>` 分支不再作为探测与映射候选；已有 `envs` 指向裸分支且没有对应的 `<仓库名>/<环境>` 时按未解析处理，需改为 `<仓库名>/<环境>` 或手工映射
- `/gitflow:init` 展示草稿与变更摘要后直接写入/更新 `~/.claude/gitflow.json`，不再等待“是否写入”确认；`--dry-run` 仍只预览

### 文档

- 更新命令、配置参考、设计决策 11 / 18、README 与 manifest 版本到 v0.4.1
- 补充已知限制：365 天活跃窗口、目录名与远端仓库名不一致、候选分支 fetch 开销

## v0.4.0（2026-11-03）

### 破坏性变更

- 配置只保留唯一文件 `~/.claude/gitflow.json`：不再读取或创建项目/工作区 `.claude/gitflow.json`，不再读取 `settings.json#gitflow`，不再支持 `GITFLOW_CONFIG` 覆盖，也没有多文件优先级
- `/gitflow:init` 默认只处理当前仓库；`--all` 才扫描当前仓库父目录下的全部直接子仓库
- 移除 `--global`、`--single`、`--dir`、`--repos`、`--output`；配置路径固定为 `~/.claude/gitflow.json`
- 配置文件已存在时不再停摆，改为增量更新：只更新本次涉及的仓库条目，保留其他仓库与手工字段

### 新增

- `/gitflow:init` 首次未传 `--envs` 时，从当前仓库远端分支自动探测环境链：识别 `<仓库键>/<env>` 与裸 `<env>`，版本号升序、`dev` 默认置顶
- 已有配置时提示链级漂移：新增环境给出插入位置建议；疑似移除环境需满足「目标仓库均无有效映射 + 至少一个仓库曾配置且分支消失 + 不在当前仓库候选集」
- 单仓库 init 不主动删除链级环境，`--all` 才基于全部目标仓库的映射证据给出删除建议
- 已有配置时新增环境不自动加入 `active`；移除环境会从 `active` 剔除，`default_env` 被移除时回退到 `active` 最后一项

### 变更

- 文档示例环境链统一为 `3.1,3.2,4.1,dev`，移除本地不存在的 `4.2`
- 设计决策 11 更新为自动探测 + 漂移提示，新增决策 18；配置参考新增「环境探测与漂移」章节
- `repos.*.path` 固定相对工作区目录解析，缺省为仓库键名；标准兄弟布局可省略 `path`
- 现有仓库映射若仍存在于远端则优先沿用，避免每次更新重复询问
- 配置可包含其他本地工作区的仓库；遗漏检测与 `--repos all` 跳过当前工作区缺失的条目
- `claude-lab deploy gitflow` 只部署命令、技能与文档，不创建或更新 `~/.claude/gitflow.json`
- 设计决策 4 / 11 / 12 / 17、配置参考、README 同步为单一全局配置
- 保留 v0.3.0 的命名空间改名记录；v0.3.1 全局配置草案未发布，由本版本取代

## v0.3.0（2026-11-03）

### 破坏性变更

- 全面改名 `gitflow`：套件目录 `suites/gitflow/`，共享技能 `gitflow-core`
- 命令迁入 `commands/gitflow/` 命名空间，调用由 `/git-flow-*` 改为 `/gitflow:init`、`/gitflow:start`、`/gitflow:sync`、`/gitflow:commit`、`/gitflow:merge`
- 配置文件名 `.claude/git-flow.json` → `.claude/gitflow.json`，全局键 `settings.json#gitFlow` → `#gitflow`，环境变量 `GIT_FLOW_CONFIG` → `GITFLOW_CONFIG`
- 配置参考文档 `git-flow-config.md` → `gitflow-config.md`

### 变更

- `manifest.json` 映射改为 `commands/gitflow/*.md` → `~/.claude/commands/gitflow/`，部署后命令以 `/gitflow:*` 调用
- 设计决策 2 更新为命名空间方案，新增决策 16 记录全面改名
- 根 README、format-keeper 活动文档、项目计划文档同步新命名

## v0.2.0（2026-11-03）

基于 [project-docs/plans/gitflow-improvements.md](../../project-docs/plans/gitflow-improvements.md) 的反馈优化。

### 新增

- `/git-flow-init`：扫描多仓库工作区、`git ls-remote` 探测环境分支、生成并校验 `.claude/git-flow.json` 草稿，确认后落盘；支持 `--single`、`--dry-run`、`--envs`/`--active`/`--default-env`/`--repos`
- 多仓库遗漏检测（core §2.5）：commit / sync / merge 开头只读扫描其他配置仓库的未提交改动、同名任务分支与不可用路径，命中停摆提醒
- `--repo <name>`：四个执行命令支持显式操作配置中的兄弟仓库，会话无需切换目录
- `/git-flow-start --repos <a,b,c|all>`：为兄弟仓库创建同名对齐任务分支（`git branch --no-track`，只创建不切换）

### 变更

- 配置版本升到 `2`：`repos.*.path` 改为相对配置文件基准目录（`.claude` 的上一级）解析，修复同一份多仓库配置在不同仓库内解析不一致的问题
- `/git-flow-merge`：`fetch` 提前到推送状态校验之前；`merge-tree` 预检报告注明目标分支快照 `<hash>`，提示服务端合并时可能已前进
- `/git-flow-sync`：description 与文档统一为“环境分支 → 任务分支”，修正方向歧义
- 各命令“停摆条件”收敛为“通用项引用 core + 命令特有项”
- glab 适配：补充内网 GitLab 的 `glab auth login --hostname` / `GITLAB_HOST` 指引；描述优先用临时文件与 `--description-file`（以 `--help` 为准）；手动入口按 core §7 从远端 URL 推导 Web 地址并对分支名 URL 编码
- 配置新增 `commit.checks` 预留字段（v0.2 不执行）
- `/git-flow-commit` 文档补充 `--repo` 与多仓库检测步骤

### 修复

- core 新增 §2.6：`--repo` 模式下内嵌技能/命令继承操作仓库上下文，修复 format-keeper、mojibake-fixer、commit-draft 仍按会话当前目录执行的问题；commit 流程写明具体实现方式
- `/git-flow-start --repos`：兄弟仓库工作区不干净由停摆改为提醒后继续（`git branch` 只写分支引用，不改工作区）
- 多仓库遗漏检测区分「正在同名任务分支」与「存在同名任务分支（未检出）」
- 修正改进建议文档中 `git diff -U` 笔误

### 文档

- 配置参考新增：`/git-flow-init` 用法、工作区多仓库示例、`pro-api` 非同构分支示例、`commit.checks`、手动 MR Web 地址推导、版本 2 检查清单
- README 更新命令表、多仓库协同说明与配置版本

## v0.1.1（2026-11-02）

- `/git-flow-commit` 对齐 format-keeper v0.2.0：格式化步骤内部会执行 `git add -A`，并优先 `prettier:auto` / `lc-build`

## v0.1.0（2026-11-02）

- 初始版本：4 个命令 + 共享核心技能 + 配置参考文档
- `/git-flow-start`：ONES 工单解析、链式默认顶端环境、`--no-track` 创建任务分支、同名分支停摆
- `/git-flow-sync`：fetch → 落后提交比较 → merge 环境分支，冲突停摆
- `/git-flow-commit`：`git add -A` → format-keeper → mojibake-fixer → `git add -A` → commit-draft → commit → push
- `/git-flow-merge`：推送状态校验、`merge-tree` 冲突预检、glab 创建合入所属环境的 MR
- `git-flow-core`：配置查找/校验、环境链、前置检查、ONES 解析、保护分支与安全边界
- 配置：仓库 `.claude/git-flow.json` + 全局 `settings.json#gitFlow` 默认值
- v0.1 不含 TS 类型检查、单元测试、环境链提升与冲突自动解决
