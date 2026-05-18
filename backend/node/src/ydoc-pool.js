import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { config } from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class YDocPool {
  constructor(flushCallback) {
    this.workers = [];
    this.flushCallback = flushCallback;
    this._init();
  }

  _init() {
    for (let i = 0; i < config.workerCount; i++) {
      const worker = new Worker(resolve(__dirname, 'ydoc-worker.js'));
      worker.on('message', (msg) => this._onWorkerMessage(worker, msg));
      this.workers.push(worker);
    }
    console.log(`[pool] ${this.workers.length} merge workers started`);
  }

  _hash(docId) {
    let hash = 0;
    for (let i = 0; i < docId.length; i++) {
      hash = ((hash << 5) - hash) + docId.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  _getWorker(docId) {
    return this.workers[this._hash(docId) % this.workers.length];
  }

  /** Apply an update to the YDoc for a given document */
  applyUpdate(docId, update) {
    this._getWorker(docId).postMessage({ type: 'apply', docId, update });
  }

  /** Get current state (used for new client sync) */
  getState(docId) {
    this._getWorker(docId).postMessage({ type: 'getState', docId });
  }

  /** Flush a specific document to Go */
  flush(docId) {
    this._getWorker(docId).postMessage({ type: 'flush', docId });
  }

  /** Evict idle document from memory */
  evict(docId) {
    this._getWorker(docId).postMessage({ type: 'evict', docId });
  }

  _onWorkerMessage(worker, msg) {
    if (msg.type === 'flush' && msg.state) {
      this.flushCallback(msg.docId, msg.state);
    }
  }
}
