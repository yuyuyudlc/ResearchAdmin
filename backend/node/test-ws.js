import WebSocket from 'ws';
const ws = new WebSocket('ws://localhost:3001/documents/eeaf882e-e56e-4992-aa8e-fff1b16c7d16?token=test-token');
ws.on('open', () => { console.log('Connected'); ws.close(); });
ws.on('error', (err) => { console.error('Error:', err.message); });
ws.on('unexpected-response', (req, res) => { console.error('Unexpected response:', res.statusCode); });
ws.on('close', (code, reason) => { console.log('Closed:', code, reason.toString()); });
