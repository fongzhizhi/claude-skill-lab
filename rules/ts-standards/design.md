# design —— ts-standards

## 定位

聚合规则模块：一次部署整套 TS 约束到 `~/.claude/rules/`。遵循"规则是法律条文，指南是参考手册"的分层：每条规则 < 40 行只写必须项，长指南放独立 docs 模块按需引用。

## 设计决策

1. **聚合而非独立模块**：5 条规则同属"TS 标准"，一起部署/卸载/状态核对，管理成本最低；后续单条规则需要独立治理时可拆出。
2. **5 条规则的划分**：覆盖主流 TS 项目约束的必要维度——注释（沟通）、风格（一致性）、类型（正确性）、错误处理（健壮性）、测试（回归保障）。刻意保持精简，避免规则膨胀稀释约束力。
3. **paths 作用域**：统一 `**/*.ts, **/*.tsx`（测试规则限定 `.test.ts` / `.spec.ts`），仅在处理 TS 文件时自动加载，其他语言/文件不占上下文。
4. **与 docs 模块的依赖协调（三层）**：
   - `lab deploy --all` 一并部署 docs 与 rules
   - `meta.json` 软依赖（`required: false`）：检测 `~/.claude/docs/ts-comments-guide.md` 是否存在，缺失仅提示不拦截——文档缺失不影响规则本身执行
   - 规则文件内引用文档绝对路径，AI 需要时按需读取
5. **`.md` 后缀**：与官方文档一致（rules 目录下的 `.md` 文件 frontmatter 声明 `description` / `paths` 即可按路径作用域加载），遵循 skill-forge 约定。

## 版本历史

- v0.1.0：初始 5 条规则（ts-comments / ts-coding-style / ts-types / ts-error-handling / ts-testing）+ docs 软依赖
