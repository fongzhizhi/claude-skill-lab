---
name: "gitflow:commit"
description: 在任务分支上完成提交流水线：git add -A → mojibake-fixer 检查乱码 → format-keeper 格式化 → git add -A → commit-draft 生成提交信息 → git commit → git push。默认推送；支持 --repo 操作配置中的兄弟仓库。执行前检测其他仓库改动：与当前分支同名的仓库视为同一任务，自动按相同流水线提交；不同分支的改动一律忽略、不提示、不提交。乱码检查或格式化失败、分支不是任务分支、疑似敏感文件时停摆询问。
category: git
---
# /gitflow:commit

任务分支的提交流水线。**执行前必须先读取 `~/.claude/skills/gitflow-core/SKILL.md`**，配置、操作仓库、分支保护、用户/工单解析与安全边界以 core 为准。

## 参数

| 参数 | 说明 |
| --- | --- |
| `--repo <name>` | 操作配置 `repos` 中的指定仓库，无需切换目录；缺省为当前仓库 |
| `--no-push` | 只提交，不推送 |
| `--message "<msg>"` | 跳过 commit-draft，直接使用给定提交信息（仍需通过 Git 校验） |

```text
/gitflow:commit
/gitflow:commit --no-push
/gitflow:commit --repo pro-pcb
/gitflow:commit --message "fix: 修复背景色丢失 (PRO-159115)"
```

## 流水线

```text
操作仓库解析 → 分支校验 → 多仓库改动检测 → 敏感文件检查
→ git add -A → mojibake-fixer → format-keeper → git add -A
→ commit-draft → git commit → git push
```

乱码修复会改写文本内容（可能改变行长、字符宽度），先修复再格式化，避免修复后的内容不符合格式规则；格式化放在最后可覆盖前序步骤引入的格式偏差。

操作仓库完成后，若缺省模式且存在「同任务待提交」的兄弟仓库（当前分支与操作仓库相同），对它们逐个执行相同流水线；不同分支的仓库改动一律忽略。兄弟仓库失败不阻断操作仓库，也不回滚。

操作仓库任何一步失败立即停摆，不执行后续步骤；已产生的乱码修复/格式化改动保留在工作区，不自动回滚。

## 流程

1. **读取共享规则与配置**：读取 `~/.claude/skills/gitflow-core/SKILL.md`，按 core 第 1 节定位操作目标与配置。

2. **解析操作仓库**：按 core §2.1 确定 `<root>`；`--repo` 指向的仓库必须在配置中且是 Git 仓库根目录。输出写明“操作仓库”。

3. **分支校验**（提交前唯一的工作区前置检查）：
   - 按 core §2.3 检查进行中的 merge/rebase/cherry-pick/revert 与 detached HEAD，命中 → 停摆
   - 当前分支等于操作仓库任一环境分支、`protected`、`main`/`master` → 停摆，**禁止直接提交到保护分支**
   - 当前分支不匹配 `branch_pattern`（`{type}` 不是 `feat`/`fix` 或 `{ticket}` 不合法）→ 停摆，提示先用 `/gitflow:start` 创建任务分支

   ```bash
   git -C <root> symbolic-ref -q --short HEAD
   ```

4. **多仓库改动检测（不询问、不停摆）**：按 core §2.5 扫描配置中的其他仓库，分类为「同任务待提交」「同任务已干净」「其他任务改动」「无法自动处理」。

   - 其他仓库与当前任务分支**同名且有未提交改动** → 视为同一任务，加入待提交清单（第 13 步处理）
   - 其他仓库在**不同分支**上的改动 → 一律忽略，不提示确认、不提交
   - 同名分支但 detached HEAD、处于 merge/rebase 等操作中 → 记入跳过清单，附原因
   - 显式 `--repo <name>` → 本次只提交指定仓库，不自动提交任何兄弟仓库
   - 检测结果只写入最终摘要，不要求用户选择

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

7. **乱码检查**：先取 `<root>` 的变更文件清单，再显式传给 mojibake-fixer，避免它按会话当前仓库执行默认的 `git diff`：

   ```bash
   git -C <root> diff HEAD --name-only --diff-filter=d
   ```

   - 清单为空 → 跳过本步
   - 读取 `~/.claude/commands/mojibake-fixer.md`，把清单中的文件拼成绝对路径作为参数传入（可一次多个，或传其所在目录），并明确只扫描清单内文件
   - 命令不存在 → 停摆，提示 `claude-lab deploy mojibake-fixer`
   - 修复后仍有无法可靠推断的 U+FFFD → 停摆，列出文件与位置，交由用户处理
   - 不强行猜测、不跳过未修复项直接提交

