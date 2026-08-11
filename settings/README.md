# settings —— 配置类模块

> 本目录是 `~/.claude/` 的镜像（除 `vscode/` 子目录外），由 `lab deploy` / `lab switch` 部署。
> 设计细节见 [`project-docs/design.md`](../project-docs/design.md)「Settings 配置设计」。

## 设计原则

1. **模板与实际分离**：`settings.template.json` 入仓（含占位符），`settings.json` 不入仓（`.gitignore`），由手动拷贝模板并填充真实 Key。
2. **`settings/` 即 `~/.claude/` 的镜像**：除 `vscode/` 子目录外，其余文件直接复制到 `~/.claude/` 对应位置。
3. **多模型配置用"基座 + 差异"**：`profiles/_base.json` 存公共配置，各模型文件只放差异字段。
4. **`CLAUDE.md` 优先级**：全局 `~/.claude/CLAUDE.md` 与项目级 `./CLAUDE.md` 合并，项目级配置优先。

## 目录结构

```
settings/
├── README.md                 ← 本文档
├── CHANGELOG.md             配置变更历史
├── feedback.md              使用反馈
├── settings.template.json   配置模板（占位符入仓）
├── settings.json            实际配置（含真实 Key，不入仓，手动维护）
├── CLAUDE.md                全局个人指令
├── profiles/
│   ├── _base.json           公共配置基座
│   ├── deepseek.json
│   ├── zhipu.json
│   └── company.json
└── vscode/
    └── settings.json        VSCode 用户配置
```
