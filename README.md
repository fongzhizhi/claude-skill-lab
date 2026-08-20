# claude-skill-lab

> Claude Code 扩展能力的个人研发工作台：锻造 skill / agent / command / rule / hook / workflow / suite，一键部署到本地，用真实反馈驱动迭代。

## 核心理念

**仓库是工作台，本地是生产环境。**

所有模块在仓库里锻造，一条命令直接覆盖部署到 `~/.claude/`（不备份、不交互——覆盖就是负责），问题回流仓库迭代。

```
      仓库（工作台）                           本地（生产环境）
 ┌─────────────────────────────┐  claude-lab  ┌───────────────────────────┐
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

前置条件：Node.js 18+（Claude Code 自带）· 已安装 Claude Code

```bash
# 0. 一次性注册全局命令 claude-lab（之后可在任意目录使用）
npm run link

# 1. 查看帮助与可用模块
claude-lab
claude-lab list

# 2. 一键部署所有模块（主流程，一条命令全部就位）
claude-lab deploy --all
#    skill / command / rules / docs / suite / settings 一次落位
#    技能依赖的 docs / rules 会一并携带，无需逐个部署

# 3. 在对话中创建/修改你的第一个模块
#    /skill-forge "创建一个用于整理 Git commit 的技能，叫 commit-draft"

# 4. 开发完成后，只重新部署迭代过的模块（没必要全量重来）
claude-lab deploy commit-draft   # 之后对话中输入 /commit-draft 即可使用

