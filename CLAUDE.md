# CLAUDE.md

# claude-skill-lab

Claude Code 扩展能力的个人研发工作台：在仓库中锻造 skill / agent / command / rule / hook / workflow / suite，一条命令覆盖部署到 `~/.claude/`。核心原则：**仓库是工作台，本地是生产环境**——成品在仓库锻造，`lab` 直接覆盖部署（不备份、不交互），问题回流仓库迭代。

## 常用命令

无构建、无 lint、无测试（验证方式 = 部署后在 Claude Code 对话中实际使用）。CLI 是零依赖的纯 Node.js 单文件，Node 18+。

```bash
npm run lab                    # 帮助
npm run lab:list               # 列出所有可部署模块（单模块 + 套件）
npm run lab:status             # 显示本地部署状态
npm run lab:deploy <name>      # 部署（类型自动推断；冲突时用 type/name 或 suites/name 显式限定）
npm run lab:deploy --all       # 一键部署所有（--force 跳过依赖检查；--switch <profile> 部署后切换配置）
npm run lab:remove <name>      # 卸载
npm run lab:switch <profile>   # 切换模型配置（--ephemeral 仅当前会话，不写磁盘）
```

等价于 `node cli/lab.js`。`npm run lab:deploy --all` 无需 `--` 分隔符——CLI 会从 `npm_config_all`/`npm_config_force` 环境变量恢复 npm 消费掉的标志（见 `lab.js` 的 `main()`）。

## 架构

### 两种模块形态

| 形态 | 位置 | 部署方式 |
| --- | --- | --- |
| 单模块 | `skills/` `agents/` `commands/` `rules/` `hooks/` `workflows/` `docs/` 下的 `<name>/` | `dist/` 全量镜像复制到 `~/.claude/` |
| 聚合套件 | `suites/<name>/` | 按套件内 `manifest.json` 的 `mappings` 映射 |

每个模块目录统一结构（skill-forge 生成，见 [skills/skill-forge/dist/skills/skill-forge/SKILL.md](skills/skill-forge/dist/skills/skill-forge/SKILL.md)）：

- 根目录：`README.md`、`design.md`、`CHANGELOG.md`、`feedback.md` —— 文档，由 skill-forge 维护
- `dist/` —— **成品目录，与 `~/.claude/` 相对路径一一对应（镜像结构），`lab deploy` 唯一关注的地方**，所有文件按相对路径原样递归复制
- `meta.json` —— 可选，声明外部 CLI 前置依赖

### 部署形态（cli/lab.js 核心逻辑）

- **dist/ 即 ~/.claude/ 镜像**：所有模块（单模块与套件）的 `dist/` 目录都与 `~/.claude/` 的相对路径一一对应，部署 = 按相对路径原样递归复制。单模块为隐式全量镜像（`dist/` 下所有文件直接复制，无需声明）；套件通过 `manifest.json` 显式声明映射子集。
- 单模块示例：`dist/commands/foo.md` → `~/.claude/commands/foo.md`；`dist/skills/foo/SKILL.md` → `~/.claude/skills/foo/SKILL.md`（skills 部署目标为目录 `~/.claude/skills/<name>/`，故镜像中多一层）
- **全量复制**：`dist/` 下所有文件（含 references/ 等辅助文件）一并复制，单模块无需声明即可附带额外资源
- **直接复制验证**：`cp -r <module>/dist/* ~/.claude/` 即为完整部署
- 部署目标不创建多余的嵌套目录（如 `~/.claude/commands/<name>/`）——避免命令名被解析为 `<dir>:<file>` 导致斜杠命令失效

### 聚合套件 manifest.json

每条 `mappings`：`source` 是 `dist/` 内的相对路径（支持 `*`、`*.ext` 简单模式），`target` 是目标路径模板（支持 `{HOME}`，运行时由 `os.homedir()` 解析）；target 以 `/` 结尾视为目录。`lab status` 与 `lab remove` 按同一套 mappings 对称核对/删除。

### meta.json 前置依赖机制

模块依赖外部 CLI（如 `openspec`、`gh`）时声明：

```json
{ "dependencies": [{ "name": "openspec CLI", "check": "openspec --version", "install": "npm install -g @fission-ai/openspec@latest", "required": true }] }
```

`lab deploy` 逐个执行 `check` 命令：缺失且 `required: true`（默认）时拦截部署，`--force` 可跳过；`required: false` 只提示不拦截。**迭代模块时，成品文件增减了外部工具调用必须同步维护 `meta.json`。**

### 顶层 manifest.json 与新增类型

顶层 `manifest.json` 的 `types` 映射模块类型 → `~/.claude/` 目标路径。新增模块类型 = 建顶层目录 + 在 `types` 加一条映射，CLI 代码零改动。注意：`lab.js` 内嵌的 `TYPES` 与 `DIST_FILE_MAP` 是部署逻辑的事实来源，与顶层 manifest.json 需保持一致。

### settings/ 配置模块

- 是 `~/.claude/` 的镜像：`settings.template.json` 入仓（占位符），`settings.json` 不入仓（`.gitignore`，含真实 API Key，手动从模板拷贝生成）
- 多模型切换：`profiles/_base.json` + `<profile>.json` 深度合并 → 写入 `~/.claude/settings.json`
- **ANTHROPIC_AUTH_TOKEN 保护**（`lab.js` 的 `buildProfileConfig`）：profile/base 中为占位符（如 `API_KEY`、`YOUR_API_KEY_HERE`）时移除该键并继承本地已有真实值，防止误覆盖
- `settings/CLAUDE.md` 是部署到 `~/.claude/CLAUDE.md` 的**全局个人指令**，与本项目级 CLAUDE.md 无关

## 工作流

### 创建 / 迭代模块：skill-forge 是唯一入口

`skills/skill-forge/dist/skills/skill-forge/SKILL.md` 是元技能，负责创建、迭代、接管所有模块。核心约定：

- **不要手动编辑模块文档**（README/design/CHANGELOG/feedback）——由 skill-forge 在对话中维护
- 需求变更时直接修改 `dist/` 成品文件，由 skill-forge 同步文档、递增 CHANGELOG 版本、维护 `meta.json`
- 典型流程：`/skill-forge "创建/修改 xxx"` → `npm run lab:deploy <name>` → 对话中实测 → 反馈迭代
- 接管外部导入的模块：补全文档，核对/生成 `manifest.json`（套件）与 `meta.json`

### 部署与验证

修改 `dist/` 后运行 `npm run lab:deploy <name>` 覆盖部署。仓库内唯一"测试"是部署后在 Claude Code 中实际使用该模块；`lab status` 可核对本地与仓库的一致性。

## 约定

- 模块名：英文小写、短横线分隔（如 `commit-draft`）
- 当前开发环境为 Windows（win32）；`{HOME}`、`{VSCodeSettings}` 等路径变量由 CLI 按平台运行时解析
- 仓库语言为中文，模块文档与对话保持中文
- 提交遵循 Conventional Commits（`feat` / `fix` / `docs` / `chore` 等 + 中文 subject），可用 `/commit-draft` 基于暂存区生成
- 新增/移除模块或改模块说明时，同步更新 README「当前状态」章节（🟢 已部署 / 🟡 规划中表格）——状态章节容易滞后于实际模块，以模块目录为准
