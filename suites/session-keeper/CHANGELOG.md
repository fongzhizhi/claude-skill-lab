# CHANGELOG —— session-keeper 变更历史

<!-- 记录 suites/session-keeper/ 的每次变更。 -->

## v0.2.1（2026-11-06）

### 修复

- 修复 hook 在真实输入下静默退出的问题：UserPromptSubmit 的 `session_title` 仅在会话已有自定义标题时有值，改为从 `transcript_path` 兜底读取（`ai-title` 读文件头、`custom-title` 读文件尾，窗口倍增，避免全量扫描）
- `set` 的幂等判断改用快速读取（35MB 会话从 2.3s 降到约 100ms）
- SKILL.md / README 的命令路径改用 `os.homedir()` 展开，规避 `$HOME` 被第三方软件污染
- 文档修正：明确 `session_title` 的条件性（仅已有自定义标题时存在）；输出 `sessionTitle` 已由 CLI schema 与运行逻辑确认支持

### 验证

- 35MB transcript：无 `session_title` 输入时 hook 可输出提醒；标题读取约 100ms
- 假 HOME 下 pending 回填输出 `sessionTitle`，缓存文件被消费

## v0.2.0（2026-11-06）

### 变更

- 套件、技能与 hook 脚本由 `session-title-keeper` 统一重命名为 `session-keeper`：套件定位从「会话标题维护」上移为「会话体验守护」，后续会话状态等能力直接在套件内扩展
- 每轮提醒前缀由 `[title-keeper]` 改为 `[session-keeper]`，待生效标题缓存目录同步改为 `~/.claude/cache/session-keeper/`
- `settings/profiles/_base.json` 的 hook 路径同步更新为 `{HOME}/.claude/hooks/session-keeper.js`

## v0.1.0（2026-11-06）

### 新增

- 新增 `session-title-keeper` 技能：定义标题形式（约 24 个汉字、动词优先、保留专有名词）、正反例、漂移判定表、ONES 单号前缀规则与静默边界
- 新增 `UserPromptSubmit` hook：每轮注入一行 `[title-keeper]` 提醒（含当前标题与本轮 ONES 单号候选）；读取待生效标题并通过 `sessionTitle` 回填运行中的会话
- 新增 `session-title-keeper.js` 双模式脚本：hook 模式 + `get` / `set` / `context` 三个 CLI 子命令；`set` 向 transcript 追加与内置 `/rename` 同构的 `custom-title` 记录，幂等、带长度与非法字符校验
- 新增 `settings/profiles/_base.json` 的 hook 注册（exec 形式，`{HOME}` 占位）
- `cli/lab.js` 的 `buildProfileConfig` 支持展开 `hooks` 中的 `{HOME}`，保证切 profile 不丢失 hook 且跨机器可移植
