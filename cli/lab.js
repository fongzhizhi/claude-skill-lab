#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

// ============================================
// 配置
// ============================================

const ROOT = path.resolve(__dirname, "..");
const HOME = os.homedir();

// 类型目录（单模块）——单模块的 dist/ 是 ~/.claude/ 的**全量镜像**：
// dist/ 下所有文件按相对路径原样复制到 ~/.claude/（如 dist/commands/foo.md →
// ~/.claude/commands/foo.md），与聚合套件共用同一认知模型，lab 无需按类型特殊处理
const TYPES = ["skills", "agents", "commands", "rules", "hooks", "workflows", "docs"];

// ~/.claude/ 根：单模块 dist/ 即其全量镜像（隐式），套件经 manifest.json 声明映射子集
const CLAUDE_ROOT = path.join(HOME, ".claude");

// ============================================
// 工具函数
// ============================================

function log(msg, indent = 0) {
  console.log("  ".repeat(indent) + msg);
}

function error(msg) {
  // 抛异常而非直接退出：一键部署时可按模块捕获继续，
  // 顶层 main() 统一捕获后打印并退出
  throw new Error(msg);
}

function success(msg) {
  console.log("✅ " + msg);
}

function info(msg) {
  console.log("ℹ️  " + msg);
}

// 简单模式匹配：* 匹配所有，*.* 匹配带点文件，*.ext 匹配扩展名，其余精确匹配
function matchPattern(file, pattern) {
  if (pattern === "*") return true;
  if (pattern === "*.*") return file.includes(".");
  if (pattern.startsWith("*.")) return file.endsWith(pattern.substring(1));
  return file === pattern;
}

// 自然排序：数字段按数值比较（name-2 < name-10），其余按字典序
function naturalCompare(a, b) {
  const partsA = a.match(/\d+|\D+/g) || [a];
  const partsB = b.match(/\d+|\D+/g) || [b];
  const len = Math.min(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    const x = partsA[i];
    const y = partsB[i];
    const isNumX = /^\d+$/.test(x);
    const isNumY = /^\d+$/.test(y);
    if (isNumX && isNumY) {
      const diff = parseInt(x, 10) - parseInt(y, 10);
      if (diff !== 0) return diff;
    } else {
      const cmp = x < y ? -1 : x > y ? 1 : 0;
      if (cmp !== 0) return cmp;
    }
  }
  return partsA.length - partsB.length;
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return false;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
  return true;
}

// 镜像核对：srcDir 下所有文件按相对路径在 destRoot 下逐一检查，
// 返回已部署数与缺失的相对路径列表（用于 lab status）
function checkDistMirror(srcDir, destRoot) {
  let deployed = 0;
  const missing = [];
  const walk = (src, dest) => {
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        walk(srcPath, destPath);
      } else if (fs.existsSync(destPath)) {
        deployed++;
      } else {
        missing.push(path.relative(destRoot, destPath));
      }
    }
  };
  walk(srcDir, destRoot);
  return { deployed, missing };
}

// 镜像删除：删除 destRoot 下与 srcDir 相对路径对应的文件（用于 lab remove）
function removeDistMirror(srcDir, destRoot) {
  const walk = (src, dest) => {
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        walk(srcPath, destPath);
      } else if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath);
        log(`  🗑️  删除: ${destPath}`);
      }
    }
  };
  walk(srcDir, destRoot);
}

