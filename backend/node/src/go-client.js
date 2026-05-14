import { config } from './config.js';

export class GoClient {
  /** Write merged Yjs state to Go backend */
  async putBody(docId, state) {
    try {
      const res = await fetch(`${config.goBackendURL}/api/v1/documents/${docId}/body`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Body-Type': 'yjs_state',
          'Authorization': `Bearer ${config.goInternalToken}`,
        },
        body: state,
      });
      if (!res.ok) {
        console.error(`[go-client] PUT body failed for ${docId}: ${res.status}`);
        return false;
      }
      console.log(`[go-client] flushed ${docId} (${state.length} bytes)`);
      return true;
    } catch (err) {
      console.error(`[go-client] PUT body error for ${docId}:`, err.message);
      return false;
    }
  }
}
