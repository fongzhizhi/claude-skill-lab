---
name: "gitflow:sync"
description: 将当前任务分支所属环境分支的最新改动合入任务分支：fetch → 比较落后提交 → git merge 环境分支 → 推送；冲突停摆。支持 --repo 操作配置中的兄弟仓库，并在执行前检测其他仓库的遗漏改动。未指定环境时从分支名解析；跨环境同步需确认。
category: git
---
# /gitflow:sync

将**所属环境分支的最新改动合入当前任务分支**（环境分支 → 任务分支，merge，不 rebase）。**执行前必须先读取 `~/.claude/skills/gitflow-core/SKILL.md`**。

## 参数

| 参数 | 说明 |
| --- | --- |
| `--repo <name>` | 操作配置 `repos` 中的指定仓库，无需切换目录；缺省为当前仓库 |
| `[环境]` | 目标环境，如 `4.1`；缺省从当前分支名 `{version}` 解析 |
| `--no-push` | 合并成功后不推送 |

```text
/gitflow:sync
/gitflow:sync 4.1
/gitflow:sync --repo pro-pcb
/gitflow:sync --no-push
```

## 流程

1. **读取共享规则与配置**：读取 core，按第 1 节定位操作目标与配置。

2. **解析操作仓库**：按 core §2.1 确定 `<root>`；`--repo` 指向的仓库必须在配置中且是 Git 仓库根目录。

3. **前置检查**：按 core §2.2 检查工作区、§2.3 检查进行中的 Git 操作与 detached HEAD。工作区不干净 → 停摆，**不得**先 merge。

4. **确认当前分支是任务分支**：按 `branch_pattern` 解析出 `{type}`、`{version}`、`{ticket}`。当前在环境分支、保护分支或非任务分支 → 停摆（本命令只同步任务分支）。

5. **多仓库遗漏检测**：按 core §2.5 扫描配置中的其他仓库；有未提交改动、同名任务分支或仓库不可用 → 停摆提醒，用户选择继续后再进入下一步。

6. **确定目标环境**：

   - 显式参数 → 校验在 `active` 中且有 `envs` 映射
   - 未指定 → 使用分支名中的 `{version}`
   - 显式环境与分支所属环境不同 → **停摆确认**：“当前分支基于 X，却要合入 Y 的最新提交，是否继续？”
   - 目标环境分支不存在 → 停摆

7. **同步远端**：

   ```bash
   git -C <root> fetch <remote> --prune
   ```

   fetch 失败 → 停摆并输出错误。

8. **比较落后提交**：

   ```bash
   git -C <root> rev-list --count HEAD..<remote>/<env-branch>
   ```

   - `0` → 报告“已是最新”，结束（不 merge、不 push）
   - `>0` → 列出待合入提交（最多 20 条）：

     ```bash
     git -C <root> log --oneline --no-decorate HEAD..<remote>/<env-branch> --max-count=20
     ```

9. **合并**：

   ```bash
   git -C <root> merge --no-edit <remote>/<env-branch>
   ```

   - 合并成功（含 fast-forward）→ 继续
   - 冲突 → 停摆：

     ```bash
     git -C <root> diff --name-only --diff-filter=U
     ```

     列出冲突文件，说明“工作区保持冲突状态”，让用户选择：
     - 手动解决后重新运行 `/gitflow:sync`
     - 明确确认后执行 `git merge --abort` 放弃本次合并
     - 其他处理方式

     **不自动解决冲突、不自动 abort、不选择 ours/theirs。**
   - 其他失败（工作区被外部修改、hook 失败等）→ 停摆并输出原始错误

10. **推送**（除非 `--no-push`）：

    ```bash
    git -C <root> rev-parse --abbrev-ref --symbolic-full-name '@{u}'
    ```

    - 无上游 → `git push -u <remote> HEAD`（`<remote>` 取配置，缺省 `origin`）
    - 有上游 → 确认上游不是环境/保护分支；是 → 停摆
    - 正常上游 → `git push`

    推送被拒绝 → 停摆。若远端任务分支有本地没有的提交，说明可能在其他机器上开发过；列出提示，让用户决定如何处理，**不自动 pull/merge/rebase/force**。

11. **输出结果**：操作仓库、目标环境、合并的提交数、是否 fast-forward、冲突情况、推送结果、下一步建议。

## 停摆条件

通用停摆条件见 core §2（工作区 / 进行中操作 / 远端）、§5（保护分支 / 命令失败 / 状态不符）。本命令特有：

- 当前分支不是任务分支或处于保护分支
- 多仓库遗漏检测命中且用户未选择继续
- 目标环境不在 `active`、缺少 `envs` 映射、环境分支不存在
- 跨环境同步未经确认
- merge 冲突或 merge 其他失败
- push 被拒绝或上游指向保护分支

## 输出示例

```text
## gitflow:sync
- 操作仓库: pro-ui（D:/work/pro-ui）
- 当前分支: jiangshun/fix/4.1-PRO-159115
- 目标环境: 4.1（分支名）
- 远端: origin

### 执行
1. 多仓库检测: 无其他改动
2. fetch origin: 成功
3. 落后提交: 3 个
   - a1b2c3d fix: ...
   - d4e5f6a feat: ...
   - 789abcd chore: ...
4. merge origin/pro-ui/4.1: fast-forward
5. push: origin/jiangshun/fix/4.1-PRO-159115

### 结果
- 状态: 成功
- 下一步: 继续开发后运行 /gitflow:commit
```