function findModules() {
  const result = { types: {}, suites: {} };

  // 扫描单模块类型目录
  for (const type of TYPES) {
    const typeDir = path.join(ROOT, type);
    if (!fs.existsSync(typeDir)) continue;
    const dirs = fs
      .readdirSync(typeDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    for (const name of dirs) {
      const distPath = path.join(typeDir, name, "dist");
      const hasDist =
        fs.existsSync(distPath) && fs.readdirSync(distPath).length > 0;
      if (hasDist) {
        result.types[name] = result.types[name] || [];
        result.types[name].push(type);
      }
    }
  }

  // 扫描聚合套件
  const suitesDir = path.join(ROOT, "suites");
  if (fs.existsSync(suitesDir)) {
    const dirs = fs
      .readdirSync(suitesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    for (const name of dirs) {
      const manifestPath = path.join(suitesDir, name, "manifest.json");
      const distPath = path.join(suitesDir, name, "dist");
      if (fs.existsSync(manifestPath) && fs.existsSync(distPath)) {
        result.suites[name] = path.join(suitesDir, name);
      }
    }
  }

  return result;
}

function resolveModule(name) {
  const modules = findModules();
  const matches = [];

  // 检查是否显式指定了 suites/
  if (name.startsWith("suites/")) {
    const suiteName = name.replace(/^suites\//, "");
    if (modules.suites[suiteName]) {
      return {
        type: "suite",
        name: suiteName,
        path: modules.suites[suiteName],
      };
    }
    error(`套件 "${suiteName}" 不存在`);
  }

  // 检查是否显式指定了类型前缀
  for (const type of TYPES) {
    if (name.startsWith(type + "/")) {
      const modName = name.replace(new RegExp("^" + type + "/"), "");
      if (modules.types[modName] && modules.types[modName].includes(type)) {
        return {
          type: type,
          name: modName,
          path: path.join(ROOT, type, modName),
        };
      }
      error(`模块 "${modName}" 在 "${type}" 中不存在`);
    }
  }

  // 自动推断
  const typeMatches = modules.types[name] || [];
  const suiteMatch = modules.suites[name];

  if (typeMatches.length === 1 && !suiteMatch) {
    const type = typeMatches[0];
    return { type: type, name: name, path: path.join(ROOT, type, name) };
  }

  if (suiteMatch && typeMatches.length === 0) {
    return { type: "suite", name: name, path: suiteMatch };
  }

  if (suiteMatch && typeMatches.length > 0) {
    log(`⚠️  模块 "${name}" 存在多个匹配：`);
    for (const t of typeMatches) {
      log(`  - ${t}/${name}`);
    }
    log(`  - suites/${name}`);
    log(
      "请使用完整路径限定：lab deploy <type>/<name> 或 lab deploy suites/<name>",
    );
    process.exit(1);
  }

  if (typeMatches.length > 1) {
    log(`⚠️  模块 "${name}" 存在多个匹配：`);
    for (const t of typeMatches) {
      log(`  - ${t}/${name}`);
    }
    log("请使用 lab deploy <type>/<name> 显式指定");
    process.exit(1);
  }

  error(`模块 "${name}" 不存在`);
}

// 读取模块目录下的 meta.json（声明前置依赖等元信息），无效或不存在时返回 null
function readMeta(modulePath) {
  const metaPath = path.join(modulePath, "meta.json");
  if (!fs.existsSync(metaPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(metaPath, "utf-8"));
  } catch (e) {
    return null;
  }
}

// 逐个执行 meta.json 中声明的依赖检查命令，返回是否全部满足；
// required === false 的依赖只提示不拦截
function checkDependencies(modulePath) {
  const meta = readMeta(modulePath);
  if (!meta) {
    log("⚠️  meta.json 格式无效，跳过依赖检查");
    return true;
  }

  const deps = meta.dependencies || [];
  let allOk = true;

  for (const dep of deps) {
    if (!dep.check) continue;
    try {
      execSync(dep.check, { stdio: "pipe", shell: true });
      log(`  ✅ ${dep.name} 已安装`);
    } catch (e) {
      log(`  ❌ ${dep.name} 未安装`);
      if (dep.required !== false) {
        allOk = false;
        log(`  📦 安装命令: ${dep.install || "请手动安装"}`);
      } else {
        log(`  ⚠️  （可选依赖，仅提示）`);
      }
    }
  }

  return allOk;
}

function deploySingleModule(type, name, modulePath) {
  const distPath = path.join(modulePath, "dist");
  if (!fs.existsSync(distPath)) {
    error(`模块 "${name}" 没有 dist/ 目录`);
  }

  // dist/ 即 ~/.claude/ 的全量镜像：dist/ 下所有文件按相对路径原样复制
  log(`部署: ${type}/${name} → ${CLAUDE_ROOT}`);
  if (copyDir(distPath, CLAUDE_ROOT)) {
    success(`部署完成: ${name}`);
  } else {
    error(`部署失败: ${name}`);
  }
}

function deploySuite(name, suitePath) {
  const manifestPath = path.join(suitePath, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    error(`套件 "${name}" 缺少 manifest.json`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  const distBase = path.join(suitePath, "dist");

  if (!fs.existsSync(distBase)) {
    error(`套件 "${name}" 没有 dist/ 目录`);
  }

  log(`部署套件: ${name}`);

  for (const mapping of manifest.mappings || []) {
    const sourceGlob = mapping.source;
    // 简化：只支持精确路径或 *.ext 模式，完整 glob 留待后续
    const sourceDir = path.dirname(sourceGlob);
    const sourcePattern = path.basename(sourceGlob);
    const fullSourceDir = path.join(distBase, sourceDir);

    if (!fs.existsSync(fullSourceDir)) {
      log(`⚠️  跳过不存在的源目录: ${sourceDir}`);
      continue;
    }

    // 解析 target，替换 {HOME}
    let target = mapping.target.replace(/\{HOME\}/g, HOME);

    // 如果是目录（以 / 结尾），创建目录
    if (!target.endsWith(path.sep) && !target.endsWith("/")) {
      // 可能是文件路径，也可能是目录路径（没有末尾斜杠）
      // 检查是否有通配符
      if (sourcePattern.includes("*")) {
        // 通配符模式，目标应为目录
        if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });
      } else {
        // 单文件，目标应为文件路径，确保父目录存在
        const parent = path.dirname(target);
        if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
      }
    } else {
      // 以 / 结尾，创建目录
      if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });
    }

    // 复制文件
    const files = fs.readdirSync(fullSourceDir);
    for (const file of files) {
      if (
        sourcePattern === "*" ||
        sourcePattern === "*.*" ||
        file.endsWith(sourcePattern.replace("*", "")) ||
        sourcePattern === file
      ) {
        // 简单匹配：* 匹配所有，*.ext 匹配扩展名
        let matched = false;
        if (sourcePattern === "*") matched = true;
        else if (sourcePattern === "*.*") matched = file.includes(".");
        else if (sourcePattern.startsWith("*.")) {
          const ext = sourcePattern.substring(1);
          matched = file.endsWith(ext);
        } else {
          matched = file === sourcePattern;
        }

        if (matched) {
          const srcFile = path.join(fullSourceDir, file);
          let destFile;
          if (target.endsWith(path.sep) || target.endsWith("/")) {
            destFile = path.join(target, file);
          } else {
            destFile = target;
          }
          const destDir = path.dirname(destFile);
          if (!fs.existsSync(destDir))
            fs.mkdirSync(destDir, { recursive: true });
          fs.copyFileSync(srcFile, destFile);
          log(`  ${file} → ${destFile}`);
        }
      }
    }
  }

  success(`套件 "${name}" 部署完成`);
}

// 一键部署所有模块（单模块 + 套件），逐个捕获失败，返回汇总
function deployAllModules(force = false) {
  const modules = findModules();
  let ok = 0;
  const fail = [];

  log("🚀 一键部署所有模块:");
  log("");

  // 单模块
  const typeNames = Object.keys(modules.types).sort();
  for (const name of typeNames) {
    for (const type of modules.types[name]) {
      try {
        deploySingleModule(type, name, path.join(ROOT, type, name));
        ok++;
      } catch (e) {
        fail.push(`${type}/${name}: ${e.message}`);
      }
    }
  }

  // 聚合套件
  const suiteNames = Object.keys(modules.suites).sort();
  for (const name of suiteNames) {
    try {
      // 依赖检查：缺失时跳过该套件（--force 可跳过检查）
      const meta = readMeta(modules.suites[name]);
      const deps = meta?.dependencies || [];
      if (deps.length > 0) {
        log(`🔍 检查前置依赖: suites/${name}`);
        if (!force && !checkDependencies(modules.suites[name])) {
          fail.push(`suites/${name}: 缺失前置依赖，已跳过（--force 可强制部署）`);
          continue;
        }
        if (force) {
          log(`  ⚠️  --force 已启用，跳过依赖检查`);
        }
      }
      deploySuite(name, modules.suites[name]);
      ok++;
    } catch (e) {
      fail.push(`suites/${name}: ${e.message}`);
    }
  }

  return { ok, fail };
}

// ============================================
// 命令实现
// ============================================

function cmdDeploy(args) {
  // 解析参数：--all 一键部署；--force 跳过依赖检查；--switch <profile> / --switch=<profile> 部署后切换配置
  let all = false;
  let force = false;
  let switchProfile = null;
  const names = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--all") {
      all = true;
    } else if (a === "--force") {
      force = true;
    } else if (a === "--switch") {
      switchProfile = args[++i];
      if (!switchProfile || switchProfile.startsWith("-")) {
        error("--switch 需要一个 profile 名，如: lab deploy --all --switch deepseek");
      }
    } else if (a.startsWith("--switch=")) {
      switchProfile = a.slice("--switch=".length);
    } else if (a.startsWith("-")) {
      error(`未知参数: ${a}`);
    } else {
      names.push(a);
    }
  }

  // 一键部署
  if (all) {
    const { ok, fail } = deployAllModules(force);
    log("");
    if (fail.length > 0) {
      log(`⚠️  成功 ${ok} 个，失败 ${fail.length} 个:`);
      for (const f of fail) log(`  ❌ ${f}`);
      error("一键部署未全部完成，已取消配置切换");
    } else {
      success(`全部 ${ok} 个模块部署完成`);
    }
    if (switchProfile) {
      log("");
      applyProfile(switchProfile);
    }
    return;
  }

  if (names.length === 0) {
    log("用法: lab deploy <name>");
    log("      lab deploy <type>/<name>");
    log("      lab deploy suites/<name>");
    log("      lab deploy --all");
    log("      lab deploy --all --switch <profile>");
    process.exit(1);
  }

  const name = names[0];
  const result = resolveModule(name);

  // 前置依赖检查：meta.json 中声明了 dependencies 时，缺失且未加 --force 则拦截
  const meta = readMeta(result.path);
  const deps = meta?.dependencies || [];
  if (deps.length > 0) {
    if (force) {
      log(`⚠️  --force 已启用，跳过依赖检查`);
    } else {
      log(`🔍 检查前置依赖: ${name}`);
      if (!checkDependencies(result.path)) {
        log("");
        log("⚠️  缺失前置依赖，部署已暂停");
        log("   请安装后重新执行，或使用 --force 跳过检查");
        process.exit(1);
      }
    }
  }

  if (result.type === "suite") {
    deploySuite(result.name, result.path);
  } else {
    deploySingleModule(result.type, result.name, result.path);
  }

  if (switchProfile) {
    log("");
    applyProfile(switchProfile);
  }
}

