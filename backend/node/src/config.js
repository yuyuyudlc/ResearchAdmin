export const config = {
  port: 3001,
  // Go backend for writing merged snapshots
  goBackendURL: process.env.GO_BACKEND_URL || 'http://localhost:8080',
  // Internal token for calling Go APIs
  goInternalToken: process.env.GO_INTERNAL_TOKEN || 'internal-secret',
  // Flush strategy
  flushIntervalMs: 1000,       // flush every 1s
  flushUpdateCount: 5,         // or every 5 updates, whichever first
  // Cleanup: evict YDoc from memory after idle
  evictAfterMs: 5 * 60 * 1000, // 5 minutes
  // Worker pool: number of merge workers
  workerCount: parseInt(process.env.WORKER_COUNT || '4', 10),
};
