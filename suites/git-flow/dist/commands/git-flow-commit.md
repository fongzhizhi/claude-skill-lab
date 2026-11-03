---
name: git-flow-commit
description: 在任务分支上完成提交流水线：git add -A → format-keeper 格式化 → mojibake-fixer 检查乱码 → git add -A → commit-draft 生成提交信息 → git commit → git push。默认推送；支持 --repo 操作配置中的兄弟仓库，并在执行前检测其他仓库的遗漏改动。格式化或乱码检查失败、分支不是任务分支、疑似敏感文件时停摆询问。
category: git
---
# /git-flow-commit

任务分支的提交流水线。**执行前必须先读取 `~/.claude/skills/git-flow-core/SKILL.md`**，配置、操作仓库、分支保护、用户/工单解析与安全边界以 core 为准。

## 参数

| 参数 | 说明 |
| --- | --- |
| `--repo <name>` | 操作配置 `repos` 中的指定仓库，无需切换目录；缺省为当前仓库 |
| `--no-push` | 只提交，不推送 |
| `--message "<msg>"` | 跳过 commit-draft，直接使用给定提交信息（仍需通过 Git 校验） |

```text
/git-flow-commit
/git-flow-commit --no-push
/git-flow-commit --repo pro-pcb
/git-flow-commit --message "fix: 修复背景色丢失 (PRO-159115)"
```

## 流水线

```text
操作仓库解析 → 分支校验 → 多仓库遗漏检测 → 敏感文件检查
→ git add -A → format-keeper → mojibake-fixer → git add -A
→ commit-draft → git commit → git push
```

任何一步失败立即停摆，不执行后续步骤；已产生的格式化/乱码修复改动保留在工作区，不自动回滚。

## 流程

1. **读取共享规则与配置**：读取 `~/.claude/skills/git-flow-core/SKILL.md`，按 core 第 1 节定位操作目标与配置。

2. **解析操作仓库**：按 core §2.1 确定 `<root>`；`--repo` 指向的仓库必须在配置中且是 Git 仓库根目录。输出写明“操作仓库”。

3. **分支校验**（提交前唯一的工作区前置检查）：
   - 按 core §2.3 检查进行中的 merge/rebase/cherry-pick/revert 与 detached HEAD，命中 → 停摆
   - 当前分支等于操作仓库任一环境分支、`protected`、`main`/`master` → 停摆，**禁止直接提交到保护分支**
   - 当前分支不匹配 `branch_pattern`（`{type}` 不是 `feat`/`fix` 或 `{ticket}` 不合法）→ 停摆，提示先用 `/git-flow-start` 创建任务分支

   ```bash
   git -C <root> symbolic-ref -q --short HEAD
   ```

4. **多仓库遗漏检测**：按 core §2.5 扫描配置中的其他仓库；有未提交改动、同名任务分支或仓库不可用 → 停摆提醒，用户选择继续后再进入下一步。

5. **敏感文件检查**（在 `git add` 之前）：

   ```bash
   git -C <root> ls-files --others --exclude-standard
   ```

   命中以下模式且不在 `.gitignore` 中 → **停摆**，列出文件，询问“加入 `.gitignore` / 移出仓库 / 明确确认提交”：

   - `.env`、`.env.*`（`.env.example`、`.env.sample`、`.env.template` 除外）
   - `*.pem`、`*.key`、`*.p12`、`*.pfx`、`id_rsa`、`id_ed25519`
   - `credentials*`、`secrets.*`

   用户明确确认后才继续；不擅自修改 `.gitignore`，不擅自删除文件。

6. **暂存全部改动**（包括删除）：

   ```bash
   git -C <root> add -A
   ```

   若暂存区为空：

   ```bash
   git -C <root> diff --cached --quiet
   ```

   退出码 `0` → 报告“没有可提交的改动”，结束（不提交、不推送）。

