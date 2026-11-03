# CHANGELOG —— gitflow 变更历史

<!-- 记录 suites/gitflow/ 的每次变更。 -->

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
