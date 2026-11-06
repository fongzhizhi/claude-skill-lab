# feedback —— commit-flow 使用反馈

<!-- 记录使用过程中发现的问题与改进建议。 -->

## 待记录

尚无实测反馈。部署后首次使用 `/commit-flow` 时重点验证：

- format-keeper 在无 `package.json` 的仓库（如本仓库）能否正常返回 `skipped` 而不阻塞
- mojibake-fixer 按显式文件清单扫描时是否正确限定范围
- 无上游分支时 `git push -u origin HEAD` 的行为
- 敏感文件确认与 format-keeper 的二次检查是否会重复停摆
