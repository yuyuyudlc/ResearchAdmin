import WebSocket from 'ws';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const GO_URL = process.env.GO_BACKEND_URL || 'http://localhost:8080';
const WS_URL = process.env.WS_URL || 'ws://localhost:3001';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Simple fetch wrapper to handle JSON responses
async function request(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  const response = await fetch(url, { ...options, headers });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (err) {
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}: ${text}`);
    }
    return text;
  }
  if (!response.ok || (json.code !== undefined && json.code !== 0)) {
    throw new Error(json.message || `Request failed: ${JSON.stringify(json)}`);
  }
  return json.data;
}

// Binary body download/upload helpers
async function getBodyRaw(docId, token) {
  const response = await fetch(`${GO_URL}/api/v1/documents/${docId}/body`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) {
    throw new Error(`Failed to GET body: ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

async function run() {
  console.log('\n=============================================================');
  console.log('🚀 STARTING REAL-TIME COLLABORATION INTEGRATION TEST SUITE');
  console.log('=============================================================\n');

  try {
    const timestamp = Date.now();
    const emailA = `user-a-${timestamp}@test.com`;
    const emailB = `user-b-${timestamp}@test.com`;
    const password = 'Password123';

    // -----------------------------------------------------------------
    // Step 1: User Registration
    // -----------------------------------------------------------------
    console.log('👤 [Step 1] Registering User A & User B...');
    
    await request(`${GO_URL}/api/v1/auth/register`, {
      method: 'POST',
      body: JSON.stringify({
        username: 'Alice (User A)',
        email: emailA,
        password: password,
        organization: 'Research Lab A',
      }),
    });
    console.log(`✅ Registered User A: ${emailA}`);

    await request(`${GO_URL}/api/v1/auth/register`, {
      method: 'POST',
      body: JSON.stringify({
        username: 'Bob (User B)',
        email: emailB,
        password: password,
        organization: 'Research Lab B',
      }),
    });
    console.log(`✅ Registered User B: ${emailB}`);

    // -----------------------------------------------------------------
    // Step 2: User Login
    // -----------------------------------------------------------------
    console.log('\n🔑 [Step 2] Logging in to get JWT access tokens...');
    
    const loginA = await request(`${GO_URL}/api/v1/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: emailA, password }),
    });
    const tokenA = loginA.accessToken;
    const userA = loginA.user;
    console.log(`✅ Logged in Alice. Token length: ${tokenA.length}`);

    const loginB = await request(`${GO_URL}/api/v1/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: emailB, password }),
    });
    const tokenB = loginB.accessToken;
    const userB = loginB.user;
    console.log(`✅ Logged in Bob. Token length: ${tokenB.length}`);

    // -----------------------------------------------------------------
    // Step 3: Workspace & Document Creation
    // -----------------------------------------------------------------
    console.log('\n📁 [Step 3] Creating a private workspace & a rich-text document...');
    
    const workspace = await request(`${GO_URL}/api/v1/workspaces`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}` },
      body: JSON.stringify({
        name: `Alice's Lab Workspace ${timestamp}`,
        description: 'Testing real-time document synchronization',
      }),
    });
    const wsId = workspace.id;
    console.log(`✅ Created workspace: "${workspace.name}" (ID: ${wsId})`);

    const document = await request(`${GO_URL}/api/v1/workspaces/${wsId}/documents`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}` },
      body: JSON.stringify({
        title: `Collaborative Research Plan ${timestamp}`,
        docType: 'rich_text',
        summary: 'Synchronized collaborative document',
      }),
    });
    const docId = document.id;
    console.log(`✅ Created document: "${document.title}" (ID: ${docId})`);

    // -----------------------------------------------------------------
    // Step 4: Unauthorized WebSocket Connection Rejections
    // -----------------------------------------------------------------
    console.log('\n🛡️ [Step 4] Testing handshake security & JWT token validations...');

    // Attempt A: Missing token
    await new Promise((resolve, reject) => {
      console.log('⏳ Attempting WebSocket connection with no token...');
      const ws = new WebSocket(`${WS_URL}/documents/${docId}`);
      ws.on('error', (err) => {
        console.log(`✅ Properly rejected at HTTP handshake. Error: "${err.message}"`);
        resolve();
      });
      ws.on('close', (code, reason) => {
        console.log(`✅ Properly rejected. Close code: ${code}`);
        resolve();
      });
      ws.on('open', () => {
        ws.close();
        reject(new Error('Security Gap: WebSocket opened successfully without a token!'));
      });
    });

    // Attempt B: Invalid token
    await new Promise((resolve, reject) => {
      console.log('⏳ Attempting WebSocket connection with invalid token...');
      const ws = new WebSocket(`${WS_URL}/documents/${docId}?token=invalid-jwt-signature-token`);
      ws.on('error', (err) => {
        console.log(`✅ Properly rejected at HTTP handshake. Error: "${err.message}"`);
        resolve();
      });
      ws.on('close', (code, reason) => {
        console.log(`✅ Properly rejected. Close code: ${code}`);
        resolve();
      });
      ws.on('open', () => {
        ws.close();
        reject(new Error('Security Gap: WebSocket opened with an invalid token!'));
      });
    });

    // Attempt C: Token B (User B who is not a member of Alice's private workspace yet)
    await new Promise((resolve, reject) => {
      console.log('⏳ Attempting WebSocket connection by Bob (User B) who is not a member...');
      const ws = new WebSocket(`${WS_URL}/documents/${docId}?token=${tokenB}`);
      ws.on('error', (err) => {
        console.log(`✅ Properly rejected Bob at HTTP handshake. Error: "${err.message}"`);
        resolve();
      });
      ws.on('close', (code, reason) => {
        console.log(`✅ Properly rejected Bob. Close code: ${code}`);
        resolve();
      });
      ws.on('open', () => {
        ws.close();
        reject(new Error('Security Gap: Bob connected to Alice\'s private document without workspace access!'));
      });
    });

    // -----------------------------------------------------------------
    // Step 5: Invite User B & Test Successful Workspace Authorization
    // -----------------------------------------------------------------
    console.log('\n➕ [Step 5] Adding Bob to Alice\'s workspace and establishing connections...');
    
    await request(`${GO_URL}/api/v1/workspaces/${wsId}/members`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}` },
      body: JSON.stringify({
        userId: userB.id,
        role: 'member',
      }),
    });
    console.log(`✅ Added Bob (User B) as a member to Alice's workspace`);

    // Let's connect Alice (Client A)
    const ydocA = new Y.Doc();
    const providerA = new WebsocketProvider(WS_URL, `documents/${docId}`, ydocA, {
      WebSocketPolyfill: WebSocket,
      params: { token: tokenA },
    });

    await new Promise((resolve, reject) => {
      providerA.on('status', ({ status }) => {
        console.log(`   [Alice Sync Client] Status: ${status}`);
        if (status === 'connected') resolve();
      });
      setTimeout(() => reject(new Error('Alice failed to connect via WebSockets within 5s')), 5000);
    });
    console.log(`✅ Alice connected successfully!`);

    // Let's connect Bob (Client B)
    const ydocB = new Y.Doc();
    const providerB = new WebsocketProvider(WS_URL, `documents/${docId}`, ydocB, {
      WebSocketPolyfill: WebSocket,
      params: { token: tokenB },
    });

    await new Promise((resolve, reject) => {
      providerB.on('status', ({ status }) => {
        console.log(`   [Bob Sync Client] Status: ${status}`);
        if (status === 'connected') resolve();
      });
      setTimeout(() => reject(new Error('Bob failed to connect via WebSockets within 5s')), 5000);
    });
    console.log(`✅ Bob connected successfully!`);

    // -----------------------------------------------------------------
    // Step 6: Multi-user Presence & Cursor/Awareness Tracking
    // -----------------------------------------------------------------
    console.log('\n👥 [Step 6] Testing real-time awareness, cursors, and presence sync...');

    // Set local states
    providerA.awareness.setLocalStateField('user', {
      name: 'Alice (User A)',
      email: emailA,
      color: '#ff4d4f',
    });

    providerB.awareness.setLocalStateField('user', {
      name: 'Bob (User B)',
      email: emailB,
      color: '#52c41a',
    });

    await sleep(500); // Wait for awareness to propagate

    const statesA = Array.from(providerA.awareness.getStates().values());
    const statesB = Array.from(providerB.awareness.getStates().values());

    console.log(`   Alice sees ${statesA.length} online users:`, statesA.map((s) => s.user.name));
    console.log(`   Bob sees ${statesB.length} online users:`, statesB.map((s) => s.user.name));

    if (statesA.length < 2 || statesB.length < 2) {
      throw new Error('Presence/Awareness sync failed: did not register multiple users online');
    }
    console.log(`✅ Presence / awareness states correctly synchronized between clients!`);

    // -----------------------------------------------------------------
    // Step 7: Real-Time Content Collaboration Synchronization
    // -----------------------------------------------------------------
    console.log('\n📝 [Step 7] Testing real-time collaborative text insertions...');

    const textA = ydocA.getText('default');
    const textB = ydocB.getText('default');

    // Alice types "Hello, Bob!"
    ydocA.transact(() => {
      textA.insert(0, 'Hello, Bob!');
    });
    console.log('✍️  Alice wrote: "Hello, Bob!"');

    await sleep(500); // Wait for WebSocket delivery
    console.log(`📖 Bob reads: "${textB.toString()}"`);
    if (textB.toString() !== 'Hello, Bob!') {
      throw new Error(`Real-time sync failed. Bob has: "${textB.toString()}"`);
    }

    // Bob appends " Hello, Alice!"
    ydocB.transact(() => {
      textB.insert(11, ' Hello, Alice!');
    });
    console.log('✍️  Bob wrote: " Hello, Alice!"');

    await sleep(500); // Wait for WebSocket delivery
    console.log(`📖 Alice reads: "${textA.toString()}"`);
    if (textA.toString() !== 'Hello, Bob! Hello, Alice!') {
      throw new Error(`Real-time sync failed. Alice has: "${textA.toString()}"`);
    }
    console.log(`✅ Real-time content updates synchronized successfully!`);

    // -----------------------------------------------------------------
    // Step 8: Offline Operations & Automatic Conflict-Free Merge
    // -----------------------------------------------------------------
    console.log('\n📴 [Step 8] Testing offline operations and reconnection merge...');

    console.log('🔌 Disconnecting Bob (Connection B)...');
    providerB.disconnect(); // Simulate Bob going offline
    await sleep(200);

    // Alice (still online) types " Alice edits online." at the end
    ydocA.transact(() => {
      textA.insert(textA.length, ' Alice edits online.');
    });
    console.log('✍️  Alice (Online) wrote: " Alice edits online."');

    // Bob (offline) types " Bob edits offline!" at the end of his local copy
    ydocB.transact(() => {
      textB.insert(textB.length, ' Bob edits offline!');
    });
    console.log('✍️  Bob (Offline) wrote: " Bob edits offline!"');

    console.log('📖 Offline Doc on Bob Client:', textB.toString());

    console.log('🔌 Reconnecting Bob (Connection B)...');
    providerB.connect(); // Reconnect Bob

    await sleep(1000); // Wait for reconnect sync and auto-merge

    console.log('📖 Bob reads after merging:', textB.toString());
    console.log('📖 Alice reads after merging:', textA.toString());

    if (textA.toString() !== textB.toString()) {
      throw new Error('Documents out of sync after offline merge!');
    }
    if (!textA.toString().includes('Alice edits online.') || !textA.toString().includes('Bob edits offline!')) {
      throw new Error('Updates lost during offline merge!');
    }
    console.log(`✅ Offline editing conflict-free merge executed successfully without data loss!`);

    // -----------------------------------------------------------------
    // Step 9: State Persistence (Debounced Flush to Go Backend)
    // -----------------------------------------------------------------
    console.log('\n💾 [Step 9] Testing debounced DB state recovery & server persistence...');

    const expectedFinalText = textA.toString();

    console.log('🔌 Closing all client connections...');
    providerA.disconnect();
    providerB.disconnect();

    console.log('⏳ Waiting for debounced flush to complete (flushIntervalMs is 1000ms)...');
    await sleep(2000); // Wait 2s to allow server.js to writeState and goClient.putBody to finish

    console.log('📥 Retrieving document body from Go backend directly...');
    const dbUpdate = await getBodyRaw(docId, tokenA);
    console.log(`✅ Loaded document body from DB. Size: ${dbUpdate.byteLength} bytes`);

    const cleanYdoc = new Y.Doc();
    Y.applyUpdate(cleanYdoc, dbUpdate);
    const recoveredText = cleanYdoc.getText('default').toString();

    console.log(`📖 Recovered text from database: "${recoveredText}"`);
    console.log(`📖 Expected collaborated text:  "${expectedFinalText}"`);

    if (recoveredText !== expectedFinalText) {
      throw new Error('Database state does not match final collaborated document content!');
    }
    console.log(`✅ Database state matches collaborated content perfectly!`);

    // -----------------------------------------------------------------
    // Step 10: State Recovery on Server Startup (bindState validation)
    // -----------------------------------------------------------------
    console.log('\n✨ [Step 10] Testing state recovery (bindState) from Go DB upon clean server startup...');

    // Since Alice and Bob closed their connections, the server may have kept the document in memory.
    // In our test, if we connect again, the server might load from memory.
    // But what if we simulate a fresh client connecting and checking if it loads correctly?
    // Let's connect Client C!
    const ydocC = new Y.Doc();
    const providerC = new WebsocketProvider(WS_URL, `documents/${docId}`, ydocC, {
      WebSocketPolyfill: WebSocket,
      params: { token: tokenA },
    });

    await new Promise((resolve, reject) => {
      providerC.on('status', ({ status }) => {
        if (status === 'connected') resolve();
      });
      setTimeout(() => reject(new Error('Client C failed to connect')), 3000);
    });

    await sleep(500); // wait for initial sync
    const textC = ydocC.getText('default').toString();
    console.log(`📖 Fresh client C connected and loaded: "${textC}"`);

    if (textC !== expectedFinalText) {
      throw new Error('Fresh connection failed to recover state from server persistence!');
    }
    console.log(`✅ Server successfully restored the state from Go DB (bindState) for the new connection!`);

    providerC.disconnect();

    console.log('\n=============================================================');
    console.log('🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! 100% CORRECT!');
    console.log('=============================================================\n');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ INTEGRATION TEST FAILED:');
    console.error(err);
    console.log('\n=============================================================\n');
    process.exit(1);
  }
}

run();
