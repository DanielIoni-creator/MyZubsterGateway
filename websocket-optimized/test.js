const WebSocketOptimized = require('./src/server');

// Crea il server
const server = new WebSocketOptimized({
  port: 8082,
  batchSize: 10,
  batchInterval: 100
});

// Event listeners
server.on('connection', (client) => {
  console.log(`✅ Client connected: ${client.id}`);
});

server.on('disconnect', (clientId) => {
  console.log(`❌ Client disconnected: ${clientId}`);
});

server.on('message', ({ clientId, data }) => {
  console.log(`📨 Message from ${clientId}:`, data);
});

server.on('error', (err) => {
  console.error('❌ Error:', err.message);
});

// Stats endpoint via HTTP
const express = require('express');
const app = express();

app.get('/api/websocket/stats', (req, res) => {
  res.json(server.getStats());
});

app.listen(8081, () => {
  console.log('📊 Stats endpoint: http://localhost:8081/api/websocket/stats');
});

console.log('🚀 WebSocket Optimized Server running');
console.log(`📡 Port: ${server.port}`);
console.log('📊 Stats port: 8081');

// Gestisci chiusura graceful
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  server.close();
  process.exit(0);
});
