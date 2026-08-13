# design.md

## style-keeper 设计

### 背景

仓库已落地 TS 编码风格规范：`rules/ts-standards`（强制规则 `ts-coding-style.md`）+ `docs/ts-code-guide`（详细指南 `ts-coding-style-guide.md`）。规则约束新增代码，存量代码的命名、魔法数字、文件组织大概率不符合。需要一个工具批量对齐存量风格。与 comment-keeper（注释）、test-keeper（测试）同为 ts-standards 的执行闭环，补齐 keeper 家族第三位。

### 关键设计决策

#### 1. 为什么用 Skill 而非 Command

与 comment-keeper / test-keeper 同因：需要按详细指南执行（Skill 可明确指引加载参考文档），流程含分支判断（工具兜底 → 手工核对 → 安全分级），未来可挂 references/ 扩展命名规约速查表。

#### 2. 自动化 > 人工约束

指南核心理念是"约定 > 配置，自动化 > 人工约束"——风格问题能交给 Lint 工具自动拦截的绝不手工改。因此流程第一步是检测项目 ESLint/Prettier 配置并运行 `--fix`，工具修完的剩余问题才手工处理。**不擅自创建配置文件**：落地工具是项目级决策，本技能只提示规范建议。

#### 3. 改名安全分级（区别于 comment-keeper 的核心差异）

注释调整零传播风险，改名则有引用传播：局部符号无传播、模块私有符号模块内核对、导出符号全项目核对、公共 API 只列清单。这是风格治理与注释治理的本质区别——所以安全分级是本技能的主线规则。另有两处保守设计：枚举只改名不重排（数值枚举重排会改变运行时值）、文件名 kebab-case 不自动 git mv（文件移动留给用户执行）。

#### 4. 结构拆分只出建议

单文件职责拆分（超 300 行）是结构改动，风险远超风格调整——与 comment-keeper 的"等价结构调整"不同，本技能只输出拆分建议，由用户决定是否另走重构流程。显式函数返回类型补齐、魔法数字提取则属低风险等价改动，直接做。

### 与现有模块的关系

- 依赖 `rules/ts-standards`（`ts-coding-style.md`）与 `docs/ts-code-guide`（`ts-coding-style-guide.md`），不重复维护规范内容，只做执行者
- 与 comment-keeper / test-keeper 互为姊妹技能（keeper 家族），结构、元技能约束、部署形态完全一致
