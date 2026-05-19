#!/usr/bin/env node
// 一键启动：Go 后端 + Node 协同服务 + 前端 dev server
// 用法: node scripts/dev.mjs   或   npm run dev
//
// 特性：
//  - 三个进程并发启动，带彩色前缀的合并日志
//  - Ctrl+C / 任一进程退出 → 统一回收所有子进程
//  - Node 协同服务首次启动时自动 npm install（若缺 node_modules）
//  - 前端自动选择 pnpm（优先）/ npm 启动

import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const COLORS = {
  reset: '\x1b[0m',
  go: '\x1b[36m',      // cyan
  node: '\x1b[35m',    // magenta
  web: '\x1b[32m',     // green
  sys: '\x1b[33m',     // yellow
  err: '\x1b[31m',     // red
};

const children = [];
let shuttingDown = false;

function log(tag, color, line) {
  if (!line) return;
  process.stdout.write(`${color}[${tag}]${COLORS.reset} ${line}\n`);
}

function sysLog(line) {
  log('dev', COLORS.sys, line);
}

function pipeOutput(child, tag, color) {
  const handle = (buf) => {
    const text = buf.toString();
    for (const line of text.split(/\r?\n/)) {
      if (line.length > 0) log(tag, color, line);
    }
  };
  child.stdout?.on('data', handle);
  child.stderr?.on('data', handle);
}

function start(name, color, cmd, args, opts = {}) {
  sysLog(`启动 ${name}: ${cmd} ${args.join(' ')} (cwd=${opts.cwd || ROOT})`);
  const child = spawn(cmd, args, {
    cwd: opts.cwd || ROOT,
    env: { ...process.env, ...(opts.env || {}) },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: NEEDS_SHELL,
  });
  child._name = name;
  child._color = color;
  pipeOutput(child, name, color);
  child.on('exit', (code, signal) => {
    log(name, color, `进程退出 code=${code} signal=${signal || '-'}`);
    if (!shuttingDown) shutdown(code ?? 1);
  });
  child.on('error', (err) => {
    log(name, COLORS.err, `启动失败: ${err.message}`);
    if (!shuttingDown) shutdown(1);
  });
  children.push(child);
  return child;
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  sysLog('收到退出信号，正在关闭子进程...');
  for (const c of children) {
    if (c.exitCode === null && !c.killed) {
      try {
        c.kill('SIGTERM');
      } catch {/* ignore */}
    }
  }
  // 兜底：3 秒后强杀
  setTimeout(() => {
    for (const c of children) {
      if (c.exitCode === null && !c.killed) {
        try { c.kill('SIGKILL'); } catch {/* ignore */}
      }
    }
    process.exit(code);
  }, 3000).unref();
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

// ---- 依赖检查与准备 ----
const IS_WIN = process.platform === 'win32';
// Windows 下 npm/pnpm/go 通常是 .cmd 脚本，需要 shell:true 才能直接 spawn
const NEEDS_SHELL = IS_WIN;

function hasCommand(cmd, versionArgs = ['--version']) {
  const r = spawnSync(cmd, versionArgs, { stdio: 'ignore', shell: NEEDS_SHELL });
  return r.status === 0;
}

async function ensureNodeDeps() {
  const nodeDir = join(ROOT, 'backend', 'node');
  const nm = join(nodeDir, 'node_modules');
  if(existsSync(nm)) return;
  sysLog('backend/node 缺少 node_modules，正在 npm install ...');
  await new Promise((resolve, reject) => {
    const p = spawn('npm', ['install'], {
      cwd: nodeDir,
      stdio: 'inherit',
      shell: NEEDS_SHELL,
    });
    p.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`npm install 失败 code=${code}`)));
    p.on('error', reject);
  });
}

async function ensureFrontendDeps() {
  const feDir = join(ROOT, 'Frontend');
  const nm = join(feDir, 'node_modules');
  if (existsSync(nm)) return;
  // 优先 pnpm
  const usePnpm = hasCommand('pnpm');
  const cmd = usePnpm ? 'pnpm' : 'npm';
  sysLog(`Frontend 缺少 node_modules，正在 ${cmd} install ...`);
  await new Promise((resolve, reject) => {
    const p = spawn(cmd, ['install'], {
      cwd: feDir,
      stdio: 'inherit',
      shell: NEEDS_SHELL,
    });
    p.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${cmd} install 失败 code=${code}`)));
    p.on('error', reject);
  });
}

function pickFrontendRunner() {
  return hasCommand('pnpm') ? 'pnpm' : 'npm';
}

// 端口占用检测：返回占用端口的 [{ port, pid, cmd }] 列表；无占用返回 []
function detectPortOccupants(ports) {
  if (IS_WIN) return []; // 仅在 *nix 上做检测
  const result = [];
  for (const port of ports) {
    const r = spawnSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN'], {
      encoding: 'utf8',
    });
    if (r.status !== 0) continue;
    const lines = (r.stdout || '').split('\n').slice(1).filter(Boolean);
    for (const line of lines) {
      const cols = line.split(/\s+/);
      if (cols.length >= 2) {
        result.push({ port, pid: cols[1], cmd: cols[0] });
      }
    }
  }
  return result;
}

// ---- 主流程 ----
(async () => {
  try {
    sysLog(`工作目录: ${ROOT}`);

    // 0) 端口占用 preflight
    const busy = detectPortOccupants([8080, 3001, 5173]);
    if (busy.length > 0) {
      sysLog(`${COLORS.err}端口已被占用：${COLORS.reset}`);
      for (const b of busy) {
        sysLog(`  :${b.port}  PID=${b.pid}  CMD=${b.cmd}`);
      }
      sysLog(`请先释放端口：例如 ${COLORS.sys}kill ${busy.map((b) => b.pid).join(' ')}${COLORS.reset}`);
      process.exit(1);
    }

    // 1) 依赖准备（串行，避免重复装包）
    await ensureNodeDeps();
    await ensureFrontendDeps();
    // 2) 启动 Go 后端
    // 使用 `go run .`，跨平台、无需先 build。要求 go 已安装。
    if (!hasCommand('go', ['version'])) {
      sysLog(`${COLORS.err}未找到 go 命令，请先安装 Go 并确保已在 PATH 中${COLORS.reset}`);
      process.exit(1);
    }
    start('go ', COLORS.go, 'go', ['run', '.'], {
      cwd: join(ROOT, 'backend'),
    });

    // 3) 启动 Node 协同服务
    start('node', COLORS.node, 'npm', ['run', 'dev'], {
      cwd: join(ROOT, 'backend', 'node'),
      env: {
        GO_BACKEND_URL: process.env.GO_BACKEND_URL || 'http://localhost:8080',
        GO_INTERNAL_TOKEN: process.env.GO_INTERNAL_TOKEN || 'internal-secret',
      },
    });

    // 4) 启动前端
    const runner = pickFrontendRunner();
    start('web ', COLORS.web, runner, ['run', 'dev'], {
      cwd: join(ROOT, 'Frontend'),
    });

    sysLog('全部服务已启动：Go(:8080)  Node-Yjs(:3001)  Frontend(vite)');
    sysLog('Ctrl+C 退出全部');
  } catch (err) {
    sysLog(`${COLORS.err}启动失败: ${err.message}${COLORS.reset}`);
    shutdown(1);
  }
})();