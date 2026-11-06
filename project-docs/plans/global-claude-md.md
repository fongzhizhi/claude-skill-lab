# 全局 CLAUDE.md 固化规划

> 把 ~/.claude/CLAUDE.md (全局个人指令) 纳入 claude-skill-lab 仓库维护，部署通道走 deploy，不绑 switch。
>
> 关联：settings 模块、lab/index.js、CLAUDE.md 工作台说明

## 一、背景与问题

~/.claude/CLAUDE.md 是 Claude Code 的全局个人指令，当前承载着最核心的个人环境知识：

- 嘉立创EDA 专业版的多仓库协作架构 (pro-ui / pro-pcb / pro-sch / chameleon 等平级布局)
- 跨仓库代码阅读规则 (bus2 消息总线、IDL 契约、兄弟仓库追踪)
- 三层规范体系、模块体系、Git 策略等工作台约定

这份文件 (约 10.7KB) 是 2025-10 手写的，仓库里没有任何版本管理。风险：

- 误删 / 重装系统 / 换机后内容丢失，重建成本高 (环境知识是长期积累)
- 内容与仓库模块脱节：改了规范体系、模块结构，CLAUDE.md 里的描述不会跟着变
- 无法用 git diff 观察它的演进，也没有回滚能力

工作台哲学是"仓库是工作台，本地是生产环境"——~/.claude/ 下的配置要么入仓 (settings.template.json、gitinit/.gitignore.template)，要么是运行时数据。CLAUDE.md 两者都不是，属于漏网的"生产环境本体"。

## 二、现状盘点

| # | 事实 | 出处 |
| :--- | :--- | :--- |
| 1 | 顶层 manifest 已声明 CLAUDE.md 的映射: `"settings": { "files": { "CLAUDE.md": "${HOME}/.claude/CLAUDE.md", ... } }` | manifest.json |
| 2 | `settings/CLAUDE.md` 占位文件已存在，但只有 7 行空壳注释 (2025-08 创建后从未填充) | settings/CLAUDE.md |
| 3 | lab/index.js 从未消费顶层 settings.files ——CLI 只读套件的 manifest.mappings；单模块部署走内嵌 TYPES 常量 | lab/index.js:18、lab/index.js:162 |
| 4 | settings不在 TYPES (skills/agents/commands/rules/hooks/workflows/docs) 中，因此完全不在 findModules 的扫描范围里——list / status / deploy / remove 都看不见它 | lab/index.js:132-171 |
| 5 | settings 现有两条特殊路径：switch (合并 profile -> 写 ~/.claude/settings.json，含 ANTHROPIC_AUTH_TOKEN 占位符保护) 与 gitinit (覆盖部署 .gitignore 模板)；都不碰 CLAUDE.md | lab/index.js:747-883 |
| 6 | 本地 ~/.claude/CLAUDE.md (10.7KB) 为手写真身，与仓库无任何关联 | C:\Users\win10\.claude\CLAUDE.md |

结论：架构骨架 (manifest 映射 + settings/CLAUDE.md 占位) 当初就是按"放 settings 目录、部署到 ~/.claude/CLAUDE.md"设计的，只是内容与部署通道从未实现。本次是补全，不是新设计。

## 三、方案对比与选型

| 方案 | 说明 | 判断 |
| :--- | :--- | :--- |
| A. settings/维护 + switch 带过去 | 每次 claude-lab switch 时顺带复制 CLAUDE.md | ❌ switch 的职责是切模型 (合并 profile -> 写 settings.json)，CLAUDE.md 的变更节奏是"环境知识变化"，与切模型无关；每次切模型都覆盖它语义错位，还给 switch 增加职责 |
| B. 独立新目录 (新模块类型) | 如 claude-md/ 或新增类型映射到根级 | ❌ 为根级一个文件新建类型，lab/index.js 内嵌 TYPES、顶层 manifest、status/remove 对称性全要动；且方案骨架里的 settings/CLAUDE.md 占位与 manifest 映射会变成自相矛盾的遗留 |
| C. settings/维护 + deploy 带过去 (选型) | settings/CLAUDE.md 为唯一事实来源，新增 claude-lab deploy settings 复制到 ~/.claude/CLAUDE.md | ✅ 完成既有设计骨架；与 settings.json 同属 ~/.claude 根级"个人配置"，语义同一家族；改动量最小 |

选 C 的补充理由：

- 与 settings.json 同族不同命：两者都是 ~/.claude 根级的个人配置，但性质不同——settings.json 是模型/环境配置 (有 token，需要 profile 合并与占位符保护)；CLAUDE.md 是纯静态知识文档 (无敏感信息，可直接入仓，不需要 template 机制)。目录相同、通道分离
- CLAUDE.md 的一半内容描述本仓库 (三层规范体系、模块体系、Git 策略)，入仓后与模块演进同步，仓库即版本历史
- gitinit 已验证了"仓库模板 -> 覆盖部署 ~/.claude 单文件"的模式可行，CLAUDE.md 复用同一心智

