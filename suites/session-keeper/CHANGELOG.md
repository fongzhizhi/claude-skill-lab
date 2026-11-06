# CHANGELOG —— session-keeper 变更历史

<!-- 记录 suites/session-keeper/ 的每次变更。 -->

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
