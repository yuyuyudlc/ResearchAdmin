import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { setupWSConnection, setPersistence } from 'y-websocket/bin/utils';
import * as Y from 'yjs';
import { config } from './config.js';
import { GoClient } from './go-client.js';

const goClient = new GoClient();

// ---- Flush scheduler ----
// Flush every flushIntervalMs OR every flushUpdateCount updates, whichever first
const flushTimers = new Map();   // docId → setTimeout
const updateCounts = new Map();  // docId → 未 flush 的更新次数
const ydocs = new Map();         // docId → YDoc 引用，用于连接关闭时强制 flush

function scheduleFlush(docId, ydoc) {
  ydocs.set(docId, ydoc);
  const count = (updateCounts.get(docId) || 0) + 1;
  updateCounts.set(docId, count);

  clearTimeout(flushTimers.get(docId));

  if (count >= config.flushUpdateCount) {
    doFlush(docId, ydoc);
  } else {
    flushTimers.set(docId, setTimeout(() => doFlush(docId, ydoc), config.flushIntervalMs));
  }
}

function doFlush(docId, ydoc) {
  const state = Buffer.from(Y.encodeStateAsUpdate(ydoc));
  updateCounts.set(docId, 0);
  flushTimers.delete(docId);
  goClient.putBody(docId, state);
}

/** 连接关闭时强制 flush 未写入的更新，防止数据丢失 */
function flushIfPending(docId) {
  const count = updateCounts.get(docId) || 0;
  if (count > 0) {
    const ydoc = ydocs.get(docId);
    if (ydoc) {
      clearTimeout(flushTimers.get(docId));
      doFlush(docId, ydoc);
      console.log(`[ws] ${docId} disconnected, flushed ${count} pending updates`);
    }
  }
}

// ---- Persistence hook ----
// y-websocket calls writeState on every update. We debounce the actual flush.
setPersistence({
  bindState: async (docId, ydoc) => {
    console.log(`[persistence] Loading initial state for doc ${docId}...`);
    const dbUpdate = await goClient.getBody(docId);
    if (dbUpdate && dbUpdate.byteLength > 0) {
      Y.applyUpdate(ydoc, dbUpdate);
      console.log(`[persistence] Loaded initial state for doc ${docId} (${dbUpdate.byteLength} bytes)`);
    } else {
      console.log(`[persistence] No existing state found for doc ${docId}, starting fresh`);
    }
  },
  writeState: async (docId, ydoc) => {
    scheduleFlush(docId, ydoc);
  },
});

// ---- HTTP server ----
const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
    return;
  }
  res.writeHead(404);
  res.end('not found');
});

// ---- WebSocket ----
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', async (req, socket, head) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const match = url.pathname.match(/^\/documents\/([a-f0-9-]{36})$/);
  if (!match) {
    socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
    socket.destroy();
    return;
  }
  const docId = match[1];

  const token = url.searchParams.get('token');
  if (!token) {
    console.log(`[ws-upgrade] ${docId} connection rejected: missing token`);
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  // Validate permission with Go backend
  const perms = await goClient.checkPermission(docId, token);
  if (!perms.canRead) {
    console.log(`[ws-upgrade] ${docId} connection rejected: insufficient permissions`);
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    ws.perms = perms;
    wss.emit('connection', ws, req);
  });
});

wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const match = url.pathname.match(/^\/documents\/([a-f0-9-]{36})$/);
  if (!match) {
    ws.close(4000, 'invalid path, expected /documents/{docId}');
    return;
  }
  const docId = match[1];

  // 连接关闭前确保待 flush 的更新已写入 Go
  ws.on('close', () => flushIfPending(docId));

  if (ws.readyState !== ws.OPEN) {
    return;
  }

  // docName 是 y-websocket 内部 YDoc Map 的 key，传文档 UUID，不是文档标题
  setupWSConnection(ws, req, { docName: docId, gc: true });
  console.log(`[ws] ${docId} connected (canEdit: ${ws.perms?.canEdit || false})`);
});

// ---- Start ----
server.listen(config.port, () => {
  console.log(`[server] Yjs collaboration on :${config.port}`);
  console.log(`[server] Flush: ${config.flushIntervalMs}ms or ${config.flushUpdateCount} updates`);
  console.log(`[server] Go: ${config.goBackendURL}`);
});
