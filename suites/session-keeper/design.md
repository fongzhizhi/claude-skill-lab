# design.md

## session-keeper 设计

### 背景

Claude Code 会为每个会话自动生成标题（`ai-title`），显示在 `/resume` 列表中。但自动标题只在会话早期生成，长会话一旦切换话题，标题仍停留在最初那句提问。会话开得越多，恢复历史会话时越难靠标题定位。

目标不是「标题好看」，而是**标题始终等于当前主话题**，并且在团队工作流里能直接看出关联的 ONES 单。

### 机制调研结论

落地前先确认了 Claude Code 2.1.x 的标题存储与改写链路（阅读本机 CLI 二进制中的实现）：

| 结论 | 依据 |
| --- | --- |
| 标题存储在会话 transcript 的 JSONL 记录中 | `~/.claude/projects/<项目>/<sessionId>.jsonl` 内的 `{"type":"ai-title"}` 与 `{"type":"custom-title"}` |
| 列表标题优先取自定义标题 | 读取逻辑为 `customTitle ?? aiTitle`；`custom-title` 后写覆盖先写 |
| 内置 `/rename` 就是追加一条 `custom-title` | 记录结构 `{type, customTitle, sessionId, uuid, timestamp}`，无需修改其他状态 |
| `UserPromptSubmit` hook 原生支持设置标题 | hook 输出 schema 含 `hookSpecificOutput.sessionTitle`（`Set the session title`），并支持 `additionalContext` 注入本轮上下文 |
| hook 输入**可能不含**当前标题 | 2.1.221 的输入构造为「公共字段（`session_id` / `transcript_path` / `cwd` 等）+ `session_title: currentSessionTitle`」；该值只在会话已有自定义标题时存在，仅有 `ai-title` 的新会话里为空。标题必须有 `transcript_path` 兜底 |
| 模型没有直接的「重命名」工具 | `rename_session` 是 SDK control 请求，不是模型可调用的工具 |

结论：**模型负责语义判断，hook 负责确定性触发，脚本负责按官方数据结构落盘。**

### 关键设计决策

#### 1. hook + 技能，而不是纯 CLAUDE.md

纯 CLAUDE.md 规则是软约束：跨轮次、上下文压缩后容易被忽略；而且这条规则会常驻所有项目的会话。纯技能则依赖模型自行想起调用，长会话里同样不可靠。

`UserPromptSubmit` hook 是确定性触发器：每轮用户发言都会执行，不依赖模型记忆。但它只做三件事——回填待生效标题、注入一行提醒、附上本轮检测到的 ONES 单号。**判断是否漂移仍由模型完成**，因为「大背景有没有变」是语义问题，脚本无法可靠判断。

#### 2. 写入 transcript 的 `custom-title`，不碰私有状态

`/rename` 的持久化结果就是一条 `custom-title` 记录。脚本复刻同样的结构，直接追加到 transcript：

```json
{"type":"custom-title","customTitle":"…","sessionId":"…","uuid":"…","timestamp":"…"}
```

`/resume` 列表读取的就是它，因此写入后恢复历史会话即可看到新标题。不修改 `~/.claude/sessions/<pid>.json` 等运行时状态文件——那是并发会话注册表，由 Claude Code 自己维护，外部写入存在竞态。

#### 3. 待生效标题文件：解决「当前会话标题栏不刷新」

外部追加 transcript 只能保证落盘，运行中的会话标题栏不会立即刷新。脚本因此额外写一个 `~/.claude/cache/session-keeper/<sessionId>.json`；下一轮 `UserPromptSubmit` hook 读到后通过 `sessionTitle` 回填，由 Claude Code 自己完成内存状态与持久化更新。

放在 `cache/` 下是因为该目录已被 `~/.claude/.gitignore` 忽略，不污染 gitinit 的追踪。

#### 4. 每轮提醒，但只提醒一次「怎么判断」

