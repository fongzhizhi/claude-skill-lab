# commit-draft

> 根据仓库变更状态与当前会话内容，自动总结 Conventional Commits 规范的 commit message，输出代码块供直接复制。

告别"每次提交都要想 commit 写什么"，又免去翻规范核对格式。执行 `/commit-draft`（可附上需求链接或说明），即可拿到一条可直接复制的 commit。

## 功能

| 能力 | 说明 |
| --- | --- |
| 自动总结 | 暂存区变更优先（无暂存则回退全部变更），自动归纳改动 |
| 上下文补全 | 结合会话中的需求/bug 与参数链接，补充 commit 背景便于溯源；链接含明细 ID 时追加到 subject 末尾 `(ID)`（如 `feat: 新增参考点切换 (PRO-156328)`）便于 `git log --oneline` 快速定位；ONES 单追加 `Title: <ID> <标题>`（git trailer，可按单号 `git log --grep` 检索）+ `Refs: <纯链接>` |
| 规范输出 | 严格遵循 Conventional Commits 结构，单代码块输出直接复制 |

## 信息优先级

1. **暂存区**：`git add .` 缓存的文件内容（无暂存时回退到全部变更文件）
2. **当前会话**：会话中涉及的需求、bug 修复、改动说明
3. **命令参数**：执行 `/commit-draft` 时附带的链接或说明

## 前置依赖

无（依赖 Git 本身，Claude Code 环境自带）。

## 部署

```bash
lab deploy commit-draft
```

部署后，命令在 Claude Code 对话中以 `/commit-draft` 调用。

## 使用

```
/commit-draft
/commit-draft "修复了登录页 bug，关联需求 #123 https://example.com/ticket/123"
```

输出为单个代码块（含 subject / body / footer），直接复制到 `git commit` 即可。无任何变更时，命令会告知"没有可提交的变更"。
