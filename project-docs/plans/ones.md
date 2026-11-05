# ONES CLI 与 ONES 套件：实现计划

> 目标：把 ONES 的读/写操作从浏览器手工流程中抽出来，做成一个独立的 `ones` CLI；再在其上构建 `/ones:*` Claude 套件。一期做四件事：读工单描述并输出核心表达、评论增删改查、缺陷分析评论、工时登记；其他能力后续按需扩展。CLI 是 ONES 版的 glab，套件是 ONES 版的 gitflow。

> **交接说明**：本文档供实现会话使用；实现直接在仓库中读取本文件即可。开始前先读第三节（CLI 与套件关系）和第四、五节（两者设计），再按第七节顺序实现。本文档不包含代码；实现细节以 `CONTRACT.md` 为准（实现时创建）。

实现者约束：

1. 套件只通过 `ones ... --json` 调用 CLI，不 import CLI 源码、不写 HTTP。
2. CLI 不知道 Claude/套件；不要加入评论模板、gitflow 解析。
3. 所有 ONES 端点/字段只在 `profile.js` 出现。
4. 写操作必须支持 `--dry-run`，写后读回，不自动重试。
5. CLI 不可用时套件停摆，不退回浏览器/CDP。


## 一、背景与目标

### 问题

- 需求和缺陷都来自 ONES；gitflow 通过 `ones-parser` 解析工单文本，但只到“读单号/标题”为止。
- 合并代码后还有一批手工操作：登记工时、评论根因与修复方案、转状态。
- 这些操作重复、机械，且信息已经在会话里（session-review 能生成根因/方案），适合自动化。
- 一期先做描述读取、评论、缺陷分析评论和工时登记；状态流转等保留手工，后续再扩展。

### 目标

| 目标 | 说明 |
|------|------|
| 独立 CLI | `ones` 命令可脱离 Claude 使用，覆盖 auth、读、写、doctor |
| 套件一期 | 读工单描述并输出核心表达；评论增删改查；缺陷分析评论；工时登记 |
| 稳定契约 | CLI 与套件通过命令 + JSON + 退出码交互，不互相 import |
| 安全写入 | 预览/确认、读回验证、去重、不自动重试 |
| 可维护 | 私有 API 变化时只改 CLI 的 profile，套件不动 |

### 非目标（一期不做）

- 状态流转、合并后收尾编排
- 工时的修改/删除（一期只登记）
- 工单描述写入、附件上传/下载
- 工单搜索、批量操作
- 项目/迭代/看板管理
- 浏览器/CDP 自动化
- 纯人工模式


## 二、关键决策

| 决策 | 结论 | 理由 |
|------|------|------|
| 传输方式 | 仅 `webapi` | 私有部署不支持官方 OpenAPI；三个验证（读回放、写回放、会话寿命）已通过 |
| CLI 与套件 | 完全分离 | CLI = glab，套件 = gitflow；代码、安装、版本独立 |
| CLI 命名 | 二进制 `ones`，包名 `ones-cli` | 短、自然；包名避免冲突 |
| 套件命名 | `ones` | `/ones:init`；与 `ones` 命令共享域名但不冲突 |
| CLI 目录 | `clis/ones/` | 独立 Node 包，不归 `claude-lab` 部署 |
| 套件目录 | `suites/ones/` | 标准套件，`claude-lab deploy ones` |
| 套件一期范围 | 读描述摘要 + 评论增删改查 + 缺陷分析评论 + 工时登记 | 先覆盖高频手工操作；状态/收尾后置 |
| 开发顺序 | 契约 → CLI → 套件 | CLI 稳定前不写套件，避免命令层反复改 |
| 浏览器 | 不使用 | 运行时不做 CDP；采集契约时用 DevTools 查看请求/响应 |


## 三、总体架构与 CLI/套件关系

### 3.1 一句话模型

`ones` CLI 是 ONES 版的 glab，`/ones:*` 套件是 ONES 版的 gitflow。CLI 负责把 ONES 的 HTTP 接口变成稳定的命令；套件负责把 Claude 的意图变成命令组合。两者只通过命令行、JSON 和退出码交互。

