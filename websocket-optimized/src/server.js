const WebSocket = require('ws');
const EventEmitter = require('events');
const crypto = require('crypto');

class WebSocketOptimized extends EventEmitter {
  constructor(options = {}) {
    super();
    this.port = options.port || 8080;
    this.clients = new Map();
    this.topics = new Map();
    this.messageQueue = [];
    this.isProcessing = false;
    this.batchSize = options.batchSize || 10;
    this.batchInterval = options.batchInterval || 100;
    
    this.init();
  }

  init() {
    this.wss = new WebSocket.Server({ 
      port: this.port,
      perMessageDeflate: true,
      maxPayload: 1024 * 1024
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    this.wss.on('error', (err) => this.emit('error', err));
    
    // Avvia il processore batch
    this.startBatchProcessor();
    
    console.log(`✅ WebSocket server running on port ${this.port}`);
  }

  handleConnection(ws, req) {
    const clientId = crypto.randomBytes(16).toString('hex');
    const clientInfo = {
      id: clientId,
      ws,
      topics: new Set(),
      connectedAt: Date.now(),
      lastPing: Date.now(),
      ip: req.socket.remoteAddress
    };

    this.clients.set(clientId, clientInfo);
    this.emit('connection', clientInfo);

    // Ping per mantenere la connessione
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
        clientInfo.lastPing = Date.now();
      } else {
        clearInterval(pingInterval);
        this.handleDisconnect(clientId);
      }
    }, 30000);

    ws.on('message', (data) => this.handleMessage(clientId, data));
    ws.on('close', () => {
      clearInterval(pingInterval);
      this.handleDisconnect(clientId);
    });
    ws.on('error', (err) => this.emit('error', err));

    // Invia messaggio di benvenuto
    this.sendToClient(clientId, {
      type: 'connected',
      clientId,
      timestamp: new Date().toISOString()
    });
  }

  handleMessage(clientId, rawData) {
    try {
      const data = JSON.parse(rawData);
      const client = this.clients.get(clientId);
      
      if (!client) return;

      // Gestisci topic subscription
      if (data.type === 'subscribe' && data.topic) {
        client.topics.add(data.topic);
        if (!this.topics.has(data.topic)) {
          this.topics.set(data.topic, new Set());
        }
        this.topics.get(data.topic).add(clientId);
        
        this.sendToClient(clientId, {
          type: 'subscribed',
          topic: data.topic,
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (data.type === 'unsubscribe' && data.topic) {
        client.topics.delete(data.topic);
        if (this.topics.has(data.topic)) {
          this.topics.get(data.topic).delete(clientId);
        }
        this.sendToClient(clientId, {
          type: 'unsubscribed',
          topic: data.topic,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Inoltra il messaggio se ha un topic
      if (data.topic) {
        this.broadcastToTopic(data.topic, data.payload || data, clientId);
      }

      // Emetti evento per il messaggio
      this.emit('message', { clientId, data });

    } catch (err) {
      this.emit('error', err);
    }
  }

  handleDisconnect(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Rimuovi da tutti i topic
    for (const [topic, clients] of this.topics) {
      clients.delete(clientId);
    }

    this.clients.delete(clientId);
    this.emit('disconnect', clientId);
  }

  broadcastToTopic(topic, data, excludeClientId = null) {
    const topicClients = this.topics.get(topic);
    if (!topicClients) return;

    const message = JSON.stringify({
      topic,
      data,
      timestamp: new Date().toISOString()
    });

    for (const clientId of topicClients) {
      if (clientId === excludeClientId) continue;
      this.sendToClient(clientId, message, true);
    }
  }

  sendToClient(clientId, data, raw = false) {
    const client = this.clients.get(clientId);
    if (!client) return false;

    try {
      if (client.ws.readyState === WebSocket.OPEN) {
        const message = raw ? data : JSON.stringify(data);
        client.ws.send(message);
        return true;
      }
    } catch (err) {
      this.emit('error', err);
    }
    return false;
  }

  // Sistema di batch processing per messaggi
  startBatchProcessor() {
    setInterval(() => {
      if (this.messageQueue.length === 0 || this.isProcessing) return;
      
      this.isProcessing = true;
      const batch = this.messageQueue.splice(0, this.batchSize);
      
      for (const { clientId, message } of batch) {
        this.sendToClient(clientId, message);
      }
      
      this.isProcessing = false;
    }, this.batchInterval);
  }

  queueMessage(clientId, message) {
    this.messageQueue.push({ clientId, message });
  }

  // Statistiche
  getStats() {
    return {
      clients: this.clients.size,
      topics: this.topics.size,
      queueSize: this.messageQueue.length,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
  }

  close() {
    this.wss.close();
    this.clients.clear();
    this.topics.clear();
    this.messageQueue = [];
  }
}

module.exports = WebSocketOptimized;
