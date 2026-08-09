# openspec

> OpenSpec 官方工作流套件 —— 由 `@fission-ai/openspec` CLI（`openspec init`）生成的 Claude Code 集成资产，原样接管并纳入 lab 规范管理。

以「变更（change）」为单位的 spec 驱动开发工作流：先规划（propose）、再实现（apply）、随时修订（update）、落地主 spec（sync）、最后归档（archive），探索（explore）贯穿全程。

## 内容

| 类型 | 名称 | 说明 |
| ---- | ---- | ---- |
| 命令 | `/opsx:propose` | 提出新 change，一次性生成 proposal / specs / design / tasks 全部规划产物 |
| 命令 | `/opsx:apply` | 实现 change 中的任务（experimental） |
| 命令 | `/opsx:update` | 更新 change，修订已有规划产物并保持相互一致 |
| 命令 | `/opsx:sync` | 将 change 的 delta specs 同步到主 specs |
| 命令 | `/opsx:archive` | 归档已完成的 change |
| 命令 | `/opsx:explore` | 探索模式：思考想法、调研问题、澄清需求 |
| 技能 | `openspec-propose` | 配套 propose 的技能，一步生成完整提案 |
| 技能 | `openspec-apply-change` | 配套 apply 的技能：开始/继续实现 change 任务 |
| 技能 | `openspec-update-change` | 配套 update 的技能：修订规划产物，不碰代码 |
| 技能 | `openspec-sync-specs` | 配套 sync 的技能：delta spec 同步到主 spec |
| 技能 | `openspec-archive-change` | 配套 archive 的技能：实现完成后归档 change |
| 技能 | `openspec-explore` | 配套 explore 的技能：作为思考伙伴澄清需求 |
| 模板 | `openspec/config.yaml` | 项目级工作区配置模板（spec-driven schema 的 context / rules / operations） |

## 前置依赖

命令与技能通过 `allowed-tools: Bash(openspec:*)` 限定工具，**必须**全局安装 openspec CLI：

```bash
npm install -g @fission-ai/openspec@latest
```

## 部署

```bash
lab deploy openspec          # 或 lab deploy suites/openspec
```

部署后：

- 6 个命令 → `~/.claude/commands/opsx/`，以 `/opsx:*` 前缀调用（保留 `opsx` 子目录，避免与单层命令名冲突）
- 6 个技能 → `~/.claude/skills/openspec-*/`

## 使用

在任意项目中启动 openspec 工作区后（`openspec init` 或 `openspec doctor` 检查），直接使用斜杠命令：

```
/opsx:explore 思考某个想法或澄清需求
/opsx:propose 新增一个 change，例如 /opsx:propose add-user-auth
/opsx:apply 开始实现已批准的 change
/opsx:update 修订 change 的规划产物
/opsx:sync 把 delta specs 同步进主 specs
/opsx:archive 归档已完成的 change
```

`openspec/config.yaml` 是项目级配置模板：目标项目需通过 `openspec init` 生成（或参考本套件内的模板），配置项目的 tech stack、artifacts 规则与 apply/archive 操作指引。