# 5. 切换模型配置
claude-lab switch                # 列出可用 profiles
claude-lab switch deepseek       # 切换到 deepseek
```

> **主流程是一键部署，而不是逐个部署。** 技能不是孤立的——`comment-keeper` / `test-keeper` 等运行时依赖 `docs/`（规范指南）与 `rules/`（强制规则）两个独立模块，`claude-lab deploy <name>` 只部署目标模块本身、不携带这些依赖；只有 `claude-lab deploy --all` 才把全部模块一次落位。**单独部署是开发完成后的迭代动作**：`/skill-forge` 改完某个模块后，只重新部署那一个，避免全量覆盖。仓库内也可用 npm 脚本薄封装：`npm run deploy <name>`、`npm run switch <profile>` 等（见下方指令参考）。

> 不满意？直接在对话中对 `skill-forge` 说："commit-draft 生成的 message 太长了，改成不超过 50 个字符"。`skill-forge` 自动更新文档、修改成品并提示重新部署，全程无需手动编辑任何 markdown。

## 指令参考

全局命令 `claude-lab`（`npm run link` 注册后任意目录可用，等价于 `node cli/lab.js`）：

| 命令 | 说明 |
| --- | --- |
| `claude-lab` | 显示帮助 |
| `claude-lab list` | 列出所有可部署模块（含套件） |
| `claude-lab status` | 显示本地部署状态 |
| `claude-lab deploy <name>` | 部署（类型自动推断） |
| `claude-lab deploy <type>/<name>` | 同名冲突时显式限定 |
| `claude-lab deploy suites/<name>` | 部署聚合套件 |
| `claude-lab deploy --all` | 一键部署所有模块 |
| `claude-lab remove <name>` | 卸载已部署模块 |
| `claude-lab switch` | 列出可用 profiles |
| `claude-lab switch <profile>` | 切换模型配置 |
| `claude-lab switch <profile> --ephemeral` | 仅当前会话生效 |

仓库内 npm 脚本为同一 CLI 的薄封装：`npm run lab`（帮助）、`npm run list` / `status` / `deploy <name>` / `remove <name>` / `switch <profile>`。`npm run deploy --all` 无需 `--` 分隔符（CLI 从 `npm_config_all` 等环境变量恢复标志）。

## 当前状态

### 🟢 已部署可用

| 模块 | 类型 | 说明 |
| --- | --- | --- |
| **[skill-forge](skills/skill-forge/README.md)** | skill | 创建、维护、迭代所有模块（单模块 + 聚合套件） |
| **[comment-keeper](skills/comment-keeper/README.md)** | skill | 按 TS 注释规范统一调整代码注释（核对/增删改/补录，必要时重构自解释） |
| **[style-keeper](skills/style-keeper/README.md)** | skill | 按编码风格规范统一命名与常量：ESLint/Prettier 自动兜底，改名安全分级 |
| **[type-keeper](skills/type-keeper/README.md)** | skill | 按类型安全规范修复类型漏洞：清 any / @ts-ignore / 非空断言，tsc 全绿门禁 |
| **[error-handling-keeper](skills/error-handling-keeper/README.md)** | skill | 按错误处理规范修复存量代码：语义等价直接做，控制流改动列清单 |
| **[test-keeper](skills/test-keeper/README.md)** | skill | 按测试规范补充与修复单元测试：无测试走方案，有测试审质量 |
| **[live-debugger](skills/live-debugger/README.md)** | skill | 模拟人工 debugger 流程定位前端 bug：埋点 → 复现 → 收敛 → 修复清理 |
| **[quick-start](skills/quick-start/README.md)** | skill | 快速验证功能/新改动：注入入口与数据，验证后清场恢复原状 |
| **[ones-parser](skills/ones-parser/README.md)** | skill | 解析 ONES 平台复制的工单内容（ID / 标题 / 链接），作为 commit 引用的单一事实来源 |
| **[commit-draft](commands/commit-draft/README.md)** | command | 基于暂存区生成 Conventional Commits 规范的 commit message |
| **[mojibake-fixer](commands/mojibake-fixer/README.md)** | command | 修复 AI 生成内容中的乱码（U+FFFD 等） |
| **[session-review](commands/session-review/README.md)** | command | 生成技术复盘报告（背景、根因、方案、验证） |
| **[ts-standards](rules/ts-standards/README.md)** | rules | 5 条 TS 必备规则（注释/风格/类型/错误处理/测试），路径作用域自动生效 |
| **[ts-code-guide](docs/ts-code-guide/README.md)** | docs | TS 规范参考文档（注释/风格/类型/错误处理/测试 5 份指南）→ `~/.claude/docs/`，按需引用不占上下文 |
| **[openspec](suites/openspec/README.md)** | suite | 6 个 `/opsx:*` 斜杠命令，规范驱动开发（需全局安装 `openspec` CLI） |
| **[settings](settings/README.md)** | settings | 多模型切换（`_base.json` + profiles 合并），VSCode 配置部署 |

### 🟡 规划中

| 方向 | 说明 |
| --- | --- |
| **hooks 落地** | 部署后自动核对一致性、提交前提醒等自动化 hook |
| **agents 子代理** | 规范审查专用代理，主对话只拿结论，省上下文 |
| **workflows 编排** | 批量重构 / 批量规范审查等多 agent 并行场景 |

类型目录：`hooks/` · `workflows/` · `agents/` 已预留，按需生长

> 不追求数量，只追求每个模块都真正好用。

### 🧭 快速决策

| 你的目标 | 推荐路径 |
| --- | --- |
| 想创建新技能/命令 | `/skill-forge "创建一个 xxx"` |
| 想按规范整理/修复代码注释 | `/comment-keeper`（可指定文件/目录/函数） |
| 想统一命名/清理魔法数字 | `/style-keeper`（可指定文件/目录） |
| 想修复类型安全漏洞 | `/type-keeper`（可指定文件/目录） |
| 想修复错误处理问题 | `/error-handling-keeper`（可指定文件/目录） |
| 想补充/修复单元测试 | `/test-keeper`（可指定模块/目录） |
| 想定位前端 bug | `/live-debugger "bug 描述与复现步骤"` |
| 想快速验证功能/新改动 | `/quick-start "验证诉求与预期结果"` |
| 想管理多模型配置 | `claude-lab switch <profile>` |
| 想用规范驱动开发 | `claude-lab deploy openspec`，然后 `/opsx:propose` |
| 想查看有哪些可用模块 | `claude-lab list` |

## 参考

- [Claude Code 官方文档](https://code.claude.com/docs)
- [Agent Skills 开放标准](https://agentskills.io)
- [OpenSpec](https://github.com/Fission-AI/OpenSpec) —— 聚合套件参考案例
- 设计文档：[project-docs/design.md](project-docs/design.md)（面向贡献者 / 进阶用户）

_MIT License._
