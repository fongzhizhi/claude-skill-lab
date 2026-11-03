---
name: git-flow-init
description: 扫描多仓库工作区生成 .claude/git-flow.json 配置草稿：发现兄弟仓库，按环境列表探测远端环境分支，生成并校验草稿，人工确认后落盘；支持单仓库模式。仓库/环境映射无法自动推断、仓库不可用或目标文件已存在时停摆询问，不猜测映射。
category: git
---
# /git-flow-init

接入 git-flow 的第一步：扫描工作区、探测远端环境分支、生成配置草稿。**先展示、后落盘**；任何无法自动确定的映射都停摆询问，不猜测。

执行前读取 `~/.claude/skills/git-flow-core/SKILL.md` 的 §1.2 / §1.3（字段与校验规则）。本命令**不按 core §1.1 查找配置**——它的任务就是在配置缺失时生成配置；全局默认（`~/.claude/settings.json` 的 `gitFlow`）仍可作为默认值来源。

## 参数

| 参数 | 说明 |
| --- | --- |
| `--dir <path>` | 扫描目录；缺省：当前目录在 Git 仓库内时用仓库根目录的父目录，否则用当前目录 |
| `--repos <a,b,c>` | 只处理指定名称的兄弟仓库；缺省扫描扫描目录下所有直接子仓库 |
| `--single` | 单仓库模式：只为当前仓库生成配置（`path` 为 `.`），不扫描兄弟仓库；与 `--dir`/`--repos` 互斥 |
| `--envs <e1,e2,...>` | 环境列表，从低到高，如 `3.1,3.2,4.1,4.2,dev`；缺省读取全局 `gitFlow.chain`，都没有则停摆询问 |
| `--active <e,...>` | 在用环境子集；缺省等于 `--envs` |
| `--default-env <env>` | 未指定环境时的默认值；缺省为 `active` 最后一项（链式顶端） |
| `--remote <name>` | 远端名，缺省 `origin`（或全局 `gitFlow.remote`） |
| `--output <path>` | 输出路径；缺省见“输出位置” |
| `--dry-run` | 只输出草稿与校验结果，不落盘 |

```text
/git-flow-init --envs 3.1,3.2,4.1,4.2,dev
/git-flow-init --envs 4.1,4.2,dev --repos pro-ui,pro-pcb,pro-api
/git-flow-init --single --envs 4.1,4.2,dev
/git-flow-init --envs 4.1,4.2,dev --dry-run
```

## 流程

1. **确定模式与扫描根目录**：

   - `--single`：当前目录必须在 Git 仓库内，仓库根目录（`git rev-parse --show-toplevel`）即目标仓库；`--dir`/`--repos` 同时出现 → 停摆
   - 否则：`--dir` 有值用 `--dir`；无值且当前目录在仓库内用仓库根目录的父目录；否则用当前目录
   - 扫描根目录不存在 → 停摆

2. **发现仓库**（扫描模式）：

   - 列出扫描根目录的直接子目录中 `test -e "<dir>/.git"` 为真的（目录或 worktree 的 `.git` 文件均可）
   - `--repos` 有值时按目录名过滤；指定的名字不存在 → 停摆并列出候选
   - 一个都没发现时：若扫描根目录本身是 Git 仓库，退化为单仓库（`path` 为 `.`）；否则停摆
   - 每个仓库用 `git -C <dir> rev-parse --show-toplevel` 规范化根目录；重复根目录去重
   - 仓库键默认取目录名

3. **确定环境参数**：

   - `--envs` → `chain`；否则全局 `gitFlow.chain`；都没有 → 停摆，请用户提供环境列表
   - `active`：`--active`，缺省等于 `chain`
   - `default_env`：`--default-env`，缺省 `active` 最后一项
   - `remote`：`--remote`，缺省全局 `gitFlow.remote`，再缺省 `origin`
   - 校验：`active` 是 `chain` 子集、`default_env` 在 `active` 中；失败 → 停摆

4. **探测远端环境分支**（每个仓库一次）：

   ```bash
   git -C <repo-root> ls-remote --heads <remote>
   ```

   `ls-remote` 连接失败 → 停摆并指出仓库与原始错误，不重试。

   对每个仓库 × 环境，按顺序匹配候选分支：

   1. `<仓库键>/<环境>`（如 `pro-ui/4.1`）
   2. `<环境>`（如 `dev`）

   - 恰好命中一个 → 采用
   - 同时命中两个 → 停摆，让用户指定用哪个
   - 一个都没命中 → 记为**未解析**，不猜测

