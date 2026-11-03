# git-flow

> AI 执行 Git 环境分支工作流的套件：创建任务分支、同步、提交、创建 MR，正常流程自动跑，异常一律停摆交给人。

环境分支（`dev` / `4.2` / `4.1` / ...）长期存在、只通过 MR 合入；每个任务从所属环境拉出 `{user}/{feat|fix}/{version}-{ticket}` 任务分支，开发完成后合回该环境。`git-flow` 把这条链路上的重复操作交给 AI，把需要业务判断的异常留给人。

## 内容

| 类型 | 名称 | 说明 |
| --- | --- | --- |
| 命令 | `/git-flow-start` | 从 ONES 工单创建任务分支；未指定环境时用链式顶端（通常 `dev`），`--no-track` 避免误跟踪环境分支 |
| 命令 | `/git-flow-sync` | 把任务分支同步到所属环境分支（fetch → 比较 → merge），冲突停摆 |
| 命令 | `/git-flow-commit` | `git add -A` → format-keeper → mojibake-fixer → `git add -A` → commit-draft → commit → push |
| 命令 | `/git-flow-merge` | 校验同步状态 → `merge-tree` 冲突预检 → 用 glab 创建合入所属环境的 MR |
| 技能 | `git-flow-core` | 共享规则：配置、环境链、前置检查、ONES 解析、分支命名、安全边界 |
| 文档 | `git-flow-config` | 项目配置参考（部署到 `~/.claude/docs/`，按需引用） |

## 前置依赖

| 依赖 | 说明 |
| --- | --- |
| Git ≥ 2.38 | `/git-flow-merge` 使用新版 `git merge-tree --write-tree` 做只读冲突预检 |
| `format-keeper` 技能 | `/git-flow-commit` 的格式化步骤；未部署时 commit 停摆 |
| `mojibake-fixer` 命令 | `/git-flow-commit` 的乱码检查步骤；未部署时 commit 停摆 |
| `commit-draft` 命令 | `/git-flow-commit` 生成提交信息；未部署时 commit 停摆 |
| `glab`（可选，需 `glab auth login`） | `/git-flow-merge` 自动创建 MR；不可用时停摆并给出手动创建入口与完整标题/描述 |

`ones-parser` 技能可选：已部署时优先使用其解析规则，否则使用 `git-flow-core` 内置规则。

部署依赖模块：

```bash
claude-lab deploy format-keeper
claude-lab deploy mojibake-fixer
claude-lab deploy commit-draft
claude-lab deploy git-flow
```

## 配置

在项目仓库根目录创建 `.claude/git-flow.json`（建议提交到仓库）：

```json
{
  "version": 1,
  "remote": "origin",
  "chain": ["3.1", "3.2", "4.1", "4.2", "dev"],
  "active": ["4.1", "4.2", "dev"],
  "default_env": "dev",
  "repos": {
    "pro-ui": {
      "path": ".",
      "envs": {
        "dev": "pro-ui/dev",
        "4.2": "pro-ui/4.2",
        "4.1": "pro-ui/4.1"
      }
    }
  }
}
```

完整字段、多仓库与全局默认见部署后的 `~/.claude/docs/git-flow-config.md`（本套件 `dist/docs/git-flow-config.md`）。

> 全局默认可写在 `claude-skill-lab/settings/profiles/_base.json` 的 `gitFlow` 字段，由 `claude-lab switch` 合并进 `~/.claude/settings.json`；仓库配置优先。

## 部署

```bash
claude-lab deploy git-flow          # 或 claude-lab deploy suites/git-flow
```

部署后：

- 4 个命令 → `~/.claude/commands/git-flow-*.md`
- 共享技能 → `~/.claude/skills/git-flow-core/SKILL.md`
- 配置参考 → `~/.claude/docs/git-flow-config.md`

## 使用

```text
/git-flow-start PRO-159115【冒烟测试】显示颜色设置背景色之后，重新打开PCB，背景色丢失
heep:ones.lceda.com/project/#team/TkSb58GQ/issue/PRO-159115
4.1环境的缺陷

/git-flow-sync 4.1
/git-flow-commit
/git-flow-commit --no-push
/git-flow-merge --reviewer @zhangsan
/git-flow-merge --to 4.2 --dry-run
```

### 链式模型

```text
3.1 → 3.2 → 4.1 → 4.2 → dev
```

- 任务分支从**所属环境**拉出，只合回该环境
- 未指定环境 → `default_env`（链式顶端，通常 `dev`）
- 环境之间的提升按链式顺序逐级 MR（v0.1 暂未提供，规划为 `/git-flow-promote`）

### 提交流水线

```text
git add -A → format-keeper → mojibake-fixer → git add -A
           → commit-draft → git commit → git push
```

- 格式化 `failed` 或乱码检查失败 → 停摆，不提交；格式化 `skipped` → 记录警告后继续
- 疑似敏感文件（`.env`、`*.key` 等）→ 停摆确认
- 推送非快进/权限失败 → 停摆，绝不 force
- v0.1 暂不包含 TS 类型检查与单元测试，后续按需加入

## 边界

- **不自动解决冲突**：`/git-flow-sync` 冲突停摆；`/git-flow-merge` 只做 `merge-tree` 预检，不碰工作区
- **不直接提交保护分支**：环境分支、`main`/`master`、配置的 `protected` 一律拒绝
- **不执行破坏性操作**：`reset --hard`、`clean`、`rebase`、`force push`、`--amend` 均需用户明确要求（v0.1 不提供）
- **不猜测异常**：配置缺失、工单/环境/类型不确定、glab 不可用、状态与预期不符 → 停摆询问
- **一次一个仓库**：多仓库修改需在各仓库分别执行命令

## 相关

- 设计背景与完整计划：[project-docs/plans/git-flow.md](../../project-docs/plans/git-flow.md)
- 格式化技能：[skills/format-keeper](../../skills/format-keeper/README.md)
- 乱码修复：[commands/mojibake-fixer](../../commands/mojibake-fixer/README.md)
- 提交信息：[commands/commit-draft](../../commands/commit-draft/README.md)
