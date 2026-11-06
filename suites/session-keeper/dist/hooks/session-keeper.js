#!/usr/bin/env node
"use strict";

/**
 * session-keeper
 *
 * 双模式：
 *   1. hook 模式：Claude Code 无参数调用，stdin 收到 UserPromptSubmit JSON，
 *      stdout 返回 { hookSpecificOutput: { hookEventName, sessionTitle?, additionalContext? } }
 *   2. CLI 模式：模型或用户手动调用
 *      get / set <title> / context
 *
 * 标题写入会话 transcript 的 custom-title 记录（与内置 /rename 同构），
 * 这是 /resume 列表读取标题的规范来源（customTitle 优先于 aiTitle）。
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const readline = require("readline");

const HOME = os.homedir();
const CLAUDE_DIR = path.join(HOME, ".claude");
const PROJECTS_DIR = path.join(CLAUDE_DIR, "projects");
const PENDING_DIR = path.join(CLAUDE_DIR, "cache", "session-keeper");

// 硬上限：超过说明不是“标题”而是摘要。软上限由 SKILL.md 约束（约 24 个汉字）。
const HARD_MAX_CHARS = 80;

// 常见技术词，避免把 UTF-8 / SHA-256 之类误判为 ONES 单号
const ONES_PREFIX_BLACKLIST = new Set([
  "UTF", "SHA", "MD", "ISO", "RFC", "HTTP", "HTTPS", "AES", "RSA", "TLS",
  "SSL", "IPV", "ECMA", "GB", "WIN", "API", "CPU", "GPU", "RAM", "SSD",
  "USB", "PDF", "PNG", "JPG", "JPEG", "SVG", "CSS", "HTML", "JSON", "XML",
  "X86", "ARM", "MAC", "IOS", "NPM", "CLI", "SDK", "URL", "URI", "UUID",
]);

function parseArgs(argv) {
  const opts = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--session") opts.session = argv[++i];
    else if (arg === "--transcript") opts.transcript = argv[++i];
    else if (arg === "--limit") opts.limit = Math.max(1, Number(argv[++i]) || 8);
    else if (arg === "--json") opts.json = true;
    else opts._.push(arg);
  }
  return opts;
}

/** 定位会话 transcript：优先 --transcript，其次按 sessionId 在 projects/ 下查找。 */
function resolveTranscript(opts) {
  if (opts.transcript) return path.resolve(opts.transcript);
  const sessionId = opts.session || process.env.CLAUDE_CODE_SESSION_ID;
  if (!sessionId) return null;

  let dirs = [];
  try {
    dirs = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true });
  } catch {
    return null;
  }

  let best = null;
  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;
    const candidate = path.join(PROJECTS_DIR, dir.name, `${sessionId}.jsonl`);
    try {
      const stat = fs.statSync(candidate);
      if (!stat.isFile()) continue;
      if (!best || stat.mtimeMs > best.mtimeMs) {
        best = { file: candidate, mtimeMs: stat.mtimeMs };
      }
    } catch {
      // 该目录下没有这个会话，继续
    }
  }
  return best ? best.file : null;
}

function resolveSessionId(opts, transcript) {
  if (opts.session) return opts.session;
  if (process.env.CLAUDE_CODE_SESSION_ID) return process.env.CLAUDE_CODE_SESSION_ID;
  if (transcript) return path.basename(transcript, ".jsonl");
  return null;
}

function normalizeTitle(raw) {
  return String(raw)
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\ufeff]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function charLength(text) {
  return [...text].length;
}

/** 从一行 JSONL 中提取纯文本用户消息；工具结果、meta、子代理消息都跳过。 */
function extractUserText(entry) {
  if (!entry || entry.type !== "user") return null;
  if (entry.isMeta || entry.isSidechain) return null;
  const content = entry.message && entry.message.content;
  let text = null;
  if (typeof content === "string") {
    text = content;
  } else if (Array.isArray(content)) {
    if (content.some((item) => item && item.type === "tool_result")) return null;
    const block = content.find((item) => item && item.type === "text");
    if (block) text = block.text;
  }
  if (!text) return null;
  const cleaned = text
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || null;
}

/**
 * 流式扫描 transcript，只保留需要的信息，避免把几十 MB 的会话整个读进内存。
 * keepPrompts 为 true 时收集最近 limit 条用户消息（context 模式使用）。
 */