5. **处理未解析映射**：

   输出表格（仓库、环境、远端候选分支），停摆询问。例如：

   ```text
   以下环境无法自动匹配远端分支：
     pro-api  4.1  → 远端分支: pro-api/0.3、pro-api/0.4、pro-api/dev
     pro-api  4.2  → 远端分支: pro-api/0.3、pro-api/0.4、pro-api/dev
     pro-api  dev  → 远端分支: pro-api/0.3、pro-api/0.4、pro-api/dev

   请提供映射（可多个环境指向同一分支），例如：
     4.1=pro-api/0.3, 4.2=pro-api/0.4, dev=pro-api/dev
   ```

   - 用户明确给出后才填入；允许同一仓库多个环境映射到同一远端分支（如 `4.1`、`4.2` 都指向 `pro-api/0.3`）
   - 用户要求跳过某仓库/环境 → 该仓库/环境不写入 `envs`；后续命令用到时按 core 停摆
   - 未得到明确答案 → 停摆，不生成草稿

6. **确定输出位置与路径基准**：

   - `--single`：缺省 `<当前仓库>/.claude/git-flow.json`
   - 扫描模式：缺省 `<扫描根目录>/.claude/git-flow.json`
   - `--output` 覆盖（相对路径按当前目录解析）
   - 配置 base = 输出文件所在目录；若目录名为 `.claude` 则取其上一级（与 core §1.1 一致）
   - 每个仓库的 `path` = 仓库根目录相对 base 的路径，分隔符统一为 `/`；同一目录写 `"."`
   - 例：`<workspace>/.claude/git-flow.json` → `"pro-ui": {"path": "pro-ui"}`；`<repo>/.claude/git-flow.json` → `"path": "."`

7. **生成草稿**（最小完整结构，不写可选默认值）：

   ```json
   {
     "version": 2,
     "remote": "origin",
     "chain": ["3.1", "3.2", "4.1", "4.2", "dev"],
     "active": ["4.1", "4.2", "dev"],
     "default_env": "dev",
     "repos": {
       "pro-ui": {
         "path": "pro-ui",
         "envs": {
           "dev": "pro-ui/dev",
           "4.2": "pro-ui/4.2",
           "4.1": "pro-ui/4.1"
         }
       },
       "pro-api": {
         "path": "pro-api",
         "envs": {
           "dev": "pro-api/dev",
           "4.2": "pro-api/0.4",
           "4.1": "pro-api/0.3"
         }
       }
     }
   }
   ```

8. **校验草稿**（按 core §1.3）：

   - `version` 为 2；`chain` 非空无重复；`active` 是 `chain` 子集
   - `default_env` 在 `active` 中
   - 每个 `repos.*.path` 解析后存在且是 Git 仓库根目录
   - 每个 `envs` 键在 `chain` 中，值在对应仓库远端分支列表中存在
   - 任一失败 → 停摆，指出仓库/字段，不落盘

9. **展示草稿与摘要**，等待用户确认：

   ```text
   配置草稿（3 个仓库，9 条环境映射）：
     pro-ui   path=pro-ui   dev→pro-ui/dev  4.2→pro-ui/4.2  4.1→pro-ui/4.1
     pro-pcb  path=pro-pcb  dev→pro-pcb/dev 4.2→pro-pcb/4.2 4.1→pro-pcb/4.1
     pro-api  path=pro-api  dev→pro-api/dev 4.2→pro-api/0.4 4.1→pro-api/0.3

   目标文件: D:/Code/GitEditor/editor-pro/.claude/git-flow.json
   确认写入？
   ```

   - 目标文件已存在 → **停摆**，展示路径，询问“覆盖（仅在你明确确认后）/ 另存为其他路径（`--output`）/ 取消”；绝不静默覆盖
   - 用户未确认 → 结束，不写文件

10. **落盘**：

    - 创建 `.claude` 目录（如不存在）
    - 以 2 空格缩进、UTF-8 写入；不修改 `.gitignore`
    - `--dry-run`：到此为止，只输出草稿、摘要与目标路径

11. **输出结果**：配置文件路径、仓库数、环境映射数、下一步（从任意仓库运行 `/git-flow-start` 验证；工作区根目录的配置不在任何仓库内，如需团队共享可复制到各仓库的 `.claude/git-flow.json`）。

## 停摆条件

通用停摆条件见 core §5。本命令特有：

- `--single` 与 `--dir`/`--repos` 冲突，或当前目录不在 Git 仓库内
- 扫描不到仓库、指定仓库不存在、仓库不可用
- 环境列表缺失、`active`/`default_env` 非法
- 远端分支探测失败，或候选分支同时命中/无法自动匹配且用户未给出明确映射
- 草稿校验失败
- 目标文件已存在且用户未明确确认覆盖
