import { config } from './config.js';

export class GoClient {
  /** Fetch raw document Yjs state from Go backend */
  async getBody(docId) {
    try {
      const res = await fetch(`${config.goBackendURL}/api/v1/documents/${docId}/body`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.goInternalToken}`,
        },
      });
      if (!res.ok) {
        if (res.status === 404) {
          return new Uint8Array(0);
        }
        console.error(`[go-client] GET body failed for ${docId}: ${res.status}`);
        return null;
      }
      const buffer = await res.arrayBuffer();
      return new Uint8Array(buffer);
    } catch (err) {
      console.error(`[go-client] GET body error for ${docId}:`, err.message);
      return null;
    }
  }

  /** Check user permission for document */
  async checkPermission(docId, userToken) {
    try {
      const res = await fetch(`${config.goBackendURL}/api/v1/documents/${docId}/my-permission`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
      });
      if (!res.ok) {
        console.error(`[go-client] checkPermission failed for ${docId}: ${res.status}`);
        return { canRead: false, canEdit: false };
      }
      const body = await res.json();
      if (body.code === 0 && body.data) {
        return {
          canRead: body.data.canRead || false,
          canEdit: body.data.canEdit || false,
        };
      }
      return { canRead: false, canEdit: false };
    } catch (err) {
      console.error(`[go-client] checkPermission error for ${docId}:`, err.message);
      return { canRead: false, canEdit: false };
    }
  }

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
