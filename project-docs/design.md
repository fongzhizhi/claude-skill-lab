# 设计文档

> 本文档描述 `claude-skill-lab` 的设计目标、目录结构、模块规范与核心机制。快速上手请移步 [README](../README.md)。

---

## 版本更新记录

| 版本 | 日期       | 变更说明                                                                                                                                                                 |
| ---- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| v2.1 | 2026-08-11 | 新增 `docs/` 模块类型（参考文档 → `~/.claude/docs/`）；项目说明文档迁移至 `project-docs/`；新增 `rules/ts-standards` TS 规则模块（含 5 条规则与 docs 软依赖检查）。      |
| v2.0 | 2026-08-09 | 新增聚合套件（`suites/`）支持；统一所有模块成品存放于 `dist/` 目录；重构部署逻辑支持单模块与套件两种模式；更新 `manifest.json` 结构；引入套件内部 `manifest.json` 规范。 |
| v1.0 | 初始       | 原始设计，仅支持单模块（skills/agents/commands/rules/hooks/workflows），成品文件位于模块根目录。                                                                         |

---

## 目录

1. [设计目标](#设计目标)
2. [核心工作流](#核心工作流)
3. [仓库目录结构](#仓库目录结构)
4. [模块规范](#模块规范)
5. [聚合套件规范](#聚合套件规范)
6. [Settings 配置设计](#settings-配置设计)
7. [CLI 命令设计](#cli-命令设计)
8. [部署逻辑详解](#部署逻辑详解)
9. [映射表与 manifest.json](#映射表与-manifestjson)
10. [跨平台路径处理](#跨平台路径处理)
11. [安全与 .gitignore](#安全与-gitignore)

---

## 设计目标

1. **工作台即仓库，本地即生产**：所有成品在仓库中锻造，一键部署到本地。
2. **设计与成品分离**：人读的文档与机器加载的成品文件物理分离，互不干扰。文档由 `skill-forge` 自动维护，无需人工编辑。
3. **类型可扩展**：新增扩展类型只需在顶层 `manifest.json` 加一条映射，CLI 逻辑不变。
4. **配置即模块**：Claude Code 配置（`settings.json`、`CLAUDE.md`）同样被版本化、可迭代。
5. **直接覆盖，不备份**：部署就是覆盖，信任用户对本地环境的控制权。
6. **对话驱动迭代**：所有创建、反馈、迭代通过自然语言与 `skill-forge` 交互完成，不依赖手动编辑 markdown。
7. **统一成品目录**：所有模块（无论单模块还是聚合套件）的成品文件统一放在 `dist/` 子目录下，简化部署逻辑。
8. **套件一等公民**：支持聚合套件（多个文件、混合类型）的导入、版本管理和迭代，与单模块享受同等治理能力。

---

## 核心工作流

`skill-forge` 是本仓库的元技能，所有模块的创建、反馈、迭代都通过它完成。用户全程在 Claude Code 对话中操作，无需手动编辑任何文件。

```
用户 → 自然语言描述 → skill-forge → 生成/更新文件 → lab deploy → 测试 → 反馈 → 迭代
```

### 场景一：从零创建新模块（单模块或套件）

| 步骤 | 操作                                                           | 说明                                                                  |
| ---- | -------------------------------------------------------------- | --------------------------------------------------------------------- |
| 创建 | `/skill-forge "创建一个 xxx 技能"` 或 `"创建一套数据处理命令"` | `skill-forge` 自动判断类型（单模块/套件），生成完整目录结构和成品文件 |
| 部署 | `lab deploy <name>`                                            | CLI 将 `dist/` 内容复制到 `~/.claude/` 对应位置                       |
| 反馈 | "xxx 有个问题：……"                                             | 自然语言描述，`skill-forge` 理解并记录                                |
| 迭代 | "改为……"                                                       | `skill-forge` 更新设计文档、CHANGELOG、成品文件                       |
| 验证 | 对话中直接测试                                                 | `lab deploy` 输出部署结果                                             |

### 场景二：导入外部模块（单模块或聚合套件）

用户从网上复制或下载现成的技能/命令/套件：

| 步骤 | 操作                                                                        | 说明                                       |
| ---- | --------------------------------------------------------------------------- | ------------------------------------------ |
| 导入 | 手动将文件放入对应目录（如 `skills/<name>/dist/` 或 `suites/<name>/dist/`） | 用户自行放置成品                           |
| 部署 | `lab deploy <name>`                                                         | 直接部署使用                               |
| 接管 | "帮我改造一下 skills/<name>" 或 "接管 suites/openspec"                      | `skill-forge` 扫描目录，补全文档，记录基线 |
| 迭代 | 后续与场景一相同                                                            | 对话驱动，`skill-forge` 维护               |

> `skill-forge` 不关心模块来源，所有模块最终都收敛到同一套迭代规范。

---

## 仓库目录结构

```
claude-skill-lab/
├── README.md
├── package.json                 部署入口（npm scripts / bin → cli/lab.js）
├── manifest.json                顶层映射表（类型 → 目标路径、部署规则）
├── docs/                        单模块：参考文档 → ~/.claude/docs/
│   └── <name>/
│       ├── README.md            说明、状态（由 skill-forge 维护）
│       ├── design.md            设计决策（由 skill-forge 维护）
│       ├── CHANGELOG.md         迭代历史（由 skill-forge 维护）
│       ├── feedback.md          问题清单（由 skill-forge 维护）
│       └── dist/
│           └── docs/
│               └── <name>.md        成品（长参考文档，AI 按需 @ 读取，不自动加载）
│
├── project-docs/                ← 项目说明文档（design.md、quickstart.md、examples/）
│
├── skills/                      单模块：技能 → ~/.claude/skills/
│   └── <name>/
│       ├── README.md            说明、状态（由 skill-forge 维护）
│       ├── design.md            设计决策（由 skill-forge 维护）
│       ├── CHANGELOG.md         迭代历史（由 skill-forge 维护）
│       ├── feedback.md          问题清单（由 skill-forge 维护）
│       └── dist/                ← 成品目录（~/.claude/ 镜像）
│           └── skills/
│               └── <name>/
│                   ├── SKILL.md         成品主文件
│                   └── scripts/         辅助脚本（可选）
│
├── agents/                      单模块：智能体 → ~/.claude/agents/
│   └── <name>/
│       ├── README.md
│       ├── design.md
│       ├── CHANGELOG.md
│       ├── feedback.md
│       └── dist/
│           └── agents/
│               └── <name>.md        成品
│
├── commands/                    单模块：斜杠命令 → ~/.claude/commands/
│   └── <name>/
│       ├── README.md
│       ├── design.md
│       ├── CHANGELOG.md
│       ├── feedback.md
│       └── dist/
│           └── commands/
│               └── <name>.md        成品
│
├── rules/                       单模块：规则文件 → ~/.claude/rules/
│   └── <name>/
│       ├── README.md
│       ├── design.md
│       ├── CHANGELOG.md
│       ├── feedback.md
│       └── dist/
│           └── rules/
│               └── <name>.md        成品
│
├── hooks/                       单模块：Hook 脚本 → ~/.claude/hooks/
│   └── <name>/
│       ├── README.md
│       ├── design.md
│       ├── CHANGELOG.md
│       ├── feedback.md
│       └── dist/
│           └── hooks/
│               └── <name>.js        成品
│
├── workflows/                   单模块：动态工作流 → ~/.claude/workflows/
│   └── <name>/
│       ├── README.md
│       ├── design.md
│       ├── CHANGELOG.md
│       ├── feedback.md
│       └── dist/
│           └── workflows/
│               └── <name>.js        成品
│
├── suites/                      ← 聚合套件（多文件/混合类型）
│   └── <name>/
│       ├── README.md            套件总览（由 skill-forge 维护）
│       ├── design.md            整体设计决策
│       ├── CHANGELOG.md         套件级迭代历史
│       ├── feedback.md          套件级反馈
│       ├── manifest.json        套件内部部署清单（声明文件映射）
│       └── dist/                ← 成品目录（可包含子目录）
│           └── (任意结构，与目标部署位置对应)
│
└── settings/                    配置类 → ~/.claude/ + VSCode
    ├── README.md                配置决策说明
    ├── CHANGELOG.md             配置变更历史
    ├── feedback.md              使用反馈
    ├── settings.template.json   配置模板（含占位符，入仓）
    ├── settings.json            实际配置（含真实 API Key，不入仓）
    ├── CLAUDE.md                全局个人指令
    ├── profiles/
    │   ├── _base.json           公共配置基座
    │   ├── deepseek.json
    │   ├── zhipu.json
    │   └── company.json
    └── vscode/
        └── settings.json        VSCode 用户配置
```

---

## 模块规范

### 通用结构（适用于所有单模块类型）

每个单模块是一个独立目录，其下包含：

| 文件/目录      | 用途               | 维护者                                 |
| -------------- | ------------------ | -------------------------------------- |
| `README.md`    | 说明、状态、用法   | `skill-forge` 自动生成/更新            |
| `design.md`    | 设计决策、测试用例 | `skill-forge` 自动生成/更新（可选）    |
| `CHANGELOG.md` | 迭代历史           | `skill-forge` 自动记录                 |
| `feedback.md`  | 问题清单           | `skill-forge` 自动记录                 |
| `dist/`        | **成品文件目录**   | `skill-forge` 生成，用户可通过对话修改 |

`dist/` 目录为 `~/.claude/` 的**相对路径镜像**，成品文件按部署落点排布：

| 类型         | 成品文件位置                     | 部署落点                          |
| ------------ | -------------------------------- | --------------------------------- |
| `skills/`    | `dist/skills/<name>/SKILL.md`    | `~/.claude/skills/<name>/`（整目录）|
| `agents/`    | `dist/agents/<name>.md`          | `~/.claude/agents/<name>.md` |
| `commands/`  | `dist/commands/<name>.md`        | `~/.claude/commands/<name>.md` |
| `rules/`     | `dist/rules/<name>.md`           | `~/.claude/rules/<name>.md` |
| `hooks/`     | `dist/hooks/<name>.js`           | `~/.claude/hooks/<name>.js` |
| `workflows/` | `dist/workflows/<name>.js`       | `~/.claude/workflows/<name>.js` |
| `docs/`      | `dist/docs/<name>.md`            | `~/.claude/docs/<name>.md` |

> **重要**：`dist/` 是唯一被 `lab deploy` 关注的目录。部署时，`lab` 将 `dist/` 下的**所有内容**按相对路径递归复制到 `~/.claude/`（镜像复制）。因此，`dist/` 内可以自由放置额外的资源文件（如脚本、模板、图片等），无需修改 `lab` 代码；也可直接 `cp -r <module>/dist/* ~/.claude/` 验证部署。

### 模块来源

| 来源               | 说明                                          | 文档文件                       | 迭代方式                                              |
| ------------------ | --------------------------------------------- | ------------------------------ | ----------------------------------------------------- |
| `skill-forge` 生成 | 对话中描述需求，由 `skill-forge` 创建完整结构 | 完整                           | 对话驱动，`skill-forge` 维护                          |
| 外部导入           | 用户手动复制或下载的现成模块                  | 可能只有成品文件，或完全不完整 | 部署后由 `skill-forge` 接管，补全文档后按统一流程迭代 |

**外部导入模块的处理流程**：

1. 用户将成品文件放入对应模块的 `dist/` 目录（如 `skills/<name>/dist/skills/<name>/SKILL.md`）
2. `lab deploy <name>` 直接部署到 `~/.claude/`
3. 若需迭代，在对话中调用 `skill-forge` 并指定该模块
4. `skill-forge` 扫描目录，识别已有文件，补全根目录下的文档文件（README、design、CHANGELOG、feedback）
5. 记录当前状态为基线版本
6. 按用户需求修改成品文件（位于 `dist/`），更新文档
7. 提示重新部署

---

## 聚合套件规范

### 定义

聚合套件（Suite）是指**包含多个成品文件**、可能**跨越多种类型**（如同时包含 commands 和 hooks）、或**需要保持特定子目录结构**的模块集合。典型例子：OpenSpec（12 个斜杠命令）、一个完整的工作流系统（commands + hooks + rules）。

### 目录结构

所有聚合套件统一放在仓库顶层的 `suites/` 目录下，每个套件一个子目录：

```
suites/<name>/
├── README.md              # 套件总览说明
├── design.md              # 整体设计决策
├── CHANGELOG.md           # 套件级版本历史
├── feedback.md            # 套件级反馈记录
├── manifest.json          # 套件内部部署清单（必需）
└── dist/                  # 成品目录，结构自由
    └── (任意文件/子目录)
```

### 套件内部 manifest.json

每个套件必须包含一个 `manifest.json` 文件，声明如何将 `dist/` 中的内容映射到 `~/.claude/` 的目标位置。

**Schema**：

```json
{
  "name": "套件名称（必填）",
  "version": "语义化版本（可选，默认 0.1.0）",
  "description": "简短描述（可选）",
  "type": "suite",
  "mappings": [
    {
      "source": "dist/内的相对路径（支持 glob）",
      "target": "目标路径模板（支持 {HOME} 等变量）"
    }
    // 可多条
  ]
}
```

**示例（OpenSpec）**：

```json
{
  "name": "openspec",
  "version": "1.0.0",
  "description": "Spec-Driven Development 工具集",
  "type": "suite",
  "mappings": [
    {
      "source": "dist/commands/opsx/*.md",
      "target": "{HOME}/.claude/commands/opsx/"
    }
  ]
}
```

**部署行为**：

- `lab deploy openspec` 读取 `suites/openspec/manifest.json`
- 对于每条 `mappings`，将 `source` 匹配的所有文件复制到 `target` 目录（保留相对路径）
- 如果 `target` 以 `/` 结尾，视为目录；否则视为具体文件路径

### 与单模块的区别

| 特性     | 单模块                                | 聚合套件                        |
| -------- | ------------------------------------- | ------------------------------- |
| 存放位置 | `skills/`、`commands/` 等顶层类型目录 | `suites/`                       |
| 成品文件 | 单个文件（或少量辅助文件）            | 任意数量、任意结构              |
| 部署方式 | `lab` 自动推断目标路径（基于类型）    | 根据套件内 `manifest.json` 映射 |
| 类型混合 | 不允许（单一类型）                    | 允许（可混合多个类型）          |
| 适用场景 | 一个技能、一个命令                    | 工具集、工作流系统、复杂插件    |

---

## Settings 配置设计

### 目录结构

```
settings/
├── README.md                配置决策说明
├── CHANGELOG.md             配置变更历史
├── feedback.md              使用反馈
├── settings.template.json   配置模板（占位符入仓）
├── settings.json            实际配置（含真实 Key，不入仓）
├── CLAUDE.md                全局个人指令
├── profiles/
│   ├── _base.json           公共配置基座
│   ├── deepseek.json
│   ├── zhipu.json
│   └── company.json
└── vscode/
    └── settings.json        VSCode 用户配置
```

### 设计原则

1. **模板与实际分离**：`settings.template.json` 入仓（含占位符），`settings.json` 不入仓（`.gitignore`），由手动拷贝模板并填充真实 Key。
2. **`settings/` 即 `~/.claude/` 的镜像**：除 `vscode/` 子目录外，其余文件直接复制到 `~/.claude/` 对应位置。
3. **多模型配置用"基座 + 差异"**：`_base.json` 存公共配置，各模型文件只放差异字段。
4. **`CLAUDE.md` 优先级**：全局 `~/.claude/CLAUDE.md` 与项目级 `./CLAUDE.md` 合并，项目级配置优先。

### 多模型切换机制（Profile Merge）

`lab switch <name>` 执行流程：

1. 读取 `settings/profiles/_base.json`
2. 读取 `settings/profiles/<name>.json`
3. 深度合并（`<name>.json` 覆盖 `_base.json` 同名字段）
4. 将合并结果写入 `~/.claude/settings.json`

**API Key 处理策略**：

| 场景                         | 行为                                              |
| ---------------------------- | ------------------------------------------------- |
| profile 中明确指定 `api_key` | 覆盖本地已有值                                    |
| profile 中未指定 `api_key`   | 保留本地已有值                                    |
| 首次部署，本地无 Key         | 使用 profile 中的值，若为空则手动补充 `api_key` |

**Ephemeral 模式**：`--ephemeral` 参数不修改磁盘文件，合并在内存中完成，仅对当前会话生效。

### VSCode 配置

| 仓库位置                        | 目标位置（由 CLI 动态解析） |
| ------------------------------- | --------------------------- |
| `settings/vscode/settings.json` | `{VSCodeSettings}`          |

`{VSCodeSettings}` 根据 `process.platform` 解析：

| 平台     | 解析结果                                                |
| -------- | ------------------------------------------------------- |
| `win32`  | `%APPDATA%/Code/User/settings.json`                     |
| `darwin` | `~/Library/Application Support/Code/User/settings.json` |
| `linux`  | `~/.config/Code/User/settings.json`                     |

---

## CLI 命令设计

CLI 只做四件事：**部署模块**、**管理配置**、**信息查询**、**套件操作**。

### 命令总览

| 命令                               | 用途                                     |
| ---------------------------------- | ---------------------------------------- |
| `lab`                              | 显示帮助信息                             |
| `lab list`                         | 列出所有可部署/已安装模块（含套件）      |
| `lab status`                       | 显示本地已部署模块的状态                 |
| `lab deploy [<type>/]<name>`       | 部署单模块或套件（必须带参）             |
| `lab deploy suites/<name>`         | 显式部署聚合套件                         |
| `lab switch`                       | 列出所有可用 profile                     |
| `lab switch <profile>`             | 切换模型配置                             |
| `lab switch <profile> --ephemeral` | 仅当前会话生效                           |
| `lab remove [<type>/]<name>`       | 从 `~/.claude/` 中卸载已部署的模块或套件 |

### 类型自动推断（冲突报错）

`lab deploy` 和 `lab remove` 支持省略类型前缀：

```bash
lab deploy skill-forge        # 唯一匹配 → 直接执行
lab deploy agents/architect   # 显式指定类型 → 跳过推断
lab deploy suites/openspec    # 显式部署套件
```

推断算法：

1. 在所有单类型目录（`skills/`、`commands/` 等）以及 `suites/` 中查找匹配 `<name>` 的模块
2. 若**唯一匹配** → 输出 `Deploying <name> as <type>...`，若未加 `--yes` 则等待确认
3. 若**多个匹配** → 报错并列出所有匹配项，提示用户用 `type/name` 或 `suites/name` 显式限定
4. 若**无匹配** → 报错提示

> 不采用固定顺序查找，避免未来类型增多时产生隐式优先级导致误部署。
### 执行约定

- 所有命令在项目根目录执行
- 通过 `node cli/lab.js` 直接调用，或通过 `npm run lab -- …`、shell 别名 `lab`
- 退出码：0 成功，1 参数错误，2 文件操作失败
- 部署前自动创建目标父目录

---

## 部署逻辑详解

### 单模块部署

`lab deploy <type>/<name>` 或自动推断后：

1. 定位到 `{type}/{name}/`
2. 检查 `dist/` 目录是否存在
3. 将 `{type}/{name}/dist/` 下的**所有内容**按相对路径递归复制到 `~/.claude/`（镜像复制——`dist/` 即 `~/.claude/` 的相对路径镜像，单模块为全量镜像，无需声明）
4. 覆盖已有文件

**示例**：

- 仓库：`commands/commit-helper/dist/commands/commit-helper.md`
- 目标：`~/.claude/commands/commit-helper.md`

- 仓库：`skills/commit-helper/dist/skills/commit-helper/SKILL.md`
- 目标：`~/.claude/skills/commit-helper/SKILL.md`

如果 `dist/` 下有子目录，一并复制：

- `skills/commit-helper/dist/skills/commit-helper/scripts/helper.py` → `~/.claude/skills/commit-helper/scripts/helper.py`

### 聚合套件部署

`lab deploy suites/<name>` 或自动推断后：

1. 定位到 `suites/{name}/`
2. 读取 `manifest.json`
3. 对于每条 `mappings`：
   - 解析 `source`（支持 glob 通配符）
   - 对匹配到的每个文件，计算相对路径（相对于 `dist/`）
   - 解析 `target`（替换 `{HOME}` 等变量）
   - 将文件复制到目标路径（保持相对目录结构）
4. 所有覆盖操作直接执行

**示例**：

- 仓库：`suites/openspec/dist/commands/opsx/apply.md`
- manifest 映射：`"source": "dist/commands/opsx/*.md"`, `"target": "{HOME}/.claude/commands/opsx/"`
- 目标：`~/.claude/commands/opsx/apply.md`

### 覆盖策略

- 所有文件直接覆盖，不备份
- `lab switch` 按上述 API Key 策略处理
- `lab remove` 只删除已部署的文件，不删目录和用户数据（对于套件，按 mappings 反向删除）

---

## 映射表与 manifest.json

### 顶层 manifest.json（仓库根目录）

顶层 `manifest.json` 主要定义**单模块类型**的目标路径，并声明套件目录位置。

```json
{
  "types": {
    "skills": {
      "target": "{HOME}/.claude/skills/",
      "pattern": "skills/*/dist/*"
    },
    "agents": {
      "target": "{HOME}/.claude/agents/",
      "pattern": "agents/*/dist/*"
    },
    "commands": {
      "target": "{HOME}/.claude/commands/",
      "pattern": "commands/*/dist/*"
    },
    "rules": {
      "target": "{HOME}/.claude/rules/",
      "pattern": "rules/*/dist/*"
    },
    "hooks": {
      "target": "{HOME}/.claude/hooks/",
      "pattern": "hooks/*/dist/*"
    },
    "workflows": {
      "target": "{HOME}/.claude/workflows/",
      "pattern": "workflows/*/dist/*"
    }
  },
  "settings": {
    "files": {
      "settings.json": "{HOME}/.claude/settings.json",
      "CLAUDE.md": "{HOME}/.claude/CLAUDE.md",
      "profiles/*.json": "{HOME}/.claude/profiles/",
      "vscode/settings.json": "{VSCodeSettings}"
    }
  },
  "suites": {
    "path": "suites/"
  }
}
```

> `suites` 只声明路径，具体部署规则由套件内部的 `manifest.json` 定义。

### 新增类型流程（单模块）

1. 在顶层创建新目录（如 `plugins/`）
2. 在 `manifest.json` 的 `types` 中添加映射
3. CLI 代码自动识别，无需改动

> 此为"零 CLI 代码改动"，用户仍需编辑 `manifest.json` 配置文件。

---

## 跨平台路径处理

`manifest.json` 中使用模板变量，`lab.js` 运行时根据 `process.platform` 解析。

| 变量               | 解析规则                                     |
| ------------------ | -------------------------------------------- |
| `{HOME}`           | `os.homedir()`（由 CLI 解析，非 shell 展开） |
| `{VSCodeSettings}` | 见下表                                       |

| 平台    | `process.platform` | 解析结果                                                     |
| ------- | ------------------ | ------------------------------------------------------------ |
| Windows | `win32`            | `%APPDATA%/Code/User/settings.json`                          |
| macOS   | `darwin`           | `{HOME}/Library/Application Support/Code/User/settings.json` |
| Linux   | `linux`            | `{HOME}/.config/Code/User/settings.json`                     |

---

## 安全与 .gitignore

```gitignore
settings/settings.json
*.log
.DS_Store
node_modules/
```

`settings/settings.template.json` 入仓，含占位符（`YOUR_API_KEY_HERE`）。手动拷贝模板生成 `settings/settings.json` 并填充真实值。

---

_本文档随项目演进持续更新。_
