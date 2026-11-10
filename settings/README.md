# settings —— 配置类模块

> 个人环境配置的维护源：全局个人指令 `CLAUDE.md`、多模型配置 profiles 与 VSCode 用户配置。

本模块管理三类配置，但**通道分离**：`CLAUDE.md` 是纯静态知识文档，由 `claude-lab deploy settings` 直接复制；`settings.json` 含模型路由与 token，由 `claude-lab switch <profile>` 合并 profiles 生成；`vscode/` 下的编辑器配置由 `claude-lab vscode` 同步到本地 VSCode 用户目录。三者更新节奏与部署机制不同，互不干扰。

## 功能 / 内容

| 文件 | 作用 | 部署通道 |
| --- | --- | --- |
| `CLAUDE.md` | 全局个人指令（跨项目环境知识：嘉立创EDA 多仓库架构、消息总线阅读规则等） | `claude-lab deploy settings` → `~/.claude/CLAUDE.md` |
| `profiles/_base.json` | 多模型公共配置基座 | `claude-lab switch` 的输入，不直接部署 |
| `profiles/<profile>.json` | 各模型差异配置 | 同上 |
| `settings.template.json` | 配置模板（占位符入仓） | 手动拷贝生成仓库内 `settings.json` |
| `vscode/settings.json` | VSCode 用户配置（含 `claudeCode.useTerminal: false`，启用原生 UI 与 `claude-vscode.*` 快捷键） | `claude-lab vscode` → 本地 VSCode User 目录 |
| `vscode/keybindings.json` | VSCode 自定义快捷键（Claude Code 面板、复制相对路径、关闭编辑器组等） | 同上 |

## 设计原则

1. **模板与实际分离**：`settings.template.json` 入仓（含占位符），`settings.json` 不入仓（`.gitignore`，含真实 API Key，手动从模板拷贝生成）。
2. **按通道分离**：`CLAUDE.md` 由 `deploy` 纯静态复制；`settings.json` 由 `switch` 深度合并 profiles 后写入；`vscode/*` 由独立的 `claude-lab vscode` 同步。`deploy` 永久跳过 `settings.json`，避免模板占位符覆盖真实 token；`deploy --all` 也不会触碰 VSCode 配置，避免误覆盖编辑器本地设置。
3. **多模型配置用"基座 + 差异"**：`profiles/_base.json` 存公共配置，各模型文件只放差异字段。
4. **全局与项目级分工**：`settings/CLAUDE.md` 只保留跨项目生效的环境知识；仓库自身的模块体系、规范体系等说明在项目级 `CLAUDE.md`，避免双头维护。
5. **不提供卸载**：`~/.claude/CLAUDE.md` 与 `settings.json` 是个人环境本体，`claude-lab remove settings` 会被拒绝（与 gitinit 同理）。

## 前置依赖

无。

## 部署

```bash
claude-lab deploy settings   # 仅更新全局 CLAUDE.md
claude-lab deploy --all      # 一键部署所有模块时一并包含
```

部署后，`claude-lab status` 会报告 `settings/CLAUDE.md` 与 `~/.claude/CLAUDE.md` 是否逐字节一致；本地被手动修改过会显示漂移告警。

### VSCode 配置同步

```bash
claude-lab vscode           # 将 settings/vscode/ 同步到本地 VSCode User 目录
claude-lab vscode --check   # 仅检查差异，不一致时退出码为 1
```

目标目录按平台解析：Windows `%APPDATA%/Code/User`、macOS `~/Library/Application Support/Code/User`、Linux `~/.config/Code/User`。文件按原样覆盖、不做合并；仅当内容不同（忽略 CRLF/LF）时写入，已一致的文件保持不变。

## 使用

```bash
claude-lab switch                        # 列出可用 profiles
claude-lab switch deepseek               # 合并 _base + deepseek.json，写入 ~/.claude/settings.json
claude-lab switch deepseek --ephemeral   # 仅输出合并结果，不写盘
```

`ANTHROPIC_AUTH_TOKEN` 保护：profile/base 中为占位符（如 `API_KEY`、`YOUR_API_KEY_HERE`）时，`switch` 会移除该键并继承本地已有的真实值。

`permissions.additionalDirectories` 与 `hooks` 支持 `{HOME}` 占位符（`additionalDirectories` 还支持以 `~` 开头的路径）：`claude-lab switch` 写入 `~/.claude/settings.json` 前会展开为当前用户主目录。profile 里写 `"{HOME}/.claude"` 即可放行 `~/.claude`，hook 的 `args` 也可写 `"{HOME}/.claude/hooks/xxx.js"`，换用户名或换机器后重新 `switch` 会生成正确路径，不会因硬编码失效。

## 目录结构

```
settings/
├── README.md                 ← 本文档
├── CHANGELOG.md              配置变更历史
├── feedback.md               使用反馈
├── CLAUDE.md                 全局个人指令（deploy settings → ~/.claude/CLAUDE.md）
├── settings.template.json    配置模板（占位符入仓）
├── settings.json             实际配置（含真实 Key，不入仓，手动维护）
├── profiles/
│   ├── _base.json            公共配置基座
│   ├── deepseek.json
│   ├── zhipu.json
│   └── company.json
└── vscode/
    ├── settings.json         VSCode 用户配置（claude-lab vscode 同步）
    └── keybindings.json      VSCode 自定义快捷键（claude-lab vscode 同步）
```
