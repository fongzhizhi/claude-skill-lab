# feedback

## 初始创建 (2026-08-12)

- 需求来源：仿照 comment-keeper（修复代码注释），补一个"补充和修复单元测试"的技能。根据 git diff 判定当前模块，无法判定或多模块时由用户指定；无测试则启用 openspec-propose 参考 ts-testing-guide.md 编写方案后等用户预览执行；有测试则按规范审查质量（漏洞、合格、注水），问题多输出问题 + 改造方案并询问是否走 propose，问题少直接优化并总结结论。
- 决策：
  - 采用 Skill（依赖长文档 + 多分支流程 + 嵌套调用 openspec-propose）
  - 模块名 `test-keeper`，与 comment-keeper 对称
  - 范围判定为"模块级"（git diff 归并源码根下首层目录），而非 comment-keeper 的"文件级"
  - "问题很多"的量化阈值：红线 ≥1 或常规 ≥3 类；用户拒绝 propose 后仅输出报告不动手（用户已确认）
- 待实测确认项：模块归并规则的准确度（源码根识别、多模块候选展示）、红线/常规问题判定的尺度、openspec CLI 缺失时降级提示的实际体验。
