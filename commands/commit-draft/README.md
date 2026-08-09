# commit-draft

> 根据仓库变更状态与当前会话内容，自动总结 Conventional Commits 规范的 commit message，输出代码块供直接复制。

告别"每次提交都要想 commit 写什么"，又免去翻规范核对格式。执行 `/commit-draft`（可附上需求链接或说明），即可拿到一条可直接复制的 commit。

## 信息优先级

1. **暂存区**：`git add .` 缓存的文件内容（无暂存时回退到全部变更文件）
2. **当前会话**：会话中涉及的需求、bug 修复、改动说明，可补充到 commit 便于溯源
3. **命令参数**：执行 `/commit-draft` 时附带的链接或说明

## 用法

```
/commit-draft
/commit-draft "修复了登录页 bug，关联需求 #123 https://example.com/ticket/123"
```

输出为单个代码块，直接复制即可。

## 部署

```bash
lab deploy commit-draft
```
