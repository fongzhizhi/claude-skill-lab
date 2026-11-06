# session-keeper

> 会话体验守护套件：让每个会话的标题始终能一眼看出当前在做什么——每轮检测，话题变了就以最新话题改写；涉及 ONES 单时自动加「单号 · 」前缀。后续会话状态等能力并入同一套件。

当前版本聚焦会话标题维护。Claude Code 的会话标题由模型自动生成，长会话里话题一旦切换，标题往往还停留在开头，`/resume` 列表就变成一堆看不出内容的短句。本套件把「标题该是什么」变成一条可执行规则：`UserPromptSubmit` hook 每轮注入一行极短提醒，`session-keeper` 技能负责判定本轮话题与标题是否一致，不一致就调用脚本改写标题。标题写入会话 transcript 的 `custom-title` 记录，与内置 `/rename` 同构，`/resume` 列表直接生效。

## 内容

| 类型 | 名称 | 说明 |
| --- | --- | --- |
| 技能 | `session-keeper` | 标题形式、长度、正反例；漂移判定表；ONES 单号前缀规则；写入流程与静默边界 |
| Hook | `session-keeper.js` | `UserPromptSubmit` 每轮输出一行 `[session-keeper]` 提醒（含当前标题与本轮 ONES 单号）；同时提供 `get` / `set` / `context` 三个 CLI 子命令 |

## 前置依赖

无外部 CLI。需要 Node 18+（`claude-lab` 本身已要求）。

## 部署

```bash
claude-lab deploy session-keeper
```

hook 的注册写在 `settings/profiles/_base.json`，需要执行一次 profile 切换才会落入 `~/.claude/settings.json`：

```bash
claude-lab switch <当前使用的 profile>
```

之后新开一个会话即可生效。已有会话需要重载 Claude Code 才会带上 hook 配置。

## 使用

### 自动模式（默认）

无需任何操作。每轮用户发言时 hook 会注入：

```text
[session-keeper] 当前标题「…」。每轮自检：一句话概括本轮用户在做什么，与标题不是同一件事（新任务/新模块/新问题域/对象或目标变了都算，拿不准也算变了）就按 skill session-keeper 规则直接以最新话题为准改写标题；命令：node "…/.claude/hooks/session-keeper.js" set "<新标题>"。ONES 前缀：主话题仍属同一张单时，正文可变、前缀保留；换单则换前缀。仍是同一件事则完全忽略本提示，不要向用户提及标题。 本轮出现 ONES 单号：PRO-156328。
```

模型判定话题变化后直接调用脚本改写；仍是同一件事时什么都不做。标题正文随话题改写，但只要主话题仍属同一张 ONES 单，`ID · ` 前缀会保留——hook 只在当前 prompt 出现单号时提示候选，前缀是否保留以当前标题与对话主线为准。标题示例：

```text
修复 PCB 铺铜异形焊盘报错
PRO-156328 · 切换自定义单参考点按钮置灰
month-log-summary 补写 AI 月总结
```

### 手动模式

```bash
# 读当前标题
node "$(node -p "require('os').homedir()")/.claude/hooks/session-keeper.js" get

# 看当前标题 + 最初需求 + 最近用户消息
node "$(node -p "require('os').homedir()")/.claude/hooks/session-keeper.js" context --limit 8

# 直接改写
node "$(node -p "require('os').homedir()")/.claude/hooks/session-keeper.js" set "接入 pro-api 封装查询"
```

也可以直接对 Claude 说「把会话标题改成 X」「这个会话标题不对」，由技能按规则改写。

## 已知限制

- 标题栏的**当前会话**刷新依赖下一轮 hook 回填；`/resume` 列表在脚本写入后立即读取到新标题。
- 话题切换会导致标题多次改写，这是设计目标（以最新话题为准）；同一件事的连续推进不会重复改名。
- hook 输入的 `session_title` 只在会话已有自定义标题时有值（2.1.221），仅有 `ai-title` 时为空；脚本从 `transcript_path` 兜底读取，只读文件头（`ai-title`）与文件尾（`custom-title`），35MB 会话约 100ms；极端超长尾随消息下可能退回旧标题。
- 兼容端点（如 DeepSeek）不生成 `ai-title`：此时当前标题取自首条用户消息前 40 字符，可能只是「hello」这类开场白；执行一次 `set` 后即以 `custom-title` 为准。
- 每轮执行一次 Node 进程，启动耗时受机器影响（Windows + 实时杀软实测约 1~3 秒/轮，脚本自身读取只占约 0.1 秒）。
- 命令行统一用 `os.homedir()` 展开路径；不要依赖 `$HOME`（部分环境会被第三方软件改写，如 Cadence）。
- 需要 `CLAUDE_CODE_SESSION_ID` 环境变量（Claude Code 的 Bash 工具默认提供）；缺失时可用 `--session` / `--transcript` 指定。
- 每轮注入的提醒约 60 个汉字；如不需要自动触发，移除 `_base.json` 中的 hook 注册即可退化为纯技能。
- 卸载套件时请同步移除 `settings/profiles/_base.json` 中的 hook 注册，否则每轮会因找不到脚本而报错。
