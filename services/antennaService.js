const crypto = require('node:crypto');
const EventEmitter = require('node:events');

const NODE_TIMEOUT_MS = 120_000;
const MAX_PAYLOAD_SIZE_BYTES = 65536; // 64KB
const ALLOWED_MESSAGE_TYPES = new Set(['register', 'heartbeat', 'data', 'command', 'status', 'ack']);

// --- Schema validation ---
function validateMessage(msg) {
  if (!msg || typeof msg !== 'object') return { valid: false, error: 'Message must be an object' };
  if (!msg.type || !ALLOWED_MESSAGE_TYPES.has(msg.type)) {
    return { valid: false, error: `Invalid or missing type. Allowed: ${[...ALLOWED_MESSAGE_TYPES].join(', ')}` };
  }
  if (!msg.nodeId || typeof msg.nodeId !== 'string' || msg.nodeId.length > 128) {
    return { valid: false, error: 'Invalid nodeId' };
  }
  if (msg.timestamp && (typeof msg.timestamp !== 'number' || msg.timestamp > Date.now() + 60_000)) {
    return { valid: false, error: 'Invalid timestamp (future or non-numeric)' };
  }
  return { valid: true };
}

function validatePayloadSize(payload) {
  const size = Buffer.byteLength(JSON.stringify(payload), 'utf8');
  if (size > MAX_PAYLOAD_SIZE_BYTES) {
    return { valid: false, error: `Payload too large: ${size} bytes (max ${MAX_PAYLOAD_SIZE_BYTES})` };
  }
  return { valid: true };
}

// --- Memory Node Registry ---
class MemoryNodeRegistry {
  constructor() {
    this.nodes = new Map(); // nodeId -> { id, type, protocol, address, status, lastPing, capabilities, metadata, registeredAt }
  }

  async register(node) {
    const existing = this.nodes.get(node.id);
    const entry = {
      ...node,
      status: 'active',
      lastPing: Date.now(),
      registeredAt: existing ? existing.registeredAt : Date.now(),
    };
    this.nodes.set(node.id, entry);
    return entry;
  }

  async get(nodeId) { return this.nodes.get(nodeId) || null; }

  async list({ status, type } = {}) {
    let items = [...this.nodes.values()];
    if (status) items = items.filter(n => n.status === status);
    if (type) items = items.filter(n => n.type === type);
    return items.sort((a, b) => b.lastPing - a.lastPing);
  }

  async updateHeartbeat(nodeId) {
    const node = this.nodes.get(nodeId);
    if (node) { node.lastPing = Date.now(); node.status = 'active'; }
  }

  async remove(nodeId) {
    const node = this.nodes.get(nodeId);
    if (node) { node.status = 'removed'; node.removedAt = Date.now(); }
    return node || null;
  }

  async getInactiveNodes(timeout = NODE_TIMEOUT_MS) {
    const now = Date.now();
    const inactive = [];
    for (const [, node] of this.nodes) {
      if (node.status === 'active' && (now - node.lastPing) > timeout) {
        node.status = 'inactive';
        inactive.push(node);
      }
    }
    return inactive;
  }
}

// --- Mongo Node Registry ---
class MongoNodeRegistry {
  constructor(model) { this.model = model; }

  async register(node) {
    const saved = await this.model.findOneAndUpdate(
      { id: node.id },
      { ...node, status: 'active', lastPing: Date.now(), updatedAt: new Date() },
      { upsert: true, new: true, lean: true, setDefaultsOnInsert: true }
    );
    return this._strip(saved);
  }

  async get(nodeId) { return this._strip(await this.model.findOne({ id: nodeId }).lean()); }

  async list({ status, type } = {}) {
    const q = {};
    if (status) q.status = status;
    if (type) q.type = type;
    return (await this.model.find(q).sort({ lastPing: -1 }).lean()).map(d => this._strip(d));
  }

  async updateHeartbeat(nodeId) {
    await this.model.updateOne({ id: nodeId }, { $set: { lastPing: Date.now(), status: 'active', updatedAt: new Date() } });
  }

  async getInactiveNodes(timeout = NODE_TIMEOUT_MS) {
    const cutoff = Date.now() - timeout;
    return (await this.model.find({ status: 'active', lastPing: { $lt: cutoff } }).lean()).map(d => this._strip(d));
  }

  _strip(doc) { if (!doc) return null; const { _id, __v, ...rest } = doc; return rest; }
}

// --- Antenna Service ---
class AntennaService extends EventEmitter {
  /**
   * @param {Object} opts
   * @param {Object} opts.registry - node registry (MemoryNodeRegistry or MongoNodeRegistry)
   * @param {Object} [opts.mqttClient] - optional MQTT client instance
   * @param {Object} [opts.wsServer] - optional WebSocket server instance
   */
  constructor({ registry, mqttClient, wsServer } = {}) {
    super();
    this.registry = registry || new MemoryNodeRegistry();
    this.mqtt = mqttClient;
    this.ws = wsServer;
    this._handlers = new Map();
    this._heartbeatTimer = null;
    this._setupTransport();
  }

  _setupTransport() {
    if (this.mqtt) {
      this.mqtt.on('message', (topic, payload) => {
        try {
          const msg = JSON.parse(payload.toString());
          this._handleIncoming('mqtt', topic, msg);
        } catch (_) { /* ignore malformed */ }
      });
    }
    // WebSocket handling is set up externally via onWsMessage()
  }

