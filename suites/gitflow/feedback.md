# feedback

<!-- 记录使用过程中发现的问题与改进建议。 -->

## v0.3.0 改名（2026-11-03）

- 来源：用户建议——参考 OpenSpec 套件结构，命令统一放入 `commands/gitflow/` 父目录，调用为 `/gitflow:start` 等
- 采纳：全面改名 `gitflow`（套件目录、共享技能、命令命名空间、配置文件名、全局键、环境变量）
- 决策：
  - 命令命名空间与套件同名，`~/.claude/commands/gitflow/*.md` → `/gitflow:*`，不再把命令文件平铺在 `commands/` 根目录
  - 配置改为 `.claude/gitflow.json`、全局键 `gitflow`、环境变量 `GITFLOW_CONFIG`，不保留旧名兼容（v0.3 尚未部署，无迁移成本）
  - 历史 CHANGELOG / feedback 条目保留当时的旧名，仅修正已移动计划文件的链接
- 待实测：`/gitflow:*` 在 Claude Code 中的命令解析与补全、部署后 `claude-lab status` 的映射核对

## v0.2.0 优化（2026-11-03）

- 来源：[project-docs/plans/gitflow-improvements.md](../../project-docs/plans/gitflow-improvements.md)（基于 v0.1.0 的多仓库环境使用反馈）
- 采纳并落地：
  - P0-1 多仓库协同三步：遗漏检测（默认只读提醒）、`--repo <name>` 显式操作兄弟仓库、`/git-flow-start --repos` 创建对齐分支
  - P0-2 `/git-flow-init`：扫描仓库、探测远端环境分支、草稿确认后落盘
  - P1 全部校准项：glab 内网登录指引、多行描述临时文件、glab 参数 `--help` 校准提示、手动入口 URL 推导与编码、pro-api 非同构示例、merge 先 fetch 后比较、预检注明快照
  - P2-2 sync 方向措辞、P2-3 停摆条件去重、P2-4 `commit.checks` 预留
- 决策：
  - 遗漏检测是“停摆提醒”而非硬拦截：用户确认后可继续，避免与当前任务无关的改动反复阻塞
  - 兄弟仓库对齐分支用 `git branch --no-track` 创建但不切换，避免未经确认改变其他仓库工作区
  - 配置 `path` 改为相对配置文件基准目录解析，配置版本升到 `2`；v1 配置明确停摆并提示重新生成
  - init 对无法自动匹配的环境分支（如 `pro-api/0.3`）一律停摆询问，允许多个环境映射到同一分支
  - merge 的 fetch 提前到推送状态校验之前，预检报告注明快照 hash，不把“无冲突”包装成服务端保证
  - glab 描述优先用临时文件 + `--description-file`，实际参数以 `--help` 为准；不支持时退回 `--description "$(cat ...)"`
  - 暂缓：`/git-flow-promote`（等实际遇到环境提升需求）、`commit.checks` 实际执行、已合并分支清理（GitLab 自动删除已覆盖大半）
- 复核反馈（2026-11-03，提交前自审）：
  - P1 修复：`--repo` 模式下 format-keeper / mojibake-fixer / commit-draft 默认按会话当前目录执行，会作用到错误仓库；core 新增 §2.6 统一上下文规则，commit 的格式化、乱码检查、提交信息生成均改为显式继承 `<root>`
  - P2 修复：`/git-flow-start --repos` 不再因兄弟仓库工作区不干净而停摆——`git branch` 只写引用，改为提醒后继续
  - P2 采纳：遗漏检测区分「正在同名任务分支」与「仅存在同名分支（未检出）」
  - P3 修正：改进建议文档 `git diff -U` 笔误改回 `git diff`
- 待实测：
  - 工作区多仓库遗漏检测的提醒频率与噪音（当前任务无关改动是否过多）
  - `git branch --no-track` 在 Windows 中文/带空格路径下的表现
  - 内网 GitLab 的 glab 认证与 `--description-file` 实际参数名
  - `git ls-remote` 在仓库多、网络慢时的 init 耗时
  - 工作区根目录配置与仓库内配置同时存在时的匹配行为
  - merge 预检快照措辞是否足以避免过度信任“无冲突”

## 初始创建（2026-11-02）

- 需求来源：[project-docs/plans/gitflow.md](../../project-docs/plans/gitflow.md)；经评估后用户确认：环境分支采用链式同步、未指定环境默认链式顶端（通常 `dev`）、异常停摆询问用户、指令名改为 `git-flow-*`、提交前走“add → 格式化 → 乱码修复 → add → commit-draft → commit → push”。
- 决策：
  - 采用聚合套件 + `git-flow-core` 共享技能，避免四个命令复制规则。
  - 配置以仓库 `.claude/git-flow.json` 为主，全局默认放 `settings.json#gitFlow`（由 `_base.json` 维护）；不直接依赖 `~/.claude/settings.json` 的手工改动。
  - v0.1 只做“任务分支 → 所属环境”的 MR，环境链提升留待 `/git-flow-promote`；避免一次实现过多未验证逻辑。
  - MR 自动创建依赖 `glab`；不可用时停摆并给出手动入口，不用 `git push -o merge_request.create` 兜底（分支已推送时 push 是 no-op）。
  - 冲突只预检不解决；破坏性操作一律不自动执行。
- 待实测确认项：
  - 实际 ONES 粘贴格式（多行、链接、标题）的解析准确率
  - `glab mr create/list` 的参数名随版本变化，需在真实环境核对 `--help`
  - Windows 下 `merge-tree` 输出解析、长路径、中文路径
  - 多仓库工作区配置匹配（`path` 解析、嵌套仓库）
  - 提交流水线在 Prettier/ESLint/Biome 项目中的实际表现，以及 `skipped` 是否可接受
  - 链式环境提升的真实操作顺序与 MR 目标分支