function cmdList() {
  const modules = findModules();

  log("📦 可部署模块:");
  log("");

  // 单模块
  const typeNames = Object.keys(modules.types).sort();
  if (typeNames.length > 0) {
    log("单模块:");
    for (const name of typeNames) {
      const types = modules.types[name].join(", ");
      log(`  ${name} (${types})`, 1);
    }
  }

  // 套件
  const suiteNames = Object.keys(modules.suites).sort();
  if (suiteNames.length > 0) {
    log("");
    log("聚合套件:");
    for (const name of suiteNames) {
      const meta = readMeta(modules.suites[name]);
      const deps = meta?.dependencies || [];
      let depStatus = "";
      if (deps.length > 0) {
        const missing = [];
        for (const dep of deps) {
          if (!dep.check) continue;
          try {
            execSync(dep.check, { stdio: "pipe", shell: true });
          } catch (e) {
            missing.push(dep.name);
          }
        }
        depStatus =
          missing.length === 0 ? "✅" : `⚠️ 缺少 ${missing.join(", ")}`;
      }
      log(`  ${name} (suites)${depStatus ? " " + depStatus : ""}`, 1);
    }
  }

  if (typeNames.length === 0 && suiteNames.length === 0) {
    log("  (无)");
  }
}

function cmdStatus() {
  log("📊 本地部署状态:");
  log("");

  const modules = findModules();

  // 检查单模块：按类型分组（TYPES 顺序，同类相邻），组内按命名自然排序
  const byType = new Map();
  for (const name of Object.keys(modules.types)) {
    for (const type of modules.types[name]) {
      if (!byType.has(type)) byType.set(type, []);
      byType.get(type).push(name);
    }
  }
  for (const type of TYPES) {
    const names = byType.get(type);
    if (!names) continue;
    names.sort(naturalCompare);
    for (const name of names) {
      // 镜像核对：dist/ 相对路径逐一对应 ~/.claude/（全量镜像）
      const distPath = path.join(ROOT, type, name, "dist");
      const { deployed, missing } = checkDistMirror(distPath, CLAUDE_ROOT);

      if (deployed > 0 && missing.length === 0) {
        log(`  ✅ ${type}/${name} - 已部署`);
      } else if (deployed > 0) {
        log(`  ⚠️  ${type}/${name} - 部分部署 (缺失: ${missing.join(", ")})`);
      } else {
        log(`  ❌ ${type}/${name} - 未部署`);
      }
    }
  }

  // 检查套件：按 manifest 逐条核对目标文件（与部署逻辑对称）
  const suiteNames = Object.keys(modules.suites).sort(naturalCompare);
  for (const name of suiteNames) {
    const suitePath = modules.suites[name];
    const manifestPath = path.join(suitePath, "manifest.json");
    if (!fs.existsSync(manifestPath)) continue;
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    const distBase = path.join(suitePath, "dist");

    let deployed = 0;
    const missing = [];
    for (const mapping of manifest.mappings || []) {
      const sourceDir = path.dirname(mapping.source);
      const sourcePattern = path.basename(mapping.source);
      const fullSourceDir = path.join(distBase, sourceDir);
      if (!fs.existsSync(fullSourceDir)) continue;

      const target = mapping.target.replace(/\{HOME\}/g, HOME);
      const files = fs.readdirSync(fullSourceDir);
      for (const file of files) {
        if (!matchPattern(file, sourcePattern)) continue;
        const destFile =
          target.endsWith(path.sep) || target.endsWith("/")
            ? path.join(target, file)
            : target;
        if (fs.existsSync(destFile)) {
          deployed++;
        } else {
          missing.push(file);
        }
      }
    }

    if (deployed > 0 && missing.length === 0) {
      log(`  ✅ suites/${name} - 已部署`);
    } else if (deployed > 0) {
      log(`  ⚠️  suites/${name} - 部分部署 (缺失: ${missing.join(", ")})`);
    } else {
      log(`  ❌ suites/${name} - 未部署`);
    }
  }

  if (Object.keys(modules.types).length === 0 && suiteNames.length === 0) {
    log("  (无)");
  }
}

