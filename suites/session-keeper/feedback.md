# feedback

<!-- 记录使用过程中发现的问题与改进建议。 -->

## v0.1.0 初始版本（2026-11-06）

- 来源：随着 AI 会话增多，恢复历史会话时标题总是偏抽象，难以定位。希望在对话过程中每轮检测标题是否漂移，漂移就修正；多话题以最新话题为准，最新话题大背景不变时保留大背景。团队工作流下，涉及具体 ONES 单时标题加单号前缀便于识别，但正文仍以对话总结为准——ONES 单自己的标题可能不准。
- 采纳：
  - 先用本机 CLI 二进制确认机制：标题存于 transcript 的 `custom-title` / `ai-title`，`/resume` 取 `customTitle ?? aiTitle`，内置 `/rename` 即追加 `custom-title`；`UserPromptSubmit` hook 原生支持 `sessionTitle`
  - 落地为「技能 + hook」：hook 负责每轮的确定性触发，模型负责语义判断，脚本负责按官方结构落盘
  - 漂移判定以稳定优先：同一任务推进不改，新独立话题才改，拿不准不改
  - ONES 前缀采用 `PRO-156328 · 正文`；正文独立总结，不照抄单标题；多单并存取主要驱动单
  - hook 注册放入 `settings/profiles/_base.json`，并给 `lab/index.js` 增加 hooks 的 `{HOME}` 展开，避免切换 profile 时丢失
- 决策：
  - 不采用纯 CLAUDE.md 规则：软约束跨轮次易丢失，且会常驻所有项目
  - 不让 hook 自己生成标题：无语义判断能力；也不为每轮额外调用一次模型
  - 不写 `~/.claude/sessions/<pid>.json`：属运行时并发会话状态，外部写入有竞态
  - 待生效标题放 `~/.claude/cache/`：已被 `.gitignore` 忽略，不污染 gitinit 追踪
- 待实测：
  - 部署 + `switch` 后，hook 在 Windows exec 形式下是否稳定执行
  - `/resume` 列表是否立即显示新标题；当前会话标题栏是否在下一轮刷新
  - 长会话（30 MB+ transcript）下 `get` / `context` 的扫描耗时
  - 模型是否会过度改名（需要观察一段时间的标题抖动）

## v0.2.0 套件重命名（2026-11-06）

- 反馈：`session-title-keeper` 把套件锁死在「标题」这一个能力上；后续还想做「每轮会话结束更新会话状态」等能力，希望统一收进一个套件。
- 处理：
  - 套件、技能、hook 脚本统一更名为 `session-keeper`，套件定位上移为「会话体验守护」
  - 提醒前缀改为 `[session-keeper]`，待生效标题缓存目录改为 `~/.claude/cache/session-keeper/`
  - `design.md` 补充「按 session 粒度命名」决策，后续方向加入 `Stop` hook 更新会话状态
  - 改名时尚未部署，`~/.claude/` 无残留需要迁移

## v0.2.1 实测修复（2026-11-06）

- 实测问题：部署并切换 profile 后，连续两轮都没有出现 `[session-keeper]` 提醒；用真实 session_id 模拟 UserPromptSubmit 输入（不含 `session_title`）时脚本零输出。
- 根因：Claude Code 2.1.221 的 UserPromptSubmit 输入中，`session_title` 取自运行中会话的 `currentSessionTitle`，只在会话已有自定义标题时才有值；仅有 `ai-title` 的新会话里该字段为空，`runHook()` 因此永远拿到空标题并静默退出。
- 修复：
  - hook 改为从 `transcript_path` 读取标题：`ai-title` 读文件头、`custom-title` 读文件尾，窗口倍增，不做全量扫描（35MB 全量 2.3s → 头尾约 100ms）
  - `set` 的幂等判断同步改用快速读取
  - 复核 CLI 二进制：UserPromptSubmit 输出 schema 确实支持 `sessionTitle`，并存在 `Hook sessionTitle applied/cached` 运行逻辑，回填机制成立
  - SKILL.md / README 的命令改用 `os.homedir()` 展开，规避 `$HOME` 被 Cadence 等软件污染
- 遗留：Node 进程启动在本机约 1~3 秒/轮（受杀软与磁盘缓存影响），是每轮延迟的主要来源；待观察是否值得做常驻进程或增量缓存读取。

## v0.2.1 端到端复测（2026-11-06）

