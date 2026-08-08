// services/repeaterService.js - Mesh Routing & Repeater Logic - Bounty #788
const EventEmitter = require("events");

class RepeaterService extends EventEmitter {
  constructor() {
    super();
    this.nodes = new Map();
    this.routingTable = new Map();
    this.cache = new Map();
    this.messageLog = [];
  }

  registerNode({ nodeId, position, neighbors = [], bandwidth = 10 }) {
    if (!nodeId || !position) throw new Error("Missing nodeId or position");
    const node = { nodeId, position, neighbors, bandwidth, status: "active", lastSeen: Date.now(), registeredAt: Date.now(), messagesRouted: 0, faults: 0 };
    this.nodes.set(nodeId, node);
    this.updateRoutingTable(nodeId);
    this.log("NODE_REGISTERED", { nodeId, position });
    this.emit("node:registered", node);
    return node;
  }

  updateRoutingTable(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    const distances = new Map();
    distances.set(nodeId, 0);
    const visited = new Set();
    const queue = [nodeId];
    while (queue.length > 0) {
      const current = queue.shift();
      if (visited.has(current)) continue;
      visited.add(current);
      const cn = this.nodes.get(current);
      if (!cn || cn.status !== "active") continue;
      for (const neighbor of cn.neighbors) {
        const nd = (distances.get(current) || 0) + 1;
        if (!distances.has(neighbor) || nd < distances.get(neighbor)) {
          distances.set(neighbor, nd);
          if (!visited.has(neighbor)) queue.push(neighbor);
        }
      }
    }
    this.routingTable.set(nodeId, distances);
    this.log("ROUTING_UPDATED", { nodeId, reachableNodes: distances.size - 1 });
  }

  async routeMessage(fromNodeId, toNodeId, payload) {
    const fromNode = this.nodes.get(fromNodeId);
    const toNode = this.nodes.get(toNodeId);
    if (!fromNode || fromNode.status !== "active") throw new Error("Source node inactive: " + fromNodeId);
    if (!toNode || toNode.status !== "active") throw new Error("Dest node inactive: " + toNodeId);
    const rt = this.routingTable.get(fromNodeId);
    if (!rt || !rt.has(toNodeId)) throw new Error("No route from " + fromNodeId + " to " + toNodeId);
    fromNode.messagesRouted++;
    const route = this.findPath(fromNodeId, toNodeId);
    this.log("MESSAGE_ROUTED", { from: fromNodeId, to: toNodeId, hops: rt.get(toNodeId), route });
    return { success: true, from: fromNodeId, to: toNodeId, hops: rt.get(toNodeId), route, timestamp: Date.now() };
  }

  findPath(from, to) {
    const visited = new Set();
    const queue = [[from]];
    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];
      if (current === to) return path;
      if (visited.has(current)) continue;
      visited.add(current);
      const node = this.nodes.get(current);
      if (!node || node.status !== "active") continue;
      for (const neighbor of node.neighbors) {
        if (!visited.has(neighbor)) queue.push([...path, neighbor]);
      }
    }
    return null;
  }

  cacheData(key, data, ttlMs = 3600000) {
    const entry = { key, data, ttl: ttlMs, storedAt: Date.now(), expiresAt: Date.now() + ttlMs };
    this.cache.set(key, entry);
    this.log("DATA_CACHED", { key, ttl: ttlMs });
    return entry;
  }

  getCachedData(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { this.cache.delete(key); return null; }
    return entry.data;
  }

  handleNodeFailure(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    node.status = "degraded";
    node.faults++;
    this.log("NODE_FAILURE", { nodeId, faults: node.faults });
    this.emit("node:failed", node);
    for (const neighbor of node.neighbors) {
      const nn = this.nodes.get(neighbor);
      if (nn) { nn.neighbors = nn.neighbors.filter(n => n !== nodeId); this.updateRoutingTable(neighbor); }
    }
    setTimeout(() => { if (this.nodes.has(nodeId)) this.attemptRecovery(nodeId); }, 30000);
  }

  attemptRecovery(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node || node.status !== "degraded") return;
    node.status = "active"; node.lastSeen = Date.now();
    this.log("NODE_RECOVERED", { nodeId });
    this.emit("node:recovered", node);
    for (const [nid, n] of this.nodes) {
      if (nid !== nodeId && n.status === "active") {
        const dist = Math.abs(n.position.x - node.position.x) + Math.abs(n.position.y - node.position.y);
        if (dist <= 3 && !n.neighbors.includes(nodeId)) { n.neighbors.push(nodeId); node.neighbors.push(nid); }
      }
      this.updateRoutingTable(nid);
    }
  }

  getMeshStatus() {
    const all = [...this.nodes.values()];
    return {
      totalNodes: all.length,
      activeNodes: all.filter(n => n.status === "active").length,
      degradedNodes: all.filter(n => n.status === "degraded").length,
      totalMessagesRouted: all.reduce((s, n) => s + n.messagesRouted, 0),
      totalFaults: all.reduce((s, n) => s + n.faults, 0),
      cacheSize: this.cache.size,
      nodes: all.map(n => ({ nodeId: n.nodeId, status: n.status, position: n.position, neighborsCount: n.neighbors.length, messagesRouted: n.messagesRouted, faults: n.faults })),
      timestamp: new Date().toISOString()
    };
  }

  log(event, data) {
    const entry = { event, data, timestamp: Date.now() };
    this.messageLog.push(entry);
    if (this.messageLog.length > 1000) this.messageLog.shift();
    console.log("[Repeater]", event, JSON.stringify(data));
  }

  getLogs(limit = 50) { return this.messageLog.slice(-limit); }
}

module.exports = new RepeaterService();
