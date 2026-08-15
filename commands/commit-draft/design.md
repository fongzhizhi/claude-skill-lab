# commit-draft 设计文档

## 目标

用户每次提交代码都需要思考 commit message 内容并核对提交规范，`commit-draft` 用于消除这一心智负担：

1. **自动总结**：根据仓库变更状态（暂存区优先，回退到全部变更）自动总结改动。
2. **上下文补全**：结合当前会话内容与命令参数中的需求/bug 链接，补充 commit 背景，方便日后溯源。
3. **规范输出**：遵循 Conventional Commits 结构，输出为单个代码块，可直接复制。

## 设计原则

- **暂存区优先**：`git diff --cached` 有内容则以暂存区为准；为空则回退 `git diff`（全部变更）。
- **信息优先级明确**：仓库变更 > 会话上下文 > 命令参数，低优先级作为补充而非替换。
- **不编造引用**：需求/bug 链接只使用会话或参数中真实提供的信息。
- **单代码块输出**：只输出一个代码块，便于用户直接复制，不做多余解释。
- **语言跟随仓库**：按仓库现有提交语言风格撰写（本仓库默认中文）。
- **输出前自检**：生成后检查是否混入 U+FFFD 等乱码字符（多为 Windows 下 GBK 编码文件被按 UTF-8 读取所致），发现则不复述乱码原文，改用 ASCII 或推断描述重写，确认干净后才输出。

## 信息收集流程

```text
1. git diff --cached --name-status   # 暂存区变更
   为空 → git diff --name-status     # 全部变更
2. git diff --cached --stat         # 变更统计，辅助理解改动面
3. 需要理解细节时，查看具体文件 diff 或读取文件内容
4. 补充会话上下文与命令参数中的需求/bug 链接
```

## 输出格式

严格遵循 Conventional Commits 主流结构：

```text
<type>(<scope>): <subject>

<body>

<footer>
```

| 部分   | 要求                                                               |
| ------ | ------------------------------------------------------------------ |
| type   | feat / fix / docs / style / refactor / perf / test / build / ci / chore / revert |
| scope  | 可选，受影响的模块或文件范围                                       |
| subject | 动词开头、主体不超过 50 字符、结尾不加句号；链接解析出的 ID 追加末尾 `(ID)`（如 `feat: 新增参考点切换 (PRO-156328)`），ID 后缀不计入主体限制，整条含 ID ≤72 字符 |
| body   | 说明做了什么 + 为什么，简洁分段，避免罗列代码细节                  |
| footer | `Refs: <链接或编号>`；ONES 单为 `Title: <ID> <标题>`（git trailer，便于按单号检索）+ `Refs: <纯链接>`，Title 在上、Refs 在下 |

## 边界条件

- 暂存区与工作区均无变更：告知用户无可提交内容。
- 参数携带需求链接：作为 footer `Refs` 引用。
- 会话中有需求 ID / ticket 编号：同样汇总到 footer，方便溯源。
- 链接含明细 ID（ONES 单、GitHub issue 等）：按"链接 ID 提取规则"提取，追加到 subject 末尾 `(ID)`；footer 保持 `Title`/`Refs` 不变。多个 ID 用 `, ` 分隔，超过 2 个只保留前 2 个进 subject，其余仍进 footer。
- 来源为 ONES 单：按"ONES 单解析规则"解析出 ID / 标题 / 链接，footer 输出 `Refs` + `Title` 两行；解析不到标题时只保留 `Refs` 行，不编造。
- 非 ONES 链接（普通 ticket / issue）：保持原有 `Refs: <链接或编号>` 单行，不追加 `Title:`。

## 变更理由

- **v0.1.5**：`git log --oneline` 扫提交时看不到单号，快速定位需展开 footer 看 `Title:` 行。新增"链接 ID 提取规则"：链接中含明细 ID 时（ONES 单取 `PRO-xxx` 等，GitHub issue 尾部数字取 `#数字`），追加到 subject 末尾 `(ID)`；ID 后缀不计入 subject 50 字符主体限制，整条 ≤72；多个 ID 用 `, ` 分隔，超过 2 个只保留前 2 个，其余进 footer。
- **v0.1.4**：实测反馈 footer 顺序与内容不佳——`Title:` 应是第一行（更符合阅读习惯），`Refs:` 只留纯链接即可（单 ID 已在 `Title:` 行，重复拼写无意义）。调整顺序与格式。
- **v0.1.3**：会话/参数中的 ONES 单在 footer 仅输出 `Refs: <链接>`，无法按单号检索提交。新增 ONES 单解析规则（与 ones-parser 保持一致）与 `Title: <ID> <标题>` footer（git trailer 格式，`git log --grep=<单号>` 可命中）；非 ONES 链接保持原样，保证 commit-draft 的通用性。
- **v0.1.2**：中文场景下偶发输出 U+FFFD 乱码。根因是 Windows 下 GBK 编码文件被按 UTF-8 读取时产生替换字符，模型将其复述进 commit。在信息收集阶段提示识别乱码来源，并新增"输出自检"流程（检查 → 排查 → 重写 → 复检），保证输出内容无乱码。
- **v0.1.1**：README 结构偏简单（缺少前置依赖与使用说明），按统一模块 README 规范（简介 / 功能 / 前置依赖 / 部署 / 使用，参照 openspec）完善，明确"无外部依赖"与单代码块输出方式。
- **v0.1.0**：初始设计。参考 README 中"commands `commit-draft`（commit message 生成）"规划项落地。
