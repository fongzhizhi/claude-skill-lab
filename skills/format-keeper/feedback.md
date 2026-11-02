# feedback

<!-- 记录使用过程中发现的问题与改进建议。 -->

## 初始创建（2026-11-02）

- 需求来源：`git-flow` 计划中 `/git-flow-commit` 的格式化步骤；用户要求做成像 `commit-draft` / `mojibake-fixer` 一样可独立运行、也可内嵌的模块。
- 决策：
  - 采用 Skill：需要按项目检测工具、分支处理（有/无配置、有/无脚本），并可作为共享规则被 `/git-flow-commit` 引用。
  - 模块名 `format-keeper`，与 keeper 家族命名对称；边界是“纯格式化”，不碰命名/语义/结构/乱码。
  - 只格式化目标文件，禁止仓库级格式化；不创建/修改配置；不自动安装依赖；`failed` 与 `skipped` 区分，便于提交管线决定停或继续。
- 待实测确认项：不同项目（npm/pnpm/yarn、Prettier/ESLint/Biome）的工具检测与命令拼接；Windows 下多文件参数/空格路径；大文件量下的批处理；`skipped` 是否会让提交管线漏掉本应格式化的项目。
