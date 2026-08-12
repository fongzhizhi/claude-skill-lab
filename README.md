# claude-skill-lab

> Claude Code 扩展能力的个人研发工作台：锻造 skill / agent / command / rule / hook / workflow / suite，一键部署到本地，用真实反馈驱动迭代。

## 核心理念

**仓库是工作台，本地是生产环境。**

所有模块在仓库里锻造，一条命令直接覆盖部署到 `~/.claude/`（不备份、不交互——覆盖就是负责），问题回流仓库迭代。

```
      仓库（工作台）                           本地（生产环境）
 ┌─────────────────────────────┐  lab deploy ┌───────────────────────────┐
 │ skills/<n>/dist/            │ ──────────▶ │ ~/.claude/（镜像复制）     │
 │ commands/<n>/dist/          │ ──────────▶ │   dist/ 相对路径原样落位   │
 │ agents/ · rules/ · hooks/   │ ──────────▶ │   如 commands/foo.md →     │
 │ workflows/ · docs/<n>/dist/ │ ──────────▶ │   ~/.claude/commands/foo.md│
 │ suites/<n>/dist/            │ ──────────▶ │ 按 manifest.json 映射      │
 │ settings/                   │ ──────────▶ │ ~/.claude/ + VSCode       │
 └─────────────▲───────────────┘             └───────────┬───────────────┘
               │                                       │ 使用
               │                                       ▼
               │                                真实任务 · 观察问题
               │                                       │
        调整 dist/ 成品 ◀───── 反馈 · 迭代（skill-forge）─┘
```

两种模块形态（`dist/` 均与 `~/.claude/` 相对路径一一对应，可直接 `cp -r <module>/dist/* ~/.claude/` 验证）：

| 形态 | 说明 | 适用场景 |
| --- | --- | --- |
| **单模块** | 单一类型、`dist/` 全量镜像、零配置 | 一个技能、一个斜杠命令 |
| **聚合套件** | 多文件、可混合类型、`manifest.json` 声明映射 | OpenSpec 工具集、工作流系统 |

> 目录结构、模块规范与部署细节见 [project-docs/design.md](project-docs/design.md)。

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
npm run lab:deploy --all   # 推荐：一键部署全部模块，技能依赖的 docs / rules 一并携带
#    npm run lab:deploy commit-draft   # 或只部署单个模块（不携带其依赖的文档/规则）
#    之后对话中输入 /commit-draft 即可使用

# 5. 切换模型配置
npm run lab:switch                # 列出可用 profiles
npm run lab:switch deepseek       # 切换到 deepseek
```

> **为什么推荐一键部署？** 技能不是孤立的——`comment-keeper` / `test-keeper` 等运行时依赖 `docs/`（规范指南）与 `rules/`（强制规则）两个独立模块，`lab:deploy <name>` 只部署目标模块本身、不携带这些依赖；只有 `lab:deploy --all` 会把 skill / command / rules / docs / suite / settings 全部一次落位。迭代单一模块时才用 `lab:deploy <name>`。

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
| **[comment-keeper](skills/comment-keeper/README.md)** | skill | 按 TS 注释规范统一调整代码注释（核对/增删改/补录，必要时重构自解释） |
| **[test-keeper](skills/test-keeper/README.md)** | skill | 按测试规范补充与修复单元测试：无测试走方案，有测试审质量 |
| **[live-debugger](skills/live-debugger/README.md)** | skill | 模拟人工 debugger 流程定位前端 bug：埋点 → 复现 → 收敛 → 修复清理 |
| **[quick-start](skills/quick-start/README.md)** | skill | 快速验证功能/新改动：注入入口与数据，验证后清场恢复原状 |
| **[ones-parser](skills/ones-parser/README.md)** | skill | 解析 ONES 平台复制的工单内容（ID / 标题 / 链接），作为 commit 引用的单一事实来源 |
| **[commit-draft](commands/commit-draft/README.md)** | command | 基于暂存区生成 Conventional Commits 规范的 commit message |
| **[mojibake-fixer](commands/mojibake-fixer/README.md)** | command | 修复 AI 生成内容中的乱码（U+FFFD 等） |
| **[session-review](commands/session-review/README.md)** | command | 生成技术复盘报告（背景、根因、方案、验证） |
| **[ts-standards](rules/ts-standards/README.md)** | rules | 5 条 TS 必备规则（注释/风格/类型/错误处理/测试），路径作用域自动生效 |
| **[ts-code-guide](docs/ts-code-guide/README.md)** | docs | TS 规范参考文档（注释 + 测试指南）→ `~/.claude/docs/`，按需引用不占上下文 |
| **[openspec](suites/openspec/README.md)** | suite | 6 个 `/opsx:*` 斜杠命令，规范驱动开发（需全局安装 `openspec` CLI） |
| **[settings](settings/README.md)** | settings | 多模型切换（`_base.json` + profiles 合并），VSCode 配置部署 |

### 🔴 规划中

暂无规划技能。

类型目录：`hooks/` · `workflows/` · `agents/` 已预留，按需生长

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
- 设计文档：[project-docs/design.md](project-docs/design.md)（面向贡献者 / 进阶用户）

_MIT License._