### 3.2 依赖方向

```text
Claude 对话
  └─ /ones:* 命令（suites/ones）
       ├─ ones-core 技能（规则）
       └─ Bash → ones CLI（clis/ones）
                    └─ HTTPS → ONES 私有 webapi

人工/脚本 ──→ ones CLI（同样可用，不依赖 Claude）
```

- 依赖是单向的：套件 → CLI → ONES。
- 套件不 import CLI 源码，只调用可执行文件。
- CLI 不知道套件、Claude、session-review、gitflow 的存在。
- CLI 可以单独使用；套件不能脱离 CLI 工作。

### 3.3 职责边界

| 层 | 负责 | 不负责 |
|----|------|--------|
| CLI | HTTP、Cookie/CSRF、ID 映射、分页、错误归一化、JSON、dry-run、doctor | 评论内容、工时/状态决策、gitflow/session-review |
| 套件 | 意图理解、工单解析、内容生成、预览确认、编排 | HTTP、Cookie、端点、原始响应字段 |
| Claude | 对话、确认、异常处理 | 直接拼 HTTP 请求 |

判断一个功能放哪层，用两个问题：

1. 它需要知道 ONES 的端点、Cookie、原始字段吗？需要 → CLI。
2. 它需要知道用户意图、评论内容、gitflow 分支吗？需要 → 套件。

两者都不需要 → Claude 或文档。

### 3.4 交互契约

| 问题 | 答案 |
|------|------|
| 谁依赖谁 | 套件依赖 CLI；CLI 不知道套件 |
| 怎么交互 | shell 命令 + `--json` + 退出码 |
| 谁管 Cookie/CSRF | CLI |
| 谁管评论内容 | 套件 |
| 谁管端点/字段 | CLI 的 `profile.js` |
| 谁管工时/状态决策 | 套件（一期管工时；状态后续） |
| 安装 | CLI 独立 `npm link`；套件 `claude-lab deploy ones` |
| 版本 | CLI semver + `schemaVersion`；套件声明兼容范围 |
| CLI 不可用 | 套件停摆，不退回浏览器 |
| CLI 升级 | 先看 `CONTRACT.md`；套件通常不用动 |

### 3.5 典型调用链

```text
/ones:read PRO-159115
  → ones ticket get PRO-159115 --json
  → 套件输出核心表达

/ones:comment add PRO-159115 --body-file <tmp>
  → ones comment add PRO-159115 --body-file <tmp> --json
  → ones comment list PRO-159115 --json（读回）

/ones:analysis PRO-159115
  → ones ticket get PRO-159115 --json
  → ones comment list PRO-159115 --json
  → 套件按缺陷分析模板生成
  → 预览确认
  → ones comment add PRO-159115 --body-file <tmp> --json

/ones:worklog add PRO-159115 --hours 1.5
  → ones worklog types --json
  → ones worklog list PRO-159115 --json（查重）
  → 预览确认
  → ones worklog add PRO-159115 --hours 1.5 --type <id> --json
  → ones worklog list PRO-159115 --json（读回）
```

每条 `ones` 命令独立成功/失败；套件负责顺序、预览、确认和失败报告，不把多步写操作塞进 CLI。

### 3.6 仓库布局

```text
claude-skill-lab/
├── clis/
│   └── ones/              # 独立 CLI，npm link 安装，不归 claude-lab 部署
├── suites/
│   └── ones/              # Claude 套件，claude-lab deploy ones
└── project-docs/
    └── plans/
        └── ones.md        # 本文档
```

### 3.7 为什么分开

- **生命周期不同**：ONES 升级时只改 CLI 的 `profile.js`，套件不用重新部署。
- **可独立测试**：CLI 可以独立跑 `doctor`，不需要 Claude。
- **可独立使用**：人工可以 `ones comment add`，脚本/CI 也能用。
- **边界清晰**：套件不会混入 HTTP/Cookie，CLI 不会混入业务判断。
- **失败隔离**：CLI 坏了，套件停摆并报错；套件改坏了，CLI 不受影响。


