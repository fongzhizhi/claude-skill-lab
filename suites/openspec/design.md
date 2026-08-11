# design.md

## 背景

`openspec init` 会在项目根目录生成 `.claude/commands/opsx/`、`.claude/skills/openspec-*/` 及 `openspec/config.yaml`。本套件将这些资产原样接管，整理为 claude-skill-lab 规范的聚合套件（`suites/openspec/`），保持命令/技能功能与调用方式完全不变。

## 关键决策

### D1：保留 `opsx` 命令子目录前缀

命令成品部署目标为 `~/.claude/commands/opsx/`，命令名保持 `/opsx:propose`、`/opsx:apply` 等原始形态。

原因：

- openspec 上游约定即 `opsx:*` 前缀，命令正文中以 `/opsx:apply` 相互引用（如 propose 完成后提示 `/opsx:apply`）；
- 若扁平化为单层命令（如 `/apply`、`/update`），易与用户自建命令冲突，且破坏命令间互引。

### D2：技能映射到 `~/.claude/skills/<name>/`，逐条列出

6 个技能各自映射为 `{HOME}/.claude/skills/openspec-<name>/`，与单模块 skills 的部署形态（`dist/skills/<name>/` 镜像，`~/.claude/skills/<name>/` 整目录）一致。

manifest 中**逐条列出**而非使用 `skills/*/SKILL.md` 通配：lab 部署器（`cli/lab.js`）仅支持单层目录 + 简单通配（`*` / `*.ext` / 精确文件名），无法展开跨目录 glob。逐条列出的额外好处是 `lab remove suites/openspec` 卸载时可精确回删每个技能目录。

### D3：`openspec/config.yaml` 不进 manifest

该文件是 **openspec 工作区（项目级）配置**——定义 spec-driven schema 的项目 context、per-artifact rules、per-operation guidance，作用于命令/技能运行的**目标项目**，而非 `~/.claude`。因此不参与部署映射，作为模板保留在套件中供参考；目标项目通过 `openspec init` 生成自有配置。

### D4：版本号沿用上游版本

manifest `version` 与上游 `@fission-ai/openspec` 版本（1.8.0）一致，便于追踪基线。上游发版引入新命令/技能时，按「迭代模块」流程同步升级。

## 工作流

```
/opsx:explore ──→ /opsx:propose ──→ /opsx:apply ──→ /opsx:update ──→ /opsx:sync ──→ /opsx:archive
   (思考/澄清)      (生成规划产物)      (实现任务)      (修订产物)      (同步主 spec)    (归档收尾)
```

- **规划边界**：propose 只产出规划产物（proposal/specs/design/tasks），不实现代码；实现须显式启动 apply。
- **产物驱动**：所有命令均以 `openspec status --json` 的 artifact 依赖图（`requires` 边）为准，而非简单文件清单。
- **技能与命令并存**：命令是入口工作流，技能由命令按需调用（如 apply 流程委托 `openspec-apply-change`），二者共享 `openspec status / instructions / context` 等 CLI 输出。

## 约束

- 不修改 `~/.claude/` 任何内容：部署与卸载完全由 `lab deploy / remove suites/openspec` 负责（按 manifest 映射执行）。
- 成品文件保持上游原样（仅 frontmatter 的 license/compatibility 元信息为上游自带），内容迭代统一走 skill-forge 流程并记录于 CHANGELOG。