async function scanTranscript(file, { keepPrompts = false, limit = 8 } = {}) {
  const result = {
    customTitle: null,
    aiTitle: null,
    firstUserPrompt: null,
    userPrompts: [],
    userCount: 0,
  };

  const stream = fs.createReadStream(file, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line) continue;

    if (line.includes('"custom-title"') && line.includes('"customTitle"')) {
      try {
        const entry = JSON.parse(line);
        if (entry.type === "custom-title" && typeof entry.customTitle === "string") {
          result.customTitle = entry.customTitle;
        }
      } catch {
        // 忽略半行或损坏行
      }
      continue;
    }

    if (line.includes('"ai-title"') && line.includes('"aiTitle"')) {
      try {
        const entry = JSON.parse(line);
        if (entry.type === "ai-title" && typeof entry.aiTitle === "string") {
          result.aiTitle = entry.aiTitle;
        }
      } catch {
        // 忽略
      }
      continue;
    }

    if (line.includes('"type":"user"')) {
      try {
        const text = extractUserText(JSON.parse(line));
        if (!text) continue;
        result.userCount += 1;
        if (!result.firstUserPrompt) result.firstUserPrompt = text;
        if (keepPrompts) {
          result.userPrompts.push(text.slice(0, 240));
          if (result.userPrompts.length > limit) result.userPrompts.shift();
        }
      } catch {
        // 忽略半行或损坏行
      }
    }
  }

  rl.close();
  stream.destroy();
  return result;
}

function currentTitle(scan) {
  if (scan.customTitle) return { title: scan.customTitle, source: "custom-title" };
  if (scan.aiTitle) return { title: scan.aiTitle, source: "ai-title" };
  if (scan.firstUserPrompt) {
    return { title: scan.firstUserPrompt.slice(0, 40), source: "first-prompt" };
  }
  return { title: "", source: "none" };
}

/** 写入 custom-title 记录（与内置 /rename 的数据结构一致）。 */
function appendCustomTitle(file, sessionId, title) {
  const entry = {
    type: "custom-title",
    customTitle: title,
    sessionId,
    uuid: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  fs.appendFileSync(file, `${JSON.stringify(entry)}\n`, "utf8");
}

/**
 * 待生效标题：下次 UserPromptSubmit hook 会把 sessionTitle 回填给当前运行中的会话，
 * 让标题栏即时刷新；transcript 写入则保证会话结束/恢复时标题已经落盘。
 */
function writePendingTitle(sessionId, title) {
  try {
    fs.mkdirSync(PENDING_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(PENDING_DIR, `${sessionId}.json`),
      JSON.stringify({ title, at: Date.now() }),
      "utf8",
    );
  } catch {
    // 缓存写失败不影响 transcript 落盘
  }
}

function readPendingTitle(sessionId) {
  const file = path.join(PENDING_DIR, `${sessionId}.json`);
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    fs.unlinkSync(file);
    if (data && typeof data.title === "string" && data.title.trim()) {
      return data.title.trim();
    }
  } catch {
    // 没有待生效标题
  }
  return null;
}

function detectOnesIds(text) {
  const ids = new Set();
  if (!text) return [];

  // ONES 链接里的单号最可信（hash 路由末尾 /issue/<ID>、/page/<ID> 等）
  const urlPattern = /\/(?:issue|workitem|defect|task|wiki)\/([A-Za-z][A-Za-z0-9]*-\d+)/g;
  for (const match of text.matchAll(urlPattern)) {
    ids.add(match[1].toUpperCase());
  }

  // 文本里的单号：PRO-156328、WIKI-2048 等
  const textPattern = /\b([A-Z]{2,10})-(\d{1,8})\b/g;
  for (const match of text.matchAll(textPattern)) {
    if (ONES_PREFIX_BLACKLIST.has(match[1])) continue;
    ids.add(`${match[1]}-${match[2]}`);
  }

  return [...ids].slice(0, 3);
}

function buildReminder(title, onesIds) {
  const parts = [
    `[session-keeper] 当前会话标题「${title}」。`,
    "若本轮话题已明显漂移（或 ONES 单发生变化），按 skill session-keeper 的规则改写标题；",
    "未漂移则完全忽略本提示，不要向用户提及标题。",
  ];
  if (onesIds.length > 0) {
    parts.push(` 本轮出现 ONES 单号：${onesIds.join("、")}。`);
  }
  return parts.join("");
}

async function runHook() {
  let input = {};
  try {
    const raw = fs.readFileSync(0, "utf8");
    if (!raw.trim()) return;
    input = JSON.parse(raw);
  } catch {
    return;
  }

  if (input.hook_event_name !== "UserPromptSubmit") return;

  const sessionId = input.session_id;
  if (!sessionId) return;

  const current = typeof input.session_title === "string" ? input.session_title.trim() : "";
  const pending = readPendingTitle(sessionId);
  const effectiveTitle = pending || current;

  // 新会话还没有标题时先不打扰，等内置 ai-title 生成
  if (!effectiveTitle) return;

  const output = { hookEventName: "UserPromptSubmit" };

  // 把脚本写入的标题回填给运行中的会话，触发标题栏刷新
  if (pending && pending !== current) {
    output.sessionTitle = pending;
  }

  const onesIds = detectOnesIds(input.prompt || "");
  output.additionalContext = buildReminder(effectiveTitle, onesIds);

  process.stdout.write(JSON.stringify({ hookSpecificOutput: output }));
}