hook 每轮注入约 150 个汉字，包含当前标题、判定方法、可直接执行的 `set` 命令与 ONES 单号候选。成本可控，收益是模型不必记住「要检查标题」这件事，也省掉「想改但先查命令」的一步。

提醒文案明确写了「仍是同一件事则完全忽略本提示，不要向用户提及标题」，避免模型把检查结果当成用户可见内容反复汇报。v0.2.3 起提醒文案不再使用「明显漂移」这类高门槛措辞，改为「每轮自检 + 一句话概括 + 拿不准也算变了」，让触发条件在提醒里就可操作。

#### 5. 漂移判定：最新话题优先

初版按「稳定性优先」设计：同一任务推进不改、只有新独立任务才改、拿不准不改。实测多个会话后发现这套规则几乎不触发 `set`——模型总能为「还在同一大背景」找到理由，标题长期停留在旧话题，违背了「标题 = 当前主话题」的初衷。

v0.2.3 将默认动作翻转为**「改」**：标题永远等于当前最新话题。

- 判定方法：一句话概括本轮用户在做什么，与标题比较对象（模块/文件/功能）与目标（实现/排查/重构/补文档），任一不同就改；
- 拿不准也算变了；
- 判定依据是用户最新发言，不是模型自己执行的中间步骤——模型读写文件、跑命令、改代码不构成话题变化，防止执行过程引发抖动；
- 寒暄、确认、口头禅不构成话题变化。

代价是标题可能随话题切换多次改写。这是有意接受的成本：标题过时的检索损失大于改名频率，且格式规则（长度、动词、专有名词、ONES 前缀）保证每次改写后的标题仍然稳定可读。

#### 6. ONES 前缀：`ID · 正文`

只在当前主话题由具体 ONES 单驱动时加前缀，格式 `PRO-156328 · 切换自定义单参考点按钮置灰`：

- 单号在前，列表里最先被扫到；
- 中点分隔，与正文有清晰层次；
- 正文必须自己总结，**不照抄 ONES 标题**——ONES 标题可能不准或过于笼统；
- **正文随话题改写，前缀不随正文丢失**：同一张单下从 `排查按钮置灰` 改到 `补按钮置灰单测`，前缀保持 `PRO-156328 · `；只有话题完全离开该单时才去掉；
- 多单并存时取当前主要驱动的那张，判断不了就不加，绝不罗列多个 ID。

单号识别优先取对话中 ONES 链接里的 ID（沿用 `ones-parser` 的「链接是唯一可信锚点」），文本单号次之，并排除 `UTF-8`、`SHA-256` 这类技术词。

hook 只能检测**当前 prompt** 里的单号，后续轮次不再贴链接时提醒里不会有单号候选。因此前缀的增删以**当前标题已有的前缀 + 对话主线**为准，不能因为某轮提醒没检测到单号就删掉前缀；hook 在标题带前缀或本轮出现单号时，会额外注入一行「正文可变、前缀保留」的约束。

#### 7. hook 注册进 `_base.json`，并让 switch 支持 `{HOME}`

`claude-lab switch <profile>` 会用 `_base.json + profile` 覆盖 `~/.claude/settings.json`，只保留 token/api_key。如果 hook 只写进本地 `settings.json`，下一次切 profile 就会丢失。因此注册写在 `settings/profiles/_base.json`。

hook 使用 exec 形式（`command: "node"` + `args`），避免 Windows 下的 shell 差异；`lab/index.js` 的 `buildProfileConfig` 增加对 `hooks` 的递归 `{HOME}` 展开，保证 profile 跨机器可移植。

#### 8. 套件按 session 粒度命名，而不是按首个能力命名

套件最初的能力只有「标题维护」，但会话体验类能力（标题、状态、结束总结等）共享同一触发面（hook）和数据源（transcript），后续会持续并入。若按首个能力命名为 `session-title-keeper`，每加一个能力都要新建套件或改名；因此套件、技能与 hook 入口统一命名为 `session-keeper`，首个能力的规则作为技能的当前范围存在，后续能力在同一目录内扩展。

