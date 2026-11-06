# session-keeper

> 会话体验守护套件：让每个会话的标题始终能一眼看出在做什么——每轮检测标题是否漂移，漂移才改写；涉及 ONES 单时自动加「单号 · 」前缀。后续会话状态等能力并入同一套件。

当前版本聚焦会话标题维护。Claude Code 的会话标题由模型自动生成，长会话里话题一旦切换，标题往往还停留在开头，`/resume` 列表就变成一堆看不出内容的短句。本套件把「标题该是什么」变成一条可执行规则：`UserPromptSubmit` hook 每轮注入一行极短提醒，`session-keeper` 技能负责判定漂移并调用脚本改写标题。标题写入会话 transcript 的 `custom-title` 记录，与内置 `/rename` 同构，`/resume` 列表直接生效。

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
[session-keeper] 当前会话标题「…」。若本轮话题已明显漂移（或 ONES 单发生变化），按 skill session-keeper 的规则改写标题；未漂移则完全忽略本提示，不要向用户提及标题。 本轮出现 ONES 单号：PRO-156328。
```

模型判定漂移后调用脚本改写；未漂移时什么都不做。标题示例：

```text
修复 PCB 铺铜异形焊盘报错
PRO-156328 · 切换自定义单参考点按钮置灰
month-log-summary 补写 AI 月总结
```

### 手动模式

```bash
# 读当前标题
node "$HOME/.claude/hooks/session-keeper.js" get

# 看当前标题 + 最初需求 + 最近用户消息
node "$HOME/.claude/hooks/session-keeper.js" context --limit 8

# 直接改写
node "$HOME/.claude/hooks/session-keeper.js" set "接入 pro-api 封装查询"
```

也可以直接对 Claude 说「把会话标题改成 X」「这个会话标题不对」，由技能按规则改写。

## 已知限制

- 标题栏的**当前会话**刷新依赖下一轮 hook 回填；`/resume` 列表在脚本写入后立即读取到新标题。
- 需要 `CLAUDE_CODE_SESSION_ID` 环境变量（Claude Code 的 Bash 工具默认提供）；缺失时可用 `--session` / `--transcript` 指定。
- 每轮注入的提醒约 60 个汉字；如不需要自动触发，移除 `_base.json` 中的 hook 注册即可退化为纯技能。
- 卸载套件时请同步移除 `settings/profiles/_base.json` 中的 hook 注册，否则每轮会因找不到脚本而报错。
