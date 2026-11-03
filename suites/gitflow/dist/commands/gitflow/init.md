---
name: "gitflow:init"
description: 管理唯一的 ~/.claude/gitflow.json：默认只扫描当前仓库，--all 扫描当前仓库父目录下的全部兄弟仓库；探测远端环境分支，创建或增量更新配置。已存在时只更新本次涉及的仓库条目，保留其他条目与手工字段，确认后落盘。无法自动推断映射时停摆询问。
category: git
---

# /gitflow:init

管理 gitflow 的**唯一配置** `~/.claude/gitflow.json`。默认只处理当前仓库；`--all` 扫描当前仓库所在工作区的全部兄弟仓库。文件不存在则创建，已存在则**增量更新本次涉及的仓库条目**，保留其他仓库与手工字段。

- 不创建项目/工作区 `.claude/gitflow.json`
- 不读取 `settings.json` 或其他配置文件，不存在优先级
- 先展示草稿/变更摘要，确认后落盘；无法自动确定的映射停摆询问，不猜测

执行前读取 `~/.claude/skills/gitflow-core/SKILL.md` 的 §1.2 / §1.3（字段与校验规则）。本命令负责创建/更新配置，不按 core §1.1 的运行时读取流程查找其他文件。

## 参数

| 参数 | 说明 |
| --- | --- |
| `--all` | 扫描当前仓库根目录的父目录下所有直接子仓库，创建/更新这些仓库的条目；缺省只处理当前仓库 |
| `--envs <e1,e2,...>` | 环境链，从低到高，如 `3.1,3.2,4.1,4.2,dev`；缺省沿用配置中的 `chain`；两者都没有则停摆询问 |
| `--active <e,...>` | 在用环境子集；缺省沿用配置，否则等于 `chain` |
| `--default-env <env>` | 未指定环境时的默认值；缺省沿用配置，否则为 `active` 最后一项（链式顶端） |
| `--remote <name>` | 远端名；缺省沿用配置，否则 `origin` |
| `--dry-run` | 只输出草稿与变更摘要，不落盘 |

```text
/gitflow:init --envs 3.1,3.2,4.1,4.2,dev
/gitflow:init --all --envs 3.1,3.2,4.1,4.2,dev
/gitflow:init                     # 配置已存在时，沿用 chain 等字段，只更新当前仓库
/gitflow:init --all --dry-run
```

## 流程

1. **定位当前仓库与工作区**：

   ```bash
   root=$(git -C . rev-parse --show-toplevel)
   workspace=$(dirname "$root")
   key=$(basename "$root")
   ```

   - 当前目录不在 Git 仓库内 → 停摆，要求进入仓库后重跑
   - 配置路径固定为 `~/.claude/gitflow.json`；不创建其他位置的配置
   - 单个仓库的 `path` = 仓库根目录相对 `workspace` 的路径（标准布局即目录名 `key`）

2. **确定目标仓库**：

   - 缺省：只有当前仓库
   - `--all`：列出 `workspace` 下直接子目录中 `test -e "<dir>/.git"` 为真的仓库（`.git` 目录或 worktree 的 `.git` 文件均可），并确保当前仓库在列表中
   - 每个仓库用 `git -C <dir> rev-parse --show-toplevel` 规范化根目录，去重
   - 仓库键 = 仓库根目录名；`path` = 该目录名（相对 `workspace`）；目录名重复时停摆，要求手工处理
   - `--all` 只扫描直接子仓库，不递归嵌套仓库

3. **读取现有配置**：

   - `~/.claude/gitflow.json` 不存在 → 新建草稿
   - 已存在 → 读取并解析；JSON 非法或 `version` 不为 `2` → **停摆**，展示文件路径与错误，不覆盖
   - 记录现有顶层字段与 `repos`；除本次更新字段外，全部原样保留（如 `user`、`branch_pattern`、`branch_types`、`protected`、`mr`、`commit` 及未知字段）
   - 现有 `repos` 中未被本次扫描到的条目一律保留，不删除

4. **确定全局字段**：

   - `chain`：`--envs` → 否则沿用配置 `chain`；都没有 → 停摆，请用户提供 `--envs`
   - `active`：`--active` → 否则沿用配置 `active`（须为 `chain` 子集）→ 否则等于 `chain`
   - `default_env`：`--default-env` → 否则沿用配置 `default_env`（须在 `active` 中）→ 否则 `active` 最后一项
   - `remote`：`--remote` → 否则沿用配置 `remote` → 否则 `origin`
   - 显式参数与现有值冲突时，以显式参数为准；现有值非法且未显式覆盖 → 停摆指出字段
   - 校验：`chain` 非空无重复，`active` 是 `chain` 子集，`default_env` 在 `active` 中

