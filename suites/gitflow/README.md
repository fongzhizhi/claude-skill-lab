# gitflow

> AI 执行 Git 环境分支工作流的套件：生成配置、创建任务分支、同步、提交、创建 MR，正常流程自动跑，异常一律停摆交给人。

环境分支（`dev` / `4.2` / `4.1` / ...）长期存在、只通过 MR 合入；每个任务从所属环境拉出 `{user}/{feat|fix}/{version}-{ticket}` 任务分支，开发完成后合回该环境。`gitflow` 把这条链路上的重复操作交给 AI，把需要业务判断的异常留给人。

面向**多仓库工作区**：一次会话同时修改多个仓库时，命令会检测兄弟仓库的遗漏改动；可用 `--repo` 切换操作仓库、`--repos` 创建对齐任务分支，不需要离开当前目录。

## 内容

| 类型 | 名称 | 说明 |
| --- | --- | --- |
| 命令 | `/gitflow:init` | 扫描多仓库工作区，探测远端环境分支，生成 `.claude/gitflow.json` 草稿，人工确认后落盘 |
| 命令 | `/gitflow:start` | 从 ONES 工单创建任务分支；未指定环境时用链式顶端（通常 `dev`），`--no-track` 避免误跟踪环境分支；`--repos` 为兄弟仓库创建同名对齐分支 |
| 命令 | `/gitflow:sync` | 把所属环境分支的最新改动合入当前任务分支（fetch → 比较 → merge），冲突停摆 |
| 命令 | `/gitflow:commit` | `git add -A` → format-keeper → mojibake-fixer → `git add -A` → commit-draft → commit → push；执行前检测其他仓库遗漏改动 |
| 命令 | `/gitflow:merge` | fetch 后校验推送状态 → `merge-tree` 冲突预检（注明快照）→ 用 glab 创建合入所属环境的 MR |
| 技能 | `gitflow-core` | 共享规则：配置、操作仓库、环境链、前置检查、多仓库检测、ONES 解析、分支命名、远端 URL 推导、安全边界 |
| 文档 | `gitflow-config` | 项目配置参考（部署到 `~/.claude/docs/`，按需引用） |

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

首次接入用 `/gitflow:init` 自动生成：

```text
/gitflow:init --envs 3.1,3.2,4.1,4.2,dev
/gitflow:init --envs 4.1,4.2,dev --repos pro-ui,pro-pcb,pro-api
/gitflow:init --single --envs 4.1,4.2,dev
```

它会扫描兄弟仓库、执行 `git ls-remote --heads` 探测环境分支、展示草稿，确认后才落盘；无法自动匹配的分支名（如 `pro-api/0.3`）会停摆询问。

