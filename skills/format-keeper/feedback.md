# feedback

<!-- 记录使用过程中发现的问题与改进建议。 -->

## 2026-11-04 流水线顺序调整（v0.2.1）

- 反馈：`/gitflow:commit` 先格式化再修乱码，乱码修复改写文本后可能破坏刚生成的格式，应改为先检查/修复乱码、再执行格式化。
- 决策：调整 gitflow 提交流水线为 `git add -A → mojibake-fixer → format-keeper → git add -A`；本技能功能不变，仅同步 README/design 中的调用顺序说明。
- 待实测确认项：乱码修复后格式化是否会把修复内容重新排布为预期格式（尤其是长行、中文宽度、注释对齐）。

## 2026-11-02 工作流调整（v0.2.0）

- 反馈：项目有专门的格式化指令，主流检测方式虽通用但效率低。希望默认走内部开发环境工作流：
  1. 不区分暂存区/普通变更区，统一对所有 `git diff` 格式化；先 `git add .`
  2. `package.json` 有 `prettier:auto` → `npm run prettier:auto`
  3. 没有 → `git diff HEAD --name-only --diff-filter=d | xargs lc-build prettier -- --write`
  4. 命令成功后再 `git add .`；命令报错才让 AI 分析 `package.json` 中作用于当前暂存区的格式化脚本
  5. 没有可用脚本 → 直接退出，不阻塞
- 决策：
  - 移除通用 Prettier/ESLint/Biome/语言工具检测，避免与内部脚本不一致
  - 保留 `failed` / `skipped` 区分：主命令失败且无回退脚本 → `skipped`；回退脚本执行失败 → `failed`
  - `git add -A` 前增加未跟踪敏感文件与冲突文件检查，避免技能自动暂存密钥或冲突标记
  - 移除 `--staged` / `--check` / 文件参数，统一为全量变更
- 待实测确认项：
  - `lc-build --version` 是否可作为 `meta.json` 的有效检测命令；`lc-build prettier -- --write` 对文件列表、空格/中文路径、二进制文件的处理
  - 实际项目 `prettier:auto` 是否总会重新暂存；失败时错误码与输出是否稳定
  - `git diff HEAD` 包含二进制文件时是否会导致 `lc-build` 整体失败，是否需要按扩展名预过滤
  - 未跟踪敏感文件检查是否会误伤 `.env.example` 之外的正常配置
  - monorepo 根目录没有 `package.json` 时，是否需要继续在 workspace 子包中查找 `prettier:auto`

## 初始创建（2026-11-02）

- 需求来源：`git-flow` 计划中 `/git-flow-commit` 的格式化步骤；用户要求做成像 `commit-draft` / `mojibake-fixer` 一样可独立运行、也可内嵌的模块。
- 决策：
  - 采用 Skill：需要按项目检测工具、分支处理（有/无配置、有/无脚本），并可作为共享规则被 `/git-flow-commit` 引用。
  - 模块名 `format-keeper`，与 keeper 家族命名对称；边界是“纯格式化”，不碰命名/语义/结构/乱码。
  - 只格式化目标文件，禁止仓库级格式化；不创建/修改配置；不自动安装依赖；`failed` 与 `skipped` 区分，便于提交管线决定停或继续。
- 待实测确认项：不同项目（npm/pnpm/yarn、Prettier/ESLint/Biome）的工具检测与命令拼接；Windows 下多文件参数/空格路径；大文件量下的批处理；`skipped` 是否会让提交管线漏掉本应格式化的项目。
