---
name: git-flow-commit
description: 在任务分支上完成提交流水线：git add -A → format-keeper 格式化 → mojibake-fixer 检查乱码 → git add -A → commit-draft 生成提交信息 → git commit → git push。默认推送；格式化或乱码检查失败、分支不是任务分支、疑似敏感文件时停摆询问。
category: git
---
# /git-flow-commit

任务分支的提交流水线。**执行前必须先读取 `~/.claude/skills/git-flow-core/SKILL.md`**，配置、分支保护、用户/工单解析与安全边界以 core 为准。

## 参数

| 参数 | 说明 |
| --- | --- |
| `--no-push` | 只提交，不推送 |
| `--message "<msg>"` | 跳过 commit-draft，直接使用给定提交信息（仍需通过 Git 校验） |

```text
/git-flow-commit
/git-flow-commit --no-push
/git-flow-commit --message "fix: 修复背景色丢失 (PRO-159115)"
```

## 流水线

```text
分支校验 → git add -A → format-keeper → mojibake-fixer → git add -A
        → commit-draft → git commit → git push
```

任何一步失败立即停摆，不执行后续步骤；已产生的格式化/乱码修复改动保留在工作区，不自动回滚。

## 流程

1. **读取共享规则与配置**：读取 `~/.claude/skills/git-flow-core/SKILL.md`，按第 1 节定位仓库与配置。

2. **分支校验**（提交前唯一的前置检查）：

   ```bash
   git -C <root> symbolic-ref -q --short HEAD
   ```

   - detached HEAD → 停摆
   - 当前分支等于任一环境分支、`protected`、`main`/`master` → 停摆，**禁止直接提交到保护分支**
   - 当前分支不匹配 `branch_pattern`（`{type}` 不是 `feat`/`fix` 或 `{ticket}` 不合法）→ 停摆，提示先用 `/git-flow-start` 创建任务分支
   - 存在进行中的 merge/rebase/cherry-pick/revert → 停摆

3. **敏感文件检查**（在 `git add` 之前）：

   ```bash
   git -C <root> ls-files --others --exclude-standard
   ```

   命中以下模式且不在 `.gitignore` 中 → **停摆**，列出文件，询问“加入 `.gitignore` / 移出仓库 / 明确确认提交”：

   - `.env`、`.env.*`（`.env.example`、`.env.sample`、`.env.template` 除外）
   - `*.pem`、`*.key`、`*.p12`、`*.pfx`、`id_rsa`、`id_ed25519`
   - `credentials*`、`secrets.*`

   用户明确确认后才继续；不擅自修改 `.gitignore`，不擅自删除文件。

4. **暂存全部改动**（等价于仓库根目录 `git add .`，同时记录删除）：

   ```bash
   git -C <root> add -A
   ```

   若暂存区为空：

   ```bash
   git -C <root> diff --cached --quiet
   ```

   退出码 `0` → 报告“没有可提交的改动”，结束（不提交、不推送）。

5. **格式化**：读取 `~/.claude/skills/format-keeper/SKILL.md`，按规则对本次 git 变更文件执行格式化。

   - 技能不存在 → 停摆，提示 `claude-lab deploy format-keeper`
   - 状态 `formatted` / `no_changes` / `skipped` → 继续
   - 状态 `failed` → 停摆，输出原始错误，不提交

6. **乱码检查**：读取 `~/.claude/commands/mojibake-fixer.md`，按其规则扫描并修复本次变更文件中的 U+FFFD。

   - 命令不存在 → 停摆，提示 `claude-lab deploy mojibake-fixer`
   - 修复后仍有无法可靠推断的 U+FFFD → 停摆，列出文件与位置，交由用户处理
   - 不强行猜测、不跳过未修复项直接提交

7. **再次暂存**（格式化与乱码修复可能产生新改动）：

   ```bash
   git -C <root> add -A
   ```

8. **生成提交信息**：

   - 有 `--message` → 使用给定内容，校验非空
   - 否则读取 `~/.claude/commands/commit-draft.md`，按规则生成 Conventional Commits 信息；从当前分支名提取单号（`{ticket}`），结合会话中的 ONES 内容补充标题/链接
   - 生成失败或内容为空 → 停摆，请用户提供提交信息；**不提交空信息**
   - 提交信息写入系统临时目录的文件（不写入仓库），提交后删除

9. **提交**：

   ```bash
   git -C <root> commit -F <临时文件>
   ```

   不添加 `--no-verify`，不自动 `--amend`。commit 失败（hooks、身份、冲突等）→ 停摆并输出原始错误。

10. **推送**（除非 `--no-push`）：

    ```bash
    git -C <root> rev-parse --abbrev-ref --symbolic-full-name '@{u}'
    ```

    - 无上游 → `git push -u <remote> HEAD`（`<remote>` 取配置，缺省 `origin`）
    - 有上游 → 先确认上游不是环境/保护分支；是 → 停摆（避免误推环境分支），让用户先修正上游
    - 正常上游 → `git push`

    推送被拒绝（非快进、保护分支、权限、认证）→ 停摆，输出原因与可选方案；**绝不 force、绝不自动 pull/rebase**。

11. **输出结果**：格式化状态、乱码修复情况、提交 hash 与 subject、推送结果（远端分支或“未推送”）、下一步建议（`/git-flow-sync` 或 `/git-flow-merge`）。

## 停摆条件

- 非任务分支 / 保护分支 / detached HEAD / 进行中的 Git 操作
- 命中疑似敏感文件且用户未明确确认
- format-keeper 失败或未部署
- mojibake-fixer 未部署，或仍有无法修复的乱码
- commit-draft 无法生成且用户未提供信息
- commit 被 hooks/身份校验拦截
- push 被拒绝、上游指向保护分支、认证失败
- 任何命令非零退出或状态与预期不符

## 输出示例

```text
## git-flow commit
- 仓库: D:/work/pro-ui
- 当前分支: jiangshun/fix/4.1-PRO-159115
- 目标环境: 4.1（分支名）
- 远端: origin

### 执行
1. git add -A: 3 个文件
2. format-keeper: formatted（Prettier，2 个文件）
3. mojibake-fixer: 无乱码
4. git add -A: 2 个文件
5. commit-draft: fix(ui): 修复背景色丢失 (PRO-159115)
6. git commit: a1b2c3d

### 结果
- 状态: 成功
- 推送: origin/jiangshun/fix/4.1-PRO-159115
- 下一步: 开发完成并自测后运行 /git-flow-merge
```
