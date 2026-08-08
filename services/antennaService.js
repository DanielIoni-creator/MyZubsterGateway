// services/antennaService.js — Antenna Protocol Gateway Integration — Bounty #787
const mongoose = require('mongoose');
const EventEmitter = require('events');

class AntennaService extends EventEmitter {
  constructor() {
    super();
    this.nodes = new Map(); // In-memory store for real-time status
    this.commandQueue = new Map();
  }

  // Registra un nodo antenna
  registerNode({ nodeId, type, location, capabilities = [] }) {
    if (!nodeId || !type) throw new Error('Missing nodeId or type');
    
    const node = {
      nodeId,
      type,
      location: location || {},
      capabilities,
      status: 'online',
      lastPing: Date.now(),
      registeredAt: Date.now(),
      activeCommands: [],
      metadata: {}
    };
    
    this.nodes.set(nodeId, node);
    this.emit('node:registered', node);
    console.log('[Antenna] Nodo registrato:', nodeId, 'type:', type);
    return node;
  }

  // Aggiorna stato nodo
  updateNodeStatus(nodeId, status, metadata = {}) {
    const node = this.nodes.get(nodeId);
    if (!node) throw new Error('Nodo antenna non trovato: ' + nodeId);
    
    node.status = status;
    node.lastPing = Date.now();
    node.metadata = { ...node.metadata, ...metadata };
    
    if (status === 'offline') {
      this.emit('node:offline', node);
    }
    return node;
  }

  // Invia comando a un nodo
  async sendCommand(nodeId, command, params = {}) {
    const node = this.nodes.get(nodeId);
    if (!node) throw new Error('Nodo antenna non trovato: ' + nodeId);
    if (node.status !== 'online') throw new Error('Nodo antenna offline: ' + nodeId);
    
    const cmd = {
      commandId: 'cmd_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      command,
      params,
      status: 'pending',
      createdAt: Date.now(),
      nodeId
    };
    
    this.commandQueue.set(cmd.commandId, cmd);
    node.activeCommands.push(cmd.commandId);
    
    console.log('[Antenna] Comando inviato a', nodeId, ':', command);
    this.emit('command:sent', cmd);
    
    // Simula completamento comando dopo 2 secondi (in produzione: MQTT/WS callback)
    setTimeout(() => {
      cmd.status = 'completed';
      cmd.completedAt = Date.now();
      this.emit('command:completed', cmd);
    }, 2000);
    
    return cmd;
  }

  // Ottieni stato di tutti i nodi
  getAllNodes() {
    return [...this.nodes.values()].map(n => ({
      nodeId: n.nodeId,
      type: n.type,
      status: n.status,
      location: n.location,
      lastPing: n.lastPing,
      uptime: Date.now() - n.registeredAt
    }));
  }

  // Ottieni stato di un nodo specifico
  getNodeStatus(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) throw new Error('Nodo antenna non trovato: ' + nodeId);
    return {
      ...node,
      uptime: Date.now() - node.registeredAt,
      activeCommandsCount: node.activeCommands.length
    };
  }

  // Heartbeat
  pingNode(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) throw new Error('Nodo antenna non trovato: ' + nodeId);
    node.lastPing = Date.now();
    if (node.status === 'offline') node.status = 'online';
    return { status: node.status, lastPing: node.lastPing };
  }

  // Dashboard antenna
  getDashboard() {
    const all = [...this.nodes.values()];
    return {
      totalNodes: all.length,
      onlineNodes: all.filter(n => n.status === 'online').length,
      offlineNodes: all.filter(n => n.status === 'offline').length,
      pendingCommands: [...this.commandQueue.values()].filter(c => c.status === 'pending').length,
      nodesByType: all.reduce((acc, n) => { acc[n.type] = (acc[n.type] || 0) + 1; return acc; }, {}),
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new AntennaService();
