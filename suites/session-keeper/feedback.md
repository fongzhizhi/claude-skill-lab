# feedback

<!-- 记录使用过程中发现的问题与改进建议。 -->

## v0.1.0 初始版本（2026-11-06）

- 来源：随着 AI 会话增多，恢复历史会话时标题总是偏抽象，难以定位。希望在对话过程中每轮检测标题是否漂移，漂移就修正；多话题以最新话题为准，最新话题大背景不变时保留大背景。团队工作流下，涉及具体 ONES 单时标题加单号前缀便于识别，但正文仍以对话总结为准——ONES 单自己的标题可能不准。
- 采纳：
  - 先用本机 CLI 二进制确认机制：标题存于 transcript 的 `custom-title` / `ai-title`，`/resume` 取 `customTitle ?? aiTitle`，内置 `/rename` 即追加 `custom-title`；`UserPromptSubmit` hook 原生支持 `sessionTitle`
  - 落地为「技能 + hook」：hook 负责每轮的确定性触发，模型负责语义判断，脚本负责按官方结构落盘
  - 漂移判定以稳定优先：同一任务推进不改，新独立话题才改，拿不准不改
  - ONES 前缀采用 `PRO-156328 · 正文`；正文独立总结，不照抄单标题；多单并存取主要驱动单
  - hook 注册放入 `settings/profiles/_base.json`，并给 `lab.js` 增加 hooks 的 `{HOME}` 展开，避免切换 profile 时丢失
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
