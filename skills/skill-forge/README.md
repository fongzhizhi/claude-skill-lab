# skill-forge

> 本仓库的元技能 —— 通过自然语言对话创建、维护、迭代所有模块（单模块：skills/agents/commands/rules/hooks/workflows；聚合套件：suites/）。

对话驱动完成模块的全生命周期管理：自动生成模块目录、文档文件（README/design/CHANGELOG/feedback）、`dist/` 成品文件，并按需生成 `meta.json` 声明外部 CLI 前置依赖（`lab deploy` 会自动检测）。

**你不需要手动编辑任何文档文件** —— 全部交给 `skill-forge` 在对话中自动完成。

## 功能

| 能力 | 说明 |
| --- | --- |
| 创建单模块 | 在类型目录下生成完整模块（文档 + `dist/` 成品 + 按需 `meta.json`），README 遵循统一规范 |
| 创建聚合套件 | 在 `suites/` 下生成套件（文档 + `manifest.json` + `dist/` 成品 + 按需 `meta.json`） |
| 迭代模块 | 修改 `dist/` 成品文件，同步维护 design/CHANGELOG/feedback 与 `meta.json` |
| 接管外部导入 | 扫描已放入的成品文件，补全文档并核对 `manifest.json` / `meta.json` |

> 所有模块 `dist/` 均与 `~/.claude/` 相对路径一一对应（镜像结构）：单模块如 `dist/commands/commit-draft.md` → `~/.claude/commands/commit-draft.md`、`dist/skills/<name>/SKILL.md` → `~/.claude/skills/<name>/SKILL.md`，可直接 `cp -r <module>/dist/* ~/.claude/` 验证。

## 前置依赖

无外部 CLI 依赖（纯对话逻辑）。

## 部署

```bash
lab deploy skill-forge
```

部署后，命令在 Claude Code 对话中以 `/skill-forge` 调用。

## 使用

在 Claude Code 对话中直接描述需求：

```
/skill-forge "创建一个用于整理 Git commit 的技能，叫 commit-draft"
/skill-forge "创建一套数据处理命令，叫 data-tools"          # 聚合套件
"commit-draft 生成的 message 太长了，改成不超过 50 个字符"    # 迭代现有模块
"接管 suites/openspec"                                       # 接管外部导入
```

创建/修改完成后运行 `lab deploy <name>` 部署，再回到对话中实测验证，有问题继续对 `skill-forge` 反馈即可。