也可以手写 `.claude/gitflow.json`（配置版本 `2`）：

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
    }
  }
}
```

`repos.*.path` 相对配置文件所在目录（`.claude` 的上一级）解析：工作区配置写兄弟目录名，单仓库配置写 `"."`。完整字段、多仓库与非同构分支示例见部署后的 `~/.claude/docs/gitflow-config.md`（本套件 `dist/docs/gitflow-config.md`）。

> 全局默认可写在 `claude-skill-lab/settings/profiles/_base.json` 的 `gitflow` 字段，由 `claude-lab switch` 合并进 `~/.claude/settings.json`；仓库/工作区配置优先。

> 从 v0.1 升级：配置版本从 `1` 升到 `2`，`path` 语义改为相对配置文件基准目录。用 `/gitflow:init` 重新生成最省事。

> 从 v0.2 升级：命令由 `/git-flow-*` 改为 `/gitflow:*`，配置文件由 `.claude/git-flow.json` 改名为 `.claude/gitflow.json`，全局键由 `gitFlow` 改为 `gitflow`；配置内容不变，改名即可。若曾部署旧版，先删除 `~/.claude/commands/git-flow-*.md` 与 `~/.claude/skills/git-flow-core/`，再部署本套件。

## 部署

```bash
claude-lab deploy gitflow          # 或 claude-lab deploy suites/gitflow
```

部署后：

- 5 个命令 → `~/.claude/commands/gitflow/*.md`（调用为 `/gitflow:init` 等）
- 共享技能 → `~/.claude/skills/gitflow-core/SKILL.md`
- 配置参考 → `~/.claude/docs/gitflow-config.md`

## 使用

```text
/gitflow:init --envs 3.1,3.2,4.1,4.2,dev

/gitflow:start PRO-159115【冒烟测试】显示颜色设置背景色之后，重新打开PCB，背景色丢失
heep:ones.lceda.com/project/#team/TkSb58GQ/issue/PRO-159115
4.1环境的缺陷

/gitflow:start PRO-159115 4.1环境的缺陷 --repos pro-pcb,pro-api
/gitflow:sync 4.1
/gitflow:commit
/gitflow:commit --repo pro-pcb
/gitflow:merge --reviewer @zhangsan
/gitflow:merge --repo pro-pcb --dry-run
```

### 链式模型

```text
3.1 → 3.2 → 4.1 → 4.2 → dev
```

- 任务分支从**所属环境**拉出，只合回该环境
- 未指定环境 → `default_env`（链式顶端，通常 `dev`）
- `/gitflow:sync` 的方向是**环境分支 → 任务分支**：把所属环境的最新改动合入任务分支
- 环境之间的提升按链式顺序逐级 MR（v0.3 暂未提供，规划为 `/gitflow:promote`）

### 提交流水线

```text
git add -A → format-keeper → mojibake-fixer → git add -A
           → commit-draft → git commit → git push
```

- 格式化 `failed` 或乱码检查失败 → 停摆，不提交；格式化 `skipped` → 记录警告后继续
- 疑似敏感文件（`.env`、`*.key` 等）→ 停摆确认
- 推送非快进/权限失败 → 停摆，绝不 force
- v0.3 暂不执行 TS 类型检查与单元测试；配置 `commit.checks` 为预留位

## 多仓库协同

1. **遗漏检测（默认开启）**：在配置了多个 `repos` 的工作区，`/gitflow:commit`、`/gitflow:sync`、`/gitflow:merge` 开头会扫描其他仓库的未提交改动与同名任务分支，命中即停摆提醒；用户确认后可继续只处理当前仓库。报告区分“正在同名任务分支”与“仅存在同名分支”。
2. **`--repo <name>`**：显式操作配置中的某个兄弟仓库（内部用 `git -C`），不切换目录；四个执行命令都支持。commit 的内嵌技能（format-keeper / mojibake-fixer / commit-draft）按 core §2.6 继承操作仓库上下文，不会作用到会话当前仓库。
3. **`--repos <a,b,c|all>`**：`/gitflow:start` 为兄弟仓库创建同名对齐任务分支（同环境、同单号），只创建不切换工作区；兄弟仓库工作区不干净只提醒，不阻断。

多仓库的改动靠工单号关联：各仓库分支名包含同一单号，MR 描述中引用同一工单。

> `/gitflow:init` 生成的草稿在遇到仓库分支名与版本号不同构时不会猜测，会停摆要求人工映射（如 `4.1 → pro-api/0.3`）。

## 边界

- **不自动解决冲突**：`/gitflow:sync` 冲突停摆；`/gitflow:merge` 只做 `merge-tree` 预检，不碰工作区
- **不直接提交保护分支**：环境分支、`main`/`master`、配置的 `protected` 一律拒绝
- **不执行破坏性操作**：`reset --hard`、`clean`、`rebase`、`force push`、`--amend` 均需用户明确要求（v0.3 不提供）
- **不猜测异常**：配置缺失、工单/环境/类型不确定、glab 不可用、状态与预期不符 → 停摆询问
- **不隐式操作其他仓库**：跨仓库写操作必须显式 `--repo`/`--repos`，不自动切换其他仓库工作区；遗漏检测只读

## 相关

- 设计背景与完整计划：[project-docs/plans/gitflow.md](../../project-docs/plans/gitflow.md)
- 改进建议：[project-docs/plans/gitflow-improvements.md](../../project-docs/plans/gitflow-improvements.md)
- 格式化技能：[skills/format-keeper](../../skills/format-keeper/README.md)
- 乱码修复：[commands/mojibake-fixer](../../commands/mojibake-fixer/README.md)
- 提交信息：[commands/commit-draft](../../commands/commit-draft/README.md)
