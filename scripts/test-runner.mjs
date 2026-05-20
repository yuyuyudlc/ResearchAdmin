#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const COLORS = {
  reset: '\x1b[0m',
  go: '\x1b[36m',      // cyan
  node: '\x1b[35m',    // magenta
  test: '\x1b[32m',    // green
  sys: '\x1b[33m',     // yellow
  err: '\x1b[31m',     // red
};

const processes = [];
let isShuttingDown = false;

function log(name, color, text) {
  if (!text) return;
  for (const line of text.split(/\r?\n/)) {
    if (line.trim().length > 0) {
      process.stdout.write(`${color}[${name}]${COLORS.reset} ${line}\n`);
    }
  }
}

function sysLog(msg) {
  log('runner', COLORS.sys, msg);
}

function startProcess(name, color, cmd, args, opts = {}) {
  sysLog(`Starting ${name}: ${cmd} ${args.join(' ')}`);
  const proc = spawn(cmd, args, {
    cwd: opts.cwd || ROOT,
    env: { ...process.env, ...opts.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  proc.stdout.on('data', (buf) => log(name, color, buf.toString()));
  proc.stderr.on('data', (buf) => log(name, color, buf.toString()));

  proc.on('error', (err) => {
    log(name, COLORS.err, `Process error: ${err.message}`);
    cleanup(1);
  });

  processes.push(proc);
  return proc;
}

async function waitPort(url, name, maxRetries = 20) {
  sysLog(`Waiting for ${name} to be ready at ${url}...`);
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        sysLog(`✨ ${name} is ready!`);
        return true;
      }
    } catch (err) {
      // ignore connection errors
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timeout waiting for ${name} at ${url}`);
}

function cleanup(exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  sysLog('Cleaning up services and test files...');

  for (const p of processes) {
    if (p.exitCode === null && !p.killed) {
      try {
        p.kill('SIGTERM');
      } catch (err) {
        // ignore
      }
    }
  }

  // Delete temp database
  const dbPath = join(ROOT, 'backend', 'test_integration.db');
  try {
    if (existsSync(dbPath)) {
      rmSync(dbPath);
      sysLog('Deleted test_integration.db');
    }
    const journalPath = join(ROOT, 'backend', 'test_integration.db-journal');
    if (existsSync(journalPath)) {
      rmSync(journalPath);
    }
  } catch (err) {
    sysLog(`Failed to delete integration test database files: ${err.message}`);
  }

  sysLog(`Exiting test runner with code ${exitCode}`);
  process.exit(exitCode);
}

// Intercept exit signals
process.on('SIGINT', () => cleanup(0));
process.on('SIGTERM', () => cleanup(0));

async function main() {
  try {
    // 0) Delete database if leftover
    const dbPath = join(ROOT, 'backend', 'test_integration.db');
    if (existsSync(dbPath)) {
      rmSync(dbPath);
    }

    // 1) Start Go Backend
    startProcess('go ', COLORS.go, 'go', ['run', '.'], {
      cwd: join(ROOT, 'backend'),
      env: {
        HTTP_ADDR: ':8080',
        DB_DSN: 'test_integration.db',
        JWT_SECRET: 'dev_secret_change_me',
        GO_INTERNAL_TOKEN: 'internal-secret',
      },
    });

    // Wait for Go port 8080 (check swagger)
    await waitPort('http://localhost:8080/swagger/index.html', 'Go Backend');

    // 2) Start Node Collaboration Server
    startProcess('node', COLORS.node, 'node', ['src/server.js'], {
      cwd: join(ROOT, 'backend', 'node'),
      env: {
        PORT: '3001',
        GO_BACKEND_URL: 'http://localhost:8080',
        GO_INTERNAL_TOKEN: 'internal-secret',
      },
    });

    // Wait for Node port 3001 (check health)
    await waitPort('http://localhost:3001/health', 'Node Yjs Server');

    // 3) Run the Integration Tests
    sysLog('🚀 Running integration tests...');
    const testProc = spawn('node', ['test-sync.js'], {
      cwd: join(ROOT, 'backend', 'node'),
      env: {
        ...process.env,
        GO_BACKEND_URL: 'http://localhost:8080',
        WS_URL: 'ws://localhost:3001',
      },
      stdio: 'inherit',
    });

    testProc.on('exit', (code) => {
      sysLog(`Integration test script exited with code ${code}`);
      cleanup(code ?? 0);
    });

    testProc.on('error', (err) => {
      sysLog(`Failed to run integration test script: ${err.message}`);
      cleanup(1);
    });

  } catch (err) {
    sysLog(`${COLORS.err}Test runner execution failed: ${err.message}${COLORS.reset}`);
    cleanup(1);
  }
}

main();
