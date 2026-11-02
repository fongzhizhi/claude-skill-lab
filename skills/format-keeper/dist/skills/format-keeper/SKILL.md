---
name: format-keeper
description: 按项目已有工具统一代码格式（Prettier / ESLint --fix / Biome / rustfmt / gofmt / clang-format 等），默认只处理 git diff 变更文件，支持指定文件或目录与 --check；只做纯格式化，不改语义、不创建配置、不做仓库级格式化，无可用工具时报告跳过。作为 git-flow 提交流水线的格式化步骤，可独立运行或被其他命令内嵌引用。
version: 0.1.0
---
# format-keeper

纯格式化执行者：**只跑目标项目已有的格式化工具，不替项目做格式化决策**。

## 核心原则

| 原则 | 说明 |
| --- | --- |
| 只格式化目标文件 | 默认本次 git 变更文件；绝不执行 `prettier --write .`、`eslint --fix .` 这类仓库级操作 |
| 不改语义 | 只做空白、缩进、换行、引号、尾逗号等格式调整；命名、魔法数字、结构、注释内容不在本技能范围 |
| 不创建/修改配置 | ESLint / Prettier / Biome 配置是项目级决策，本技能只读取并执行，不生成、不改写 |
| 不自动安装依赖 | 工具缺失时报告并跳过，不执行 `npm install`，也不触发 `npx` 的联网安装 |
| 失败即停 | 工具执行报错 → 停，输出原始错误；无工具可用 → 报告 `skipped`，不阻塞调用方 |
| 不处理乱码 | U+FFFD / 编码错位交给 `mojibake-fixer`；格式化后发现乱码时提示调用方先修复 |

与 `style-keeper` 的边界：`style-keeper` 管 TS 命名、魔法数字、文件组织等**风格治理**；本技能只管**纯格式化**，不碰命名与结构。两者都可能以 ESLint / Prettier 为底层工具，但目标不同。

## 确定目标文件

### 默认模式（git 变更文件）

```bash
git diff --name-only --diff-filter=ACMR -z HEAD
git ls-files --others --exclude-standard -z
```

合并去重（保留相对路径）。没有目标文件 → 输出“没有可格式化的变更文件”并结束。

### 手动指定

| 参数 | 行为 |
| --- | --- |
| `<文件路径>` | 只处理该文件；路径不存在 → 停 |
| `<目录路径>` | 递归处理目录内可格式化的文本文件（排除忽略目录） |
| `--staged` | 只处理已暂存文件（`git diff --cached --name-only --diff-filter=ACMR -z`） |
| `--check` | 只检查不写入，报告“将会被格式化”的文件 |

### 过滤规则

以下文件不传给格式化工具：

- 目录：`node_modules/`、`.git/`、`dist/`、`build/`、`out/`、`coverage/`、`.next/`、`.nuxt/`、`target/`、`vendor/`、`Pods/`、`venv/`、`.venv/`、`__pycache__/`
- 锁文件：`package-lock.json`、`pnpm-lock.yaml`、`yarn.lock`、`bun.lockb`、`Cargo.lock`、`go.sum`、`poetry.lock`、`Pipfile.lock`、`composer.lock`、`Gemfile.lock`
- 生成/压缩文件：`*.min.js`、`*.min.css`、`*.map`、`*.generated.*`、`*.g.*`、`__snapshots__/`
- 二进制/媒体：图片、字体、音视频、压缩包等（按扩展名排除，不要尝试读取）
- 含冲突标记的文件：命中 `<<<<<<< ` / `>>>>>>> ` 时**停**，先让用户解决冲突

`.gitignore` 已由 `--exclude-standard` 处理；工具的 `.prettierignore` / `.eslintignore` 由工具自身处理，本技能不重复实现。

## 检测并选择格式化工具

**只读取项目已有配置与脚本，不创建、不安装。** 先读 `package.json`（若存在），按以下顺序确定工具。

### 1. 项目脚本

识别 `package.json` 的 `format` / `format:fix` / `lint:fix` / `fix` 脚本，读取其命令：

| 脚本内容 | 处理 |
| --- | --- |
| 含 `prettier` | 直接调用 Prettier，把 `.` / `src/` 等仓库级目标替换为**目标文件列表** |
| 含 `eslint` | 直接调用 ESLint `--fix`，传目标文件 |
| 含 `biome` | 直接调用 Biome，传目标文件 |
| 其他自定义脚本 | **不直接执行**（可能格式化整个仓库）；报告“脚本无法安全限定文件范围”，回退到配置检测 |

不要执行 `npm run format` 这类可能作用于整个仓库的脚本；命令必须带目标文件。脚本里有 `--config`、`--cache` 等选项时保留，只替换仓库级目标。

### 2. 配置文件与工具

