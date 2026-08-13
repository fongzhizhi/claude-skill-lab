# design.md

## error-handling-keeper 设计

### 背景

仓库已落地 TS 错误处理规范：`rules/ts-standards`（强制规则 `ts-error-handling.md`）+ `docs/ts-code-guide`（详细指南 `ts-error-handling-guide.md`）。规则约束新增代码，存量代码的静默吞错、裸值 throw、异步错误无人处理普遍存在。需要一个工具按规范修复。补齐 keeper 家族第五位，至此 ts-standards 5 条规则全部具备执行闭环。

### 关键设计决策

#### 1. 为什么用 Skill 而非 Command

与 keeper 家族其余成员同因：依赖长文档指南 + 多分支流程（等价/控制流两轨判定）。

#### 2. 两轨判定：语义等价 vs 控制流（本技能的核心差异）

错误处理是所有治理维度中**行为风险最高**的——补一个 try/catch、加一个入口校验，都直接改变程序的失败路径：

- **语义等价轨（直接做）**：catch 变量 unknown 化、补错误日志（只记录不改变执行流）、裸值 throw → Error 实例（message 语义一致，但必须先核对调用方的错误类型依赖）、补 cause、console.log → console.error
- **控制流轨（只列清单）**：补 try/catch、新增边界校验（非法输入从静默通过变为抛错）、循环内 catch 后中断/跳过（业务语义只有用户知道）、错误分层设计、日志体系搭建（项目级决策）

这是与 comment-keeper（零行为风险，可大改）最鲜明的对比：错误处理改动默认**只列清单**，等用户确认。改动量最大的维度反而采用最保守的策略——因为错误处理没有"行为严格等价"的中间地带，捕获与否就是行为本身。

#### 3. 交付核心是"控制流改动清单"

与 test-keeper 的"问题多走 propose"同思路：控制流改动清单（现状 + 建议处理方式 + 影响面）是交付的核心产物，落地由用户决定；语义等价部分直接修，让一次调用既有即时的修复成果、又有完整的决策输入。

### 与现有模块的关系

- 依赖 `rules/ts-standards`（`ts-error-handling.md`）与 `docs/ts-code-guide`（`ts-error-handling-guide.md`），不重复维护规范内容，只做执行者
- 与 comment-keeper / test-keeper / style-keeper / type-keeper 互为姊妹技能（keeper 家族），结构、元技能约束、部署形态完全一致
