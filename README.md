````markdown
# claude-skill-lab

> Claude Code **扩展能力的个人研发工作台** —— 锻造 skill / agent / command / rule / hook / workflow / suite，管理配置与连带环境（VSCode 等），一条命令直接覆盖到本地，用真实反馈驱动迭代。

---

## 为什么存在

Claude Code 的扩展机制很强大，但实际用起来有一个普遍问题：**技能不适用，要么臃肿，要么不适配。**

本仓库是把**锻造工具**当成一件正经事：写设计、记反馈、追迭代，让工具更好用、更本地化、更适合自己。配置与连带环境同样该被版本化、一键部署、持续打磨。

不追热点、不堆数量，只追求每个模块都真正好用。

---

## 核心理念

**仓库是工作台，本地是生产环境。**

所有东西在仓库里锻造，一条命令把成品直接覆盖到本地被加载使用（**不备份、不交互**——覆盖就是我对它负责），问题回流仓库迭代。

**两种模块形态：**

| 形态         | 说明                                                 | 适用场景                    |
| ------------ | ---------------------------------------------------- | --------------------------- |
| **单模块**   | 单一类型、单个成品文件（如一个 skill、一个 command） | 一个技能、一个斜杠命令      |
| **聚合套件** | 多文件、可混合类型、保持子目录结构                   | OpenSpec 工具集、工作流系统 |

每种模块类型一一映射到 `~/.claude/` 对应位置，单模块自动推断，聚合套件通过内部 `manifest.json` 声明映射。

> 详细设计、目录结构、模块迭代流程见 [`docs/design.md`](docs/design.md)。

## 快速开始

### 最小可用流程

> 仓库当前以**蓝图**为主，`cli/lab.js` 待实现。以下命令为定稿设计。

```bash
# 1. 首次配置
lab setup                 # 交互式输入 API Key，选择默认模型

# 2. 部署元技能
lab deploy skill-forge    # skill-forge 用于创建和管理其他模块

# 3. 在 Claude Code 中创建你的第一个技能
# 在对话中输入：/skill-forge "创建一个用于整理 Git commit 的技能"

# 4. 部署你刚创建的技能
lab deploy commit-draft
```
````

完成这 4 步，你就有了一个可用的技能。后续迭代完全通过自然语言驱动：

```
# 在 Claude Code 对话中直接说：
"commit-draft 生成的 message 太长了，改成不超过 50 个字符"
```

`skill-forge` 会自动：

1. 理解问题，更新 `design.md` / `feedback.md`
2. 修改 `dist/` 下的成品文件
3. 提示你重新部署测试

整个过程无需手动编辑任何 markdown 文件。

### 导入已有模块

如果你从网上复制了一个现成的技能，手动放入 `skills/<name>/dist/SKILL.md` 后：

```bash
lab deploy <name>
```

后续如需迭代，在对话中对 `skill-forge` 说：

```
"帮我改造一下 skills/<name>，让它支持 xxx"
```

`skill-forge` 会自动补全文档、记录基线、按需修改、提示部署。

### 导入聚合套件（如 OpenSpec）

从网上下载或克隆一个聚合套件（如 OpenSpec 的 12 个命令），放入 `suites/<name>/dist/` 并编写内部 `manifest.json` 后：

```bash
lab deploy suites/openspec
```

或如果名称唯一：

```bash
lab deploy openspec
```

`lab` 会根据套件内部的 `manifest.json` 将 `dist/` 下的文件按映射规则部署到 `~/.claude/` 对应位置。

后续如需迭代或定制，同样可由 `skill-forge` 接管：

```
"接管 suites/openspec，帮我调整 explore 命令的输出格式"
```

### 完整命令参考

<details>
<summary>点击展开所有命令</summary>