- 验证方式：在当前 VSCode 扩展（Claude Code 2.1.318）会话中直接实测，而非仅手工模拟 stdin。
- 验证结论：
  - hook 触发正常：UserPromptSubmit 每轮注入提醒；exec 形式 `command: "node"` + `args: [脚本路径]` 在 Claude Code 2.1.x 下可用（官方 2.1.139+ 支持，二进制内也有明确的 exec 形式报错提示）。
  - 标题回填链路完整：`set` 写入 transcript 的 `custom-title` 与 `~/.claude/cache/session-keeper/<sessionId>.json`，下一轮 UserPromptSubmit 消费 pending 并以 `sessionTitle` 回填；VSCode 扩展的标题栏在该轮刷新。
  - 刷新时机：`set` 执行当下不会立即改变运行中会话的标题——`set` 是外部进程，无法直接修改运行中 CLI 的内存，属预期行为。正确心智模型是「`set` 排队，下一条消息提交时生效」。
  - ONES 模式验证通过：从 ONES 链接 `/issue/PRO-156328` 识别单号，标题写为 `PRO-156328 · 切换自定义单参考点按钮置灰`（正文独立总结，不照抄单标题），下一轮消息后标题栏可见。
  - ONES 提醒范围：「本轮出现 ONES 单号」只基于当前 prompt 文本检测；后续 prompt 不带单号时该行消失，但标题前缀保持不变（同一张单持续推进）。
  - 新会话空窗：Claude Code 的 `ai-title` 生成前（本次实测为前 3 条用户消息），hook 因读不到任何标题而静默；是否改用首条用户消息兜底尚未决定，当前保持「新会话先不打扰」策略。
- 待定：新会话空窗的兜底方案；`ai-title` 的生成时机由 Claude Code 控制，hook 侧无法提前。

## v0.2.2 兼容端点死锁修复（2026-11-06）

- 反馈：部署 `/session-keeper` 后每轮会话结束都没有刷新标题。排查时为排除干扰，用户明确要求「别主动去调用」，先只观察 hook 是否触发。
- 观察：hook 确实每轮触发了（additionalContext 可见），但标题栏始终不变。进一步发现当前会话（DeepSeek 兼容端点）的 transcript 里 0 条 `ai-title`、0 条 `custom-title`；作为对照，另一条正常会话有 21 条 `ai-title`、15 条 `custom-title`。
- 根因：DeepSeek 的 Anthropic 兼容 API 不生成 `ai-title`，而 `readTitleQuick()` 只认 `ai-title` / `custom-title` → `effectiveTitle` 恒为空 → hook 每轮 `return` 静默 → 模型收不到提醒 → 不会调用 `set` → transcript 永远没有 `custom-title`。闭环死锁，与 v0.2.1 修的是不同环节。
- 修复：
  - 新增 `firstUserText()` / `readFirstUserPrompt()`：从 transcript 文件头窗口（64KB → 4MB 倍增）取第一条用户消息，截断 40 字符作为当前标题
  - `runHook()` 在 `readTitleQuick()` 为空时调用兜底；完全读不到用户消息时仍静默
  - 这同时回答了 v0.2.1 遗留的「新会话空窗兜底方案」：采用首条用户消息兜底，不再让 hook 在 `ai-title` 生成前完全空白
- 验证：
  - 模拟 stdin 执行 hook：修复前零输出，修复后输出 `additionalContext`，标题为「hello」
  - 重新部署并重启后 hook 每轮触发；用户观察到标题未变，确认这正是「hook 只提醒、`set` 才改名」的预期行为
  - 执行 `set "重构仓库目录并修复 session-keeper hook"` 后，下一轮标题栏刷新，`/resume` 同步生效，全链路闭环
- 心智模型补充：hook 触发 ≠ 标题自动变化。标题变更必须由模型执行 `set`；在用户要求「先别主动调用」的观察期，标题理应保持不变。

## v0.2.3 漂移判定翻转（2026-11-07）

- 反馈：实测多个会话，`set` 基本不会触发，标题长期停留在旧话题。用户明确要求「只要话题变了，就应该更新 title，以最新的为准」。
- 根因：规则把「不改」设为默认——「宁可不动」「拿不准不改」「大背景不变只是局部进展不改」，再叠加 hook 提醒里的「明显漂移」和技能 description 里的「明显切换」，模型几乎总能找到「不算漂移」的理由。
- 处理：
  - 判定翻转为「最新话题优先」：对象或目标任一变化即改写，拿不准也改写
  - 增加可操作的判定方法（一句话概括 + 对象/目标比较），降低语义门槛
  - 明确判定依据是用户最新发言而非模型执行步骤，防止模型自身的读写、跑命令引发抖动
  - hook 提醒文案与技能 description 同步去掉高门槛措辞
  - 补充 ONES 前缀与话题改写的交互：正文可变、前缀保留；hook 只检测当前 prompt 单号，后续轮次以前缀 + 对话主线为准，避免改写时误删
- 待观察：是否出现过度改名（同一需求多步执行被误判）；若有，只收紧「模型执行步骤不算话题变化」这一条，不回退整体策略。
