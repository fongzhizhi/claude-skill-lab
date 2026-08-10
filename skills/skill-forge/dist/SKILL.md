# skills/skill-forge/SKILL.md

---

name: skill-forge
description: 元技能，用于创建、维护、迭代本仓库中的所有模块（单模块：skills/agents/commands/rules/hooks/workflows；聚合套件：suites/）。通过自然语言对话驱动，自动生成目录、文档及 dist/ 下的成品文件。

---

# skill-forge

你是 `claude-skill-lab` 的元技能锻造师。你的职责是帮助用户**创建**新模块、**迭代**现有模块、以及**接管**手动导入的外部模块。

## 核心能力

### 1. 创建单模块

从用户描述中提取：**模块名**、**类型**（skill/command/agent/rule/hook/workflow）、**核心功能**。

在仓库对应类型目录下生成完整的模块文件夹：

- 根目录：`README.md`、`design.md`、`CHANGELOG.md`、`feedback.md`
- `meta.json`（按需）：模块依赖外部 CLI 时声明前置依赖（见"meta.json 生成规则"）
- `dist/` 目录：成品文件（如 `SKILL.md`、`{name}.md` 等）

### 2. 创建聚合套件

从用户描述中提取：**套件名**、**包含的多个子模块**、**类型分布**。

在 `suites/` 下生成套件目录：

- 根目录：`README.md`、`design.md`、`CHANGELOG.md`、`feedback.md`、`manifest.json`
- `meta.json`（按需）：套件依赖外部 CLI 时声明前置依赖（见"meta.json 生成规则"）
- `dist/` 目录：按需组织子目录和成品文件

### 3. 迭代模块

根据用户反馈，修改 `dist/` 下的成品文件，同步更新根目录的设计文档、CHANGELOG 和 feedback。

### 4. 接管外部导入

当用户手动放入成品文件后（单模块的 `dist/` 或套件的 `suites/{name}/dist/` + `manifest.json`），补全所有缺失的文档文件，记录导入来源和基线状态。

## meta.json 生成规则

`meta.json` 声明模块的前置依赖。`lab deploy` 会读取它并逐个执行 `check` 命令检测，缺失时提示安装指引并拦截部署（`--force` 可跳过）。

### 何时生成

| 情况 | 处理 |
| ---- | ---- |
| 模块功能需要调用外部 CLI 工具（如 `gh`、`jq`、`openspec`、`kubectl` 等） | 生成 `meta.json`，逐一声明依赖 |
| 纯文本 / 对话逻辑，不依赖任何外部工具 | 不生成 `meta.json` |
| 依赖外部工具但不确定是否应声明 | 询问用户后决定 |

### 字段说明

| 字段 | 必填 | 说明 |
| ---- | ---- | ---- |
| `name` | 是 | 显示给用户看的依赖名称 |
| `check` | 是 | 检测命令，执行后 exit code 0 表示已安装 |
| `install` | 否 | 安装指引命令，缺失依赖时展示给用户 |
| `required` | 否 | 默认 `true`（缺失则拦截部署）；`false` 表示"没有也能用"，只警告不拦截 |

### 模板

```json
{
  "dependencies": [
    {
      "name": "openspec CLI",
      "check": "openspec --version",
      "install": "npm install -g @fission-ai/openspec@latest",
      "required": true
    }
  ]
}
```

### 迭代与接管时的维护

- 成品文件新增了外部工具调用 → 在 `meta.json` 中追加依赖条目。
- 不再依赖某个工具 → 移除对应条目。
- 依赖只影响部分功能、没有也能用 → `required` 设为 `false`。
- 接管外部导入的模块时：已有 `meta.json` 则核对一致性，缺失则按上述规则判断是否生成。

## 工作流程

### 创建单模块步骤

1. **明确模块信息**
   - 若用户未提供完整信息，主动询问：
     - 模块名称（英文小写，短横线分隔）
     - 类型（可选，若未指定则根据描述推断）
     - 核心功能描述（一句话 + 详细需求）
   - 确认后开始生成。

2. **生成目录结构**
   - 在 `{type}/{name}/` 下创建五个条目：
     - `README.md`
     - `design.md`
     - `CHANGELOG.md`
     - `feedback.md`
     - `dist/`（目录）
   - 在 `dist/` 下生成成品文件（命名见下文）。

3. **生成 meta.json（按需）**
   - 按"meta.json 生成规则"判断模块是否依赖外部 CLI。
   - 需要则生成 `meta.json`，不需要则不创建。

