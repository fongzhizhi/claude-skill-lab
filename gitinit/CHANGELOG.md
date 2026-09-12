# CHANGELOG —— gitinit 变更历史

<!-- 记录 gitinit/ 的每次变更。 -->

## v0.1.1（2026-09-12）

- `.gitignore` 模板调整：`settings.json` 改为**默认追踪**（switch 的覆盖目标；纯本地不 push 不增加暴露面——能访问 `.git` 的进程必然也能直接读 `settings.json` 明文）；仅忽略 `settings.local.json`（Claude Code 本地覆盖、非 lab 产物）。
- 风险提示写入模板注释：若未来配置远程推送，先 `git rm --cached settings.json` 再 push，避免 API Key 永久留在 git 历史。

## v0.1.0（2026-09-12）

- 初始版本：新增 `gitinit/` 顶层目录（`.gitignore.template` 模板源 + 文档）与 `claude-lab gitinit` 子命令。
- 命令语义对齐 `switch`/`settings`：每次执行把仓库 `gitinit/.gitignore.template` **覆盖**到 `~/.claude/.gitignore`；`git init` 幂等（已有 `.git` 则跳过）。
- `.gitignore` 模板忽略敏感配置（`settings.json` 等含 API Key）、会话/历史/缓存等动态数据目录与系统文件，追踪范围聚焦 lab 部署产物。
- 迭代方式：修改模板 → 重新 `claude-lab gitinit` 同步。