7. **格式化**：读取 `~/.claude/skills/format-keeper/SKILL.md`，按规则执行。该技能会先 `git add -A`，再按 `prettier:auto` → `lc-build` → `package.json` 暂存区脚本的顺序格式化；成功后再次 `git add -A`。

   - 技能不存在 → 停摆，提示 `claude-lab deploy format-keeper`
   - 第 5 步用户已明确确认敏感文件时，调用时说明该确认，避免 format-keeper 重复拦截
   - 状态 `formatted` / `no_changes` / `skipped` → 继续
   - 状态 `failed` → 停摆，输出原始错误，不提交

8. **乱码检查**：读取 `~/.claude/commands/mojibake-fixer.md`，按其规则扫描并修复本次变更文件中的 U+FFFD。

   - 命令不存在 → 停摆，提示 `claude-lab deploy mojibake-fixer`
   - 修复后仍有无法可靠推断的 U+FFFD → 停摆，列出文件与位置，交由用户处理
   - 不强行猜测、不跳过未修复项直接提交

9. **再次暂存**（格式化与乱码修复可能产生新改动）：

   ```bash
   git -C <root> add -A
   ```

10. **生成提交信息**：

    - 有 `--message` → 使用给定内容，校验非空
    - 否则读取 `~/.claude/commands/commit-draft.md`，按规则生成 Conventional Commits 信息；从当前分支名提取单号（`{ticket}`），结合会话中的 ONES 内容补充标题/链接
    - 生成失败或内容为空 → 停摆，请用户提供提交信息；**不提交空信息**
    - 提交信息写入系统临时目录的文件（不写入仓库），提交后删除

    > 配置 `commit.checks` 是预留字段，v0.2 不执行；不要把它当作已生效的检查。

11. **提交**：

    ```bash
    git -C <root> commit -F <临时文件>
    ```

    不添加 `--no-verify`，不自动 `--amend`。commit 失败（hooks、身份、冲突等）→ 停摆并输出原始错误。

12. **推送**（除非 `--no-push`）：

    ```bash
    git -C <root> rev-parse --abbrev-ref --symbolic-full-name '@{u}'
    ```

    - 无上游 → `git push -u <remote> HEAD`（`<remote>` 取配置，缺省 `origin`）
    - 有上游 → 先确认上游不是环境/保护分支；是 → 停摆（避免误推环境分支），让用户先修正上游
    - 正常上游 → `git push`

    推送被拒绝（非快进、保护分支、权限、认证）→ 停摆，输出原因与可选方案；**绝不 force、绝不自动 pull/rebase**。

13. **输出结果**：操作仓库、格式化状态、乱码修复情况、提交 hash 与 subject、推送结果（远端分支或“未推送”）、下一步建议（`/git-flow-sync` 或 `/git-flow-merge`）。

## 停摆条件

通用停摆条件见 core §2.3（进行中操作与 HEAD）、§2.4（远端）、§5（保护分支 / 命令失败 / 状态不符）。本命令不执行 core §2.2 的工作区干净检查。本命令特有：

- 当前分支不是任务分支或指向保护分支
- 多仓库遗漏检测命中且用户未选择继续
- 命中疑似敏感文件且用户未明确确认
- format-keeper / mojibake-fixer / commit-draft 未部署或执行失败
- 提交信息为空，或 commit 被 hooks / 身份校验拦截
- push 被拒绝、上游指向保护分支

## 输出示例

```text
## git-flow commit
- 操作仓库: pro-ui（D:/work/pro-ui）
- 当前分支: jiangshun/fix/4.1-PRO-159115
- 目标环境: 4.1（分支名）
- 远端: origin

### 执行
1. 多仓库检测: pro-pcb 有 2 处未提交改动 → 用户选择继续 pro-ui
2. git add -A: 3 个文件
3. format-keeper: formatted（prettier:auto，2 个文件）
4. mojibake-fixer: 无乱码
5. git add -A: 2 个文件
6. commit-draft: fix(ui): 修复背景色丢失 (PRO-159115)
7. git commit: a1b2c3d

### 结果
- 状态: 成功
- 推送: origin/jiangshun/fix/4.1-PRO-159115
- 下一步: 开发完成并自测后运行 /git-flow-merge；pro-pcb 的改动可用 /git-flow-commit --repo pro-pcb 处理
```
