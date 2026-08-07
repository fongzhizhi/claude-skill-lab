# 设计文档

> 本文档描述 `claude-skill-lab` 的设计目标、目录结构、模块规范与核心机制。快速上手请移步 [README](../README.md)。

---

## 目录

1. [设计目标](#设计目标)
2. [核心工作流](#核心工作流)
3. [仓库目录结构](#仓库目录结构)
4. [模块规范](#模块规范)
5. [Settings 配置设计](#settings-配置设计)
6. [CLI 命令设计](#cli-命令设计)
7. [映射表与部署逻辑](#映射表与部署逻辑)
8. [跨平台路径处理](#跨平台路径处理)
9. [与 claude-env 的整合计划](#与-claude-env-的整合计划)

## 设计目标

1. **工作台即仓库，本地即生产**：所有成品在仓库中锻造，一键部署到本地。
2. **设计与成品分离**：人读的文档与机器加载的成品文件分离，互不干扰。文档由 `skill-forge` 自动维护，无需人工编辑。
3. **类型可扩展**：新增扩展类型只需在 `manifest.json` 加一条映射，CLI 逻辑不变。
4. **配置即模块**：Claude Code 配置（`settings.json`、`CLAUDE.md`）同样被版本化、可迭代。
5. **直接覆盖，不备份**：部署就是覆盖，信任用户对本地环境的控制权。
6. **对话驱动迭代**：所有创建、反馈、迭代通过自然语言与 `skill-forge` 交互完成，不依赖手动编辑 markdown。

## 核心工作流

`skill-forge` 是本仓库的元技能，所有模块的创建、反馈、迭代都通过它完成。用户全程在 Claude Code 对话中操作，无需手动编辑任何文件。

```
用户 → 自然语言描述 → skill-forge → 生成/更新文件 → lab deploy → 测试 → 反馈 → 迭代
```

### 场景一：从零创建新模块

| 步骤 | 操作                               | 说明                                                     |
| ---- | ---------------------------------- | -------------------------------------------------------- |
| 创建 | `/skill-forge "创建一个 xxx 技能"` | `skill-forge` 生成完整目录结构和成品文件                 |
| 部署 | `lab deploy <name>`                | CLI 将成品复制到 `~/.claude/`                            |
| 反馈 | "xxx 技能有个问题：……"             | 自然语言描述，`skill-forge` 理解并记录                   |
| 迭代 | "改为……"                           | `skill-forge` 更新 `design.md`、`CHANGELOG.md`、成品文件 |
| 验证 | 对话中直接测试                     | `lab deploy` 输出部署结果                                |

### 场景二：导入外部模块

用户从网上复制或下载现成的技能/命令，手动放入对应目录：

| 步骤 | 操作                              | 说明                                       |
| ---- | --------------------------------- | ------------------------------------------ |
| 导入 | 手动创建 `skills/<name>/SKILL.md` | 用户自行放入成品文件                       |
| 部署 | `lab deploy <name>`               | 直接部署使用                               |
| 接管 | "帮我改造一下 skills/<name>"      | `skill-forge` 扫描目录，补全文档，记录基线 |
| 迭代 | 后续与场景一相同                  | 对话驱动，`skill-forge` 维护               |

> `skill-forge` 不关心模块来源，所有模块最终都收敛到同一套迭代规范。

## 仓库目录结构

```
claude-skill-lab/
├── README.md
├── package.json                 部署入口（npm scripts / bin → cli/lab.js）
├── manifest.json                类型映射表（类型 → 目标路径、部署规则）
├── docs/
│   ├── design.md                ← 本文档
│   ├── quickstart.md            端到端快速入门（待补充）
│   └── examples/                使用样例（待补充）
│
├── skills/                      技能 → ~/.claude/skills/
│   └── <name>/
│       ├── README.md            说明、状态（由 skill-forge 维护）
│       ├── design.md            设计决策（由 skill-forge 维护）
│       ├── CHANGELOG.md         迭代历史（由 skill-forge 维护）
│       ├── feedback.md          问题清单（由 skill-forge 维护）
│       ├── SKILL.md             成品（部署这个）
│       └── scripts/             辅助脚本
│
├── agents/                      智能体 → ~/.claude/agents/
│   └── <name>/
│       ├── README.md            （由 skill-forge 维护）
│       ├── design.md            （可选）
│       ├── CHANGELOG.md         （由 skill-forge 维护）
│       ├── feedback.md          （由 skill-forge 维护）
│       └── <name>.md            成品
│
├── commands/                    斜杠命令 → ~/.claude/commands/
│   └── <name>/
│       ├── README.md            （由 skill-forge 维护）
│       ├── design.md            （可选）
│       ├── CHANGELOG.md         （由 skill-forge 维护）
│       ├── feedback.md          （由 skill-forge 维护）
│       └── <name>.md            成品
│
├── rules/                       规则文件 → ~/.claude/rules/
│   └── <name>/
│       ├── README.md            （由 skill-forge 维护）
│       ├── design.md            （可选）
│       ├── CHANGELOG.md         （由 skill-forge 维护）
│       ├── feedback.md          （由 skill-forge 维护）
│       └── <name>.mdc           成品
│
├── hooks/                       Hook 脚本 → ~/.claude/hooks/
│   └── <name>/
│       ├── README.md            （由 skill-forge 维护）
│       ├── design.md            （可选）
│       ├── CHANGELOG.md         （由 skill-forge 维护）
│       ├── feedback.md          （由 skill-forge 维护）
│       └── <name>.js            成品
│
├── workflows/                   动态工作流 → ~/.claude/workflows/
│   └── <name>/
│       ├── README.md            （由 skill-forge 维护）
│       ├── design.md            （可选）
│       ├── CHANGELOG.md         （由 skill-forge 维护）
│       ├── feedback.md          （由 skill-forge 维护）
│       └── <name>.js            成品
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

## 模块规范

### 文件结构

每个模块的文档文件（README、design、CHANGELOG、feedback）由 `skill-forge` 在对话中自动生成和维护，用户无需手动编辑。

| 文件           | 用途                | 维护者                                 |
| -------------- | ------------------- | -------------------------------------- |
| `README.md`    | 说明、状态          | `skill-forge` 自动生成/更新            |
| `design.md`    | 设计决策、测试用例  | `skill-forge` 自动生成/更新（可选）    |
| `CHANGELOG.md` | 迭代历史            | `skill-forge` 自动记录                 |
| `feedback.md`  | 问题清单            | `skill-forge` 自动记录                 |
| 成品文件       | 给 Claude Code 加载 | `skill-forge` 生成，用户可通过对话修改 |

### 模块来源

本仓库支持两种模块来源：

| 来源               | 说明                                          | 文档文件                       | 迭代方式                                              |
| ------------------ | --------------------------------------------- | ------------------------------ | ----------------------------------------------------- |
| `skill-forge` 生成 | 对话中描述需求，由 `skill-forge` 创建完整结构 | 完整                           | 对话驱动，`skill-forge` 维护                          |
| 外部导入           | 用户手动复制或下载的现成技能/命令             | 可能只有成品文件，或完全不完整 | 部署后由 `skill-forge` 接管，补全文档后按统一流程迭代 |

**外部导入模块的处理流程**：

1. 用户将成品文件放入对应目录（如 `skills/<name>/SKILL.md`）
2. `lab deploy <name>` 直接部署到 `~/.claude/`
3. 若需迭代，在对话中调用 `skill-forge` 并指定该模块
4. `skill-forge` 扫描目录，识别已有文件，补全缺失的文档文件
5. 记录当前状态为基线版本
6. 按用户需求修改成品文件，更新文档
7. 提示重新部署

### 成品文件命名规则

| 类型         | 成品文件名   | 说明                             |
| ------------ | ------------ | -------------------------------- |
| `skills/`    | `SKILL.md`   | 固定命名，符合 Agent Skills 标准 |
| `agents/`    | `<name>.md`  | 与目录名一致                     |
| `commands/`  | `<name>.md`  | 与目录名一致                     |
| `rules/`     | `<name>.mdc` | 与目录名一致                     |
| `hooks/`     | `<name>.js`  | 与目录名一致                     |
| `workflows/` | `<name>.js`  | 与目录名一致                     |

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

1. **模板与实际分离**：`settings.template.json` 入仓（含占位符），`settings.json` 不入仓（`.gitignore`），由 `lab setup` 拷贝模板并填充真实 Key。
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
| 首次部署，本地无 Key         | 使用 profile 中的值，若为空则提示运行 `lab setup` |

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

## CLI 命令设计

CLI 只做三件事：**部署**、**配置**、**信息查询**。不承担任何文档编辑或反馈收集职责。

### 命令总览

| 命令                               | 用途                                 |
| ---------------------------------- | ------------------------------------ |
| `lab`                              | 显示帮助信息                         |
| `lab list`                         | 列出所有可部署/已安装模块            |
| `lab status`                       | 显示本地已部署模块的状态             |
| `lab deploy [<type>/]<name>`       | 部署模块到 `~/.claude/`（必须带参）  |
| `lab switch`                       | 列出所有可用 profile                 |
| `lab switch <profile>`             | 切换模型配置                         |
| `lab switch <profile> --ephemeral` | 仅当前会话生效                       |
| `lab remove [<type>/]<name>`       | 从 `~/.claude/` 中卸载已部署的模块   |
| `lab setup`                        | 交互式配置 API Key，选择默认 profile |
| `lab setup --env`                  | 从环境变量 `CLAUDE_API_KEY` 读取     |

### 类型自动推断（冲突报错）

`lab deploy` 和 `lab remove` 支持省略类型前缀：

```bash
lab deploy skill-forge        # 唯一匹配 → 直接执行
lab deploy agents/architect   # 显式指定类型 → 跳过推断
```

推断算法：

1. 在所有类型目录中查找匹配 `<name>` 的模块
2. 若**唯一匹配** → 输出 `Deploying <name> as <type>...`，若未加 `--yes` 则等待确认
3. 若**多个匹配** → 报错并列出所有匹配项，提示用户用 `type/name` 显式限定
4. 若**无匹配** → 报错提示

> 不采用固定顺序查找，避免未来类型增多时产生隐式优先级导致误部署。

### lab setup

交互式流程：

1. 检查 `settings/settings.template.json` 是否存在，若存在则拷贝为 `settings/settings.json`
2. 检查 `~/.claude/settings.json` 是否存在，若存在询问是否覆盖
3. 交互式输入 API Key，或从 `--env` 读取
4. 写入 `~/.claude/settings.json` 的 `api_key` 字段
5. 列出可用 profiles，询问选择默认项
6. 调用 `lab switch <选中的profile>` 完成首次配置
7. 询问是否部署 VSCode 配置
8. 询问是否创建初始 `CLAUDE.md`

### 执行约定

- 所有命令在项目根目录执行
- 通过 `node cli/lab.js` 直接调用，或通过 `npm run lab -- …`、shell 别名 `lab`
- 退出码：0 成功，1 参数错误，2 文件操作失败
- 部署前自动创建目标父目录

## 映射表与部署逻辑

### 核心映射

| 仓库位置                        | 目标位置                          |
| ------------------------------- | --------------------------------- |
| `skills/<n>/SKILL.md`           | `~/.claude/skills/<n>/SKILL.md`   |
| `agents/<n>/<n>.md`             | `~/.claude/agents/<n>.md`         |
| `commands/<n>/<n>.md`           | `~/.claude/commands/<n>.md`       |
| `rules/<n>/<n>.mdc`             | `~/.claude/rules/<n>.mdc`         |
| `hooks/<n>/<n>.js`              | `~/.claude/hooks/<n>.js`          |
| `workflows/<n>/<n>.js`          | `~/.claude/workflows/<n>.js`      |
| `settings/settings.json`        | `~/.claude/settings.json`         |
| `settings/CLAUDE.md`            | `~/.claude/CLAUDE.md`             |
| `settings/profiles/*.json`      | `~/.claude/profiles/*.json`       |
| `settings/vscode/settings.json` | `{VSCodeSettings}`（由 CLI 解析） |

### manifest.json 驱动

```json
{
  "types": {
    "skills": {
      "target": "{HOME}/.claude/skills/",
      "file": "SKILL.md",
      "pattern": "skills/*/SKILL.md"
    },
    "agents": {
      "target": "{HOME}/.claude/agents/",
      "file": "<name>.md",
      "pattern": "agents/*/*.md"
    },
    "commands": {
      "target": "{HOME}/.claude/commands/",
      "file": "<name>.md",
      "pattern": "commands/*/*.md"
    },
    "rules": {
      "target": "{HOME}/.claude/rules/",
      "file": "<name>.mdc",
      "pattern": "rules/*/*.mdc"
    },
    "hooks": {
      "target": "{HOME}/.claude/hooks/",
      "file": "<name>.js",
      "pattern": "hooks/*/*.js"
    },
    "workflows": {
      "target": "{HOME}/.claude/workflows/",
      "file": "<name>.js",
      "pattern": "workflows/*/*.js"
    }
  },
  "settings": {
    "files": {
      "settings.json": "{HOME}/.claude/settings.json",
      "CLAUDE.md": "{HOME}/.claude/CLAUDE.md",
      "profiles/*.json": "{HOME}/.claude/profiles/",
      "vscode/settings.json": "{VSCodeSettings}"
    }
  }
}
```

### 新增类型流程

1. 在顶层创建新目录
2. 在 `manifest.json` 的 `types` 中添加映射
3. CLI 代码自动识别，无需改动

> 说明：此为"零 CLI 代码改动"，用户仍需编辑 `manifest.json` 配置文件。

### 覆盖策略

- 所有文件直接覆盖，不备份
- `lab switch` 按上述 API Key 策略处理
- `lab remove` 只删除成品文件，不删目录和用户数据

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

## 与 claude-env 的整合计划

| claude-env 位置          | 迁入后位置                                    |
| ------------------------ | --------------------------------------------- |
| `profiles/deepseek.json` | `settings/profiles/deepseek.json`             |
| `profiles/zhipu.json`    | `settings/profiles/zhipu.json`                |
| `profiles/company.json`  | `settings/profiles/company.json`              |
| `settings.json`          | `settings/settings.template.json`（占位符化） |
| `vscode-settings.json`   | `settings/vscode/settings.json`               |
| `CLAUDE.md`              | `settings/CLAUDE.md`                          |

## 安全与 .gitignore

```gitignore
settings/settings.json
*.log
.DS_Store
```

`settings/settings.template.json` 入仓，含占位符（`YOUR_API_KEY_HERE`）。`lab setup` 拷贝模板生成 `settings/settings.json` 并填充真实值。

---

_本文档随项目演进持续更新。_