## 四、CLI 设计

### 4.1 原则

- Node 18+，零依赖，无构建；复制目录即可运行。
- 人类可直接使用；套件用 `--json` 解析。
- 稳定输出：`schemaVersion`、`ok`、`command`、`data`、`warnings` / `error`。
- 稳定退出码；错误码可编程判断。
- 所有写操作支持 `--dry-run`；默认不自动重试。
- 提供 `ones --version`，供套件 `meta.json` 检测。
- 永不把 Cookie/CSRF 放进 argv、日志或错误信息。

### 4.2 目录

```text
clis/ones/
├── package.json          # bin: { "ones": "bin/ones.js" }
├── bin/ones.js
├── src/
│   ├── cli.js            # 参数解析、命令分发
│   ├── config.js         # 配置/环境变量
│   ├── session.js        # Cookie/CSRF
│   ├── http.js           # fetch 封装、错误归一化
│   ├── profile.js        # 端点模板 + 字段映射（升级只改这里）
│   ├── output.js         # JSON / 人类输出
│   ├── errors.js         # 错误码
│   └── api/
│       ├── ticket.js
│       ├── comment.js
│       ├── worklog.js
│       └── status.js       # 后续
├── test/                 # node --test，零依赖
├── tools/
│   └── ones-capture.js   # 请求/响应整理，不发布
├── README.md
├── CONTRACT.md           # CLI 与套件的接口契约
└── CHANGELOG.md
```

> `cli/`（单数）是 `claude-lab` 自身的部署工具；`clis/`（复数）是独立 CLI 集合。是否把 `cli/` 改名为 `lab/` 待定。

### 4.3 命令

| 命令 | 作用 | 版本 |
|------|------|------|
| `ones auth status` | 检查会话是否存在/过期 | v0.1 |
| `ones auth set --cookie-file` | 更新 Cookie/CSRF | v0.1 |
| `ones doctor [--ticket]` | 配置/会话/身份/读能力自检 | v0.1 |
| `ones user me` | 当前用户 | v0.1 |
| `ones ticket get <id>` | 解析展示号并读详情 | v0.1 |
| `ones ticket resolve <id>` | 展示号 → 内部 ID/团队 | v0.1 |
| `ones comment list <id>` | 评论列表（分页） | v0.1 |
| `ones comment add <id> --body-file` | 新增评论 | v0.2 |
| `ones comment edit <id> --comment-id --body-file` | 编辑评论 | v0.2 |
| `ones comment delete <id> --comment-id --yes` | 删除评论 | v0.2 |
| `ones worklog list <id>` | 工时列表 | v0.1 |
| `ones worklog types` | 工时类型列表 | v0.1 |
| `ones worklog add <id> --hours <h> --type <type> [--date <date>] [--note <text>]` | 登记工时 | v0.2 |
| `ones status transitions <id>` | 可用流转 | 后续 |
| `ones status set <id> --to ...` | 执行流转 | 后续 |

一期实现 ticket/comment/worklog 相关命令；status 等 CLI 能力随套件后续扩展再补。
后续：`ticket update --description`、`worklog update/delete`、附件、搜索。

### 4.4 JSON 契约

成功：

```json
{
  "schemaVersion": 1,
  "ok": true,
  "command": "ticket.get",
  "data": {},
  "warnings": []
}
```

失败：

```json
{
  "schemaVersion": 1,
  "ok": false,
  "command": "comment.add",
  "error": {
    "code": "AUTH_EXPIRED",
    "message": "会话已过期",
    "hint": "运行 ones auth set 更新 Cookie"
  }
}
```

错误码：`AUTH_EXPIRED`、`FORBIDDEN`、`NOT_FOUND`、`VALIDATION`、`SCHEMA_MISMATCH`、`NETWORK`、`RATE_LIMITED`、`UNSUPPORTED`、`CONFLICT`。

退出码：0 成功；2 会话；3 权限；4 不存在；5 参数；6 结构不符；7 网络；8 不支持；9 冲突。

### 4.5 配置与会话

