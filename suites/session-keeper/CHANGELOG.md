# CHANGELOG —— session-keeper 变更历史

<!-- 记录 suites/session-keeper/ 的每次变更。 -->

## v0.2.3（2026-11-07）

### 变更

- 漂移判定翻转为「最新话题优先」：只要用户最新发言的主线与当前标题不是同一件事（新任务/新模块/新问题域/换需求），就改写；拿不准也算变了。移除「宁可不动」「拿不准不改」的旧默认
- 判定改为可操作的两步法：一句话概括本轮用户在做什么 → 比较对象（模块/文件/功能）与目标（实现/排查/重构/补文档），任一不同即改
- 明确判定依据是**用户最新发言**，不是模型执行步骤；模型读写文件、跑命令、改代码不构成话题变化，避免执行过程引发抖动
- hook 提醒文案同步改写：由「本轮话题已明显漂移」改为「每轮自检 + 一句话概括 + 拿不准也算变了」，强调直接改写、无需征求用户同意，并直接附上可执行的 `set` 命令（含脚本绝对路径）
- 明确 ONES 前缀与话题改写的关系：**正文可变、前缀保留**——同一张单下改写最新内容时保留 `ID · ` 前缀；hook 只检测当前 prompt 的单号，后续轮次以当前标题已有前缀 + 对话主线为准，避免误删；提醒在标题带前缀或本轮出现单号时追加该约束
- 技能 description 同步改写，去掉「明显切换」的高门槛措辞
- `manifest.json` 与 `SKILL.md` 版本号统一为 0.2.3（v0.2.2 时 SKILL.md 未同步递增）

### 验证

- 模拟 UserPromptSubmit stdin：提醒文案输出新判定规则，ONES 单号附在末尾
- 端到端待测：话题切换后模型是否触发 `set`，以及同一任务多步执行时标题是否保持稳定

## v0.2.2（2026-11-06）

### 修复

- 修复兼容端点下 hook 永久静默的死锁：DeepSeek 等 Anthropic 兼容 API 不生成 `ai-title`，`readTitleQuick()` 只认 `ai-title` / `custom-title`，导致 `effectiveTitle` 恒为空、hook 每轮退出；模型因此收不到提醒、永远不会调用 `set`，transcript 也就永远没有 `custom-title`
- `runHook()` 在 `readTitleQuick()` 为空时回退到 `readFirstUserPrompt()`：从 transcript 文件头窗口（64KB → 4MB 倍增）取第一条用户消息，截断 40 字符作为当前标题；成本与 `readTitleQuick()` 同级
- 完全读不到用户消息时仍保持静默，原「新会话先不打扰」策略不变

### 验证

- 模拟 UserPromptSubmit stdin（DeepSeek 会话，无 `ai-title` / `custom-title`）：修复前零输出；修复后输出 `additionalContext`，标题为「hello」
- 端到端实测：重新部署并重启会话后 hook 每轮触发；执行 `set` 后下一轮标题栏刷新为「重构仓库目录并修复 session-keeper hook」，`/resume` 列表同步生效

## v0.2.1（2026-11-06）

### 修复

- 修复 hook 在真实输入下静默退出的问题：UserPromptSubmit 的 `session_title` 仅在会话已有自定义标题时有值，改为从 `transcript_path` 兜底读取（`ai-title` 读文件头、`custom-title` 读文件尾，窗口倍增，避免全量扫描）
- `set` 的幂等判断改用快速读取（35MB 会话从 2.3s 降到约 100ms）
- SKILL.md / README 的命令路径改用 `os.homedir()` 展开，规避 `$HOME` 被第三方软件污染
- 文档修正：明确 `session_title` 的条件性（仅已有自定义标题时存在）；输出 `sessionTitle` 已由 CLI schema 与运行逻辑确认支持

### 验证

- 35MB transcript：无 `session_title` 输入时 hook 可输出提醒；标题读取约 100ms
- 假 HOME 下 pending 回填输出 `sessionTitle`，缓存文件被消费
- 端到端实测（VSCode 扩展 2.1.318）：hook 正常触发；`set` 后下一轮消息提交时标题栏刷新，`set` 当下不刷新属预期；ONES 链接识别 → `PRO-156328 · 切换自定义单参考点按钮置灰` 生效

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
