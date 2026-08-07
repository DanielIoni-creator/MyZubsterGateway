const crypto = require('node:crypto');
const axios = require('axios');

const HEARTBEAT_INTERVAL_MS = 30_000;
const NODE_TIMEOUT_MS = 90_000;
const MAX_HOPS = 10;
const CACHE_MAX_SIZE = 1000;
const CACHE_DEFAULT_TTL_MS = 300_000; // 5 min

// --- LRU Cache with TTL ---
class TTLCache {
  constructor({ maxSize = CACHE_MAX_SIZE, defaultTTL = CACHE_DEFAULT_TTL_MS } = {}) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this._store = new Map(); // key -> { value, expiresAt }
    this._accessOrder = [];
  }

  set(key, value, ttlMs) {
    const ttl = ttlMs || this.defaultTTL;
    // Evict oldest if at capacity
    if (this._store.size >= this.maxSize && !this._store.has(key)) {
      const oldest = this._accessOrder.shift();
      if (oldest) this._store.delete(oldest);
    }
    this._store.set(key, { value: structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value)), expiresAt: Date.now() + ttl });
    // Update access order
    this._accessOrder = this._accessOrder.filter(k => k !== key);
    this._accessOrder.push(key);
  }

  get(key) {
    const entry = this._store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this._store.delete(key);
      this._accessOrder = this._accessOrder.filter(k => k !== key);
      return null;
    }
    // Move to end (most recently used)
    this._accessOrder = this._accessOrder.filter(k => k !== key);
    this._accessOrder.push(key);
    return entry.value;
  }

  has(key) { return this.get(key) !== null; }
  delete(key) { this._store.delete(key); this._accessOrder = this._accessOrder.filter(k => k !== key); }
  get size() { return this._store.size; }
  clear() { this._store.clear(); this._accessOrder = []; }
}

// --- Memory Topology Store ---
class MemoryMeshStore {
  constructor() {
    this.nodes = new Map();        // nodeId -> { id, address, status, lastHeartbeat, latency, metadata }
    this.edges = new Map();        // `${a}-${b}` -> { from, to, latency, active }
    this.routes = new Map();       // `${src}-${dst}` -> { path, hops, totalLatency, cachedAt }
    this.sensorCache = new TTLCache({ maxSize: 500, defaultTTL: 120_000 });
  }

  async registerNode(node) {
    this.nodes.set(node.id, { ...node, lastHeartbeat: Date.now(), status: 'active' });
    return this.nodes.get(node.id);
  }

  async updateHeartbeat(nodeId) {
    const node = this.nodes.get(nodeId);
    if (node) { node.lastHeartbeat = Date.now(); node.status = 'active'; }
  }

  async getNode(nodeId) { return this.nodes.get(nodeId) || null; }

  async listActiveNodes() {
    const now = Date.now();
    const active = [];
    for (const [id, node] of this.nodes) {
      if (now - node.lastHeartbeat < NODE_TIMEOUT_MS) active.push(node);
      else node.status = 'offline';
    }
    return active.sort((a, b) => (a.latency || 999) - (b.latency || 999));
  }

  async addEdge(from, to, latency) {
    const key = [from, to].sort().join('-');
    this.edges.set(key, { from, to, latency, active: true, updatedAt: Date.now() });
  }

  async getEdges() { return [...this.edges.values()]; }

  async cacheRoute(src, dst, route) {
    this.routes.set(`${src}-${dst}`, { ...route, cachedAt: Date.now() });
  }

  async getCachedRoute(src, dst) {
    const r = this.routes.get(`${src}-${dst}`);
    if (r && (Date.now() - r.cachedAt) < 60_000) return r; // 1 min route cache
    return null;
  }

  async cacheSensorData(nodeId, data, ttl) {
    this.sensorCache.set(`sensor:${nodeId}`, data, ttl);
  }

  async getSensorData(nodeId) { return this.sensorCache.get(`sensor:${nodeId}`); }
}

// --- A* inspired mesh routing ---
function findMeshRoute(nodes, edges, src, dst) {
  if (src === dst) return { path: [src], hops: 0, totalLatency: 0 };

  const graph = {};
  for (const e of edges) {
    if (!e.active) continue;
    graph[e.from] = graph[e.from] || [];
    graph[e.to] = graph[e.to] || [];
    graph[e.from].push({ to: e.to, latency: e.latency || 50 });
    graph[e.to].push({ to: e.from, latency: e.latency || 50 });
  }

  if (!graph[src] || !graph[dst]) return null;

  // Dijkstra (simplified A* without heuristic)
  const dist = {}; const prev = {}; const visited = new Set();
  for (const n of Object.keys(graph)) dist[n] = Infinity;
  dist[src] = 0;

  const pq = [[0, src]]; // [cost, node]
  while (pq.length > 0) {
    pq.sort((a, b) => a[0] - b[0]);
    const [cost, node] = pq.shift();
    if (visited.has(node)) continue;
    visited.add(node);
    if (node === dst) break;

    for (const { to, latency } of (graph[node] || [])) {
      const alt = cost + latency;
      if (alt < dist[to]) {
        dist[to] = alt;
        prev[to] = node;
        pq.push([alt, to]);
      }
    }
  }

  if (dist[dst] === Infinity) return null;

  // Reconstruct path
  const path = [];
  let cur = dst;
  while (cur) { path.unshift(cur); cur = prev[cur]; }

  return {
    path,
    hops: path.length - 1,
    totalLatency: Math.round(dist[dst]),
  };
}

