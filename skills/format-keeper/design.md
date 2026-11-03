# design.md

## format-keeper 设计

### 背景

`gitflow` 的提交流水线需要“先统一格式，再检查乱码/类型/测试，最后提交”。格式化是其中相对独立、可复用的一步：它既要在提交前自动执行，也要能单独手动跑。仓库已有 `style-keeper`（TS 命名/魔法数字/结构）和 `mojibake-fixer`（乱码），但前者目标更广、后者职责不同，缺少一个**纯格式化**的执行者。

初版按主流方式检测 Prettier / ESLint / Biome / 语言工具。实际使用中发现团队成员日常依赖内部工作流：项目 `package.json` 通常有 `prettier:auto`，没有时用 `lc-build prettier`。继续走通用检测既慢又容易与内部脚本不一致，因此 v0.2.0 改为**内部工作流优先**。

### 关键设计决策

#### 1. Skill 而非 Command

- 需要按项目脚本分支、区分 `skipped` / `failed`，存在多分支判断，适合 Skill。
- 需要被 `/gitflow:commit` 内嵌引用；Skill 的 `SKILL.md` 可作为规则单一来源，避免在命令里复制一套格式化逻辑。
- 同时支持 `/format-keeper` 手动触发，满足独立运行需求。

#### 2. 统一全量范围，先暂存再格式化

不再区分暂存区与普通变更区。执行顺序固定为：

```text
git add -A → git diff HEAD → 格式化 → git add -A
```

理由：

- 代码格式化本身是优化，不需要用户先决定“哪些改动要提交”
- `git diff HEAD` 天然覆盖暂存 + 未暂存 + 新加入的文件，避免漏文件
- 格式化后统一再次暂存，调用方拿到的是可直接提交的状态

代价是**本技能会改写暂存区**，这是与 `style-keeper` / `mojibake-fixer` 最大的行为差异，因此在 README 与 SKILL 中显著说明。为避免把未跟踪的密钥文件加入暂存区，`git add -A` 前增加未跟踪敏感文件检查；冲突文件也直接停。

#### 3. 内部工作流优先

优先级固定为：

1. `package.json#scripts["prettier:auto"]` → `npm run prettier:auto`
2. 没有 → `git diff HEAD --name-only --diff-filter=d | xargs lc-build prettier -- --write`
3. 上述命令报错 → 才分析 `package.json` 中作用于当前暂存区的格式化脚本
4. 没有可用脚本 → `skipped`

这样做的取舍：

- **放弃通用工具检测**：不再读取 `.prettierrc` / `eslint.config.*` / `biome.json` 自行拼命令，减少与团队脚本的偏差
- **允许 `prettier:auto` 是仓库级脚本**：它是项目预先定义的约定，不是本技能自行扩大范围
- **`lc-build` 只处理本次 diff**：保持“不无差别重排整个仓库”的边界
- **回退只接受暂存区脚本**：`lint-staged`、`*:staged`、`git diff --cached`，避免回退时突然跑仓库级格式化

#### 4. `failed` 与 `skipped` 分离

- `failed`：冲突、未跟踪敏感文件、`git add` 失败、回退脚本报错、候选不唯一 → 调用方停摆
- `skipped`：主命令报错且没有可用的暂存区回退脚本 → 调用方继续并记录警告

主命令报错本身不直接判 `failed`，因为用户要求“报错才回退，没有回退脚本就退出”，避免内部脚本临时不可用时阻塞所有提交。回退脚本一旦被选中并执行失败，则视为真实错误。

#### 5. 与 style-keeper 的边界

`style-keeper` 的工具兜底步骤会跑 ESLint/Prettier，但它同时做命名、魔法数字、结构治理。`format-keeper` 只做纯格式化，不碰语义与命名。未来可以让 `style-keeper` 的“工具兜底”步骤引用本技能，保持单一来源；当前不做跨模块改动，避免一次迭代范围过大。

### 与现有模块的关系

- `style-keeper`：风格治理；本技能是其格式化步骤的潜在复用点
- `mojibake-fixer`：乱码修复；格式化后如出现乱码，交由它处理
- `commit-draft`：commit message 生成；本技能不提交
- `gitflow` 套件：`/gitflow:commit` 按“add → format → mojibake → add → commit-draft → commit → push”调用

### 已知限制（v0.2.0）

- 强依赖内部工作流：没有 `prettier:auto`、没有 `lc-build`、`package.json` 也没有暂存区脚本的项目会走 `skipped`，不会自动改用 Prettier/ESLint 配置
- `lc-build` 的可用性检查命令（`lc-build --version`）与实际参数需在开发机实测校准
- `git diff HEAD` 会把二进制/不支持格式的文件一并传给 `lc-build`；若工具因此报错，按回退流程处理，不自行过滤
- `xargs` 默认按空白拆分路径；路径含空格/中文时需改用 `-z` + `xargs -0`（SKILL 中已给出替代命令）
- 会改写暂存区；不提供 `--check` 只读模式
- 不做格式化配置的初始化与迁移
