---
name: ones-parser
description: 解析 ONES 项目管理平台（ones.com、ones.yourcompany.com 等）复制出来的工单内容——识别工单 ID（PRO-/WIKI-/TASK-/BUG- 等前缀）、标题与链接，输出结构化结果供对话使用或 commit 引用。当对话中出现 ONES 链接、ONES 工单粘贴内容、"PRO-xxx"、"WIKI-xxx" 等 ONES 单号标识时使用。
version: 0.1.2
---
# ones-parser

解析用户粘贴的 ONES 工单内容（需求 / 文档 / 任务 / 缺陷等），输出规范的结构化结果，作为对话上下文或 commit 引用的**单一事实来源**。本 skill 只做文本解析，**不发起任何网络请求**，也不编造链接之外的信息。

## 已知的 ONES 复制格式

ONES 复制出来的内容有几种变体，都可能出现：

| 变体 | 示例 |
| ---- | ---- |
| 单行：`ID 标题 链接` | `PRO-156328 【需求测试】切换到自定义单还未选择参考点的模式下，在左侧区域按钮没有置灰 http://ones.com/project/#/team/Tkdsads78/issue/PRO-156328` |
| 单行，多空格分隔 | `WIKI-2048  用户权限管理模块设计方案 https://ones.yourcompany.com/wiki/#/team/Tkdsads78/space/Sp3c3Id/page/Page1234` |
| 两行：`ID 标题` 换行 `链接` | `PRO-156328 【需求测试】...` 换行 `http://ones.com/...` |
| Markdown 链接 | `[PRO-156328 【需求测试】...](http://ones.com/project/#/team/Tkdsads78/issue/PRO-156328)` |

链接结构（hash 路由）：

```text
http(s)://<域名>/project/#/team/<TeamId>/issue/<工单ID>          # 项目内单（需求/任务/缺陷等）
http(s)://<域名>/wiki/#/team/<TeamId>/space/<SpaceId>/page/<PageId>  # 知识库页面
```

- `<TeamId>`（如 `Tkdsads78`）是 base62 团队标识，**冗余信息**，不是工单号。
- 真正的工单 ID（如 `PRO-156328`、`WIKI-2048`、`Page1234`）在 hash 末尾。

## 解析规则

### 1. 以链接为唯一可信锚点

- 从链接 hash 末尾提取正式工单 ID（`PRO-156328`、`WIKI-2048` 等）。
- 链接与 ID 不一致时（如用户手改过标题行），**以链接为准**。
- 链接缺失时：仅当文本中出现 `[A-Z]+-\d+` 形态的 ONES 单号标识，才作为 ID 候选，并标注"来源为文本而非链接"。

### 2. 标题提取

- **单行格式**：取 ID（或前缀）之后、链接之前的整段文本为标题（标题可含空格、`【】`、`#` 等任意字符）。
- **两行格式**：取 ID 行去掉 ID 前缀后的部分为标题。
- **Markdown 链接格式**：取链接文本（`[...]` 内）为标题。
- 链接前若紧跟标点（句号、逗号）或聊天工具补充的字符，从标题中剔除。
- 标题为空或解析不到时，标题字段留空并说明，**不要猜测**。
- **不分析单类型**：ONES ID 前缀（PRO/WIKI/TASK 等）无法可靠区分单是需求、缺陷还是其他类型，解析结果不输出类型字段，也不臆测。

### 3. 容忍变体

- 分隔符：单空格、多空格、制表符均可。
- 同行 / 换行均可，甚至 ID、标题、链接部分丢失也要尽力解析出能确定的字段。
- 同一段文本中出现多个 ONES 单 → 逐个解析，输出列表。
- 链接可能被聊天工具截断或转义（如末尾多出标点）——以 `http(s)://` 起始、能识别出 ID 的链接为准。

## 输出协议

### 结构化结果（默认）

```text
ONES 工单解析：
- ID: PRO-156328
- 标题: 【需求测试】切换到自定义单还未选择参考点的模式下，在左侧区域按钮没有置灰
- 链接: http://ones.com/project/#/team/Tkdsads78/issue/PRO-156328
```

### 紧凑引用格式（供 commit / 文档引用）

```text
PRO-156328 · 切换到自定义单…（http://ones.com/project/#/team/Tkdsads78/issue/PRO-156328）
```

commit footer 中引用：`Refs: http://ones.com/project/#/team/Tkdsads78/issue/PRO-156328`（纯链接，单 ID 由 `Title:` 行体现）

## 使用场景

- **对话中直接出现** ONES 粘贴内容 → 按本规则解析，输出结构化结果（若解析结果随后会被 commit-draft 等使用，同时给出紧凑引用格式）。
- **被其他 skill / command 引用**：他人模块需要解析 ONES 内容时，将下方"引用片段"嵌入其指令，保持解析规则单一来源。

```markdown
对话或参数中出现的 ONES 工单链接（示例：`PRO-156328 【标题】 http://ones.xxx.com/project/#/team/xxx/issue/PRO-156328`），按以下规则解析：
1. 以链接为锚点，从 hash 末尾提取正式单 ID（如 PRO-156328、WIKI-2048）。
2. 标题取 ID 与链接之间的文本（单行）或单独一行（两行格式）。
3. 不分析单类型（ONES ID 前缀无法可靠区分需求/缺陷等）。
4. 解析结果在 footer 中引用为 `Refs: <链接>`（纯链接，单 ID 由 `Title:` 行体现）。
```

## 边界与不编造原则

- **不发起网络请求**：不调用 ONES API、不访问链接内容补全信息。
- **不编造标题**：解析不到就留空说明。
- **不分析单类型**：ONES ID 前缀无法可靠区分单类型，不输出类型字段，也不臆测。
- **不修改原文**：解析基于用户粘贴的文本，输出时保留原始标题字面（包括可能存在的乱码，交由使用方处理）。
