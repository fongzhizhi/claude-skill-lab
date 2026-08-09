#!/usr/bin/env node
/**
 * claude-skill-lab 统一 CLI —— 蓝图占位骨架
 *
 * 完整设计见 docs/design.md「CLI 命令设计」：
 *   CLI 只做三件事：部署、配置、信息查询。
 *   不承担任何文档编辑或反馈收集职责（那是 skill-forge 的事）。
 *
 * 当前状态：待实现（🔴）。入口与命令签名已定稿：
 *   lab                    显示帮助
 *   lab list               列出可部署/已安装模块
 *   lab status             显示本地已部署模块状态
 *   lab deploy <name>      部署模块（类型自动推断，冲突报错）
 *   lab switch <profile>   切换模型配置（--ephemeral 仅当前会话）
 *   lab remove <name>      卸载已部署模块
 *   lab setup              交互式配置 API Key（--env 从环境变量读取）
 */

const [cmd, ...args] = process.argv.slice(2);

const HELP = `claude-skill-lab CLI（蓝图占位，待实现）

用法:
  lab                    显示帮助信息
  lab list               列出所有可部署/已安装模块
  lab status             显示本地已部署模块的状态
  lab deploy <name>      部署模块（类型自动推断，必须带参）
  lab deploy <type>/<name>  同名冲突时显式限定
  lab switch <profile>   切换模型配置（--ephemeral 仅当前会话）
  lab remove <name>      从 ~/.claude/ 中卸载已部署的模块
  lab setup              交互式配置 API Key（--env 从环境变量读取）

实现细节见 docs/design.md；模块类型映射见 manifest.json。`;

if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
  console.log(HELP);
  process.exit(0);
}

console.error(`lab ${cmd}: 尚未实现（蓝图阶段，见 docs/design.md）`);
process.exit(1);