## 四、设计思路

### 4.1 数据流与职责边界

维护（仓库侧）                        部署（本地侧）
─────────────────────────────────────────────────────────────
settings/CLAUDE.md     — claude-lab deploy settings —>  ~/.claude/CLAUDE.md      (纯静态复制)
settings/profiles/     — claude-lab switch <profile> —> ~/.claude/settings.json  (深度合并 + token 保护)
gitinit/.gitignore.template — claude-lab gitinit ──> ~/.claude/.gitignore      (覆盖部署)

三条通道各管各的：switch 管有合并逻辑的，deploy 管纯静态的。CLAUDE.md 的更新节奏是"环境知识变化"，用户改完仓库文件后手动 claude-lab deploy settings 即可，与切模型彻底解耦。

### 4.2 manifest 顶层 settings.files 的定位

激活后它是 settings 模块部署逻辑的事实来源 (与 lab/index.js 内嵌逻辑保持一致)：

| 键 | 处理 | v1 状态 |
| :--- | :--- | :--- |
| CLAUDE.md | 纯静态复制 -> {HOME}/.claude/CLAUDE.md | ✅ 本次激活 |
| settings.json | 归 switch 管，deploy 必须跳过 (template 含占位符，直接会覆盖真实 token) | 🚫 永久排除 |
| profiles/*.json | 与 switch 体系重复，暂无独立部署价值 | 暂不激活 |
| vscode/settings.json | 涉及 {vscodeSettings} 解析与合并，按需另议 | 暂不激活 |

### 4.3 CLI 改动范围

- deploy: resolveModule / findModules 增加 settings 特例 (或独立 cmdDeploySettings)，仅执行静态文件复制；deploy --all 时包含，与 gitinit 的地位对齐
- status: 报告 settings/CLAUDE.md 与 ~/.claude/CLAUDE.md 的一致性 (md5 或逐字节比较)，防漂移
- list: 显示 settings (标注"配置模块，switch/deploy 专用")
- remove: 不提供 settings 的卸载——~/.claude/CLAUDE.md 与 settings.json 是个人环境本体，"卸载"等于删个人环境，超出工具边界 (与 gitinit 同理)

### 4.4 内容收编原则

把 ~/.claude/CLAUDE.md 收编到 settings/CLAUDE.md 时做一次去重，避免与项目级 CLAUDE.md 双头维护：

| 章节 | 归属 | 理由 |
| :--- | :--- | :--- |
| 嘉立创EDA 多仓库架构、pro-api、消息总线阅读规则 | 全局 (settings/CLAUDE.md) | 个人环境知识，跨项目生效 |
| 三层规范体系、模块体系、settings.json 要点、Git 策略 | 项目级 (仓库根 CLAUDE.md) | 描述的是本仓库自身，只有在本仓库工作时才相关 |
| 仓库职责等两版都有的内容 | 只留项目级 | 全局版去重 |

收编后全局版应显著变短 (预计 10.7KB -> 6KB 左右)，只保留"环境知识 + 个人偏好"。

## 五、实施步骤

1. 内容收编：按 4.4 拆分 ~/.claude/CLAUDE.md -> 全局部分写入 settings/CLAUDE.md，仓库部分合并进项目级 CLAUDE.md (去重)
2. CLI 实现：lab/index.js 增加 settings 的 deploy (静态复制) + status 一致性检查 + list 展示；settings.json 键永久跳过
3. 文档同步：settings/README.md、项目级 CLAUDE.md 的 settings 模块章节、顶层 README 状态章节
4. 验证：claude-lab deploy settings 后 diff 本地与仓库文件；claude-lab status 确认一致性报告正确；跑一次 switch 确认 settings.json 不受影响
5. 回归：deploy --all、gitinit、switch --ephemeral 各跑一遍，确认三条通道互不干扰

## 六、待确认事项

| 项 | 说明 | 倾向 |
| :--- | :--- | :--- |
| 去重幅度 | 激进拆分 (按 4.4) 还是先原样入仓再逐步拆 | 按 4.4 一次到位，理由充分且改动只是搬章节 |
| deploy settings 命名 | 子命令形式 (deploy settings) 还是复用 gitinit 式独立命令 (如 claude-lab claudemd) | deploy settings ——保持"部署"单一动词，settings 作为其作用域 |
| deploy --all 是否包含 settings | 包含则一键部署覆盖全局指令 | 包含 (静态文件，无风险) |
| 修改后提醒机制 | CLAUDE.md 变更后如何感知需要重新 deploy | 靠 claude-lab status 的一致性报告即可，不加 hook (避免过度工程) |

2026-11-03 规划，实施时走 /skill-forge 流程落地。
