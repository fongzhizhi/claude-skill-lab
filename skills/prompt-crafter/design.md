# prompt-crafter 设计文档

## 目标

`prompt-crafter` 是 Claude Code 生态中的 prompt 优化工具：用户输入一段粗略描述，结合当前会话上下文（项目背景、规范、用户身份），分析需求与预期，生成优化后的 AI prompt，输出为 markdown 文档方便直接复制。

解决的问题：用户经常"知道想做什么，但写不出好 prompt"——要么太模糊（AI 发挥失准），要么过度堆砌（复杂冗余）。工具把 prompt 工程的最佳实践内化为一个可复用的对话流程。

## 设计原则

- **反过度工程（Clarity Gate）**：所有主流实现（prompt-it、prompt-engineering-skill）都把"不过度优化简单任务"列为第一失败模式。本设计将其作为流程第 1 步：输入已清晰则只做最小收紧，直接输出。
- **多阶段流水线**：诊断 → 选择技术 → 重写 → 自检 → 输出，对齐主流架构（prompt-engineering-skill 五阶段、prompt-optimizer-skill 七步）。
- **结构化组装（canonical structure）**：角色 + 上下文动机 + XML 标签数据 + 正向指令 + few-shot 示例 + 输出契约 + 成功标准，与 Anthropic 官方实践一致。
- **框架库按需取用**：CO-STAR / CRISPE / RISE / RACE 等沉淀在 `references/frameworks.md`，渐进式披露，不塞进 SKILL.md。
- **可解释输出**：每次优化附"主要改动"（改了什么、为什么），对齐 prompt-engineering-skill 的 changelog 设计。
- **模型感知**：Claude 与 GPT 推理模型（o 系列）规则不同——推理模型内置思考，写"think step by step"反而起反作用（对齐 prompt-engineering-skill 的模型家族规则）。
- **黄金测试自检**："无上下文同事能否直接执行"——对齐 Anthropic 官方"如果同事看不懂，Claude 也会困惑"的原则。
- **上下文注入有纪律**：只注入会话中确凿的事实（项目规范、技术栈、用户身份），不注入猜测；注入内容放 prompt 的 context 部分。

## 与主流实现的差异

| 维度 | 主流实现 | 本设计取舍 |
| --- | --- | --- |
| 意图路由 | 部分工具按关键词路由到 10+ 个场景子技能（skill-ten-prompt-generator） | 不做子技能路由，一个 SKILL.md + 框架库覆盖全部场景——个人工作台规模下路由是过度设计 |
| 质量评分 | 部分工具输出 7 维加权评分（orator、prompt-builder） | 不做数值评分，用 checklist 自检（真/假判断）——评分数字对用户无实际帮助，checklist 更可操作 |
| 确定性优化 | orator 用确定性启发式零 LLM 重写 | 由 Claude 完成重写（LLM 驱动）——在 Claude Code 内使用，重写质量优先 |
| 模型感知深度 | 部分工具做 T1/T2/T3 模型分级 + 部署场景校准 | 只区分 Claude / GPT 推理两类——个人使用场景下足够，保持简单 |

## 模块形态选择（skill vs command）

选 **skill** 而非 command：

- 需要携带 `references/`（框架库、checklist、示例），渐进式披露——command 是单文件，无法承载
- 多阶段流程（诊断 → 重写 → 自检）比 command 承载得更好
- 靠 description 意图触发（"帮我优化这个 prompt"），使用自然
- 主流 prompt 优化工具均为 skill 形态（Anthropic 官方推荐用 prompt generator）

## 文件结构

```
skills/prompt-crafter/
├── README.md                    # 门面文档
├── design.md                    # 本文件
├── CHANGELOG.md                 # 版本历史
├── feedback.md                  # 反馈记录
└── dist/
    └── skills/
        └── prompt-crafter/
            ├── SKILL.md         # 核心指令（五步流水线 + 输出格式）
            └── references/
                ├── frameworks.md  # 框架库（CO-STAR 等 + 通用技巧 + 反模式）
                ├── checklist.md   # 质量自检清单（黄金测试 + 10 组核对项）
                └── examples.md    # 输入 → 输出示例（简单/复杂/上下文注入三例）
```

## 边界

- **不修改用户原话之外的系统行为**：只生成 prompt 文档，不执行任何命令、不读文件（除非用户把内容贴进对话）。
- **不替代代码评审等执行类技能**：prompt-crafter 生成"让 AI 做 X 的 prompt"，不自己做 X。
- **目标模型默认 Claude**：输出时提示适配差异，用户可指定其他模型。

## 变更理由

- **v0.1.0**：初始设计。基于主流 prompt 优化工具调研（prompt-engineering-skill 五阶段流水线、prompt-architect 框架库、prompt-optimizer-skill 反过度工程与 checklist、orator 模型感知与反模式），形成"Clarity Gate + 五步流水线 + references 渐进披露 + markdown 可复制输出"的设计。