```bash
lab                      # 显示帮助信息
lab list                 # 列出所有可部署/已安装模块（含套件）
lab status               # 显示本地已部署模块的状态
lab deploy <name>        # 部署模块（类型自动推断，必须带参）
lab deploy <type>/<name> # 同名冲突时显式限定
lab deploy suites/<name> # 显式部署聚合套件
lab switch               # 列出所有可用 profile
lab switch <profile>     # 切换到指定模型
lab switch <profile> --ephemeral   # 仅当前会话生效
lab remove <name>        # 从 ~/.claude/ 中卸载已部署的模块
lab setup                # 交互式配置 API Key
lab setup --env          # 从环境变量 CLAUDE_API_KEY 读取
```

</details>

> 直接调用：`node cli/lab.js …`；或通过 `npm run lab -- …`、shell 别名提供 `lab`。

## 当前状态

> **说明**：🟢 表示能力已在姊妹仓库 `claude-env` 中落地，待迁入本仓库后即可使用；🟡 表示规划中，需等 CLI 实现后才能激活；🔴 表示尚未启动。

| 类型      | 模块 / 能力                              | 状态                |
| --------- | ---------------------------------------- | ------------------- |
| settings  | 多模型切换（\_base.json + profile 合并） | 🟢 已落地（待迁入） |
| settings  | VSCode 配置部署                          | 🟢 已落地（待迁入） |
| 工具      | 统一 CLI `cli/lab.js`                    | 🟡 待实现           |
| 工具      | `manifest.json` 类型映射驱动             | 🔴 规划中           |
| 工具      | 聚合套件（`suites/`）支持                | 🔴 规划中           |
| skills    | `skill-forge`（元技能）                  | 🟡 设计已完成       |
| skills    | `comment-keeper`（注释梳理）             | 🔴 规划中           |
| skills    | `session-review`（技术复盘）             | 🔴 规划中           |
| commands  | `commit-draft`（commit message 生成）    | 🔴 规划中           |
| skills    | `live-debugger`（运行时调试）            | 🔴 规划中           |
| skills    | `mojibake-fixer`（U+FFFD 乱码修复）      | 🔴 规划中           |
| skills    | `quick-test`（快速测试加速器）           | 🔴 规划中           |
| rules     | （待定）                                 | 🔴 规划中           |
| hooks     | （待定）                                 | 🔴 规划中           |
| workflows | （待定）                                 | 🔴 规划中           |

> **状态图例**：🔴 规划中 · 🟡 待实现/设计已完成 · 🟢 已落地（待迁入）
>
> `rules/`、`hooks/`、`workflows/` 目录已预留，`suites/` 目录已新增，待实际需求出现时自然生长。不追求数量，追求每个模块都真正好用。

## 路线图

- [ ] **统一 CLI**：实现 `cli/lab.js`，退役 `.sh` / `.ps1`
- [ ] **manifest.json 驱动**：所有类型映射可配置，新增类型零 CLI 代码改动
- [ ] **聚合套件支持**：`lab deploy` 支持 `suites/` 目录及内部 `manifest.json` 映射
- [ ] **settings 迁入**：把 `claude-env` 的配置按 `settings/` 新结构重组并入
- [ ] **`skill-forge` 落地**：作为第一个毕业模块，驱动后续模块的产出与迭代，支持单模块与聚合套件的创建/导入/接管
- [ ] **扩展类型落地**：依次实现 `rules/`、`hooks/`、`workflows/` 下的第一个模块
- [ ] **示例补充**：在 `docs/examples/` 中提供单模块、聚合套件的使用样例

## 参考

- [Claude Code 官方文档](https://code.claude.com/docs)
- [Agent Skills 开放标准](https://agentskills.io)
- [OpenSpec](https://github.com/Fission-AI/OpenSpec) —— 聚合套件参考案例
- 姊妹仓库：[claude-env](https://github.com/fongzhizhi/claude-env)

_MIT License._

## 延伸阅读

- 详细设计、目录结构、模块迭代流程：[`docs/design.md`](docs/design.md)（面向贡献者/进阶用户）
- 端到端快速入门：[`docs/quickstart.md`](docs/quickstart.md)（待补充）
- 使用样例：[`docs/examples/`](docs/examples/)（待补充）

```

```