| 工具 | 检测信号 | 适用扩展名 | 写入命令 |
| --- | --- | --- | --- |
| Biome | `biome.json` / `biome.jsonc` | js/jsx/ts/tsx/json/jsonc/css | `<pm> biome format --write <files>` |
| Prettier | `.prettierrc*`、`prettier.config.*`、`package.json#prettier` | js/jsx/ts/tsx/mjs/cjs/json/jsonc/json5/css/scss/less/html/vue/svelte/md/mdx/yaml/yml/graphql/gql | `<pm> prettier --write --ignore-unknown <files>` |
| ESLint | `eslint.config.*`、`.eslintrc*`、`package.json#eslintConfig` | js/jsx/ts/tsx/mjs/cjs/vue/svelte | `<pm> eslint --fix <files>` |
| rustfmt | `Cargo.toml` 或 `rustfmt.toml` / `.rustfmt.toml` | rs | `rustfmt <files>` |
| gofmt | `go.mod` | go | `gofmt -w <files>` |
| clang-format | `.clang-format` / `_clang-format` | c/cc/cpp/cxx/h/hpp/hxx | `clang-format -i <files>` |
| Ruff | `pyproject.toml` 含 `[tool.ruff]` | py | `ruff format <files>` |
| Black | `pyproject.toml` 含 `[tool.black]` 或 `.black` | py | `black <files>` |
| shfmt | 已安装 `shfmt` | sh/bash | `shfmt -w <files>` |

`<pm>` 的选取：

1. `package.json` 的 `packageManager` 字段：`pnpm@` → `pnpm exec`，`yarn@` → `yarn`，`bun@` → `bunx`，`npm@` → `npx --no-install`
2. 否则按锁文件：`pnpm-lock.yaml` → `pnpm exec`，`yarn.lock` → `yarn`，`bun.lockb` → `bunx`，`package-lock.json` / `npm-shrinkwrap.json` → `npx --no-install`
3. 都没有 → `npx --no-install`
4. `node_modules/.bin/<tool>` 存在时优先直接用该路径，避免联网解析

**同时存在多个工具时**：

- 项目脚本已定义顺序 → 按脚本顺序，但只传目标文件
- 无脚本 → ESLint `--fix` 先执行，Prettier 最后执行（让格式以 Prettier 为准）；Biome 存在时优先 Biome，不再叠加 Prettier / ESLint
- 不同扩展名交给对应工具；不要把工具不支持的扩展名传给它

### 3. 无可用工具

报告：

```text
未发现可用的格式化工具（无 format 脚本 / Prettier / ESLint / Biome / 语言 formatter）。
跳过格式化，不阻塞后续流程。
建议：在项目中落地 Prettier 或 ESLint 配置，或添加 format 脚本。
```

这是 `skipped`，不是 `failed`。

### 4. 工具存在但无法安全执行

例如：脚本是自定义命令、配置存在但工具未安装、`npx --no-install` 找不到二进制。输出具体原因，归类为 `failed`（配置存在但执行不了）或 `skipped`（项目本来就没有工具）。不要自动安装。

## 执行

1. 读取目标文件列表，过滤、去重、排序。
2. 按扩展名分组，选择工具与命令。
3. 批量执行：文件数 ≤ 50 可一次传入；超过时按 50 个一批，避免命令行过长。
4. 路径含空格/中文时加引号；不要用未加引号的变量拼接。
5. `--check` 模式：Prettier `--check`、ESLint 不加 `--fix`、Biome `check` 不加 `--write`、gofmt `-l`、rustfmt `--check`、clang-format `--dry-run --Werror`；工具返回非零表示“有文件需要格式化”，不是失败。
6. 写入模式：工具返回非零 → `failed`，停止并把原始错误贴给用户。
7. 执行后对比 `git status --porcelain` 前后差异，确认**只有目标文件**被修改；若出现目标范围外的文件变化 → 停，报告“工具改动了范围外文件”，不要自动回滚。

## 输出

```text
## format-keeper 结果
- 状态: formatted / no_changes / skipped / failed
- 模式: 写入 / 检查
- 工具: <工具名 + 版本（如输出可得）>
- 目标: N 个文件
- 结果: 已格式化 N 个 / 无变化 N 个 / 跳过 N 个
- 变更文件: <列表>
- 跳过: <文件名 + 原因：无匹配工具 / 被忽略 / 锁文件 / 二进制>
- 失败: <原始错误 + 建议下一步>
```

状态语义（供调用方判断）：

| 状态 | 含义 | 调用方（如 `/git-flow-commit`） |
| --- | --- | --- |
| `formatted` | 有文件被格式化 | 继续；调用方重新 `git add .` |
| `no_changes` | 工具运行但无文件变化 | 继续 |
| `skipped` | 无可用工具 / 全部文件被跳过 | 继续（记录警告） |
| `failed` | 工具执行报错 / 改动越界 | **停摆**，交给用户 |

## 内嵌调用片段（供 `/git-flow-commit` 等引用）

```text
格式化步骤（format-keeper）：
1. 调用方先 git add .
2. 确定目标文件：本次 git 变更（暂存 + 未暂存 + 未跟踪），排除忽略目录/锁文件/二进制
3. 检测项目已有工具：package 脚本 → 配置 → 语言专用；只执行目标文件，禁止仓库级格式化
4. 失败即停；无工具可用报告 skipped，不阻塞提交
5. 格式化后调用方再次 git add .
6. 不改语义、不创建配置、不安装依赖、不处理乱码
```

## 边界

- 不做命名规约、魔法数字、文件组织（`style-keeper`）
- 不做乱码推断修复（`mojibake-fixer`）
- 不创建/修改 ESLint、Prettier、Biome 等配置
- 不安装/升级任何格式化工具
- 不执行仓库级格式化，不格式化目标范围外文件
- 不提交、不推送、不切分支（提交由 `/git-flow-commit` 或用户执行）
- 不处理二进制文件、生成文件、锁文件