- 配置：`~/.ones-cli/config.json`（host、team、apiProfile、默认头）
- 会话：`~/.ones-cli/secret.json`（cookie、csrf、updatedAt、expiresAt）
- 环境变量：`ONES_HOST`、`ONES_TEAM`、`ONES_COOKIE`、`ONES_CSRF`
- 优先级：命令行 > 环境变量 > 配置文件 > 默认值
- 套件不读 secret；只调用 `ones auth status` / `ones doctor`

### 4.6 归一化模型

```text
Ticket:     id, displayId, title, description, status, assignee, reporter, type, priority
Comment:    id, author, body, createdAt, updatedAt, canEdit
User/Team:  id, name
Worklog:    id, author, date, hours, type, note
Transition: id, name, toStatus, requiredFields           # 后续
```

`profile.js` 负责原始响应 → 归一化模型；ONES 升级只改 profile。

### 4.7 写安全

- 所有写命令先 `--dry-run` 预览。
- 评论删除必须显式确认（非交互调用需 `--yes`）；默认 dry-run；删除后用 `comment list` 读回。
- 工时登记前先读 `worklog types`，类型不明确不猜；写入后用 `worklog list` 读回。
- 写入后读回验证；读回失败报告“已发出但未确认”，不重试。
- 评论去重由套件做（先 list 再 add）；工时按日期/工时/备注查重；一期不做批量删除。
- 后续的状态写操作沿用同一套预览、确认、读回规则。


## 五、套件设计

### 5.1 一期范围

一期做四件事：

1. **读工单描述**：读取 ONES 工单描述，输出核心表达；说人话、讲重点、力求简洁。
2. **评论增删改查**：列表、新建、修改、删除。
3. **缺陷分析评论**：基于评论能力，按专用模板生成并写入缺陷分析评论。
4. **工时登记**：读取工时类型，登记本次工时，写入后读回。

其他能力（状态流转、合并后收尾、工单描述写入、附件、搜索）一期继续手工完成，后续按需扩展。CLI 已把读写原语封装好，后续扩展只需增加命令和套件编排。

`/ones:init` 与 `/ones:auth` 是安装/认证入口，不算业务功能，但一期必须具备。

### 5.2 命令

| 命令 | 作用 | 一期 |
|------|------|------|
| `/ones:init` | 检查 CLI、跑 doctor、写套件默认配置 | 是（安装入口） |
| `/ones:auth` | 引导更新 Cookie/CSRF 并自检 | 是（认证入口） |
| `/ones:read <ticket>` | 读取工单描述，输出核心表达 | 是 |
| `/ones:comment` | 评论列表/新建/修改/删除 | 是 |
| `/ones:analysis <ticket>` | 生成并写入缺陷分析评论 | 是 |
| `/ones:worklog` | 登记工时（类型/日期/备注），列表用于确认 | 是 |
| `/ones:status` | 查看/执行流转 | 后续 |
| `/ones:wrapup` | 合并后收尾编排 | 后续 |
| `/ones:parse` | 离线解析工单文本 | 后续（ones-parser 仍独立供 gitflow 使用） |

评论子命令：

```text
/ones:comment list <ticket>
/ones:comment add <ticket> --body-file <file>
/ones:comment edit <ticket> --comment-id <id> --body-file <file>
/ones:comment delete <ticket> --comment-id <id>
```

写操作统一：先预览，确认后执行，写入后读回；删除必须显式确认。

工时子命令：

```text
/ones:worklog types
/ones:worklog list <ticket>
/ones:worklog add <ticket> --hours <h> [--date <date>] [--type <name|id>] [--note <text>]
```

工时登记要求：

- 先读 `worklog types`；类型不明确时询问，不猜 ID。
- 先读 `worklog list` 检查相同日期/工时/备注的疑似重复记录；发现重复先询问。
- 默认日期为今天；默认工时和类型取自 `~/.claude/ones.json`，没有默认值时询问。
- 写入前预览“工单、日期、工时、类型、备注”，确认后执行；写入后 `worklog list` 读回。
- 一期只登记，不修改、不删除工时。

`/ones:read` 的输出要求：

