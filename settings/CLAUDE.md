# CLAUDE.md

> 全局个人指令：仅保留跨项目生效的环境知识（嘉立创EDA 专业版多仓库架构与跨仓库代码阅读规则）。仓库自身的模块体系、规范体系等说明由项目级 CLAUDE.md 维护，避免双头同步。

## 嘉立创EDA 专业版架构（外部工作环境，命中时生效）

当会话工作目录（或其祖先目录）属于嘉立创EDA 专业版编辑器的代码聚合仓库时（典型路径如 `D:\Code\GitEditor\editor-pro\*`、`D:\Code\GitEditor\editor-pro-spare\*`，聚合目录名不固定），本节生效。

## 识别方法

从当前目录逐级向上查找：若某级目录下平级存在 `pro-ui`、`pro-pcb`、`pro-sch` 等仓库（命中两个及以上），该目录即为聚合目录。会话通常在某个子仓库内启动（如 `editor-pro/pro-ui`），此时其他兄弟仓库都在 `<当前仓库>/../` 下，直接按父目录路径读取即可。聚合目录不一定包含全部仓库。

## 仓库布局

多仓库平级布局（非 git submodule，各仓库独立 git、独立构建）：

| 仓库 | 职责 |
| --- | --- |
| pro-ui | UI 组件仓库（主仓库）：编辑器窗口框架、顶栏/面板等 UI 壳 |
| pro-pcb | PCB 编辑器（主仓库） |
| pro-sch | 原理图编辑器（主仓库） |
| pro-dev-server | 开发服务器：本地代理 + 多模块自动构建 |
| chameleon | 格式转换仓库（独立运行的转换引擎） |
| lc-protocol | 专业版源码编解码（工程数据源码操作） |
| lc-geometry | 几何算法 |
| kitsune | 渲染引擎 |
| pro-mgr | 工程管理 |
| pro-panel | 面板编辑器（主仓库） |
| pro-api | 扩展 API 仓库：向终端用户扩展与内部扩展提供开放 API（详见下文小节） |
| lc-editor-common | 共享库：消息总线 bus2 兼容层（`src/bus2/`）+ IDL 消费链（`src/schema/`） |
| lc-editor-schema | IDL 单点源 + codegen：`@topic/@observer/@channel` 注解生成 typed Client/Service |

其余 `eext-common`、`pro-editor-client`、`plugins`、`easyeda-editor-document`、`docs-product-document` 等为功能集中的工具/文档仓库。工具类仓库一般通过 `npm i` (`modules.iceda.cn` 的 tgz 包) 引入主仓库使用。

## pro-api (扩展 API)

面向终端用户扩展和内部扩展的开放 API 模块，覆盖 PCB / 原理图 / 面板 / 符号 / 封装五类编辑器。

源码结构：

- `src/extension/api/` — 外部扩展 API，按领域分目录且文件有前缀约定：`DocumentTree/` (DMT*，文档工程/工作区/团队)、`PCB/` (PCB*)、`Schematic/` (SCH*)、`Panel/` (PNL*)、`IntegratedLibrary/` (LIB_*，符号/封装/器件综合库)、`System/` (弹窗、toast、设置、i18n等)。总入口 `src/extension/api/eda.ts`
- `src/extension/builtinApi/` — 内部扩展 API (入口 `builtin.ts`)
- `src/extension/interfaces/` — 接口、枚举、类
- `src/runner/` — 用户代码执行器 (沙箱)

关键约定：

- 数据单位与画布源码一致：原理图 0.01inch，PCB mil
- 不存在对应画布时接口返回空数据（`undefined / []`）
- 对外 API 有稳定性承诺：不得修改接口入参与返回值定义（同步改异步除外）
- 分支管理特殊，与 EDA 版本绑定：`pro-api/0.2 ↔ pro-ui/2.2.C`、`pro-api/0.3 ↔ pro-ui/3.1~4.1`、`pro-api/dev ↔ pro-ui/4.2 与 dev`

跨仓库协作：

- 与 pro-ui / pro-sch / pro-pcb / pro-panel 联动开发，部分执行代码位于联动项目的 `src/extensionApi` 目录内——追 pro-api 的 API 实现时记得去这些兄弟仓库搜
- 消息通讯对应 IDL 通道 `extensionApi`（扩展 API 总线 mb2），见「跨仓库代码阅读规则」
- 构建产物 `dist/api-types.d.ts` 是全部外部 API 的类型定义；`npm run build:list` 可额外生成结构化 API 列表（`dist/api-list.json` / `.csv`），适合检索 API 清单
- 本地联调走 pro-dev-server：`npm run syh pro-api pro-ui` (或 pro-sch / pro-pcb / pro-panel) ；内部扩展联调 `npm run dev pro-api eext-common`

