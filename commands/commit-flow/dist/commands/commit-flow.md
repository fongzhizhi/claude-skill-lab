---
name: commit-flow
description: 通用提交流水线：敏感文件检查 → 代码格式化 → 乱码检测与修复 → 生成提交信息 → 提交并推送。不依赖 gitflow 配置，允许在任意分支（含 master/main）直接提交。
category: git
---
# /commit-flow

通用提交流水线，面向单仓库、无 MR 流程的项目。**不读取 gitflow 配置、不做多仓库遗漏检测、不校验任务分支与保护分支**；当前在哪个分支，就在哪个分支提交并推送。

## 参数

| 参数 | 作用 |
| --- | --- |
| （无） | 完整流水线：检查 → 格式化 → 乱码 → 提交 → 推送 |
| `--no-push` | 只提交，不推送 |
| `--message "<msg>"` | 跳过 commit-draft，直接使用给定提交信息（仍需通过 Git 校验） |

```text
/commit-flow
/commit-flow --no-push
/commit-flow --message "chore(settings): 补充 VSCode 用户配置备份"
```

## 流水线

```text
仓库定位 → 分支信息 → 敏感文件检查 → git add -A
→ format-keeper → mojibake-fixer → git add -A
→ commit-draft → git commit → git push
```

任何一步失败立即停摆，不执行后续步骤；已产生的格式化/乱码修复改动保留在工作区，不自动回滚。

## 流程

### 1. 仓库定位

```bash
git rev-parse --show-toplevel
```

- 失败 → **停摆**：「当前目录不在 Git 仓库内」
- 成功 → 记 `<root>` 为仓库根目录，后续所有 Git 命令使用 `git -C <root>`

检查进行中的 Git 操作与 HEAD：

```bash
for f in MERGE_HEAD CHERRY_PICK_HEAD REVERT_HEAD; do
  p=$(git -C <root> rev-parse --git-path "$f"); [ -f "$p" ] && echo "in-progress: $f"
done
for d in rebase-merge rebase-apply; do
  p=$(git -C <root> rev-parse --git-path "$d"); [ -d "$p" ] && echo "in-progress: $d"
done
git -C <root> symbolic-ref -q --short HEAD || echo DETACHED
```

- 任一进行中状态或 `DETACHED` → **停摆**，报告状态，让用户先处理（合并/变基中的提交会改变原操作语义；detached HEAD 的提交会成为游离提交）

### 2. 分支信息

```bash
git -C <root> symbolic-ref -q --short HEAD
```

输出当前分支。分支为 `master` / `main` 时只提示一句「当前在保护主干上，将直接提交」，**不拦截**。

### 3. 敏感文件检查

```bash
git -C <root> ls-files --others --exclude-standard
```

命中以下模式且不在 `.gitignore` 中 → **停摆**，列出文件，询问「加入 `.gitignore` / 移出仓库 / 明确确认提交」：

- `.env`、`.env.*`（`.env.example`、`.env.sample`、`.env.template` 除外）
- `*.pem`、`*.key`、`*.p12`、`*.pfx`、`id_rsa`、`id_ed25519`
- `credentials*`、`secrets.*`

用户明确确认后才继续；不擅自修改 `.gitignore`，不擅自删除文件。**确认后调用 format-keeper 时必须说明该确认**，避免其重复拦截。

### 4. 暂存

```bash
git -C <root> add -A
git -C <root> diff --cached --quiet
```

- `git add -A` 失败 → 停摆并输出原始错误
- `diff --cached --quiet` 退出码 `0` → 报告「没有可提交的改动」，结束（不提交、不推送）

### 5. 格式化（format-keeper）

- 技能不存在（`~/.claude/skills/format-keeper/SKILL.md` 缺失）→ **停摆**，提示 `claude-lab deploy format-keeper`
- 读取 `~/.claude/skills/format-keeper/SKILL.md` 并按其规则执行
- **上下文继承**：format-keeper 的仓库根固定为 `<root>`；所有 `git` 命令使用 `git -C <root>`，`npm run` / `lc-build` 必须在 `<root>` 下执行，不得使用会话当前目录
- 第 3 步用户已明确确认敏感文件时，调用时说明该确认
- 状态 `formatted` / `no_changes` / `skipped` → 继续
- 状态 `failed` → **停摆**，输出原始错误，不提交

### 6. 乱码检测（mojibake-fixer）

先取变更文件清单：

```bash
git -C <root> diff HEAD --name-only --diff-filter=d
```

- 清单为空 → 跳过本步
- 命令不存在（`~/.claude/commands/mojibake-fixer.md` 缺失）→ **停摆**，提示 `claude-lab deploy mojibake-fixer`
- 读取 `~/.claude/commands/mojibake-fixer.md`，把清单中的文件拼成**绝对路径**作为参数传入（可一次多个，或传其所在目录），并明确只扫描清单内文件；不要让它按会话当前仓库执行默认的 `git diff`
- 修复后仍有无法可靠推断的 U+FFFD → **停摆**，列出文件与位置，交由用户处理
- 不强行猜测、不跳过未修复项直接提交

### 7. 再次暂存

```bash
git -C <root> add -A
```

格式化与乱码修复可能产生新改动。

### 8. 生成提交信息

- 有 `--message` → 使用给定内容，校验非空
- 否则读取 `~/.claude/commands/commit-draft.md`，按其规则生成 Conventional Commits 信息
  - 信息收集命令全部改为 `git -C <root> ...`，只使用当前仓库的变更
  - 基于暂存区 diff 与当前会话上下文总结；**不要求、不编造工单号**——会话中确有真实链接时按 commit-draft 自身规则引用，没有则不加
- 生成失败或内容为空 → **停摆**，请用户提供提交信息；**不提交空信息**
- 提交信息写入系统临时目录的文件（不写入仓库），提交后删除

### 9. 提交

```bash
git -C <root> commit -F <临时文件>
```

不添加 `--no-verify`，不自动 `--amend`。提交失败（hooks、身份、冲突等）→ **停摆**并输出原始错误。

### 10. 推送（除非 `--no-push`）

```bash
git -C <root> rev-parse --abbrev-ref --symbolic-full-name '@{u}'
```

- 无上游 → `git -C <root> push -u origin HEAD`
- 有上游 → `git -C <root> push`
- 推送被拒绝（非快进、权限、认证等）→ **停摆**，输出原因与可选方案；**绝不 force、绝不自动 pull/rebase**

### 11. 输出结果

```text
## commit-flow
- 仓库: <root>
- 分支: <branch>
- 远端: origin

### 执行
1. 敏感文件检查: 通过
2. 暂存: N 个文件
3. format-keeper: formatted / no_changes / skipped（工具名）
4. mojibake-fixer: 修复 N 处 / 未发现乱码 / 跳过
5. commit-draft: <subject>
6. git commit: <hash>
7. git push: origin/<branch>

### 结果
- 状态: 成功 / 停摆
- 提交: <hash> <subject>
- 推送: <remote/branch> / 未推送（--no-push）
```

## 停摆条件

- 不在 Git 仓库内、detached HEAD、有进行中的 merge/rebase/cherry-pick/revert
- 命中疑似敏感文件且用户未明确确认
- format-keeper / mojibake-fixer / commit-draft 未部署或执行失败
- 乱码无法可靠推断、未修复完成
- 提交信息为空，或 commit 被 hooks / 身份校验拦截
- push 被拒绝

停摆时必须说明「发生了什么、哪些动作没有执行、可选方案」，不把异常包装成成功。
