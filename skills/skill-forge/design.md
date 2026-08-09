# skill-forge 设计文档

## 目标

`skill-forge` 是 `claude-skill-lab` 的元技能，承载以下核心职责：

1. **创建单模块**：根据用户自然语言描述，在 `skills/`、`commands/` 等类型目录下生成符合规范的模块（含 `dist/` 成品目录及文档）。
2. **创建聚合套件**：根据用户描述，在 `suites/` 下生成套件目录，包含 `dist/` 成品文件、内部 `manifest.json` 及文档。
3. **迭代维护**：响应用户的修改需求，更新 `dist/` 下的成品文件，并同步维护 `design.md`、`CHANGELOG.md`、`feedback.md`。
4. **导入接管**：对用户手动放入的外部模块（单模块或套件），补全缺失的文档，建立基线。

`skill-forge` **不负责部署**（部署由 `lab` CLI 承担），也不涉及配置管理（由 `settings/` 独立处理）。

## 设计原则

- **对话优先**：所有操作通过自然语言在 Claude Code 对话中完成，无需切换终端。
- **自动化文档**：消除手动编辑 markdown 的负担，文档由 `skill-forge` 自动生成和更新。
- **渐进式披露**：生成的内容遵循"核心指令 → 详细参考"的层级，避免信息过载。
- **与 `lab` 解耦**：不依赖 `lab` 的实现细节，只负责生成仓库内的文件。
- **统一成品目录**：所有模块（单模块和套件）的成品文件统一放在 `dist/` 下。
- **可扩展**：支持所有现有类型（skills/agents/commands/rules/hooks/workflows）及聚合套件，新增类型无需改动核心逻辑。

## 工作流程设计

### 场景一：从零创建单模块

用户输入（示例）：
`/skill-forge "创建一个名为 commit-draft 的 command，用于生成符合 Conventional Commits 规范的提交信息"`

`skill-forge` 执行步骤：

1. **解析意图**：提取模块名 (`commit-draft`)、类型 (`command`)、核心功能描述。判断为"单模块"。
2. **确定类型目录**：`commands/commit-draft/`。
3. **生成目录结构**：

```text
commands/commit-draft/
├── README.md       # 说明、状态、用法简述
├── design.md       # 设计决策、使用场景、边界条件
├── CHANGELOG.md    # 初始版本 v0.1.0
├── feedback.md     # 占位，后续记录反馈
└── dist/           # 成品目录
    └── commit-draft.md  # 成品文件
```

4. **填充模板**：
   - 根据类型使用对应模板（如 command 的 frontmatter 含 `name`、`description`、`category`）。
   - 将用户描述转化为可执行的指令内容。
   - 设计文档记录设计理由、限制条件、测试用例。
5. **输出结果**：向用户报告生成的文件列表，并提示 `lab deploy commit-draft` 进行部署测试。

### 场景二：从零创建聚合套件

用户输入（示例）：
`/skill-forge "创建一套数据处理套件 data-tools，包含三个命令：validate, transform, export"`

`skill-forge` 执行步骤：

1. **解析意图**：提取套件名 (`data-tools`)、类型判断为"聚合套件"、包含的子命令列表。
2. **确定套件目录**：`suites/data-tools/`。
3. **生成套件结构**：

```text
suites/data-tools/
├── README.md        # 套件总览
├── design.md        # 整体设计决策
├── CHANGELOG.md     # 套件级版本历史
├── feedback.md      # 套件级反馈
├── manifest.json    # 部署清单
└── dist/            # 成品目录
    └── commands/
        └── data-tools/
            ├── validate.md
            ├── transform.md
            └── export.md
```

4. **生成 manifest.json**：

```json
{
  "name": "data-tools",
  "version": "0.1.0",
  "description": "数据处理工具集",
  "type": "suite",
  "mappings": [
    {
      "source": "dist/commands/data-tools/*.md",
      "target": "{HOME}/.claude/commands/data-tools/"
    }
  ]
}
```

5. **填充每个命令的模板**。
6. **输出结果**：告知用户套件已创建，提示 `lab deploy data-tools` 或 `lab deploy suites/data-tools` 部署。

### 场景三：迭代现有模块（单模块或套件）

用户输入（示例）：
`"commit-draft 生成的 message 太长了，改成不超过 50 个字符"`

`skill-forge` 执行步骤：

1. **定位模块**：扫描仓库，找到 `commands/commit-draft/`。
2. **读取当前内容**：获取 `dist/` 下的成品文件及现有文档。
3. **修改成品文件**：根据要求调整 `dist/commit-draft.md` 中的指令内容。
4. **更新文档**：
   - 在 `design.md` 中追加"变更理由"及新的设计决策。
   - 在 `CHANGELOG.md` 中记录版本（v0.1.1）及变更摘要。
   - 在 `feedback.md` 中记录本次反馈及处理结果。
5. **输出结果**：告诉用户已修改，提醒重新部署。

### 场景四：迭代聚合套件

