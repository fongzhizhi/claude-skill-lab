---
name: git-flow-start
description: 从 ONES 工单创建任务分支：解析工单与环境，未指定环境时使用链式顶端（通常 dev），按 {user}/{feat|fix}/{version}-{ticket} 从远端环境分支创建且不跟踪环境分支。工作区不干净、工单/环境/类型无法确定或分支已存在时停摆询问。
category: git
---
# /git-flow-start

从 ONES 工单创建任务分支。**执行前必须先读取 `~/.claude/skills/git-flow-core/SKILL.md`**，配置读取、前置检查、环境解析、工单解析、分支命名与安全边界全部以 core 为准；本文件只描述 start 的独有流程。

## 参数

| 参数 | 说明 |
| --- | --- |
| `<ONES 单内容 / 单号 / 链接>` | 必填。可粘贴整段工单（ID + 标题 + 链接），也可只给 `PRO-159115` |
| `[环境]` | 可选，如 `4.1`。未指定时按 core 规则使用 `default_env`，缺省为链式顶端（通常 `dev`） |
| `--type feat\|fix` | 可选，显式指定分支类型；优先级高于措辞与前缀映射 |
| `--branch <name>` | 可选，自定义分支名（跳过 `branch_pattern`，仍须通过 `git check-ref-format` 且不能是保护分支） |
| `--no-fetch` | 跳过 `git fetch`（仅在明确知道远端状态时使用；默认必须 fetch） |

```text
/git-flow-start PRO-159115【冒烟测试】显示颜色设置背景色之后，重新打开PCB，背景色丢失
heep:ones.lceda.com/project/#team/TkSb58GQ/issue/PRO-159115
4.1环境的缺陷
```

## 流程

1. **读取共享规则**：读取 `~/.claude/skills/git-flow-core/SKILL.md`；若不存在，停摆并提示先部署 git-flow 套件。

2. **定位仓库与配置**：按 core 第 1 节查找 `.claude/git-flow.json`，确定当前仓库条目、远端与 `envs`。

3. **前置检查**：按 core 第 2 节检查工作区、进行中的 Git 操作与 detached HEAD。工作区不干净 → 停摆并列选项，**不得**先切分支。

4. **解析工单**：按 core 第 4.2 节提取单号、标题、链接。无法提取单号 → 停摆，请用户粘贴完整工单或单号。

5. **确定目标环境**：显式参数 → 用户文本 → `default_env` → `active`/`chain` 顶端。输出必须写明依据，例如：

   ```text
   目标环境: dev（未指定环境，使用链式顶端默认值）
   ```

6. **确定分支类型**：`--type` → 用户措辞（缺陷/修复 → fix；需求/新增 → feat）→ ONES 前缀映射 → 无法确定则停摆。**用户说是缺陷时，`PRO-*` 也建 `fix` 分支。**

7. **生成分支名**：按 `branch_pattern` 替换并校验：

   ```bash
   git -C <root> check-ref-format --branch "<branch>"
   ```

   `--branch` 自定义时同样校验；分支名等于任一环境分支或 `protected` → 停摆。

8. **同步远端**（默认执行）：

   ```bash
   git -C <root> fetch <remote> --prune
   ```

   fetch 失败 → 停摆，原样输出错误。

9. **校验环境分支存在**：

   ```bash
   git -C <root> ls-remote --exit-code --heads <remote> <env-branch>
   ```

   退出码 `2`（不存在）→ 停摆，报告“环境分支不存在”，列出 `repos.<repo>.envs` 的配置，让用户核对。

10. **检查同名分支**：

    - 当前已在该分支 → 报告“已在该任务分支”，直接输出结果，不重复创建。
    - 本地存在同名分支 → 停摆，询问“切换到该分支继续”还是“放弃”。
    - 仅远端存在同名分支 → 停摆，询问“复用远端分支（`git checkout --track -b`）”还是“放弃”。
    - 绝不覆盖、重命名或删除已有分支。

11. **创建分支**（不跟踪环境分支）：

    ```bash
    git -C <root> checkout --no-track -b <branch> <remote>/<env-branch>
    ```

12. **确认上游为空**：

    ```bash
    git -C <root> rev-parse --abbrev-ref --symbolic-full-name '@{u}'
    ```

    预期失败（无上游）。若意外存在上游 → 停摆报告，不自动 `--unset-upstream`。

13. **输出结果**：分支名、基于的环境分支、工单、目标环境及依据、下一步建议（`/git-flow-commit`）。首次 push 由 `/git-flow-commit` 用 `git push -u <remote> HEAD` 完成（`<remote>` 缺省 `origin`）。

## 停摆条件

- 工作区不干净、存在进行中的 merge/rebase/cherry-pick/revert、detached HEAD
- 配置缺失/非法、当前仓库无法匹配 `repos`、目标环境不在 `active`、`envs` 缺少映射
- 工单无法解析、单号不唯一、类型无法确定
- 环境分支不存在、fetch/远端检查失败
- 同名分支已存在（本地或远端）
- 分支名非法或指向保护分支
- 任何命令非零退出或状态与预期不符

停摆时按 core 第 6 节输出：发生了什么、哪些动作未执行、可选方案。不猜测、不绕过。

## 输出示例

```text
## git-flow start
- 仓库: D:/work/pro-ui
- 当前分支: dev
- 目标环境: 4.1（用户文本“4.1环境的缺陷”）
- 远端: origin

### 执行
1. 工单: PRO-159115 【冒烟测试】显示颜色设置背景色之后，重新打开PCB，背景色丢失
2. 类型: fix（用户措辞“缺陷”）
3. 校验环境分支: pro-ui/4.1 存在
4. 创建: jiangshun/fix/4.1-PRO-159115 ← origin/pro-ui/4.1（--no-track）

### 结果
- 状态: 成功
- 分支: jiangshun/fix/4.1-PRO-159115（无上游）
- 下一步: 开发完成后运行 /git-flow-commit
```
