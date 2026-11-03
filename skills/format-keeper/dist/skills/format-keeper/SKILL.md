---
name: format-keeper
description: 提交前统一格式化。默认先在仓库根 git add -A，再对 git diff HEAD 的全部变更文件执行格式化：优先 npm run prettier:auto；没有该脚本则用 lc-build prettier；仅当命令报错时才分析 package.json 中作用于当前暂存区的格式化脚本，没有则跳过。会改写暂存区，不改语义、不创建配置、不安装依赖。
version: 0.2.0
---
# format-keeper

提交前的纯格式化执行者，优先适配内部开发环境：**项目有 `prettier:auto` 就用它，没有就用 `lc-build prettier`，两者都报错才回退到 `package.json` 里的暂存区脚本**。

## 核心原则

| 原则 | 说明 |
| --- | --- |
| 统一全量范围 | 不区分暂存区/普通变更区：先 `git add -A`，再格式化 `git diff HEAD` 的全部变更文件（排除删除） |
| 项目工作流优先 | 优先执行项目已定义的 `prettier:auto`；没有才调用内部 `lc-build prettier` |
| 失败才回退 | 只有上述命令报错，才分析 `package.json` 中作用于当前暂存区的格式化脚本；没有则 `skipped` |
| 会写暂存区 | 开始和格式化成功后都执行 `git add -A`；这是本技能的固有行为，调用方无需重复暂存 |
| 不改语义 | 只做空白、缩进、换行、引号、尾逗号等格式调整；命名、魔法数字、结构、注释内容不在范围内 |
| 不创建/修改配置 | 只读取并执行项目已有脚本，不生成、不改写 Prettier/ESLint/Biome 配置 |
| 不自动安装 | 不执行 `npm install`，不触发 `npx` 联网安装 |
| 失败即停 | 回退脚本执行报错、暂存失败、敏感文件/冲突检查不通过 → `failed`，调用方停摆 |
| 不处理乱码 | U+FFFD / 编码错位交给 `mojibake-fixer` |

与 `style-keeper` 的边界：`style-keeper` 管 TS 命名、魔法数字、文件组织等**风格治理**；本技能只管**纯格式化**，不碰命名与结构。

> `prettier:auto` 即使作用于整个仓库也直接执行——这是项目自己定义的工作流，不属于本技能自行扩大范围。`lc-build` 路径只处理本次 `git diff` 文件。

## 执行流程

所有命令在仓库根目录执行；当前目录不是仓库根时先 `cd <root>`（`<root>` 由 `git rev-parse --show-toplevel` 得到）。`npm run` / `lc-build` 依赖当前目录，不能只加 `git -C` 而留在子目录。

### 1. 前置检查

**冲突文件**：

```bash
git -C <root> diff --name-only --diff-filter=U
```

有输出 → `failed`，列出冲突文件，提示先解决冲突；**不执行 `git add`**（避免把冲突文件标记为已解决）。

**未跟踪的敏感文件**（只检查会被 `git add -A` 新加入的文件）：

```bash
git -C <root> ls-files --others --exclude-standard
```

命中以下模式 → `failed`，列出文件，让用户确认或加入 `.gitignore`；不擅自删除、不擅自修改 `.gitignore`。若调用方（如 `/gitflow:commit`）已在本轮明确获得用户对这些文件的提交确认，可继续：

- `.env`、`.env.*`（`.env.example`、`.env.sample`、`.env.template` 除外）
- `*.pem`、`*.key`、`*.p12`、`*.pfx`、`id_rsa`、`id_ed25519`
- `credentials*`、`secrets.*`

### 2. 统一暂存

```bash
git -C <root> add -A
```

等价于仓库根执行 `git add .`，同时记录删除。失败 → `failed`，输出原始错误。

### 3. 确定目标文件

```bash
git -C <root> diff HEAD --name-only --diff-filter=d
```

- 输出为空 → `no_changes`，结束
- 有输出即目标文件；**不按暂存区/未暂存区拆分，也不排除未跟踪文件**（上一步已加入暂存区）

### 4. 优先执行 `prettier:auto`

在仓库根目录先判断脚本是否存在：

```bash
node -e "try{const p=require('./package.json');process.exit(p.scripts&&p.scripts['prettier:auto']?0:1)}catch(e){process.exit(1)}"
```

- 退出码 `0` → 脚本存在，执行：

  ```bash
  cd <root> && npm run prettier:auto
  ```

  - 成功 → `git -C <root> add -A`，状态 `formatted`，工具记为 `prettier:auto`，结束
  - 失败 → 记录原始错误，进入第 6 步回退；**不再尝试 `lc-build`**

- 退出码非 `0`（无脚本或 `package.json` 不存在）→ 进入第 5 步