- 只基于工单原文，不编造。
- 先给一句话结论，再列关键点（现象、影响范围、环境/版本、期望结果）。
- 区分事实与推断；原文没有的信息标注“原文未说明”。
- 默认不超过 5 条要点；细节留在工单里，不整段复述。

### 5.3 缺陷分析评论模板

`/ones:analysis` 用于把本次缺陷的根因、修复方案和验证结果写成一条结构化评论。模板独立存放，便于按团队习惯调整：

- 模板文件：`suites/ones/dist/docs/ones-defect-analysis-template.md` → `~/.claude/docs/ones-defect-analysis-template.md`（由 `manifest.json` 映射）。
- 命令内置兜底模板；文件缺失时使用兜底，不阻断。
- 生成素材：工单描述、已有评论、本次会话的改动/验证信息；`--from-session` 可读取 session-review 的报告。
- 写入前必须预览全文并确认；写入后 `comment list` 读回。
- 若已存在相似分析评论，先提示，不重复写入。

建议模板字段：

```markdown
## 缺陷分析

- 工单：{{ticket}}
- 现象：{{symptom}}
- 根因：{{root_cause}}
- 影响范围：{{impact}}
- 修复方案：{{fix}}
- 验证结果：{{verification}}
- 风险与后续：{{risk}}
```

模板要求：字段可裁剪，但“根因/修复方案/验证结果”必须具体；不写空话；默认控制在 300 字以内，超出时先精简再确认。

### 5.4 技能与配置

- `ones-core`：共享规则（命令调用、`--json` 解析、错误码处理、写前预览、写后读回、删除确认、停摆）。
- `ones-parser`：一期不并入；继续作为独立技能供 gitflow 使用。
- `~/.claude/ones.json`：workflow 默认值（默认团队、评论风格、分析模板路径、摘要长度上限、默认工时、默认工时类型），不含 Cookie。
- `suites/ones/meta.json`：声明 `ones` CLI 依赖（`check`：`ones --version`；`required: true`）。
- 套件不读 CLI 的 secret；认证统一走 `ones auth status` / `ones doctor`。

### 5.5 集成

- gitflow：一期只可选地从分支名提取单号；status/wrapup 的编排后置。工时登记由用户显式调用 `/ones:worklog`，不自动串联。
- session-review：`/ones:analysis --from-session` 读取本次会话的根因/方案作为素材；未部署时用内置模板。
- 工单链接：复用 ones-parser 的链接规则。

### 5.6 后续扩展

- 状态：`/ones:status` + CLI `status transitions/set`。
- 收尾：`/ones:wrapup` 串联评论、工时、状态。
- 工时：修改/删除、按日汇总、批量登记。
- 其他：工单描述写入、附件、搜索、删除审计/恢复策略。


## 六、开发与验证方式

### 6.1 分工

本文档是实现会话的设计输入，只描述设计与契约，不包含代码；实现按第七节顺序进行。

| 角色 | 做什么 |
|------|--------|
| 本文档 | 背景、决策、CLI/套件关系、契约、能力清单、阶段计划、风险 |
| 实现会话 | 按本文档实现 `clis/ones/`（一期：ticket/comment/worklog），再实现 `suites/ones/`（一期：read/comment/analysis/worklog）；用真实 ONES 校准 `profile.js` 并验收 |
| 人工 | 提供测试工单、Cookie/CSRF、确认写操作；判断业务语义 |

实现顺序不变：先 CLI v0.1 读，再 v0.2 写，最后套件；CLI 未稳定前不写套件。一期 CLI 做 ticket/comment/worklog，status 随套件后续扩展再补。

### 6.2 验收清单

1. `node bin/ones.js auth set --cookie-file ...`
2. `node bin/ones.js doctor --ticket <测试单> --json`
3. `ones ticket get`、`ones comment list`、`ones worklog types`、`ones worklog list`
4. `/ones:read <测试单>`：摘要是否准确、简洁、无编造
5. `comment add --dry-run` → 真实写入 → 读回
6. `comment edit` → 读回
7. `comment delete` → `comment list` 确认已删除
8. `worklog add --dry-run` → 真实写入 → `worklog list` 读回
9. `/ones:analysis <测试单> --dry-run` → 写入 → 读回
10. 把 `doctor` 和失败输出记录在实现会话中