async function cmdGet(opts) {
  const transcript = resolveTranscript(opts);
  if (!transcript || !fs.existsSync(transcript)) {
    console.error("找不到会话 transcript。请确认 CLAUDE_CODE_SESSION_ID 是否可用，或用 --session/--transcript 指定。");
    process.exitCode = 1;
    return;
  }
  const sessionId = resolveSessionId(opts, transcript);
  const scan = await scanTranscript(transcript);
  const { title, source } = currentTitle(scan);

  if (opts.json) {
    process.stdout.write(`${JSON.stringify({ sessionId, transcript, title, source, userMessages: scan.userCount })}\n`);
    return;
  }
  console.log(`会话: ${sessionId}`);
  console.log(`标题: ${title || "(尚未生成)"}`);
  console.log(`来源: ${source}`);
  console.log(`用户消息数: ${scan.userCount}`);
}

async function cmdContext(opts) {
  const transcript = resolveTranscript(opts);
  if (!transcript || !fs.existsSync(transcript)) {
    console.error("找不到会话 transcript。");
    process.exitCode = 1;
    return;
  }
  const scan = await scanTranscript(transcript, { keepPrompts: true, limit: opts.limit || 8 });
  const { title, source } = currentTitle(scan);

  if (opts.json) {
    process.stdout.write(`${JSON.stringify({ title, source, firstUserPrompt: scan.firstUserPrompt, recentUserPrompts: scan.userPrompts })}\n`);
    return;
  }
  console.log(`当前标题: ${title || "(尚未生成)"}（${source}）`);
  if (scan.firstUserPrompt) console.log(`\n最初需求: ${scan.firstUserPrompt.slice(0, 200)}`);
  console.log("\n最近用户消息:");
  scan.userPrompts.forEach((prompt, index) => {
    console.log(`${index + 1}. ${prompt}`);
  });
}

async function cmdSet(opts) {
  const rawTitle = opts._.slice(1).join(" ");
  const title = normalizeTitle(rawTitle);
  if (!title) {
    console.error('用法: session-keeper.js set "新标题"');
    process.exitCode = 1;
    return;
  }
  if (charLength(title) > HARD_MAX_CHARS) {
    console.error(`标题过长（${charLength(title)} 字符，上限 ${HARD_MAX_CHARS}）。请按 SKILL.md 压缩到约 24 个汉字。`);
    process.exitCode = 1;
    return;
  }

  const transcript = resolveTranscript(opts);
  if (!transcript || !fs.existsSync(transcript)) {
    console.error("找不到会话 transcript，标题未写入。");
    process.exitCode = 1;
    return;
  }
  const sessionId = resolveSessionId(opts, transcript);
  if (!sessionId) {
    console.error("无法确定 sessionId，标题未写入。");
    process.exitCode = 1;
    return;
  }

  const scan = await scanTranscript(transcript);
  const previous = currentTitle(scan).title;

  if (previous === title) {
    console.log(`标题未变化: ${title}`);
    return;
  }

  appendCustomTitle(transcript, sessionId, title);
  writePendingTitle(sessionId, title);
  console.log(`标题已更新: ${previous || "(空)"} → ${title}`);
}

function printHelp() {
  console.log(`session-keeper

用法:
  session-keeper.js get                       读取当前会话标题
  session-keeper.js set "<标题>"              写入会话标题
  session-keeper.js context [--limit 8]       输出当前标题与最近用户消息
  session-keeper.js                           hook 模式（stdin 传入 UserPromptSubmit JSON）

选项:
  --session <id>        指定会话 ID（默认取 CLAUDE_CODE_SESSION_ID）
  --transcript <path>   直接指定 transcript 文件
  --json                机器可读输出`);
}

async function main() {
  const argv = process.argv.slice(2);
  const opts = parseArgs(argv);

  if (opts._.length === 0) {
    if (!process.stdin.isTTY) {
      await runHook();
      return;
    }
    printHelp();
    return;
  }

  const command = opts._[0];
  if (command === "get") await cmdGet(opts);
  else if (command === "set") await cmdSet(opts);
  else if (command === "context") await cmdContext(opts);
  else if (command === "help" || command === "--help" || command === "-h") printHelp();
  else {
    console.error(`未知命令: ${command}`);
    printHelp();
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`session-keeper 执行失败: ${error && error.message ? error.message : error}`);
  process.exitCode = 1;
});