### 5. 无 `prettier:auto`：执行 `lc-build`

先确认目标文件非空（第 3 步已确认），然后：

```bash
cd <root> && git diff HEAD --name-only --diff-filter=d | xargs lc-build prettier -- --write
```

- 成功 → `git -C <root> add -A`，状态 `formatted`，工具记为 `lc-build prettier`，结束
- 失败 → 记录原始错误，进入第 6 步回退
- 管道左侧 `git diff` 失败时直接 `failed`，不把空输入传给 `lc-build`
- 路径含空格或中文导致 `xargs` 拆分错误时，改用：

  ```bash
  cd <root> && git diff HEAD --name-only --diff-filter=d -z | xargs -0 lc-build prettier -- --write
  ```

### 6. 回退：分析 `package.json` 的暂存区脚本

只有第 4 步的 `npm run prettier:auto` 或第 5 步的 `lc-build` **执行报错**才进入本步；`prettier:auto` 不存在不算报错，直接走第 5 步。读取 `package.json` 的 `scripts`，只接受**明确作用于当前暂存区**的格式化脚本：

1. 命令含 `lint-staged`（如 `lint-staged`、`lint-staged --diff`）
2. 脚本名含 `staged`（如 `format:staged`、`prettier:staged`）
3. 命令含 `git diff --cached` / `git diff --staged`，或显式接收文件列表并已用暂存区文件填充

拒绝执行仓库级脚本（如 `prettier --write .`、`eslint --fix .`、`format` 里的 `.` / `src/`）；即使脚本名含 `staged`，只要命令实际作用于整个仓库也不执行。**不改写脚本、不自行拼接仓库级命令**。已失败的 `prettier:auto` 不再作为候选。

- 恰好一个候选 → 在仓库根执行 `cd <root> && npm run <script>`：
  - 成功 → `git -C <root> add -A`，状态 `formatted`，工具记为 `package:<script>`，结束
  - 失败 → `failed`，输出原始错误
- 多个候选且无法确定 → `failed`，列出候选脚本让用户指定；**不猜测**
- 没有候选 → `skipped`，输出第 4/5 步的原始错误 + “package.json 中没有作用于当前暂存区的格式化脚本”，结束

主命令失败前可能已改动部分文件；这些改动保留在工作区，不自动回滚。调用方若继续，后续的 `git add -A` 会把它们纳入暂存区。

### 7. 输出

```text
## format-keeper 结果
- 状态: formatted / no_changes / skipped / failed
- 来源: prettier:auto / lc-build / package:<script> / none
- 目标: N 个变更文件
- 暂存: 已执行 git add -A / 未执行
- 结果: 已格式化 / 无变化 / 跳过
- 主命令错误: <prettier:auto 或 lc-build 的原始错误，如有>
- 回退: <脚本名 + 结果，如有>
- 失败: <原始错误 + 建议下一步>
```

状态语义（供调用方判断）：

| 状态 | 含义 | 调用方（如 `/gitflow:commit`） |
| --- | --- | --- |
| `formatted` | 格式化命令成功，已重新 `git add -A` | 继续 |
| `no_changes` | 相对 HEAD 没有变更文件 | 继续 |
| `skipped` | 主命令失败且没有可用的暂存区回退脚本 | 继续（记录警告，提交不阻塞） |
| `failed` | 冲突/敏感文件/暂存失败/回退脚本执行报错/候选不唯一 | **停摆**，交给用户 |

## 内嵌调用片段（供 `/gitflow:commit` 等引用）

```text
格式化步骤（format-keeper）：
1. 在仓库根执行 git add -A（等价 git add .，包含删除）
2. 目标 = git diff HEAD --name-only --diff-filter=d 的全部变更文件，不区分暂存/未暂存
3. 有 package.json#scripts["prettier:auto"] → npm run prettier:auto
4. 没有 → git diff HEAD --name-only --diff-filter=d | xargs lc-build prettier -- --write
5. 成功后再 git add -A；命令报错才分析 package.json 中作用于当前暂存区的格式化脚本
6. 无可用命令 → skipped；回退脚本报错/冲突/敏感文件 → failed，调用方停摆
7. 不改语义、不创建配置、不安装依赖、不处理乱码
```

## 边界

- 不再做通用工具检测：不按 Prettier/ESLint/Biome 配置文件或语言专用工具自行选型，只走 `prettier:auto` → `lc-build` → package.json 暂存区脚本
- 不执行自行拼接的仓库级格式化命令；`prettier:auto` 是项目预先定义的例外
- 不创建/修改格式化配置，不安装/升级工具
- 不提交、不推送、不切分支
- 不处理乱码、二进制内容、生成文件；工具因这些文件报错时按回退流程处理
