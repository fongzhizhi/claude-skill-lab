---
name: git-flow-sync
description: 把任务分支同步到所属环境分支：fetch 后比较落后提交，git merge origin/<环境分支>，冲突则停摆列出文件，成功后推送。未指定环境时从分支名解析；跨环境同步需确认。工作区不干净或存在进行中的 Git 操作时停摆。
category: git
---
# /git-flow-sync

将当前任务分支与远端环境分支同步（merge，不 rebase）。**执行前必须先读取 `~/.claude/skills/git-flow-core/SKILL.md`**。

## 参数

| 参数 | 说明 |
| --- | --- |
| `[环境]` | 目标环境，如 `4.1`；缺省从当前分支名 `{version}` 解析 |
| `--no-push` | 合并成功后不推送 |

```text
/git-flow-sync
/git-flow-sync 4.1
/git-flow-sync --no-push
```

## 流程

1. **读取共享规则与配置**：按 core 第 1 节定位仓库与配置。

2. **前置检查**：按 core 第 2 节检查工作区、进行中的 Git 操作、detached HEAD。工作区不干净 → 停摆，**不得**先 merge。

3. **确认当前分支是任务分支**：按 `branch_pattern` 解析出 `{type}`、`{version}`、`{ticket}`。当前在环境分支、保护分支或非任务分支 → 停摆（本命令只同步任务分支）。

4. **确定目标环境**：

   - 显式参数 → 校验在 `active` 中且有 `envs` 映射
   - 未指定 → 使用分支名中的 `{version}`
   - 显式环境与分支所属环境不同 → **停摆确认**：“当前分支基于 X，却要合入 Y 的最新提交，是否继续？”
   - 目标环境分支不存在 → 停摆

5. **同步远端**：

   ```bash
   git -C <root> fetch <remote> --prune
   ```

   fetch 失败 → 停摆并输出错误。

6. **比较落后提交**：

   ```bash
   git -C <root> rev-list --count HEAD..<remote>/<env-branch>
   ```

   - `0` → 报告“已是最新”，结束（不 merge、不 push）
   - `>0` → 列出待合入提交（最多 20 条）：

     ```bash
     git -C <root> log --oneline --no-decorate HEAD..<remote>/<env-branch> --max-count=20
     ```

7. **合并**：

   ```bash
   git -C <root> merge --no-edit <remote>/<env-branch>
   ```

   - 合并成功（含 fast-forward）→ 继续
   - 冲突 → 停摆：

     ```bash
     git -C <root> diff --name-only --diff-filter=U
     ```

     列出冲突文件，说明“工作区保持冲突状态”，让用户选择：
     - 手动解决后重新运行 `/git-flow-sync`
     - 明确确认后执行 `git merge --abort` 放弃本次合并
     - 其他处理方式

     **不自动解决冲突、不自动 abort、不选择 ours/theirs。**
   - 其他失败（工作区被外部修改、hook 失败等）→ 停摆并输出原始错误

8. **推送**（除非 `--no-push`）：

   ```bash
   git -C <root> rev-parse --abbrev-ref --symbolic-full-name '@{u}'
   ```

   - 无上游 → `git push -u <remote> HEAD`（`<remote>` 取配置，缺省 `origin`）
   - 有上游 → 确认上游不是环境/保护分支；是 → 停摆
   - 正常上游 → `git push`

   推送被拒绝 → 停摆。若远端任务分支有本地没有的提交，说明可能在其他机器上开发过；列出提示，让用户决定如何处理，**不自动 pull/merge/rebase/force**。

9. **输出结果**：目标环境、合并的提交数、是否 fast-forward、冲突情况、推送结果、下一步建议。

## 停摆条件

- 工作区不干净、进行中的 Git 操作、detached HEAD
- 当前分支不是任务分支 / 处于保护分支
- 目标环境不在 `active`、缺少 `envs` 映射、环境分支不存在
- 跨环境同步未经确认
- fetch 失败、merge 冲突、merge 其他失败
- push 被拒绝或上游指向保护分支

## 输出示例

```text
## git-flow sync
- 仓库: D:/work/pro-ui
- 当前分支: jiangshun/fix/4.1-PRO-159115
- 目标环境: 4.1（分支名）
- 远端: origin

### 执行
1. fetch origin: 成功
2. 落后提交: 3 个
   - a1b2c3d fix: ...
   - d4e5f6a feat: ...
   - 789abcd chore: ...
3. merge origin/pro-ui/4.1: fast-forward
4. push: origin/jiangshun/fix/4.1-PRO-159115

### 结果
- 状态: 成功
- 下一步: 继续开发后运行 /git-flow-commit
```