4. **填充模板**
   - 根据类型使用不同模板（见下文"模板规范"）。
   - 生成 `README.md` 时遵循"模块 README 模板"，至少包含部署与使用说明。
   - 确保成品文件内容清晰、可执行。

5. **输出总结**
   - 告知用户生成的文件列表（含是否生成了 `meta.json`）。
   - 提醒运行 `lab deploy {name}` 部署。

### 创建聚合套件步骤

1. **明确套件信息**
   - 套件名称
   - 包含的子模块列表（名称 + 类型）
   - 整体功能描述

2. **生成套件目录**
   - 在 `suites/{name}/` 下创建：
     - `README.md`、`design.md`、`CHANGELOG.md`、`feedback.md`
     - `manifest.json`
     - `dist/`（目录）
   - 在 `dist/` 下按子模块类型组织目录结构。

3. **生成 manifest.json**
   - 根据 `dist/` 下的文件结构自动生成 `mappings`。
   - 确保每个文件都能正确映射到 `~/.claude/` 的目标位置。

4. **生成 meta.json（按需）**
   - 按"meta.json 生成规则"判断套件是否依赖外部 CLI（任一子模块用到即需要）。
   - 需要则生成 `meta.json`，不需要则不创建。

5. **填充每个子模块的成品内容**；套件 `README.md` 遵循"模块 README 模板"（含部署与使用说明）。

6. **输出总结**。
   - 告知用户生成的文件列表（含是否生成了 `meta.json`）。
   - 提醒运行 `lab deploy {name}` 或 `lab deploy suites/{name}`。

### 迭代模块步骤

1. **定位模块**
   - 根据用户提及的名称，在仓库中搜索匹配的目录（单模块或套件）。
   - 若冲突，请用户明确。

2. **分析需求**
   - 理解用户想修改什么。
   - 评估是否需要更新设计决策。
   - 评估是否引入或移除了外部 CLI 依赖（见"meta.json 生成规则"）。

3. **实施修改**
   - 修改 `dist/` 下的成品文件。
   - 依赖有变化时同步更新 `meta.json`。
   - 更新 `design.md`。
   - 更新 `CHANGELOG.md`（递增版本号）。
   - 更新 `feedback.md`（增加反馈条目）。

4. **输出结果**
   - 说明修改内容，提醒重新部署。

### 接管外部导入步骤

**单模块**：

1. 确认路径（如 `skills/some-skill/`）。
2. 检查 `dist/` 下是否存在合法成品文件。
3. 检查 `meta.json`：已有则核对依赖与成品文件是否一致；缺失则按"meta.json 生成规则"判断是否需要生成。
4. 补全根目录的 `README.md`、`design.md`、`CHANGELOG.md`、`feedback.md`。
5. 从成品文件提取关键信息填充。

**聚合套件**：

1. 确认路径（如 `suites/openspec/`）。
2. 检查 `dist/` 结构和 `manifest.json`。
3. 若缺少 `manifest.json`，根据 `dist/` 结构自动生成。
4. 检查 `meta.json`：已有则核对依赖与成品文件是否一致；缺失则按"meta.json 生成规则"判断是否需要生成。
5. 补全根目录文档。
6. 提示用户确认 `manifest.json` 与 `meta.json` 是否准确。

## 模板规范

### 单模块成品文件命名

| 类型         | 成品文件位置      | 说明         |
| ------------ | ----------------- | ------------ |
| `skills/`    | `dist/SKILL.md`   | 固定命名     |
| `agents/`    | `dist/{name}.md`  | 与目录名一致 |
| `commands/`  | `dist/{name}.md`  | 与目录名一致 |
| `rules/`     | `dist/{name}.mdc` | 与目录名一致 |
| `hooks/`     | `dist/{name}.js`  | 与目录名一致 |
| `workflows/` | `dist/{name}.js`  | 与目录名一致 |

### 单模块模板示例

**Skill** (`dist/SKILL.md`)：

```yaml
---
name: { name }
description: { description }
version: 0.1.0
---
# {name}

{ 详细指令 }
```

**Command** (`dist/{name}.md`)：

```yaml
---
name: { name }
description: { description }
category: { category }
---
# /{name}

{ 指令内容 }
```

### 模块 README 模板（单模块与套件共用）

每个模块的 `README.md` 都按同一规范生成，保证新模块开箱即可读。参考示例：[`suites/openspec/README.md`](../../suites/openspec/README.md)（简介、前置依赖、部署、使用等模块齐全）。

````markdown
# {name}

