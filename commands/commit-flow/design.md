# commit-flow 设计文档

## 目标

为**单仓库、无 MR 流程**的个人项目提供一条通用提交流水线，保留提交前真正有价值的检查，去掉 gitflow 的多仓库与环境链复杂度：

1. **防泄密**：提交前扫描未跟踪的敏感文件
2. **格式统一**：复用 format-keeper 的项目格式化策略
3. **中文乱码**：复用 mojibake-fixer 处理 AI 生成内容中的 U+FFFD
4. **提交信息规范化**：复用 commit-draft 生成 Conventional Commits
5. **一步到位**：本地提交后推送当前分支

## 设计原则

- **不依赖配置**：不读取 `gitflow.json`，不要求 chain / envs / user / 单号；命令落地即可用
- **不拦截分支**：任意分支可提交；`master` / `main` 只提示不阻断（本类项目通常在主干直接开发）
- **单仓库视野**：只操作当前仓库，不做兄弟仓库遗漏检测
- **复用而非复制**：格式化、乱码、提交信息三块逻辑分别由既有模块承载，本命令只负责编排与上下文传递
- **失败即停**：任一环节失败不继续；已产生的格式化/乱码修复改动保留，不自动回滚
- **不做破坏性动作**：不 `--amend`、不 `force`、不 `--no-verify`、不自动 `pull/rebase`

## 流水线

```text
仓库定位 → 分支信息 → 敏感文件检查 → git add -A
→ format-keeper → mojibake-fixer → git add -A
→ commit-draft → git commit → git push
```

| 步骤 | 输入 | 失败行为 |
| --- | --- | --- |
| 仓库定位 | 当前目录 | 不在仓库 / detached / 有进行中操作 → 停摆 |
| 敏感文件检查 | `git ls-files --others --exclude-standard` | 命中未确认 → 停摆询问 |
| 暂存 | `git add -A` | 暂存为空 → 报告无改动并结束 |
| 格式化 | `<root>` 下的变更文件 | format-keeper `failed` → 停摆 |
| 乱码检测 | `git diff HEAD --name-only --diff-filter=d` 的绝对路径 | 存在无法推断的 U+FFFD → 停摆 |
| 提交信息 | 暂存区 diff + 会话上下文 | 为空 → 停摆，不提交空信息 |
| 提交 | 临时文件 | hooks / 身份失败 → 停摆 |
| 推送 | 当前分支 | 被拒绝 → 停摆，不 force |

## 上下文继承

内嵌模块默认以「会话当前目录所在仓库」为工作对象，本命令必须显式继承当前仓库根 `<root>`：

- 所有 Git 命令使用 `git -C <root>`
- format-keeper 的 `npm run` / `lc-build` 必须在 `<root>` 下执行，不能只加 `-C` 而留在子目录
- mojibake-fixer 传入 `<root>` 下变更文件的绝对路径，避免扫描错误仓库
- commit-draft 的信息收集命令替换为 `git -C <root> ...`

## 状态语义

| 状态 | 含义 |
| --- | --- |
| 成功 | 提交完成；按参数推送或标记未推送 |
| 停摆 | 任一前置检查/内嵌模块/提交/推送失败，输出原因与未执行步骤 |

## 与 gitflow:commit 的边界

gitflow 套件继续服务多仓库、环境链、工单驱动的日常工作流；本命令服务个人单仓库。二者共享 format-keeper / mojibake-fixer / commit-draft，但不共享配置与分支语义，后续迭代互不影响。

## 变更理由

- **v0.1.0**：初始设计。个人仓库没有多仓库协同、环境链与 MR 要求，`/gitflow:commit` 的配置与分支校验成为纯负担；把其中通用的提交前检查与执行步骤抽成独立命令。