用户输入（示例）：
`"data-tools 的 validate 命令输出太啰嗦了，精简一下"`

`skill-forge` 执行步骤：

1. **定位套件**：找到 `suites/data-tools/`。
2. **读取当前内容**：获取套件文档和 `manifest.json`。
3. **定位具体文件**：找到 `dist/commands/data-tools/validate.md`。
4. **修改成品文件**：精简该命令的输出描述。
5. **更新套件文档**：
   - 在套件 `design.md` 中记录变更。
   - 在套件 `CHANGELOG.md` 中记录版本更新。
   - 在套件 `feedback.md` 中记录反馈。
6. **输出结果**：提醒重新部署。

### 场景五：接管外部导入的单模块

用户操作：

- 手动将某个现成的 `SKILL.md` 放入 `skills/some-skill/dist/SKILL.md`。

用户后续输入：
`"/skill-forge 接管 skills/some-skill"`

`skill-forge` 执行步骤：

1. **扫描目录**：检查是否存在 `dist/` 及成品文件，识别类型。
2. **补全文档**：
   - 生成 `README.md`（基于成品文件内容提取摘要）。
   - 生成初始 `design.md`（记录"外部导入"及基础信息）。
   - 生成 `CHANGELOG.md`（基线版本）。
   - 生成 `feedback.md`（空白）。
3. **提示用户**：说明已补全文档，后续迭代可按场景三进行。

### 场景六：接管外部导入的聚合套件

用户操作：

- 手动将 OpenSpec 的完整目录结构放入 `suites/openspec/dist/`。

用户后续输入：
`"/skill-forge 接管 suites/openspec"`

`skill-forge` 执行步骤：

1. **扫描目录**：检查 `dist/` 结构，推断文件类型和映射关系。
2. **生成 manifest.json**：根据 `dist/` 下的文件结构自动生成映射规则。
3. **补全文档**：生成 README、design、CHANGELOG、feedback。
4. **提示用户**：确认生成的 `manifest.json` 是否需要调整，然后可正常部署和迭代。

## 类型判断规则

`skill-forge` 根据用户描述自动判断"单模块"还是"聚合套件"：

| 用户表述                                    | 判断结果     |
| ------------------------------------------- | ------------ |
| "创建一个技能"、"创建一个命令"              | 单模块       |
| "创建一套工具"、"一组命令"、"多个"          | 聚合套件     |
| 明确指定路径如 `skills/xxx` 或 `suites/xxx` | 根据路径判断 |
| 不确定时                                    | 主动询问用户 |

## 文件操作规范

- 所有文件操作限定在仓库根目录内，**不涉及 `~/.claude/`**。
- 生成的文件使用 UTF-8 编码。
- 单模块的成品文件放在 `dist/` 下，命名遵循模块规范。
- 聚合套件的 `dist/` 下可自由组织子目录，由 `manifest.json` 声明映射。
- 文档更新采用**追加模式**，不覆盖已有历史。

## 模板规范

### 单模块模板

**Skill 模板** (`dist/SKILL.md`)：

```yaml
---
name: { name }
description: { description }
version: 0.1.0
---
# {name}

{ 详细指令内容 }
```

**Command 模板** (`dist/{name}.md`)：

```yaml
---
name: { name }
description: { description }
category: { 自动推断或用户指定 }
---
# /{name}

{ 指令内容 }
```

### 聚合套件模板

**套件 manifest.json**：

```json
{
  "name": "{name}",
  "version": "0.1.0",
  "description": "{description}",
  "type": "suite",
  "mappings": [
    {
      "source": "dist/{相对路径/glob}",
      "target": "{HOME}/.claude/{目标路径}/"
    }
  ]
}
```

**套件 README.md**：

````markdown
# {name}

{description}

## 包含的命令/技能

- `/{name}:{sub1}` - {描述}
- `/{name}:{sub2}` - {描述}

## 部署

```bash
lab deploy {name}
```
````

```

## 与 lab 的边界

| skill-forge 负责 | lab 负责 |
|---------------------|------------|
| 生成/修改仓库内的模块文件（含 `dist/`） | 将 `dist/` 内容复制到 `~/.claude/` |
| 生成/修改套件的 `manifest.json` | 读取 `manifest.json` 执行映射部署 |
| 维护模块的文档（design/CHANGELOG/feedback） | 部署、切换配置、列表状态 |
| 识别导入的外部模块并补全文档 | 类型推断、冲突解决、卸载 |

## 错误处理

- **无法识别模块名**：询问用户澄清。
- **类型冲突**：若多个类型目录下有同名模块，提示用户指定类型。
- **文件已存在**：询问是否覆盖（仅限成品文件），文档文件则追加。
- **外部模块导入失败**：检查文件完整性，告知缺失内容。

## 安全考虑

- 不执行任意代码，只生成文本文件。
- 不访问 `~/.claude/` 或系统敏感目录。
- 所有修改仅限仓库目录，建议用户将仓库纳入版本控制以便回滚。
```
