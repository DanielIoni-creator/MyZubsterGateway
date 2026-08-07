const crypto = require('node:crypto');
const { WebSocketServer } = require('ws');

const CHANNEL_PATTERN = /^[a-z][a-z0-9]*:[A-Za-z0-9_*-]+$/;

// In-process pub/sub. Business services publish here and stay unaware that a
// socket transport exists, so the same events can later feed SSE, a queue or
// an outbound webhook without touching the publisher.
class EventBus {
  constructor() { this.handlers = new Set(); }
  subscribe(handler) { this.handlers.add(handler); return () => this.handlers.delete(handler); }
  publish(channel, event) {
    for (const handler of this.handlers) handler(channel, event);
    return this.handlers.size;
  }
}

class ChannelRegistry {
  constructor() { this.byConnection = new Map(); }
  register(connectionId) { if (!this.byConnection.has(connectionId)) this.byConnection.set(connectionId, new Set()); }
  drop(connectionId) { this.byConnection.delete(connectionId); }
  add(connectionId, channel) { this.register(connectionId); this.byConnection.get(connectionId).add(channel); }
  remove(connectionId, channel) { this.byConnection.get(connectionId)?.delete(channel); }
  channelsOf(connectionId) { return [...(this.byConnection.get(connectionId) || [])]; }
  subscribersOf(channel) {
    return [...this.byConnection.entries()]
      .filter(([, channels]) => channels.has(channel))
      .map(([connectionId]) => connectionId);
  }
  get size() { return this.byConnection.size; }
}

// `public:*` is readable by anyone; every other channel is scoped to its owner,
// so subscribing to another user's channel is refused rather than silently
// accepted and then never delivered.
function defaultAuthorize(channel, connection) {
  if (!CHANNEL_PATTERN.test(channel)) return false;
  const [namespace, scope] = channel.split(':');
  if (namespace === 'public') return true;
  return Boolean(connection.userId) && scope === connection.userId;
}

class RealtimeService {
  constructor({ bus = new EventBus(), authorize = defaultAuthorize, heartbeatMs = 30000, maxBufferedBytes = 1 << 20, clock = () => new Date(), idGenerator = () => crypto.randomUUID() } = {}) {
    this.bus = bus;
    this.authorize = authorize;
    this.heartbeatMs = heartbeatMs;
    this.maxBufferedBytes = maxBufferedBytes;
    this.clock = clock;
    this.idGenerator = idGenerator;
    this.registry = new ChannelRegistry();
    this.connections = new Map();
    this.wss = null;
    this.heartbeat = null;
    this.unsubscribeBus = this.bus.subscribe((channel, event) => this.fanout(channel, event));
  }

  attach(server, { path = '/ws' } = {}) {
    this.wss = new WebSocketServer({ server, path });
    this.wss.on('connection', (socket, request) => this.onConnection(socket, request));
    this.heartbeat = setInterval(() => this.sweep(), this.heartbeatMs);
    if (this.heartbeat.unref) this.heartbeat.unref();
    return this;
  }

  onConnection(socket, request) {
    const query = new URL(request.url, 'http://localhost').searchParams;
    const connection = { id: this.idGenerator(), socket, userId: query.get('userId') || null, alive: true, connectedAt: this.clock().toISOString() };
    this.connections.set(connection.id, connection);
    this.registry.register(connection.id);

    socket.on('pong', () => { connection.alive = true; });
    socket.on('message', (raw) => this.onMessage(connection, raw));
    socket.on('close', () => { this.connections.delete(connection.id); this.registry.drop(connection.id); });
    socket.on('error', () => { try { socket.terminate(); } catch { /* already gone */ } });

    this.send(connection, { type: 'welcome', connectionId: connection.id, userId: connection.userId, at: connection.connectedAt });
  }

  onMessage(connection, raw) {
    let message;
    try { message = JSON.parse(raw.toString()); }
    catch { return this.send(connection, { type: 'error', error: 'payload must be JSON' }); }

    const channels = Array.isArray(message.channels) ? message.channels : [];
    switch (message.action) {
      case 'subscribe': {
        const accepted = [];
        const rejected = [];
        for (const channel of channels) {
          if (this.authorize(channel, connection)) { this.registry.add(connection.id, channel); accepted.push(channel); }
          else rejected.push(channel);
        }
        return this.send(connection, { type: 'subscribed', accepted, rejected });
      }
      case 'unsubscribe': {
        for (const channel of channels) this.registry.remove(connection.id, channel);
        return this.send(connection, { type: 'unsubscribed', channels });
      }
      case 'list':
        return this.send(connection, { type: 'subscriptions', channels: this.registry.channelsOf(connection.id) });
      case 'ping':
        return this.send(connection, { type: 'pong', at: this.clock().toISOString() });
      default:
        return this.send(connection, { type: 'error', error: `unknown action: ${message.action ?? 'none'}` });
    }
  }

  publish(channel, event) {
    return this.bus.publish(channel, event);
  }

  fanout(channel, event) {
    const payload = { type: 'event', channel, event, at: this.clock().toISOString() };
    let delivered = 0;
    for (const connectionId of this.registry.subscribersOf(channel)) {
      const connection = this.connections.get(connectionId);
      if (connection && this.send(connection, payload)) delivered += 1;
    }
    return delivered;
  }

  // One stalled reader must not stall everyone else, so a connection whose
  // buffer has run away is dropped rather than queued indefinitely.
  send(connection, payload) {
    const socket = connection.socket;
    if (!socket || socket.readyState !== socket.OPEN) return false;
    if (socket.bufferedAmount > this.maxBufferedBytes) { this.close(connection, 1013, 'client too slow'); return false; }
    socket.send(JSON.stringify(payload));
    return true;
  }

  sweep() {
    for (const connection of this.connections.values()) {
      if (!connection.alive) { this.close(connection, 1001, 'heartbeat timeout'); continue; }
      connection.alive = false;
      try { connection.socket.ping(); } catch { this.close(connection, 1011, 'ping failed'); }
    }
  }

  close(connection, code, reason) {
    this.connections.delete(connection.id);
    this.registry.drop(connection.id);
    try { connection.socket.close(code, reason); } catch { /* already gone */ }
  }

  stats() {
    const channels = new Map();
    for (const list of this.registry.byConnection.values()) {
      for (const channel of list) channels.set(channel, (channels.get(channel) || 0) + 1);
    }
    return {
      connections: this.connections.size,
      channels: [...channels.entries()].map(([channel, subscribers]) => ({ channel, subscribers })).sort((a, b) => b.subscribers - a.subscribers),
    };
  }

  async shutdown() {
    clearInterval(this.heartbeat);
    this.unsubscribeBus();
    for (const connection of [...this.connections.values()]) this.close(connection, 1001, 'server shutting down');
    if (this.wss) await new Promise((resolve) => this.wss.close(resolve));
  }
}

const realtime = new RealtimeService();

module.exports = { RealtimeService, EventBus, ChannelRegistry, defaultAuthorize, realtime, CHANNEL_PATTERN };