## 为什么所有仓库平级放置（pro-dev-server 的设计）

`pro-dev-server/tools/devServer.ts` 的机制决定了目录布局：

1. 命令行指定本地联调的模块 (如 `npm run dev pro-ui pro-pcb`)，每个模块默认解析为兄弟目录 `../<模块名>/` (selfConfig.js 可覆盖个别路径)
2. 在各模块目录内执行依赖安装 + watch 构建 (lc-build tsprj -w)
3. 模块间依赖用 `file:` 协议重装为本地路径，因此联调时 `lc-message-bus`、`lc-protocol`、`kitsune`、`lc-geometry` 等 npm 依赖实际来自本地兄弟仓库，而非线上 tgz
4. HTTP 服务把 `/editor/<模块>/...` 静态请求映射到 `<兄弟仓库>/dist/`，其余请求代理到远程环境 (dev-pro.iceda.cn 等)

所以：任一仓库要参与本地联调，必须放在聚合目录下与其他仓库平级。

## 跨仓库代码阅读规则（消息总线重点）

消息通讯架构已升级为 bus2（BroadcastChannelMessageBus）+ IDL typed 契约（IDL 迁移进行中），过渡期内新旧形态并存，读代码时两种都要会认。

三层结构：

1. **传输层（bus2）**：跨仓库/跨线程通讯走 `BroadcastChannelMessageBus`（`lc-message-bus >=0.1.40`）。基于浏览器 BroadcastChannel，同源 iframe/worker 直达，不再需要 `WindowMessageBridge` / `WorkerMessageBridge`，不依赖 `window.__MSG_BUS__` 全局单例。按 channel 分域、channel 即寻址（无 targetWin 参数）：全局 `/${tabId}/bus`（顶层各 bundle 互通）、iframe per-peer `/${tabId}/iframe/${frameId}`（主壳↔文档 iframe）、worker `/${tabId}/worker/${name}`（主壳↔worker）。iframe→iframe 禁止直连，一律经顶层中转。
2. **兼容层**（`lc-editor-common/src/bus2/`）：`gVars.bus` 是 BusRouter（每仓一份 topic 路由表，按 old/both/new 三态分发新旧总线，`?bus2=0` 运行时回滚），`gVars.messageBus` 仍是旧 MessageBox（过渡期旧腿）。裸调用形态：`gVars.bus.rpcCall / publish / subscribe(topic, ...)`。运行时诊断：`self.__bus2` (channels / rpcProbe / cloneProbe)。
3. **IDL 契约层**（与裸 topic 并存）：topic 单点源在 `lc-editor-schema/src/idl/**/*.idl.ts`（@topic / @observer / @channel 注解），codegen 产出 typed Client/Service；各仓 `src/base/schema.ts`（或 `public/schema.ts`）导出全局 schema 单例，访问路径按通道显式：`schema.client/service.<通道>.<模块>.<子模块>.<方法>`。通道节点语义：`global` = 顶层 bundle 之间、`iframe(frameId)` = 主壳↔文档 iframe、`worker(name)` = 主壳↔worker、`extensionApi` = 扩展 API 总线（mb2）、`project(pid) / notify` 等 = 独立 bc 通道（工程级/广播）。

跨仓库追踪对端：

- 读到裸字符串 topic（`gVars.bus` / `gVars.messageBus` / `docSession` / `viewSession` / `getChannelBus` 的 rpcCall/rpcService/publish/subscribe）时，同 topic 的对端很可能在兄弟仓库，在父目录下各兄弟仓库搜该 topic 字符串，确认消息发给了谁、谁在处理
- 读到 typed 调用（`schema.client.*` / `schema.service.*`）时，先到 `../lc-editor-schema/src/idl/` 按方法名搜 `@topic('...')` 定义拿到 topic 字符串与 `@channel` 通道标注，再按 topic 字符串搜各兄弟仓库定位两端；服务端注册形态是 `schema.service.<通道>.<模块>.<方法>(handler)`；`lc-editor-schema/dist/channel-map.ts` 有 topic→通道全量映射
- payload 走 structured clone（不可传函数/引用，否则 DataCloneError）。联调排障按序核对：① 双端 channel 是否一致 ② 双端字段是否匹配 ③ 升级前后业务/字段/逻辑是否丢失 ④ payload 是否可克隆
- pro-pcb 特殊规则：pro-pcb 内部通讯不迁移 bus2（保持 MessageBox + ServicePool），仅 pcb-main 对外跨仓接全局 channel
- 读到 `import ... from 'lc-protocol' / 'kitsune'` 等包时：联调场景源码在兄弟仓库（如 `../lc-protocol/src`）；非联调场景才是 node_modules 里的线上 tgz。优先读兄弟仓库源码
