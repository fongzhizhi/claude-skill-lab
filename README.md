# claude-skill-lab

> Claude Code **扩展能力的个人研发工作台** —— 锻造 skill / agent / command,管理配置与连带环境(VSCode 等),一条命令部署到本地,用真实反馈驱动迭代。

---

## 为什么存在

Claude Code 的扩展机制(Skills、Agents、Slash Commands……)很强大,但实际用起来有一个普遍问题:

> **工具写得出来,用不起来。**

`~/.claude` 生态里,除了少数真正形成闭环、可反复依赖的工作流(如 opsx/OpenSpec 系列),大量扩展要么**触发条件模糊**,要么**缺少反馈回路**,要么**与 agent 协作断裂**——信任度不够,也就无从迭代。从网上抄来的又常常不是自己所需:要么臃肿,要么捉襟见肘。

本仓库的意义,是把**锻造工具**当成一件正经事:写设计、记反馈、追迭代,让工具更好用、更本地化、更适合自己。技能是如此,**Claude Code 自身的配置与连带环境**也是如此——同样该被版本化、被一键部署、被持续打磨。

不追热点、不堆数量,只追求每个模块都真正好用。

---

## 核心理念:仓库是工作台,本地是生产环境

所有东西都在仓库里锻造,一条命令把**成品**复制到本地被加载使用,问题回流仓库迭代。**仓库不镜像本地目录,而是按"工作台"组织;每种产物类型一一映射到 `~/.claude/` 对应位置。**

```
        仓库(工作台)                          本地(生产环境)
   ┌───────────────────────┐    lab deploy   ┌─────────────────────┐
   │ skills/<n>/SKILL.md    │ ──────────────▶ │ ~/.claude/skills/   │
   │ agents/<n>/<n>.md      │ ──────────────▶ │ ~/.claude/agents/   │
   │ commands/<n>/<n>.md    │ ──────────────▶ │ ~/.claude/commands/ │
   │ settings/              │ ──────────────▶ │ ~/.claude/ + VSCode │
   └────────────▲───────────┘                 └──────────┬──────────┘
                │                                          │ 使用
                │                                          ▼
                │                               真实任务 · 观察问题
                │                                          │
         调整成品 ◀── 记 feedback / CHANGELOG ◀─────────────┘
```

---

## 快速开始