// --- Main Service ---
class RepeaterService {
  constructor({ store, paymentService } = {}) {
    this.store = store || new MemoryMeshStore();
    this.paymentService = paymentService;
    this._heartbeatTimer = null;
  }

  /**
   * Register a new repeater node in the mesh.
   */
  async registerNode({ nodeId, address, metadata = {} }) {
    const node = await this.store.registerNode({
      id: nodeId,
      address,
      latency: 0,
      metadata,
    });
    return node;
  }

  /**
   * Process heartbeat from a node. If node hasn't sent heartbeat within NODE_TIMEOUT_MS, it's marked offline.
   */
  async heartbeat(nodeId, metrics = {}) {
    await this.store.updateHeartbeat(nodeId);
    const node = await this.store.getNode(nodeId);
    if (node && metrics.latency !== undefined) {
      node.latency = metrics.latency;
    }
    return { status: 'ok', nodeId, timestamp: Date.now() };
  }

  /**
   * Get full mesh topology status.
   *
   * @returns {{ nodes: Array, edges: Array, activeNodes: number, offlineNodes: number }}
   */
  async getMeshStatus() {
    const allNodes = [...this.store.nodes.values()];
    const now = Date.now();
    const active = allNodes.filter(n => now - n.lastHeartbeat < NODE_TIMEOUT_MS);
    const offline = allNodes.filter(n => now - n.lastHeartbeat >= NODE_TIMEOUT_MS);

    return {
      nodes: allNodes.map(n => ({
        id: n.id,
        address: n.address,
        status: now - n.lastHeartbeat < NODE_TIMEOUT_MS ? 'active' : 'offline',
        latency: n.latency,
        lastHeartbeat: n.lastHeartbeat,
        metadata: n.metadata,
      })),
      edges: await this.store.getEdges(),
      activeCount: active.length,
      offlineCount: offline.length,
      timestamp: now,
    };
  }

  /**
   * Find optimal route between two nodes through the mesh.
   * Uses cached route if available (<60s), otherwise computes fresh.
   *
   * @param {string} src - source node ID
   * @param {string} dst - destination node ID
   * @returns {{ path: string[], hops: number, totalLatency: number, cached: boolean } | null}
   */
  async findRoute(src, dst) {
    // Check cache first
    const cached = await this.store.getCachedRoute(src, dst);
    if (cached) return { ...cached, cached: true };

    const nodes = [...this.store.nodes.values()];
    const now = Date.now();
    const activeIds = new Set(nodes.filter(n => now - n.lastHeartbeat < NODE_TIMEOUT_MS).map(n => n.id));

    if (!activeIds.has(src) || !activeIds.has(dst)) {
      throw new Error(`Source or destination node is offline: src=${activeIds.has(src)}, dst=${activeIds.has(dst)}`);
    }

    const edges = (await this.store.getEdges()).filter(e => activeIds.has(e.from) && activeIds.has(e.to));

    const route = findMeshRoute(nodes, edges, src, dst);
    if (!route) return null; // No path found

    if (route.hops <= MAX_HOPS) {
      await this.store.cacheRoute(src, dst, route);
    }
    return { ...route, cached: false };
  }

  /**
   * Add or update an edge (link) between two nodes with measured latency.
   */
  async updateLink(fromNodeId, toNodeId, latency) {
    await this.store.addEdge(fromNodeId, toNodeId, latency);
    return { from: fromNodeId, to: toNodeId, latency, active: true };
  }

  /**
   * Cache sensor data from a node for resilience during disconnections.
   * Data persists in cache for the specified TTL.
   *
   * @param {string} nodeId
   * @param {Object} data - sensor readings to cache
   * @param {number} [ttlMs] - cache TTL in ms (default 5 min)
   */
  async cacheSensorData(nodeId, data, ttlMs) {
    const ttl = ttlMs || CACHE_DEFAULT_TTL_MS;
    await this.store.cacheSensorData(nodeId, {
      data,
      cachedAt: Date.now(),
      ttl,
    }, ttl);
    return { nodeId, cached: true, ttl };
  }

  /**
   * Retrieve cached sensor data for a node (used during disconnections).
   */
  async getSensorData(nodeId) {
    const cached = await this.store.getSensorData(nodeId);
    if (!cached) return null;
    return {
      nodeId,
      data: cached.data,
      cachedAt: cached.cachedAt,
      stale: Date.now() - cached.cachedAt > cached.ttl,
    };
  }

  /**
   * Detect and report offline nodes. Optionally trigger re-routing.
   */
  async detectOfflineNodes() {
    const now = Date.now();
    const offline = [];
    for (const [, node] of this.store.nodes) {
      if (now - node.lastHeartbeat >= NODE_TIMEOUT_MS) {
        node.status = 'offline';
        offline.push({ nodeId: node.id, lastHeartbeat: node.lastHeartbeat, downSince: node.lastHeartbeat + NODE_TIMEOUT_MS });
      }
    }
    return { offline, count: offline.length, timestamp: now };
  }

  /**
   * Start automatic heartbeat monitoring (optional — for long-running processes).
   */
  startHeartbeatMonitor(onNodeDown) {
    if (this._heartbeatTimer) return;
    this._heartbeatTimer = setInterval(async () => {
      const { offline } = await this.detectOfflineNodes();
      if (offline.length > 0 && onNodeDown) {
        for (const node of offline) onNodeDown(node);
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  stopHeartbeatMonitor() {
    if (this._heartbeatTimer) { clearInterval(this._heartbeatTimer); this._heartbeatTimer = null; }
  }
}

module.exports = { RepeaterService, MemoryMeshStore, TTLCache, findMeshRoute };
