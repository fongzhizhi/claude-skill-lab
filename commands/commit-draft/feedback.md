# feedback —— commit-draft 使用反馈

<!-- 记录使用过程中发现的问题与改进建议。 -->

## 2026-08-15

- **反馈**：链接中带有明细 ID 时（如 ONES 链接的 hash 末尾就是单 ID），commit title 应带上 ID，`git log --oneline` 即可快速定位，不必展开 footer 看 `Title:` 行。
- **处理**：v0.1.5 新增"链接 ID 提取规则"——ONES 单取 `PRO-xxx` 等前缀 ID、GitHub issue 等链接尾部数字取 `#数字`，追加到 subject 末尾 `(ID)`；footer `Title`/`Refs` 保持不变。ID 后缀不计入 subject 50 字符主体限制，整条 ≤72。

## 2026-08-10

- **反馈（ones-parser）**：ONES ID 前缀无法可靠区分单是需求还是缺陷，类型分析应去掉（与标题无关）。
- **处理**：ones-parser v0.1.1 去掉单类型分析，输出仅保留 ID / 标题 / 链接；commit-draft 解析规则同步。

- **反馈**：实测 footer 效果不佳——`Title:` 应放在 `Refs:` 上方（符合阅读习惯）；`Refs:` 直接输出纯链接即可，不应带上 ONES ID。
- **处理**：v0.1.4 调整顺序（Title 在上、Refs 在下）与格式（Refs 只输出纯链接，单 ID 由 Title 行体现）。

- **反馈**：会话上下文有 ONES 单时，commit-draft 只输出 `Refs: <链接>`，git 历史里无法按单号检索到对应提交；希望增加 `title: <ones id + ones title>` 标识。
- **处理**：v0.1.3 新增 ONES 单解析规则（与 ones-parser 技能一致）与 `Title: <ID> <标题>` footer（git trailer 格式，`git log --grep=<单号>` 可命中）；非 ONES 链接保持原样，不破坏通用性。

- **反馈**：中文场景下偶发，commit-draft 输出带有乱码 U+FFFD 的内容。
- **处理**：v0.1.2 定位根因为 Windows 下 GBK 编码文件被按 UTF-8 读取产生替换字符并被复述进 commit；在信息收集阶段提示识别乱码来源，新增"输出自检"流程（检查 → 排查 → 重写 → 复检），输出前确认无乱码。

- **反馈**：README 结构偏简单，缺少前置依赖与使用说明；openspec 的 README 更规范，值得对齐。
- **处理**：v0.1.1 完善 README，新增功能、前置依赖、部署与使用小节，并明确"无外部依赖"。