8. **格式化**：读取 `~/.claude/skills/format-keeper/SKILL.md`，按规则执行。该技能会先 `git add -A`，再按 `prettier:auto` → `lc-build` → `package.json` 暂存区脚本的顺序格式化；成功后再次 `git add -A`。

   - 必须在上一步乱码修复之后执行：乱码修复改写的文本可能改变行长/字符宽度，需要格式化重新归一
   - **按 core §2.6 继承操作仓库上下文**：format-keeper 的仓库根固定为 `<root>`，其 `git` 命令使用 `-C <root>`，`npm run` / `lc-build` 必须在 `<root>` 下执行；不得使用会话当前目录
   - 技能不存在 → 停摆，提示 `claude-lab deploy format-keeper`
   - 第 5 步用户已明确确认敏感文件时，调用时说明该确认，避免 format-keeper 重复拦截
   - 状态 `formatted` / `no_changes` / `skipped` → 继续
   - 状态 `failed` → 停摆，输出原始错误，不提交

9. **再次暂存**（乱码修复与格式化可能产生新改动）：

   ```bash
   git -C <root> add -A
   ```

10. **生成提交信息**：

    - 有 `--message` → 使用给定内容，校验非空
    - 否则读取 `~/.claude/commands/commit-draft.md`，按规则生成 Conventional Commits 信息；从当前分支名提取单号（`{ticket}`），结合会话中的 ONES 内容补充标题/链接
    - **按 core §2.6 继承操作仓库上下文**：commit-draft 的 `git diff --cached` / `git diff` 等命令全部改为 `git -C <root> ...`，只使用操作仓库的变更
    - 生成失败或内容为空 → 停摆，请用户提供提交信息；**不提交空信息**
    - 提交信息写入系统临时目录的文件（不写入仓库），提交后删除

    > 配置 `commit.checks` 是预留字段，当前版本不执行；不要把它当作已生效的检查。

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

13. **提交同任务兄弟仓库**（仅缺省模式且第 4 步有待提交仓库）：

    按 core §2.5，对每个「同任务待提交」仓库执行与操作仓库相同的流水线：

    1. 复核：当前仍检出同一任务分支、无进行中操作、非保护分支；不满足 → 跳过并记录原因
    2. 敏感文件检查（规则同第 5 步）；命中 → **跳过该仓库**，记录文件，不询问、不阻断其他仓库
    3. `git -C <sibling> add -A` → mojibake-fixer → format-keeper → `git -C <sibling> add -A`（按 core §2.6 继承该仓库根）
    4. 提交信息：有 `--message` 时所有仓库共用；否则以该仓库暂存区调用 commit-draft 单独生成
    5. `git -C <sibling> commit`；失败 → 记录原始错误，跳过该仓库后续步骤
    6. 推送（除非 `--no-push`）；失败 → 记录原因，不 force、不 pull/rebase
    7. 任一仓库失败不影响其他仓库；不自动回滚已产生的改动

    - 按配置顺序逐个处理；不切换会话目录
    - 「其他任务改动」仓库一律不处理

14. **输出结果**：操作仓库、乱码修复情况、格式化状态、提交 hash 与 subject、推送结果（远端分支或“未推送”）；同任务兄弟仓库逐个列出「已提交 hash / 跳过（原因）」；其他分支改动只列仓库与分支，注明“已忽略”；下一步建议（`/gitflow:sync` 或 `/gitflow:merge`）。

## 停摆条件

通用停摆条件见 core §2.3（进行中操作与 HEAD）、§2.4（远端）、§5（保护分支 / 命令失败 / 状态不符）。本命令不执行 core §2.2 的工作区干净检查。本命令特有：

- 当前分支不是任务分支或指向保护分支
- 命中疑似敏感文件且用户未明确确认（仅操作仓库；兄弟仓库直接跳过，不阻断）
- mojibake-fixer / format-keeper / commit-draft 未部署或执行失败（操作仓库）
- 提交信息为空，或 commit 被 hooks / 身份校验拦截（操作仓库）
- push 被拒绝、上游指向保护分支（操作仓库）

同任务兄弟仓库的敏感文件、流水线或推送失败**不停摆**：跳过该仓库并在结果中记录原因，继续其他仓库。

## 输出示例

```text
## gitflow:commit
- 操作仓库: pro-ui（D:/work/pro-ui）
- 当前分支: jiangshun/fix/4.1-PRO-159115
- 目标环境: 4.1（分支名）
- 远端: origin

### 执行
1. 多仓库检测: pro-pcb 同任务待提交（同名分支）；pro-sch 其他任务改动（分支不同，已忽略）
2. 操作仓库 pro-ui: git add -A → mojibake-fixer（无乱码）→ format-keeper（formatted，2 个文件）→ git add -A
3. commit-draft: fix(ui): 修复背景色丢失 (PRO-159115)
4. git commit: a1b2c3d
5. 同任务仓库 pro-pcb: mojibake-fixer（无乱码）→ format-keeper（formatted，1 个文件）→ git commit: b2c3d4e

### 结果
- 状态: 成功
- pro-ui: 已推送 origin/jiangshun/fix/4.1-PRO-159115
- pro-pcb: 已推送 origin/jiangshun/fix/4.1-PRO-159115
- pro-sch: 已忽略（当前分支 jiangshun/fix/4.1-PRO-160001，与本次任务无关）
- 下一步: 开发完成并自测后运行 /gitflow:merge
```