5. **探测每个目标仓库的环境分支**：

   ```bash
   git -C <root> ls-remote --heads <remote>
   ```

   连接失败或远端不存在 → 停摆并指出仓库与原始错误，不重试。

   对每个目标仓库 × `chain` 中的环境：

   1. 若现有 `repos.<key>.envs[<env>]` 存在，且该分支仍在远端分支列表中 → **沿用现有映射**（标记“沿用”），不再自动匹配
   2. 否则按候选匹配：
      - `<仓库键>/<环境>`（如 `pro-ui/4.1`）
      - `<环境>`（如 `dev`）
      - 恰好命中一个 → 采用
      - 同时命中两个 → 停摆，让用户指定
      - 一个都没命中 → 记为**未解析**
   3. 现有映射指向的分支已不存在 → 记为未解析，重新询问

6. **处理未解析映射**：

   输出表格（仓库、环境、远端候选分支），停摆询问。例如：

   ```text
   以下环境无法自动匹配远端分支：
     pro-api  4.1  → 远端候选: pro-api/0.3、pro-api/0.4、pro-api/dev
     pro-api  4.2  → 远端候选: pro-api/0.3、pro-api/0.4、pro-api/dev
     pro-api  dev  → 远端候选: pro-api/0.3、pro-api/0.4、pro-api/dev

   请提供映射（可多个环境指向同一分支），例如：
     4.1=pro-api/0.3, 4.2=pro-api/0.4, dev=pro-api/dev
   ```

   - 用户明确给出后才填入；允许同一仓库多个环境映射到同一远端分支
   - 用户要求跳过某仓库/环境 → 该环境不写入该仓库的 `envs`；后续命令用到时按 core 停摆
   - 未得到明确答案 → 停摆，不生成草稿

7. **合并草稿**：

   - 以现有配置为基底（不存在则新建），更新 `version`、`remote`、`chain`、`active`、`default_env`
   - 对每个目标仓库写入/更新 `repos.<key>`：
     - `path` = 仓库目录名（相对 `workspace`）
     - `envs` = 本次解析出的环境映射；保留该条目下未知的仓库级字段
     - 现有条目中不属于新 `chain` 的环境键移除（配置已无效），在摘要中列出
   - 未扫描的仓库条目保持原样
   - 现有 `repos` 中若存在 `envs` 键不在新 `chain` 中，且该仓库未被本次扫描 → **停摆**，提示先在对应工作区运行 `/gitflow:init --all` 更新，或手工修正；不写入非法配置

8. **校验草稿**（按 core §1.3）：

   - `version` 为 `2`；`chain` 非空无重复；`active` 是 `chain` 子集；`default_env` 在 `active` 中
   - 每个目标仓库 `path` 解析后存在且是 Git 仓库根目录
   - 目标仓库每个 `envs` 键在 `chain` 中，值在对应仓库远端分支列表中存在
   - 保留仓库的 `envs` 键都在新 `chain` 中（路径存在性不检查，可能属于其他本地工作区）
   - 任一失败 → 停摆，指出仓库/字段，不落盘

9. **展示草稿与变更摘要**，等待用户确认：

   ```text
   配置文件: C:/Users/<用户>/.claude/gitflow.json（更新 / 新建）
   环境链: 3.1,3.2,4.1,4.2,dev（沿用配置 / --envs）
   在用环境: 4.1,4.2,dev
   默认环境: dev
   远端: origin

   本次处理:
     pro-ui  更新   dev→pro-ui/dev  4.2→pro-ui/4.2  4.1→pro-ui/4.1
     pro-pcb 新增   dev→pro-pcb/dev 4.2→pro-pcb/4.2 4.1→pro-pcb/4.1
   保留未扫描:
     pro-sch、pro-api（共 2 个）
   移除的过期环境键:
     pro-ui: 3.2（不在新 chain 中）

   确认写入 ~/.claude/gitflow.json？
   ```

   - 草稿内容与现有配置完全一致 → 输出“配置已是最新，无需写入”，结束，不重复落盘
   - 用户未确认 → 结束，不写文件
   - `--dry-run`：展示后结束，不写文件

10. **落盘**：

    - 确保 `~/.claude` 存在
    - 以 2 空格缩进、UTF-8、末尾换行写入 `~/.claude/gitflow.json`
    - 只写这一个文件；不创建 `.claude/gitflow.json`，不修改 `settings.json`
    - 写入失败 → 停摆并输出原始错误

11. **输出结果**：

    - 配置文件路径、新建/更新、本次新增/更新/保留的仓库数、环境链
    - 下一步：在当前仓库运行 `/gitflow:start` 验证；其他工作区无需再生成配置，直接使用同一份 `~/.claude/gitflow.json`
    - 若某个克隆的仓库目录名不同，在该克隆运行 `/gitflow:init` 会新增/更新对应目录名的条目，不影响已有条目

## 停摆条件

通用停摆条件见 core §5。本命令特有：

- 当前目录不在 Git 仓库内
- 现有 `~/.claude/gitflow.json` 不是合法 JSON 或 `version` 不为 `2`
- 没有 `--envs` 且现有配置没有 `chain`
- `active` / `default_env` 非法且未显式覆盖
- 远端分支探测失败
- 候选分支同时命中或无法自动匹配，且用户未给出明确映射
- 新旧 `chain` 冲突导致保留仓库存在过期 `envs` 键，且用户未处理
- 仓库目录名重复、草稿校验失败、写入失败
