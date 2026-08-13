# feedback

## 初始创建 (2026-08-13)

- 需求来源：keeper 补齐方向（README 规划中）。三份指南已就位（ts-types-guide 等），参考 comment-keeper / test-keeper 的做法创建执行技能，补齐 ts-standards 5 条规则的执行闭环。
- 决策：
  - 采用 Skill（依赖长文档 + 多分支流程）
  - 模块名 `type-keeper`，与 keeper 家族命名对称
  - 改动风险三分级：低风险编译期语义直接做、中风险（any→unknown、非空断言）行为等价验证后做、高风险（新增运行时校验、tsconfig 严格项）只列清单不动手
  - tsc --noEmit 为硬门禁：类型修复是 keeper 家族中唯一"可证明"的治理
- 待实测确认项：any→unknown 收窄的等价验证尺度（收窄分支覆盖判断是否够用）、@ts-expect-error 替换后残留报错的实际处理体验、无 tsconfig 项目的手工验证兜底是否够用。
