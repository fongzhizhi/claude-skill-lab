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
| subject | 动词开头、不超过 50 字符、结尾不加句号                              |
| body   | 说明做了什么 + 为什么，简洁分段，避免罗列代码细节                  |
| footer | `Refs: <需求/bug 链接>`，仅在有真实来源时添加                      |

## 边界条件

- 暂存区与工作区均无变更：告知用户无可提交内容。
- 参数携带需求链接：作为 footer `Refs` 引用。
- 会话中有需求 ID / ticket 编号：同样汇总到 footer，方便溯源。

## 变更理由

- **v0.1.0**：初始设计。参考 README 中"commands `commit-draft`（commit message 生成）"规划项落地。
