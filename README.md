# claude-skill-lab

> Claude Code 扩展能力的个人研发工作台：锻造 skill / agent / command / rule / hook / workflow / suite，一键部署到本地，用真实反馈驱动迭代。

## 核心理念

**仓库是工作台，本地是生产环境。**

所有模块在仓库里锻造，一条命令直接覆盖部署到 `~/.claude/`（不备份、不交互——覆盖就是负责），问题回流仓库迭代。

```
      仓库（工作台）                           本地（生产环境）
 ┌─────────────────────────────┐  lab deploy ┌───────────────────────────┐
 │ skills/<n>/dist/            │ ──────────▶ │ ~/.claude/skills/<n>/     │
 │ commands/<n>/dist/          │ ──────────▶ │ ~/.claude/commands/       │
 │ agents/ · rules/ · hooks/   │ ──────────▶ │ ~/.claude/对应目录         │
 │ workflows/<n>/dist/         │ ──────────▶ │ （成品单文件平铺，不嵌套）  │
 │ suites/<n>/dist/            │ ──────────▶ │ 按 manifest.json 映射      │
 │ settings/                   │ ──────────▶ │ ~/.claude/ + VSCode       │
 └─────────────▲───────────────┘             └───────────┬───────────────┘
               │                                       │ 使用
               │                                       ▼
               │                                真实任务 · 观察问题
               │                                       │
        调整 dist/ 成品 ◀───── 反馈 · 迭代（skill-forge）─┘
```

两种模块形态：

| 形态 | 说明 | 适用场景 |
| --- | --- | --- |
| **单模块** | 单一类型、单个成品文件（`dist/`） | 一个技能、一个斜杠命令 |
| **聚合套件** | 多文件、可混合类型、保持子目录结构 | OpenSpec 工具集、工作流系统 |

> 目录结构、模块规范与部署细节见 [docs/design.md](docs/design.md)。

## 快速开始

前置条件：Node.js 20+（Claude Code 自带）· 已安装 Claude Code

```bash
# 1. 查看帮助与可用模块
npm run lab
npm run lab:list

# 2. 部署元技能 skill-forge（创建/维护所有模块的入口）
npm run lab:deploy skill-forge

# 3. 在对话中创建你的第一个模块
#    /skill-forge "创建一个用于整理 Git commit 的技能，叫 commit-draft"

# 4. 部署并使用
npm run lab:deploy commit-draft   # 之后对话中输入 /commit-draft 即可使用

# 5. 切换模型配置
npm run lab:switch                # 列出可用 profiles
npm run lab:switch deepseek       # 切换到 deepseek
```

> 不满意？直接在对话中对 `skill-forge` 说："commit-draft 生成的 message 太长了，改成不超过 50 个字符"。`skill-forge` 自动更新文档、修改成品并提示重新部署，全程无需手动编辑任何 markdown。

## 指令参考

| 命令 | 说明 |
| --- | --- |
| `lab` | 显示帮助 |
| `lab:list` | 列出所有可部署模块（含套件） |
| `lab:status` | 显示本地部署状态 |
| `lab:deploy <name>` | 部署（类型自动推断） |
| `lab:deploy <type>/<name>` | 同名冲突时显式限定 |
| `lab:deploy suites/<name>` | 部署聚合套件 |
| `lab:deploy --all` | 一键部署所有模块 |
| `lab:remove <name>` | 卸载已部署模块 |
| `lab:switch` | 列出可用 profiles |
| `lab:switch <profile>` | 切换模型配置 |
| `lab:switch <profile> --ephemeral` | 仅当前会话生效 |

> 也可直接调用 `node cli/lab.js`。

## 当前状态

### ✅ 已部署可用

| 模块 | 类型 | 说明 |
| --- | --- | --- |
| **[skill-forge](skills/skill-forge/README.md)** | skill | 创建、维护、迭代所有模块（单模块 + 聚合套件） |
| **[commit-draft](commands/commit-draft/README.md)** | command | 基于暂存区生成 Conventional Commits 规范的 commit message |
| **[openspec](suites/openspec/README.md)** | suite | 6 个 `/opsx:*` 斜杠命令，规范驱动开发（需全局安装 `openspec` CLI） |
| **[settings](settings/README.md)** | settings | 多模型切换（`_base.json` + profiles 合并），VSCode 配置部署 |

### 🔴 规划中

技能类：`comment-keeper`（代码注释梳理）· `session-review`（技术复盘）· `live-debugger`（运行时调试）· `mojibake-fixer`（U+FFFD 乱码修复）· `quick-test`（快速测试加速器）

类型目录：`rules/` · `hooks/` · `workflows/` · `agents/` 已预留，按需生长

> 不追求数量，只追求每个模块都真正好用。

### 🧭 快速决策

| 你的目标 | 推荐路径 |
| --- | --- |
| 想创建新技能/命令 | `/skill-forge "创建一个 xxx"` |
| 想管理多模型配置 | `npm run lab:switch <profile>` |
| 想用规范驱动开发 | `npm run lab:deploy openspec`，然后 `/opsx:propose` |
| 想查看有哪些可用模块 | `npm run lab:list` |

## 参考

- [Claude Code 官方文档](https://code.claude.com/docs)
- [Agent Skills 开放标准](https://agentskills.io)
- [OpenSpec](https://github.com/Fission-AI/OpenSpec) —— 聚合套件参考案例
- 设计文档：[docs/design.md](docs/design.md)（面向贡献者 / 进阶用户）

_MIT License._