> 仓库当前以**蓝图**为主:扩展模块尚未落地,环境配置现存放于姊妹仓库 [`claude-env`](https://github.com/fongzhizhi/claude-env),计划重组迁入。命令为定稿设计,待 `cli/lab.js` 实现后即可使用。

```bash
lab                          # 总览:本地装了什么、与仓库的差异
lab deploy                   # 查:有哪些模块可部署(已装标 ✅)
lab deploy skill-forge       # 做:部署某模块(类型可省,自动推断)
lab switch                   # 查:各作用域当前用的是哪个 profile
lab switch claude zhipu      # 做:切换 Claude 到智谱 GLM
```

> 直接��用:`node cli/lab.js …`;或通过 `npm run lab -- …`、shell 别名提供 `lab`。

锻造新模块:部署 `skill-forge` 后,直接在对话里描述思路,由它引导建树;或手动参照同类模块新建一个目录。

---

## 仓库结构

> 状态图例:🚧 规划中 · 📦 迁移中(来自 claude-env) · ✅ 已落地
>
> **顶层 = 扩展类型**。每种类型映射一个 `~/.claude/` 目标;新增类型(如 `rules/`、`hooks/`)加一个顶层目录即可,框架与命令都不变。
>
> **仓库工具 ≠ 成品模块**:`cli/` 是给人用的部署工具,顶层其余目录全是给 Claude / 系统加载的成品,两者命名不冲突。

```
claude-skill-lab/
├── README.md
├── package.json                 部署入口(npm scripts / bin → cli/lab.js)
├── docs/
│   └── workflow.md              🚧 闭环工作流详解
├── skills/                      技能 → ~/.claude/skills/
│   └── <name>/
│       ├── README.md              说明、部署方法、状态
│       ├── design.md              设计决策、测试用例(供溯源)
│       ├── CHANGELOG.md           迭代历史、6 维评分
│       ├── feedback.md            使用观察记录
│       └── SKILL.md               成品(部署这个)
├── agents/                      智能体 → ~/.claude/agents/
│   └── <name>/
│       ├── (同上的溯源文件)
│       └── <name>.md              成品
├── commands/                    斜杠命令 → ~/.claude/commands/
│   └── <name>/
│       ├── (同上的溯源文件)
│       └── <name>.md              成品
├── settings/                    配置类 → ~/.claude/ + VSCode
│   ├── README.md                配置决策说明
│   ├── CHANGELOG.md             配置变更历史
│   ├── feedback.md              使用反馈
│   ├── claude/
│   │   ├── settings.json        主配置(不含 Key)
│   │   └── profiles/            多模型模板(deepseek/zhipu/company)
│   └── vscode/
│       └── settings.json        VSCode 用户配置
└── cli/                         仓库部署工具(给开发者,非成品)
    └── lab.js                   入口:lab deploy / switch / remove
```

> **设计与成品分离**:每个模块里 `README`/`design`/`CHANGELOG`/`feedback` 是给人溯源的;那个成品文件(`SKILL.md` / `<name>.md`)才是给 Claude Code 加载的,也只有它会被部署。skill 自带的辅助脚本放在 `skills/<name>/scripts/`(模块内部),不与 `cli/` 混淆。

---

## 模块:一个产物怎么迭代

无论 skill、agent 还是 command,每个产物都遵循同一套迭代结构:

| 文件 | 给谁看 | 用途 |
| --- | --- | --- |
| `README.md` | 人 | 说明、部署方法、当前状态 |
| `design.md` | 人 | 设想、设计决策、测试用例(供溯源) |
| `CHANGELOG.md` | 人 | 迭代历史、6 维评分 |
| `feedback.md` | 人 | 每次使用后的观察记录 |
| 成品文件 | Claude Code | `SKILL.md` / `<name>.md`,部署到 `~/.claude/` |

### 6 维评估

每个模块用 6 个维度量化"好不好用",记在 `CHANGELOG.md`:

| 维度 | 核心问题 |
| --- | --- |
| **触发准确性** | 该用时会不会用?不该用时会不会误触发? |
| **参数契约** | 参数从哪来?需要用户手动传吗? |
| **闭环完整性** | 执行后产物是什么?下一步去哪? |
| **协作流畅度** | 能否被 orchestrator 顺畅调度? |
| **失败可恢复** | 出错时有没有降级路径? |
| **成本可控** | Token 消耗是否合理? |

**毕业标准**:总分 ≥ 14/18,且连续 3 次真实任务达标。毕业的模块视为稳定可依赖。

---

## settings:环境配置

> 这部分能力目前在 [`claude-env`](https://github.com/fongzhizhi/claude-env) 已落地,迁入后按 `settings/` 结构重组。

配置也被当作一个"模块"迭代——有 `CHANGELOG` 记录每次调整的理由,有 `feedback` 收集使用痛点。`settings/` 下分两类成品:

- **`settings/claude/`**:Claude Code 主配置(`settings.json`)+ 多模型模板(`profiles/`)。
- **`settings/vscode/`**:VSCode 用户配置,涵盖 Claude Code 插件、Git、终端等。

切换模型走 `lab switch`(见下),**保留已有 API Key**,只更新 `BASE_URL` 与模型映射,并同步仓库与 `~/.claude` 两处。

---

## 命令:lab

git 风格的统一入口,一个动词**既能查询又能操作**——无参=只读查询,有参=执行操作。

| 命令 | 查询(无参) | 操作(带参) |
| --- | --- | --- |
| `lab` | 总览:本地已装、与仓库差异 | — |
| `lab deploy` | 列出可部署模块(已装标 ✅) | `lab deploy [<type>/]<name>` 部署 |
| `lab switch` | 列各作用域当前 profile | `lab switch <scope> <profile>` 切换 |
| `lab remove` | 列出本地已装的 | `lab remove [<type>/]<name>` 移除 |

```bash
lab                          # 总览
lab deploy                   # 有哪些能装、装没装
lab deploy skill-forge       # 装它(类型自动推断)
lab deploy agents/architect  # 同名冲突时,用 type/name 显式限定
lab switch                   # 现在各 scope 用的是谁
lab switch claude zhipu      # 切 Claude 到智谱 GLM
lab switch vscode minimal    # 切 VSCode 配置(若配了多套)
lab remove skill-forge       # 从本地移除
```

**类型限定**:`type/name` 路径风格,与目录一致。日常可省(自动在 `skills/` `agents/` `commands/` 里按名查找,唯一即命中,多个则提示用显式写法)。**新类型零成本**:将来加了 `rules/`、`hooks/`,`lab deploy rules/no-commit` 自动生效,命令格式不变。

部署逻辑就是一张「类型 → 目标」映射表,`cli/lab.js` 据此把成品复制到本地:

| 仓库位置 | 目标位置 |
| --- | --- |
| `skills/<n>/SKILL.md` | `~/.claude/skills/<n>/SKILL.md` |
| `agents/<n>/<n>.md` | `~/.claude/agents/<n>.md` |
| `commands/<n>/<n>.md` | `~/.claude/commands/<n>.md` |
| `settings/claude/settings.json` | `~/.claude/settings.json` |
| `settings/vscode/settings.json` | `%APPDATA%/Code/User/settings.json` |

> **安全**:`settings.local.json`(含真实 API Key)绝不入库,由 `.gitignore` 隔离;模板一律用 `YOUR_*_HERE` 占位;`switch` 保留已有 Key,不覆盖;`deploy` 覆盖前自动备份本地文件。

---

## 当前状态

| 类型 | 模块 / 能力 | 状态 |
| --- | --- | --- |
| settings | 多模型切换(deepseek / zhipu / company) | ✅ 已落地(在 claude-env,待迁入) |
| settings | VSCode 配置部署 | ✅ 已落地(在 claude-env,待迁入) |
| 工具 | 统一 CLI `cli/lab.js`(deploy/switch/remove) | 📦 待实现(替代 ps1/sh) |
| skills | `skill-forge`(用技能研发技能的元技能) | 🚧 规划中 |
| skills | `comment-keeper`(按规范梳理注释) | 🚧 规划中 |
| skills | `session-review`(会话技术复盘) | 🚧 规划中 |
| commands | `commit-draft`(生成 commit message) | 🚧 规划中 |
| skills | `live-debugger`(运行时调试) | 🚧 规划中 |
| skills | `mojibake-fixer`(修复 U+FFFD 乱码) | 🚧 规划中 |
| skills | `quick-start`(快速测试加速器) | 🚧 规划中 |

> 不追求数量,追求每个模块都真正好用。

---

## 路线图

- [ ] **统一 CLI**:实现 `cli/lab.js`(deploy / switch / remove,无参查 / 有参做),退役 `.sh` / `.ps1`
- [ ] **settings 迁入**:把 `claude-env` 的配置按 `settings/claude` + `settings/vscode` 重组并入
- [ ] **`skill-forge`**:作为第一个毕业模块,驱动后续 skill / agent / command 的产出
- [ ] **`docs/workflow.md`**:写清闭环工作流,让反馈有据可依

---

## 参考

- [Claude Code 官方文档](https://code.claude.com/docs)
- [Agent Skills 开放标准](https://agentskills.io)
- 姊妹仓库:[claude-env](https://github.com/fongzhizhi/claude-env)

*MIT License.*