function cmdRemove(args) {
  if (args.length === 0) {
    log("用法: lab remove <name>");
    log("      lab remove <type>/<name>");
    log("      lab remove suites/<name>");
    process.exit(1);
  }

  const name = args[0];
  const result = resolveModule(name);

  if (result.type === "suite") {
    // 套件卸载：根据 manifest 删除文件
    const manifestPath = path.join(result.path, "manifest.json");
    if (!fs.existsSync(manifestPath)) {
      error(`套件 "${name}" 缺少 manifest.json`);
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    const distBase = path.join(result.path, "dist");

    log(`卸载套件: ${name}`);

    for (const mapping of manifest.mappings || []) {
      const sourceGlob = mapping.source;
      const sourceDir = path.dirname(sourceGlob);
      const sourcePattern = path.basename(sourceGlob);
      const fullSourceDir = path.join(distBase, sourceDir);

      if (!fs.existsSync(fullSourceDir)) continue;

      let target = mapping.target.replace(/\{HOME\}/g, HOME);

      const files = fs.readdirSync(fullSourceDir);
      for (const file of files) {
        let matched = false;
        if (sourcePattern === "*") matched = true;
        else if (sourcePattern === "*.*") matched = file.includes(".");
        else if (sourcePattern.startsWith("*.")) {
          const ext = sourcePattern.substring(1);
          matched = file.endsWith(ext);
        } else {
          matched = file === sourcePattern;
        }

        if (matched) {
          let destFile;
          if (target.endsWith(path.sep) || target.endsWith("/")) {
            destFile = path.join(target, file);
          } else {
            destFile = target;
          }
          if (fs.existsSync(destFile)) {
            fs.unlinkSync(destFile);
            log(`  🗑️  删除: ${destFile}`);
          }
        }
      }
    }
    success(`套件 "${name}" 已卸载`);
  } else {
    // 单模块卸载
    const distPath = path.join(result.path, "dist");
    if (!fs.existsSync(distPath)) {
      error(`模块 "${name}" 没有 dist/ 目录`);
    }

    log(`卸载: ${result.type}/${result.name}`);
    // 镜像删除：按 dist/ 相对路径删除 ~/.claude/ 下对应文件
    removeDistMirror(distPath, CLAUDE_ROOT);
    success(`卸载完成: ${name}`);
  }
}

// ANTHROPIC_AUTH_TOKEN 占位符值：仓库中的 token 仅为占位，不得写入用户配置
const TOKEN_PLACEHOLDERS = new Set([
  "",
  "API_KEY",
  "API_KEY_HERE",
  "YOUR_API_KEY_HERE",
]);

// 将 key 移到对象键序的指定位置（index 按当前键序计，越界自动 clamp）
function reorderKey(obj, key, index) {
  const keys = Object.keys(obj).filter((k) => k !== key);
  const pos = Math.min(Math.max(index, 0), keys.length);
  const result = {};
  keys.forEach((k, i) => {
    if (i === pos) result[key] = obj[key];
    result[k] = obj[k];
  });
  if (pos === keys.length) result[key] = obj[key];
  return result;
}

// 校验 profile 并合并 _base.json + <profile>.json，返回合并后的配置对象
function buildProfileConfig(profile) {
  const settingsDir = path.join(ROOT, "settings");
  const profilesDir = path.join(settingsDir, "profiles");
  const basePath = path.join(profilesDir, "_base.json");
  const profilePath = path.join(profilesDir, profile + ".json");
  const claudeSettingsPath = path.join(HOME, ".claude", "settings.json");

  if (!fs.existsSync(basePath)) {
    error(`基座配置不存在: ${basePath}`);
  }
  if (!fs.existsSync(profilePath)) {
    error(`Profile "${profile}" 不存在`);
  }

  const base = JSON.parse(fs.readFileSync(basePath, "utf-8"));
  const override = JSON.parse(fs.readFileSync(profilePath, "utf-8"));

  // 深度合并（简单实现）
  function deepMerge(target, source) {
    for (const key of Object.keys(source)) {
      if (
        source[key] &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        target[key] = target[key] || {};
        deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  }

  const merged = deepMerge(base, override);

  // 读取现有配置，用于继承敏感值
  let existing = {};
  if (fs.existsSync(claudeSettingsPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(claudeSettingsPath, "utf-8"));
    } catch (e) {
      // ignore
    }
  }

  // ANTHROPIC_AUTH_TOKEN 保护：profile/base 中为占位符时移除该键，
  // 防止覆盖用户配置中的真实 token；已有真实 token 则继承，
  // 键位置按来源（profile > base > 本地 settings.json）中该键的原有位置
  let tokenInherited = false;
  const token = merged.env && merged.env.ANTHROPIC_AUTH_TOKEN;
  if (TOKEN_PLACEHOLDERS.has(token)) {
    delete merged.env.ANTHROPIC_AUTH_TOKEN;
  }
  if (
    !(merged.env && merged.env.ANTHROPIC_AUTH_TOKEN) &&
    existing.env &&
    existing.env.ANTHROPIC_AUTH_TOKEN
  ) {
    merged.env = merged.env || {};
    let tokenIndex = null;
    if (override.env && "ANTHROPIC_AUTH_TOKEN" in override.env) {
      tokenIndex = Object.keys(override.env).indexOf("ANTHROPIC_AUTH_TOKEN");
    } else if (base.env && "ANTHROPIC_AUTH_TOKEN" in base.env) {
      tokenIndex = Object.keys(base.env).indexOf("ANTHROPIC_AUTH_TOKEN");
    } else if ("ANTHROPIC_AUTH_TOKEN" in existing.env) {
      tokenIndex = Object.keys(existing.env).indexOf("ANTHROPIC_AUTH_TOKEN");
    }

    merged.env.ANTHROPIC_AUTH_TOKEN = existing.env.ANTHROPIC_AUTH_TOKEN;
    if (tokenIndex !== null && tokenIndex !== undefined) {
      merged.env = reorderKey(merged.env, "ANTHROPIC_AUTH_TOKEN", tokenIndex);
    }
    tokenInherited = true;
  }

  // 处理 API Key：若 profile 中未指定，保留已有的
  if (!merged.api_key && existing.api_key) {
    merged.api_key = existing.api_key;
  }

  return { merged, tokenInherited };
}

// 切换 profile：合并配置并写入 ~/.claude/settings.json
function applyProfile(profile) {
  const { merged, tokenInherited } = buildProfileConfig(profile);

  const claudeSettingsPath = path.join(HOME, ".claude", "settings.json");
  const dir = path.dirname(claudeSettingsPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(claudeSettingsPath, JSON.stringify(merged, null, 2));
  success(`切换到 profile: ${profile}`);

  if (tokenInherited) {
    log("");
    log(
      "⚠️  当前 ANTHROPIC_AUTH_TOKEN 沿用了原有配置（profile 中为占位符）",
    );
    log(
      `   如需更换服务商，请手动更新 ${claudeSettingsPath} 中的 env.ANTHROPIC_AUTH_TOKEN`,
    );
  }
}

function cmdSwitch(args) {
  const profile = args[0];
  const ephemeral = args.includes("--ephemeral");

  const profilesDir = path.join(ROOT, "settings", "profiles");

  // 列出 profiles
  if (!profile) {
    log("可用 profiles:");
    if (fs.existsSync(profilesDir)) {
      const profiles = fs
        .readdirSync(profilesDir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => f.replace(".json", ""));
      for (const p of profiles) {
        const current = p === "_base" ? " (基座)" : "";
        log(`  ${p}${current}`);
      }
    }
    return;
  }

  if (ephemeral) {
    // 临时切换：只输出合并后的配置，不写入
    const { merged } = buildProfileConfig(profile);
    log(`🔀 临时切换到 ${profile} (仅当前会话)`);
    console.log(JSON.stringify(merged, null, 2));
    info("请将以上配置应用到当前会话");
  } else {
    applyProfile(profile);
  }
}

// ============================================
// 主入口
// ============================================

function showHelp() {
  log(`
🔧 lab - Claude Skill Lab CLI

用法:
  lab                     显示帮助
  lab list                列出所有可部署模块
  lab status              显示本地部署状态
  lab deploy <name>       部署模块 (自动推断)
  lab deploy <type>/<name> 部署指定类型模块
  lab deploy suites/<name> 部署聚合套件
  lab deploy --all        一键部署所有模块
  lab deploy --all --switch <profile>  一键部署并切换配置
  lab remove <name>       卸载模块
  lab switch              列出可用 profiles
  lab switch <profile>    切换模型配置
  lab switch <profile> --ephemeral  临时切换

示例:
  lab deploy skill-forge
  lab deploy commands/commit-draft
  lab deploy --all --switch deepseek
  lab switch deepseek
  lab status
`);
}

function main() {
  try {
    // npm run 兼容：npm 不把 `--` 前的 --flag 传给脚本，而是注入 npm_config_<flag>
    // 环境变量（如 npm run lab:deploy --all → npm_config_all="true"）；位置参数则直接透传。
    // 故从环境变量恢复 --all，保证 `npm run lab:deploy --all` 无需 `--` 分隔符即可生效。
    if (
      process.env.npm_config_all === "true" &&
      !process.argv.includes("--all")
    ) {
      process.argv.push("--all");
    }
    // --force 同理：npm run 会将其消费为 npm 自身配置，从环境变量恢复
    if (
      process.env.npm_config_force === "true" &&
      !process.argv.includes("--force")
    ) {
      process.argv.push("--force");
    }

    const args = process.argv.slice(2);
    const cmd = args[0];

    if (!cmd || cmd === "help" || cmd === "--help") {
      showHelp();
      return;
    }

    const subArgs = args.slice(1);

    switch (cmd) {
      case "list":
        cmdList();
        break;
      case "status":
        cmdStatus();
        break;
      case "deploy":
        cmdDeploy(subArgs);
        break;
      case "remove":
        cmdRemove(subArgs);
        break;
      case "switch":
        cmdSwitch(subArgs);
        break;
      default:
        error(`未知命令: ${cmd}\n运行 lab 查看帮助`);
    }
  } catch (e) {
    console.error("❌ " + e.message);
    process.exit(1);
  }
}

main();
