# design.md

## git-flow 设计

### 背景

团队使用长期环境分支（`dev` / `4.2` / `4.1` / ...），任务从环境拉出、通过 MR 合回。重复劳动集中在：从 ONES 工单建分支、同步环境、提交前格式化/查乱码/写 message、创建 MR。这些步骤规则明确，适合 AI 执行；但跨版本冲突、环境判断、权限异常需要业务判断，必须留给人。

设计哲学：**AI 只负责正常流程的重复劳动，异常停摆或交给人。** 不追求“全自动”，追求“可预测、可中断、可恢复”。

### 关键设计决策

#### 1. 聚合套件 + 共享核心技能

四个命令共享配置读取、环境链、前置检查、ONES 解析与安全边界。把这些放进 `git-flow-core` 技能，命令只描述自身差异：

- 规则单一来源，改一处四个命令同时生效
- 命令文档更短，避免复制粘贴导致规则漂移
- `git-flow-core` 也可被后续命令（如 `/git-flow-promote`）复用

#### 2. 命令统一 `git-flow-*` 前缀

`git-start` / `git-commit` 这类名字与 Git 原生命令高度相似，容易误解为 Git 子命令。统一改为 `git-flow-start` / `git-flow-sync` / `git-flow-commit` / `git-flow-merge`，斜杠命令与 Git 命令在语义上清晰隔离。

#### 3. 链式环境模型

```text
3.1 → 3.2 → 4.1 → 4.2 → dev
```

- 任务分支只合回**所属环境**，不直接从任务分支向多个环境开 MR
- 环境之间按链式顺序逐级提升，避免同一改动在多条路径重复合并、产生不同步
- 未指定环境时默认链式顶端（通常 `dev`）：用户确认“没有指定就用最新”，减少每次输入
- v0.1 先实现任务 → 所属环境的 MR；环境提升留给后续 `/git-flow-promote`

#### 4. 配置放仓库 `.claude/git-flow.json`

`settings/profiles/_base.json` 是全局个人配置，适合放“默认环境、用户、分支模式、MR 默认值”等固定偏好；但**仓库-环境分支映射是项目事实**，应随项目走：

- 仓库配置提交到 Git，团队共享同一套映射
- 全局 `gitFlow` 字段提供默认值，仓库配置覆盖
- 不直接写 `~/.claude/settings.json`：`claude-lab switch` 会用 profile 重写，只有 `_base.json` 里的键能保留

合并规则：全局 < 仓库，对象深度合并，数组替换。

#### 5. 提交按固定流水线

用户明确要求：`git add .` → 格式化 → mojibake-fixer → 再次 `git add .` → commit-draft → commit → push。

- 先 add 让格式化工具看到完整变更范围
- 格式化后再 add，保证格式化结果进入提交
- commit-draft 生成 Conventional Commits 信息，单号从分支名与会话 ONES 内容提取
- 默认 push；`--no-push` 可只提交
- v0.1 不跑 TS 类型检查与单元测试：用户当前诉求是“稳定完成提交链路”，测试检查后续按项目需要加入

#### 6. 格式化独立成 `format-keeper`

格式化是可独立运行、也可内嵌的步骤，做成技能而非命令：

- 需要按项目检测工具、按扩展名分组、区分 `skipped` / `failed`
- `git-flow-commit` 只引用其规则与状态，不复制实现
- 同时支持 `/format-keeper` 手动执行

#### 7. 上游跟踪修复

从远端环境分支创建任务分支时使用 `git checkout --no-track -b`。若不加 `--no-track`，任务分支会跟踪环境分支，`git push` 可能被 `push.default=simple` 拒绝，或误推向环境分支。首次 push 由 `/git-flow-commit` 使用 `git push -u origin HEAD` 建立正确上游。

#### 8. 冲突只预检，不解决

- `/git-flow-sync`：真实 merge；冲突停摆，保留冲突状态，由用户决定解决或 `merge --abort`
- `/git-flow-merge`：`git merge-tree --write-tree --name-only` 只读模拟，不碰工作区；有冲突只报告文件，不创建 MR
- 不提供 ours/theirs 自动选择：跨版本冲突方向往往需要业务判断

#### 9. 停摆优先

以下情况一律停摆并给出选项，不猜测、不重试、不绕过：

- 工作区不干净、进行中的 merge/rebase、detached HEAD
- 配置缺失/非法、环境不确定、环境分支不存在
- 工单解析失败、类型无法确定、同名分支已存在
- 冲突、push 被拒绝、glab 不可用、状态与预期不符

停摆报告必须说明：发生了什么、哪些动作未执行、可选方案。

### 与现有模块的关系

- `format-keeper`：提交流水线的格式化步骤
- `mojibake-fixer`：提交流水线的乱码检查步骤
- `commit-draft`：提交信息生成
- `ones-parser`：工单解析（优先使用）
- `git-flow-core`：本套件共享规则

### 已知限制（v0.1.0）

- 不含 TS 类型检查与单元测试
- `/git-flow-merge` 只创建任务 → 所属环境的 MR，环境链提升待后续命令
- 自动创建 MR 依赖 `glab`；不可用时只能给出手动入口
- 多仓库修改需分别在各仓库执行
- 冲突不自动解决
- Git 需 ≥ 2.38（`merge-tree --write-tree`）
