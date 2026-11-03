---
name: "gitflow:start"
description: 从 ONES 工单创建任务分支：解析工单与环境，未指定环境时使用链式顶端（通常 dev），按 {user}/{feat|fix}/{version}-{ticket} 从远端环境分支创建且不跟踪环境分支。支持 --repo 指定配置中的兄弟仓库，支持 --repos 为多个仓库创建同名对齐任务分支（只创建、不切换）。操作仓库工作区不干净、工单/环境/类型无法确定或分支已存在时停摆询问；对齐仓库工作区不干净只提醒。
category: git
---
# /gitflow:start

从 ONES 工单创建任务分支。**执行前必须先读取 `~/.claude/skills/gitflow-core/SKILL.md`**，配置读取、操作仓库、前置检查、环境解析、工单解析、分支命名与安全边界全部以 core 为准；本文件只描述 start 的独有流程。

## 参数

| 参数 | 说明 |
| --- | --- |
| `<ONES 单内容 / 单号 / 链接>` | 必填。可粘贴整段工单（ID + 标题 + 链接），也可只给 `PRO-159115` |
| `[环境]` | 可选，如 `4.1`。未指定时按 core 规则使用 `default_env`，缺省为链式顶端（通常 `dev`） |
| `--repo <name>` | 操作配置 `repos` 中的指定仓库，无需切换目录；缺省为当前仓库 |
| `--repos <a,b,c\|all>` | 同时在指定兄弟仓库创建同名对齐任务分支（只创建、不切换）；`all` 表示配置中除操作仓库外的全部仓库 |
| `--type feat\|fix` | 可选，显式指定分支类型；优先级高于措辞与前缀映射 |
| `--branch <name>` | 可选，自定义分支名（跳过 `branch_pattern`，仍须通过 `git check-ref-format` 且不能是保护分支） |
| `--no-fetch` | 跳过 `git fetch`（仅在明确知道远端状态时使用；默认必须 fetch） |

```text
/gitflow:start PRO-159115【冒烟测试】显示颜色设置背景色之后，重新打开PCB，背景色丢失
heep:ones.lceda.com/project/#team/TkSb58GQ/issue/PRO-159115
4.1环境的缺陷

/gitflow:start PRO-159115 4.1环境的缺陷 --repos pro-pcb,pro-api
```

## 流程

1. **读取共享规则**：读取 `~/.claude/skills/gitflow-core/SKILL.md`；若不存在，停摆并提示先部署 gitflow 套件。

2. **解析操作仓库与配置**：按 core 第 1 节查找配置，按 §2.1 确定 `<root>`；`--repo` 指向的仓库必须在配置中且是 Git 仓库根目录。

3. **前置检查**：按 core §2.2 检查工作区、§2.3 检查进行中的 Git 操作与 detached HEAD。工作区不干净 → 停摆并列选项，**不得**先切分支。

4. **解析工单**：按 core §4.2 提取单号、标题、链接。无法提取单号 → 停摆，请用户粘贴完整工单或单号。

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

13. **为兄弟仓库创建对齐分支**（仅当指定 `--repos`）：

    对每个仓库（`all` 展开为配置中除操作仓库外的全部仓库；去重，忽略操作仓库本身）：

    1. 校验仓库名存在于 `repos`、路径解析后是 Git 仓库根目录；否则停摆
    2. 按 core §2.2 检查该仓库工作区；不干净 → **只提醒、不阻断**（`git branch` 只写分支引用，不改工作区），继续创建
    3. 按 core §3 校验该仓库 `envs` 有目标环境映射；没有 → 停摆
    4. 同步远端（除非 `--no-fetch`）：

       ```bash
       git -C <sibling-root> fetch <remote> --prune
       ```

    5. 校验该仓库的环境分支存在：

       ```bash
       git -C <sibling-root> ls-remote --exit-code --heads <remote> <sibling-env-branch>
       ```

    6. 检查同名分支：
       - 本地已存在同名分支 → 停摆，询问“复用现有分支（不重建）/ 跳过该仓库 / 放弃”
       - 仅远端存在同名分支 → 停摆，询问“从远端同名分支创建 / 从环境分支新建 / 跳过该仓库 / 放弃”
       - 都没有 → 继续
    7. **只创建、不切换**兄弟仓库工作区：

       ```bash
       git -C <sibling-root> branch --no-track <branch> <remote>/<sibling-env-branch>
       ```

    8. 确认新分支上游为空：

       ```bash
       git -C <sibling-root> rev-parse --abbrev-ref --symbolic-full-name '<branch>@{u}'
       ```

       预期失败（无上游）；意外存在上游 → 停摆报告。

    > 兄弟仓库用 `git branch` 创建而非 `checkout`，避免未经确认改变其他仓库的工作区。需要在该仓库开发时，再执行 `git -C <sibling-root> checkout <branch>` 或直接用 `/gitflow:commit --repo <name>`。

    任一仓库失败 → 停摆，报告已创建与未创建的仓库；不自动删除已创建分支。

14. **输出结果**：操作仓库、分支名、基于的环境分支、工单、目标环境及依据、对齐仓库表（仓库 / 分支 / 是否新建 / 是否已切换）、下一步建议（`/gitflow:commit`）。首次 push 由 `/gitflow:commit` 用 `git push -u <remote> HEAD` 完成（`<remote>` 缺省 `origin`）。

## 停摆条件

通用停摆条件见 core §2（工作区 / 进行中操作 / 远端）、§5（保护分支 / 命令失败 / 状态不符）。本命令特有：

- 工单无法解析、单号不唯一、类型无法确定
- 目标环境不在 `active`、`envs` 缺少映射、环境分支不存在
- 分支名非法或指向保护分支
- 操作仓库或对齐仓库存在同名分支
- 对齐仓库不可用或环境映射缺失（工作区不干净只提醒，不停摆）

## 输出示例

```text
## gitflow:start
- 操作仓库: pro-ui（D:/Code/GitEditor/editor-pro/pro-ui）
- 当前分支: dev
- 目标环境: 4.1（用户文本“4.1环境的缺陷”）
- 远端: origin

### 执行
1. 工单: PRO-159115 【冒烟测试】显示颜色设置背景色之后，重新打开PCB，背景色丢失
2. 类型: fix（用户措辞“缺陷”）
3. 校验环境分支: pro-ui/4.1 存在
4. 创建: jiangshun/fix/4.1-PRO-159115 ← origin/pro-ui/4.1（--no-track）
5. 对齐分支:
   - pro-pcb  jiangshun/fix/4.1-PRO-159115 ← origin/pro-pcb/4.1（新建，未切换）
   - pro-api  jiangshun/fix/4.1-PRO-159115 ← origin/pro-api/0.3（新建，未切换）

### 结果
- 状态: 成功
- 分支: jiangshun/fix/4.1-PRO-159115（操作仓库，已切换）
- 下一步: 开发完成后运行 /gitflow:commit；兄弟仓库用 --repo 处理
```
