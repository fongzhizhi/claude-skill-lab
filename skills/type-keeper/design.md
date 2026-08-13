# design.md

## type-keeper 设计

### 背景

仓库已落地 TS 类型安全规范：`rules/ts-standards`（强制规则 `ts-types.md`）+ `docs/ts-code-guide`（详细指南 `ts-types-guide.md`）。规则约束新增代码，存量代码的 `any`、`@ts-ignore`、非空断言滥用普遍。需要一个工具按规范批量修复，且**修复动作本身不能引入新问题**——这是类型治理区别于注释治理的核心挑战。补齐 keeper 家族第四位。

### 关键设计决策

#### 1. 为什么用 Skill 而非 Command

与 comment-keeper / test-keeper / style-keeper 同因：依赖长文档指南 + 多分支流程（风险分级、等价验证、硬门禁）。

#### 2. 风险三分级（本技能的主线）

类型改动的风险差异极大，统一处理必出事故：

- **低风险（编译期语义）**：`@ts-ignore` → `@ts-expect-error`、`import type`、type/interface 场景校正、泛型约束——不改变运行时行为，直接做
- **中风险（需行为等价验证）**：`any → unknown` 收窄、非空断言消除——新增了运行时逻辑，必须验证收窄分支覆盖原有调用路径的全部输入形态；无法确定的列清单，不臆造校验逻辑（与 comment-keeper "不虚构信息"一脉相承）
- **高风险（行为改动）**：外部数据新增运行时校验（Zod）、tsconfig 严格项开启——非法数据从静默通过变为抛错，是行为变化；只输出方案，由用户决策。同时不擅自引入 Zod 依赖、不改配置文件

#### 3. tsc --noEmit 为硬门禁

类型修复的可验证性远高于注释/风格调整——项目有 tsconfig 时，编译全绿是交付的最低门槛；修复过程中暴露的新错误必须当场处理完。这也决定了 type-keeper 的交付是"可证明的"。

#### 4. 与 style-keeper 的职责边界

命名/格式（风格）归 style-keeper；类型结构归 type-keeper。一个典型协作流：`@ts-ignore` 掩盖的类型问题由 type-keeper 处理，其 FIXME 注释说明遵循 ts-comments 规范（comment-keeper 的领域）——keeper 家族按规则维度划分，不重叠。

### 与现有模块的关系

- 依赖 `rules/ts-standards`（`ts-types.md`）与 `docs/ts-code-guide`（`ts-types-guide.md`），不重复维护规范内容，只做执行者
- 与 comment-keeper / test-keeper / style-keeper 互为姊妹技能（keeper 家族），结构、元技能约束、部署形态完全一致
