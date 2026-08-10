# mojibake-fixer

> 扫描并修复中文场景下 AI 生成内容中混入的乱码字符 ``（U+FFFD），默认覆盖 git diff 变更文件，可指定文件或目录。

AI 辅助编程写代码、注释、文档时，中文内容偶发混入 U+FFFD 替换字符 ``（生成时原始 UTF-8 字节已丢失，无法字节级还原）。本命令扫描目标范围，结合上下文推断原本字符并修复；无法可靠推断的位置列出报告，不强行修改。

## 功能

| 能力 | 说明 |
| --- | --- |
| 默认范围 | git diff 变更文件（暂存 + 未暂存并集），开箱即用 |
| 指定目标 | 支持单个文件或整个目录递归扫描 |
| 智能修复 | 结合前后中文语境推断 U+FFFD 原本字符，Edit 修复 |
| 克制原则 | 无法可靠推断的位置列出清单，不猜不改；编码错位只报告不自动转换 |

## 前置依赖

无（依赖 Git 本身，Claude Code 环境自带）。

## 部署

```bash
lab deploy mojibake-fixer
```

部署后，命令在 Claude Code 对话中以 `/mojibake-fixer` 调用。

## 使用

```text
/mojibake-fixer
/mojibake-fixer src/utils/encoding.ts
/mojibake-fixer docs/
```

无参数默认扫描 git diff 变更文件；带参数扫描指定文件/目录。修复后输出摘要（扫描范围、修复处数、无法推断清单），全程无 `` 则提示"未发现 U+FFFD 乱码"。

与 [commit-draft](../commit-draft/README.md) 互补：commit-draft 保证 commit 输出不复述乱码，mojibake-fixer 事后修复源文件本身的乱码。