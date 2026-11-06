# clis/

自研 CLI 工具目录。与 [apps/](../apps/)（自研桌面应用）并列，共同构成 **lab 模块体系之外的工具区**。

## 与 lab 模块的区别

| | lab 模块（skills / commands / suites …） | clis/ 下的工具 |
| --- | --- | --- |
| 终点 | `~/.claude/<type>/` 下的文件 | 注册到 PATH 的全局命令 |
| 构建 | 无构建，`dist/` 即成品 | 各自实现（Node / Go / Rust …），由工具自己构建 |
| 生效方式 | `claude-lab deploy` 复制文件 | `npm run link:<name>` 注册全局命令，改代码即时生效 |
| lab CLI | `claude-lab list/status/deploy` 管理 | **不感知**，不参与任何部署 |

`claude-lab` 只扫描 `manifest.json` 的 `types` 与 `suites/`，因此 `clis/` 天然不会被 `list`、`status`、`deploy --all` 触及。**不要**把 `clis` 加进 `manifest.json` 或 [lab/index.js](../lab/index.js) 的 `TYPES`——那会破坏「`dist/` 即 `~/.claude/` 镜像」这一核心不变量。

## 目录约定

```
clis/<name>/
  README.md            # 一句话定位 + 用法 + 认证/配置说明
  package.json         # 各自的依赖与 bin 入口（Node 实现时）
  src/                 # 实现
```

- 每个工具自包含，依赖、构建与运行方式写在工具自己的 `README.md` 里
- 全局命令约定由根 [package.json](../package.json) 的 `link:<name>` 脚本统一注册，例如 `npm run link:ones`
- 计划与设计文档仍放在 [project-docs/plans/](../project-docs/plans/)，与源码分离

## 当前工具

| 工具 | 状态 | 说明 |
| --- | --- | --- |
| [ones](ones/README.md) | 占位（内网环境已实现） | ONES 版 glab：webapi 直连读写工单 / 评论 / 工时（`ones ticket/comment/hours/doctor/auth`），Bearer 直连免浏览器，refresh 自动续期；设计见 [plans/ones.md](../project-docs/plans/ones.md) |