### 6.3 契约采集

直接用 DevTools 采集：

1. 干净的 ONES 标签页，DevTools Network 清空并勾选 Preserve log
2. 依次：工单详情 → 评论列表 → 发测试评论 → 编辑该评论 → 删除该评论 → 工时类型 → 工时列表 → 登记测试工时 → 刷新
3. 直接看请求：method、path、请求头名称、请求体字段、响应字段
4. 如需整理，可本地跑 `ones-capture.js` 生成报告；报告只用来填 `profile.js`
5. 把症状记录在实现会话中：哪条命令、HTTP 状态、错误码、缺哪个字段；原始数据保留在本地


## 七、阶段计划

| 阶段 | 内容 | 验收 |
|------|------|------|
| P0 | CONTRACT、capture 工具 | 契约评审通过 |
| P1 | CLI v0.1：auth/config/doctor/user/ticket/comment list/worklog list/types | mock 测试 + 真实 doctor/读 |
| P2 | CLI v0.2：comment add/edit/delete、worklog add | 测试单写入/修改/删除 + 读回 |
| P3 | 套件 v0.1：init/auth/read/comment/worklog | 部署后对话实测 |
| P4 | 套件 v0.2：analysis + 缺陷分析模板 | 测试单生成/预览/写入/读回 |
| P5 | 文档、版本、边界打磨 | README/CHANGELOG 完整 |
| 后续 | status/wrapup、工时修改/删除、附件、搜索 | 按需扩展 |


## 八、风险与对策

| 风险 | 对策 |
|------|------|
| 私有 API 升级改端点/字段 | `profile.js` 集中映射；`SCHEMA_MISMATCH` 明确报错；doctor 输出 apiProfile |
| Cookie 过期 | `auth status` 提前提示；`AUTH_EXPIRED` 给命令指引 |
| CSRF 轮换 | CLI 响应后写回 secret；写不进去警告 |
| 权限/WAF | 保留原始错误摘要；doctor 区分 401/403 |
| 评论格式 | DevTools 确认 Markdown/HTML；必要时加转换 |
| 删除评论不可逆 | 默认 dry-run；显式确认；删除后 list 读回；不做批量删除 |
| 摘要失真/编造 | 只基于工单原文；区分事实与推断；原文没有的标注“未说明”；限制要点数量 |
| 缺陷分析空泛 | 固定字段；根因/方案/验证必须具体；预览确认后才写入 |
| 重复评论 | 写入前 list 检查相似内容；发现重复先询问 |
| 工时类型/字段复杂 | 先读 types/list；类型或必填字段不明确就停摆，不猜 ID |
| 重复登记工时 | 写入前按日期/工时/备注检查；疑似重复先询问；写后 list 读回 |
| 工时单位/日期格式不一致 | 配置统一单位和日期格式；预览时明确显示 |
| 密钥泄露 | secret 文件不入仓；不打印；不支持 argv 传 Cookie |


## 九、待确认

- [ ] Node 版本 ≥18？
- [ ] 测试工单用哪个？
- [ ] Cookie 寿命、CSRF 是否轮换？
- [ ] 评论正文是 Markdown、HTML 还是纯文本？
- [ ] 评论删除是硬删还是软删？当前账号是否有删除权限？
- [ ] 缺陷分析模板需要哪些固定字段、目标长度、是否中英双语？
- [ ] 工时单位是小时还是天？日期格式是什么？
- [ ] 工时类型如何选择、是否有默认值？是否允许一天登记多条？备注是否必填？
- [ ] `cli/` 是否改名为 `lab/`？
- [ ] CLI 是 `npm link` 还是内部 npm 包发布？


## 十、参考

- [gitflow 计划](gitflow.md)
- [session-review 计划](session-review.md)
- [gitflow README](../../suites/gitflow/README.md)
- [ones-parser](../../skills/ones-parser/README.md)
- [CLAUDE.md](../../CLAUDE.md)
