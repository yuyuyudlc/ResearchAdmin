import { parentPort } from 'node:worker_threads';
import * as Y from 'yjs';

/** @type {Map<string, { doc: Y.Doc, updateCount: number, lastFlush: number, timer: NodeJS.Timeout | null }>} */
const docs = new Map();

function getOrCreate(docId) {
  let entry = docs.get(docId);
  if (!entry) {
    entry = { doc: new Y.Doc(), updateCount: 0, lastFlush: Date.now(), timer: null };
    docs.set(docId, entry);
  }
  return entry;
}

function applyUpdate(docId, update) {
  const entry = getOrCreate(docId);
  Y.applyUpdate(entry.doc, update);
  entry.updateCount++;
  return entry;
}

function getState(docId) {
  const entry = docs.get(docId);
  if (!entry) return null;
  return Y.encodeStateAsUpdate(entry.doc);
}

function flushAndReset(docId) {
  const entry = docs.get(docId);
  if (!entry || entry.updateCount === 0) return null;
  const state = Buffer.from(Y.encodeStateAsUpdate(entry.doc));
  entry.updateCount = 0;
  entry.lastFlush = Date.now();
  return state;
}

function evict(docId) {
  const entry = docs.get(docId);
  if (entry) {
    clearTimeout(entry.timer);
    docs.delete(docId);
  }
}

parentPort.on('message', ({ type, docId, update }) => {
  switch (type) {
    case 'apply': {
      const entry = applyUpdate(docId, update);
      // Reset eviction timer on activity
      clearTimeout(entry.timer);
      parentPort.postMessage({ type: 'updated', docId, count: entry.updateCount });
      break;
    }
    case 'flush': {
      const state = flushAndReset(docId);
      if (state) {
        parentPort.postMessage({ type: 'flush', docId, state });
      }
      break;
    }
    case 'getState': {
      const state = getState(docId);
      parentPort.postMessage({ type: 'state', docId, state });
      break;
    }
    case 'evict': {
      // Flush before evicting
      const state = flushAndReset(docId);
      if (state) {
        parentPort.postMessage({ type: 'flush', docId, state });
      }
      evict(docId);
      break;
    }
  }
});
