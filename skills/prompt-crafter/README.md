# prompt-crafter

> 把粗略的需求描述锻造成高质量、可直接复制的 AI prompt

输入一段描述，prompt-crafter 结合当前会话上下文分析你的需求与预期，按"诊断 → 选技术 → 重写 → 自检 → 输出"流水线生成优化后的 prompt，输出为 markdown 文档（prompt 本体在代码块中可一键复制 + 主要改动说明）。

参考主流 prompt 优化工具的设计思路（Anthropic 官方 prompt engineering 实践、prompt-architect、prompt-engineering-skill 等）：多阶段流水线、结构化组装、框架库、反过度工程、模型感知、可解释输出。

## 功能 / 内容

- **Clarity Gate 反过度工程**：简单需求只做最小收紧，不堆砌技巧（这是第一设计原则）
- **多阶段流水线**：诊断 → 选技术 → 重写 → 自检 → 输出
- **会话上下文利用**：注入对话中的项目背景、规范、用户身份
- **框架库**：CO-STAR / CRISPE / RISE / RACE / CARE 等（`references/frameworks.md`）
- **质量自检**：黄金测试（"无上下文同事能否直接执行"）+ 完整清单（`references/checklist.md`）
- **模型感知**：Claude 与 GPT 推理模型采用不同规则
- **可解释输出**：markdown 文档附"主要改动"说明改了什么、为什么

## 前置依赖

无

## 部署

```bash
lab deploy prompt-crafter
```

部署落点：`~/.claude/skills/prompt-crafter/`（SKILL.md + references/）

## 使用

对话中直接描述需求即可触发，例如：

```
帮我优化这段 prompt：让 AI 帮我写个产品描述生成器，输入产品参数输出描述
```

或直接说：

```
/（无需斜杠命令）把"翻译这段文字成英文"优化成一个完整的 prompt
```

prompt-crafter 输出 markdown 文档，prompt 本体在代码块中，直接复制使用。