  /**
   * Process an incoming message from any transport.
   * @param {string} transport - 'mqtt' or 'ws'
   * @param {string} topic - MQTT topic or WS channel
   * @param {Object} message - parsed JSON message
   */
  async _handleIncoming(transport, topic, message) {
    const validation = validateMessage(message);
    if (!validation.valid) {
      this.emit('error', { transport, topic, error: validation.error });
      return;
    }

    const sizeCheck = validatePayloadSize(message);
    if (!sizeCheck.valid) {
      this.emit('error', { transport, topic, error: sizeCheck.error });
      return;
    }

    switch (message.type) {
      case 'register':
        await this.registerNode({
          id: message.nodeId,
          type: message.deviceType || 'generic',
          protocol: message.protocol || transport,
          address: message.address || topic,
          capabilities: message.capabilities || [],
          metadata: message.metadata || {},
        });
        this.emit('node:registered', { nodeId: message.nodeId });
        break;

      case 'heartbeat':
        await this.heartbeat(message.nodeId, message.metrics);
        break;

      case 'data':
        this.emit('data', { nodeId: message.nodeId, payload: message.payload, timestamp: message.timestamp });
        break;

      case 'status':
        this.emit('status', { nodeId: message.nodeId, status: message.status, details: message.details });
        break;

      default:
        this.emit('message', { nodeId: message.nodeId, type: message.type, payload: message });
    }
  }

  /**
   * Handle WebSocket messages (call this from your WS server handler).
   */
  onWsMessage(ws, rawData) {
    try {
      const msg = JSON.parse(rawData.toString());
      this._handleIncoming('ws', ws._antennaChannel || 'default', msg);
    } catch (_) { /* ignore */ }
  }

  /**
   * Register an IoT/sensor node.
   */
  async registerNode({ id, type, protocol, address, capabilities, metadata }) {
    const node = await this.registry.register({
      id,
      type: type || 'generic',
      protocol: protocol || 'mqtt',
      address: address || '',
      capabilities: capabilities || [],
      metadata: metadata || {},
    });
    return node;
  }

  /**
   * Process heartbeat ping from a node.
   */
  async heartbeat(nodeId, metrics = {}) {
    const node = await this.registry.get(nodeId);
    if (!node) {
      return { status: 'unknown', nodeId, error: 'Node not registered' };
    }
    await this.registry.updateHeartbeat(nodeId);
    return { status: 'ok', nodeId, timestamp: Date.now() };
  }

  /**
   * Get status for a specific node or all nodes.
   */
  async getStatus(nodeId) {
    if (nodeId) {
      const node = await this.registry.get(nodeId);
      if (!node) return null;
      return {
        id: node.id,
        type: node.type,
        protocol: node.protocol,
        status: node.status,
        lastPing: node.lastPing,
        uptime: node.status === 'active' ? Date.now() - node.registeredAt : 0,
        capabilities: node.capabilities,
        metadata: node.metadata,
      };
    }

    const nodes = await this.registry.list();
    const inactive = await this.registry.getInactiveNodes();
    return {
      total: nodes.length,
      active: nodes.filter(n => n.status === 'active').length,
      inactive: inactive.length,
      nodes: nodes.map(n => ({
        id: n.id,
        type: n.type,
        status: n.status,
        lastPing: n.lastPing,
      })),
    };
  }

  /**
   * List all registered nodes.
   */
  async listNodes(filter = {}) {
    return this.registry.list(filter);
  }

  /**
   * Send a command to a node via configured transport.
   */
  async sendCommand(nodeId, command, params = {}) {
    const node = await this.registry.get(nodeId);
    if (!node) throw new Error(`Node not found: ${nodeId}`);

    const message = {
      type: 'command',
      nodeId: 'gateway',
      targetNodeId: nodeId,
      command,
      params,
      timestamp: Date.now(),
      messageId: crypto.randomUUID(),
    };

    const payload = JSON.stringify(message);

    if (node.protocol === 'mqtt' && this.mqtt) {
      await this.mqtt.publishAsync(`antenna/${nodeId}/command`, payload, { qos: 1 });
    } else if (node.protocol === 'ws' && this.ws) {
      // WebSocket broadcast to matching client (implemented by wsServer consumer)
      this.ws.emit('antenna:command', { targetNodeId: nodeId, payload: message });
    }

    this.emit('command:sent', { nodeId, command, messageId: message.messageId });
    return { sent: true, messageId: message.messageId, nodeId, command };
  }

  /**
   * Start automatic inactive node detection.
   */
  startHeartbeatMonitor(intervalMs = 60_000) {
    if (this._heartbeatTimer) return;
    this._heartbeatTimer = setInterval(async () => {
      const inactive = await this.registry.getInactiveNodes();
      for (const node of inactive) {
        this.emit('node:inactive', { nodeId: node.id, lastPing: node.lastPing });
      }
    }, intervalMs);
  }

  stopHeartbeatMonitor() {
    if (this._heartbeatTimer) { clearInterval(this._heartbeatTimer); this._heartbeatTimer = null; }
  }
}

module.exports = { AntennaService, MemoryNodeRegistry, MongoNodeRegistry, validateMessage, validatePayloadSize };