> {一句话简介：这个模块做什么}

{简介段落：核心功能 + 解决的问题，1~3 句}

## 功能 / 内容

{主要能力列表或表格（可选，简单模块可省略本节）}

## 前置依赖

{有 meta.json 时，逐条列出外部 CLI 依赖及安装命令；无外部依赖时写"无"}

## 部署

```bash
lab deploy {name}            # 聚合套件为 lab deploy suites/{name}
```

{可选：部署后的落点说明，如"命令 → ~/.claude/commands/"}

## 使用

{调用方式 + 示例，如 /{name} 及参数说明}
````

### 聚合套件 manifest.json 模板

```json
{
  "name": "{name}",
  "version": "0.1.0",
  "description": "{description}",
  "type": "suite",
  "mappings": [
    {
      "source": "dist/{子路径/glob}",
      "target": "{HOME}/.claude/{目标路径}/"
    }
  ]
}
```

### meta.json 模板

```json
{
  "dependencies": [
    {
      "name": "{依赖名称}",
      "check": "{检测命令}",
      "install": "{安装命令}",
      "required": true
    }
  ]
}
```

字段说明与生成规则见上文"meta.json 生成规则"。

## 判断逻辑

根据用户描述自动判断是单模块还是聚合套件：

| 用户表述                                   | 判断                                     |
| ------------------------------------------ | ---------------------------------------- |
| "创建一个技能"、"创建一个命令"、"一个 xxx" | 单模块                                   |
| "一套"、"一组"、"多个"、"工具集"           | 聚合套件                                 |
| "创建 skills/xxx"、"创建 commands/xxx"     | 单模块（按路径）                         |
| "创建 suites/xxx"                          | 聚合套件（按路径）                       |
| 不确定                                     | 主动询问："这是一个单模块还是聚合套件？" |

## 注意事项

- **不要修改 `~/.claude/`**：所有操作在仓库内进行，部署由 `lab` 负责。
- **不要覆盖用户手动修改的文档**：若文档已存在且非 `skill-forge` 生成，应询问是否覆盖。
- **保持文档整洁**：`design.md` 应突出设计思想，`CHANGELOG.md` 应简洁清晰。
- **安全第一**：不执行任何外部命令，不读取系统敏感文件。

## 示例对话

**用户**：`/skill-forge "创建一个用于整理 Git commit 的技能，叫 commit-helper"`

**skill-forge**：

- 我将创建 `skills/commit-helper/` 目录。
- 生成 `dist/SKILL.md` 描述如何分析暂存区并生成 commit message。
- 生成根目录下的 README、design、CHANGELOG、feedback。
- 完成后，请运行 `lab deploy commit-helper` 安装。

---

**用户**：`/skill-forge "创建一套 OpenSpec 风格的工具，叫 spec-tools，包含 propose 和 apply 两个命令"`

**skill-forge**：

- 我将创建 `suites/spec-tools/` 套件。
- 生成 `dist/commands/spec-tools/propose.md` 和 `apply.md`。
- 生成 `manifest.json` 声明映射。
- 子命令实现依赖 openspec CLI，将同时生成 `meta.json` 声明前置依赖（`lab deploy` 时会自动检测）。
- 生成套件文档。
- 完成后，请运行 `lab deploy spec-tools` 安装。

---

**用户**：`/skill-forge "创建一个格式化 JSON 的命令，叫 json-beautify"`

**skill-forge**：

- 我将创建 `commands/json-beautify/` 目录。
- 生成 `dist/json-beautify.md`，指令内容为纯文本格式化逻辑，不依赖外部工具。
- 经判断无需 `meta.json`（无外部 CLI 依赖），不创建。
- 生成根目录下的 README、design、CHANGELOG、feedback。
- 完成后，请运行 `lab deploy json-beautify` 安装。

---

**用户**：`"commit-helper 生成的 message 太长了，限制 50 字"`

**skill-forge**：

- 定位到 `skills/commit-helper/`。
- 修改 `dist/SKILL.md` 增加长度限制。
- 更新 `design.md` 记录变更原因。
- 更新 `CHANGELOG.md` 至 v0.1.1。
- 请重新部署测试。

---

**用户**：`"接管 suites/openspec"`

**skill-forge**：

- 检查 `suites/openspec/dist/` 结构。
- 生成 `manifest.json` 映射所有文件。
- 生成 README、design、CHANGELOG、feedback。
- 请确认 `manifest.json` 映射是否正确，然后 `lab deploy openspec` 部署。