#### 9. 标题从 `transcript_path` 兜底读取，且只读头尾

最初版本假设 hook 输入一定带 `session_title`。实测（CLI 2.1.221）该字段取自 `currentSessionTitle`，只在会话已有自定义标题时有值；仅有 `ai-title` 的新会话里为空，导致 `effectiveTitle` 为空、hook 每次静默退出。修复：

- `runHook()` 用 `input.transcript_path` 定位会话文件，再交给 `readTitleQuick()`：`ai-title` 读文件头（首条消息可能很长，头部窗口从 64KB 倍增到 4MB），`custom-title` 从文件尾按 128KB → 8MB 倍增查找（内置 `/rename` 与本脚本都追加在末尾）。
- 不做全量扫描：35MB transcript 全量扫描实测 2.3 秒，头尾窗口约 100ms。
- `set` 的幂等判断也改用快速读取，避免写标题时再付一次全量扫描成本。
- 若尾部上限内找不到 `custom-title`（极端的超长尾随消息），退回 `ai-title`，最多显示旧标题，不会误写。

#### 10. `ai-title` 缺失时用首条用户消息兜底

v0.2.1 的修复仍假设 transcript 里至少有内置 `ai-title`。实测在 DeepSeek 的 Anthropic 兼容端点上，`ai-title` 根本不会生成：`readTitleQuick()` 返回空 → `effectiveTitle` 为空 → hook 每轮静默 → 模型收不到提醒 → 不会调用 `set` → transcript 永远没有 `custom-title`。这是一个闭环死锁，hook 在该端点下完全失效。

修复采取「最小可用的兜底」：

- `runHook()` 在 `readTitleQuick()` 为空时调用 `readFirstUserPrompt()`，从 transcript 文件头取第一条用户消息，截断 40 字符作为当前标题；
- 只读头部窗口（64KB → 4MB 倍增），与 `readTitleQuick()` 的成本同级；
- 完全读不到用户消息时仍保持静默，不生成占位标题。

兜底标题只用于**让 hook 有内容可提醒**，并不是最终标题。模型看到它（通常是一句问候或需求开头）后，仍按漂移规则判断是否改写；`set` 之后以 `custom-title` 为准。

### 已知限制

- 话题判定依赖模型语义判断，仍可能漏改或过度改；当前策略明确选择「宁可多改」，由格式规则与「同一件事的连续推进不动」兜底。
- **当前会话标题栏**需要下一轮 hook 回填才刷新；`/resume` 列表立即生效。
- 兼容端点（如 DeepSeek）不生成 `ai-title` 时，hook 的当前标题取自首条用户消息的前 40 字符，可能只是「hello」这类无信息量的开场白；需模型按规则尽快改写，或手动 `set`。
- 依赖 `CLAUDE_CODE_SESSION_ID`；缺失时需显式传 `--session` / `--transcript`。
- hook 每轮执行一次 Node 进程；启动耗时受机器影响（Windows + 实时杀软实测约 1~3 秒/轮），脚本自身只读 stdin、缓存与 transcript 头尾，35MB 会话约 100ms。
- 未部署 hook 时，技能仍可手动使用，但不会自动触发。
- 卸载套件后若不移除 `_base.json` 的 hook 注册，每轮会因脚本缺失报错。

### 后续可迭代方向

- 固定 ONES 单的会话可在 `SessionStart` hook 里直接给初始标题，省掉第一轮的空窗。
- `Stop` hook 在每轮结束时更新会话状态标识（进行中 / 待确认 / 已完成），与标题守护共用 transcript 扫描能力。
- 标题历史（改过几次、每次是什么）可用于复盘话题迁移。
- 如果 Claude Code 未来开放模型可调用的重命名工具，脚本写入可替换为官方调用。
