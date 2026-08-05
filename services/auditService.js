/**
 * Audit Service - Bounty B14 (#279)
 *
 * Catalogo delle azioni critiche, scrittura dei log, query filtrate ed export.
 *
 * Il servizio non deve mai far fallire la richiesta che sta tracciando: se
 * MongoDB non è raggiungibile le voci finiscono in un buffer circolare in
 * memoria, così l'audit resta consultabile (e testabile) anche senza database.
 */

const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');

// ------------------------------------------------------- azioni critiche

/**
 * Catalogo delle azioni tracciate. `match` è valutato sul path *completo*
 * della richiesta, quindi resta valido a prescindere da dove le route sono
 * montate in server.js.
 *
 * `userKeys` elenca, in ordine di priorità, i campi del payload da cui ricavare
 * l'utente; `resourceKeys` quelli da cui ricavare l'id della risorsa.
 */
const CRITICAL_ACTIONS = [
  // --- pagamenti
  { method: 'POST', match: /^\/buy-myz\/?$/, action: 'payment.buy_myz', category: 'payment', resourceType: 'order', userKeys: ['userTariWallet', 'userId'], resourceKeys: ['orderId'] },

  // --- escrow
  { method: 'POST', match: /^\/escrow\/create\/?$/, action: 'escrow.create', category: 'escrow', resourceType: 'escrow', userKeys: ['buyer', 'userId'], resourceKeys: ['escrowId'] },
  { method: 'POST', match: /^\/api\/escrow\/house\//, action: 'escrow.house', category: 'escrow', resourceType: 'escrow', userKeys: ['buyer', 'userId'], resourceKeys: ['escrowId', 'orderId'] },
  { method: 'POST', match: /^\/api\/robot\/escrow\/create\/?$/, action: 'escrow.robot_create', category: 'escrow', resourceType: 'escrow', userKeys: ['clientId'], resourceKeys: ['jobId'] },
  { method: 'POST', match: /^\/api\/robot\/escrow\/deliver\/?$/, action: 'escrow.robot_deliver', category: 'escrow', resourceType: 'escrow', userKeys: ['clientId'], resourceKeys: ['jobId'] },
  { method: 'POST', match: /^\/api\/robot\/escrow\/dispute\/?$/, action: 'escrow.robot_dispute', category: 'escrow', resourceType: 'escrow', userKeys: ['clientId'], resourceKeys: ['jobId'] },

  // --- robot
  { method: 'POST', match: /^\/api\/robot\/create\/?$/, action: 'robot.create', category: 'robot', resourceType: 'robot', userKeys: ['walletAddress'], resourceKeys: ['robotId'] },
  { method: 'POST', match: /^\/api\/robot\/assign\/?$/, action: 'robot.assign_job', category: 'robot', resourceType: 'job', userKeys: ['clientId'], resourceKeys: ['jobId'] },
  { method: 'POST', match: /^\/api\/robot\/deliver\/?$/, action: 'robot.deliver_job', category: 'robot', resourceType: 'robot', userKeys: ['clientId'], resourceKeys: ['robotId'] },
  { method: 'POST', match: /^\/api\/robot\/job\/complete\/?$/, action: 'robot.complete_job', category: 'robot', resourceType: 'job', userKeys: ['clientId'], resourceKeys: ['jobId'] },
  { method: 'POST', match: /^\/api\/robot\/dispute\/?$/, action: 'robot.dispute', category: 'robot', resourceType: 'job', userKeys: ['clientId'], resourceKeys: ['jobId'] },

  // --- bounty
  { method: 'POST', match: /^\/api\/bounty\/create\/?$/, action: 'bounty.create', category: 'bounty', resourceType: 'bounty', userKeys: ['assignedTo'], resourceKeys: ['issueId'] },
  { method: 'POST', match: /^\/api\/bounty\/assign\/?$/, action: 'bounty.assign', category: 'bounty', resourceType: 'bounty', userKeys: ['username'], resourceKeys: ['issueId'] },
  { method: 'POST', match: /^\/api\/bounty\/complete\/?$/, action: 'bounty.complete', category: 'bounty', resourceType: 'bounty', userKeys: ['walletAddress', 'username'], resourceKeys: ['issueId'] },

  // --- reward
  { method: 'POST', match: /^\/api\/rewards\/trigger\/?$/, action: 'reward.trigger', category: 'reward', resourceType: 'reward', userKeys: ['userId'], resourceKeys: ['userId'] },

  // --- stake
  { method: 'POST', match: /^\/api\/stake\/stake\/?$/, action: 'stake.create', category: 'stake', resourceType: 'stake', userKeys: ['userId'], resourceKeys: ['userId'] },

  // --- webhook: gli eventi GitHub fanno scattare i reward, quindi sono
  // azioni critiche a tutti gli effetti anche se arrivano da fuori.
  { method: 'POST', match: /^\/api\/webhooks\/github\/?$/, action: 'webhook.github_event', category: 'webhook', resourceType: 'webhook', userKeys: ['sender', 'username'], resourceKeys: ['delivery', 'number'] },

  // --- admin
  { method: 'POST', match: /^\/api\/ratelimit\/reset\/?$/, action: 'admin.ratelimit_reset', category: 'admin', resourceType: 'ratelimit', userKeys: ['userId'], resourceKeys: ['key'] },

  // --- backup (le route sono attualmente non montate in server.js: le voci
  // restano nel catalogo così l'audit riparte da solo se vengono rimontate)
  { method: 'POST', match: /^\/api\/backup\/create\/?$/, action: 'backup.create', category: 'backup', resourceType: 'backup', userKeys: ['userId'], resourceKeys: ['backupId'] },
  { method: 'POST', match: /^\/api\/backup\/restore\/?$/, action: 'backup.restore', category: 'backup', resourceType: 'backup', userKeys: ['userId'], resourceKeys: ['backupId'] },
  { method: 'POST', match: /^\/api\/backup\/cleanup\/?$/, action: 'backup.cleanup', category: 'backup', resourceType: 'backup', userKeys: ['userId'], resourceKeys: [] }
];

/** Descrittore dell'azione critica per method+path, o null se non tracciata. */
function resolveAction(method, path) {
  if (!method || !path) return null;
  const upper = String(method).toUpperCase();
  const clean = String(path).split('?')[0];
  return CRITICAL_ACTIONS.find(a => a.method === upper && a.match.test(clean)) || null;
}

function listActions() {
  return CRITICAL_ACTIONS.map(({ action, category, method, resourceType }) =>
    ({ action, category, method, resourceType }));
}

// ------------------------------------------------------------ sanitizing

const SECRET_KEY_PATTERN = /(password|passwd|secret|token|api[-_]?key|authorization|private[-_]?key|seed|mnemonic|signature)/i;
const MAX_STRING_LENGTH = 512;
const MAX_DEPTH = 4;
const MAX_KEYS = 50;

/**
 * Rimuove i segreti e limita la dimensione del payload prima di persisterlo.
 * Un audit log che copia alla lettera il body finirebbe per archiviare proprio i
 * dati che non devono essere archiviati.
 */
function sanitize(value, depth = 0) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…[troncato]` : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (depth >= MAX_DEPTH) return '[profondità massima]';

  // Un Buffer (es. body raw di un webhook) enumerato chiave per chiave
  // produrrebbe migliaia di voci numeriche: si registra solo la dimensione.
  if (Buffer.isBuffer(value)) return `[buffer ${value.length} byte]`;
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    const limited = value.slice(0, 20).map(v => sanitize(v, depth + 1));
    if (value.length > 20) limited.push(`…[altri ${value.length - 20} elementi]`);
    return limited;
  }

  if (typeof value === 'object') {
    const out = {};
    // I payload dei webhook GitHub hanno centinaia di chiavi: si tronca per
    // non gonfiare la collection con dati che nessuno consulterà.
    const entries = Object.entries(value);
    for (const [key, val] of entries.slice(0, MAX_KEYS)) {
      out[key] = SECRET_KEY_PATTERN.test(key) ? '[REDACTED]' : sanitize(val, depth + 1);
    }
    if (entries.length > MAX_KEYS) {
      out['…'] = `[altre ${entries.length - MAX_KEYS} chiavi]`;
    }
    return out;
  }

  return String(value);
}

/** Primo valore non vuoto fra le chiavi indicate, cercato in più sorgenti. */
function firstValue(sources, keys) {
  for (const key of keys || []) {
    for (const source of sources) {
      if (source && source[key] !== undefined && source[key] !== null && source[key] !== '') {
        return String(source[key]);
      }
    }
  }
  return null;
}

// --------------------------------------------------- buffer di fallback

const FALLBACK_LIMIT = parseInt(process.env.AUDIT_LOG_BUFFER_SIZE, 10) || 500;
const fallbackBuffer = []; // più recenti in coda

function isMongoConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

function pushFallback(entry) {
  fallbackBuffer.push(entry);
  while (fallbackBuffer.length > FALLBACK_LIMIT) fallbackBuffer.shift();
}

function getFallbackBuffer() {
  return fallbackBuffer.slice();
}

function clearFallbackBuffer() {
  fallbackBuffer.length = 0;
}

// ------------------------------------------------------------- scrittura

function normalizeEntry(entry) {
  return {
    action: entry.action,
    category: entry.category || 'other',
    userId: entry.userId || null,
    resourceType: entry.resourceType || null,
    resourceId: entry.resourceId || null,
    method: entry.method || null,
    path: entry.path || null,
    statusCode: entry.statusCode ?? null,
    status: entry.status || 'success',
    ip: entry.ip || null,
    userAgent: entry.userAgent || null,
    durationMs: entry.durationMs ?? null,
    metadata: entry.metadata === undefined ? {} : sanitize(entry.metadata),
    error: entry.error || null,
    createdAt: entry.createdAt ? new Date(entry.createdAt) : new Date()
  };
}

/**
 * Registra una voce di audit. Non lancia mai: un errore di audit non deve
 * abbattere l'operazione di business che stava tracciando.
 */
async function logAudit(entry) {
  if (!entry || !entry.action) return null;
  const normalized = normalizeEntry(entry);

  if (!isMongoConnected()) {
    pushFallback(normalized);
    return normalized;
  }

  try {
    return await AuditLog.create(normalized);
  } catch (err) {
    console.error('audit: scrittura su MongoDB fallita:', err.message);
    pushFallback(normalized);
    return normalized;
  }
}

// ----------------------------------------------------------------- query

const MAX_LIMIT = 500;

/** Traduce i query param dell'API in un filtro Mongo. Lancia su input non validi. */
function buildFilter(params = {}) {
  const filter = {};
  if (params.userId) filter.userId = String(params.userId);
  if (params.action) filter.action = String(params.action);
  if (params.category) filter.category = String(params.category);
  if (params.resourceId) filter.resourceId = String(params.resourceId);
  if (params.resourceType) filter.resourceType = String(params.resourceType);
  if (params.status) {
    const status = String(params.status);
    if (!['success', 'failure'].includes(status)) {
      throw new Error("status deve essere 'success' o 'failure'");
    }
    filter.status = status;
  }

  const range = {};
  if (params.from) {
    const from = new Date(params.from);
    if (Number.isNaN(from.getTime())) throw new Error('from non è una data valida (usa ISO 8601)');
    range.$gte = from;
  }
  if (params.to) {
    const to = new Date(params.to);
    if (Number.isNaN(to.getTime())) throw new Error('to non è una data valida (usa ISO 8601)');
    range.$lte = to;
  }
  if (range.$gte && range.$lte && range.$gte > range.$lte) {
    throw new Error('from non può essere successiva a to');
  }
  if (Object.keys(range).length) filter.createdAt = range;

  return filter;
}

function parsePagination(params = {}) {
  const page = Math.max(1, parseInt(params.page, 10) || 1);
  const requested = parseInt(params.limit, 10) || 50;
  const limit = Math.min(MAX_LIMIT, Math.max(1, requested));
  return { page, limit, skip: (page - 1) * limit };
}

/** Applica lo stesso filtro al buffer in memoria, quando Mongo non c'è. */
function filterBuffer(entries, filter) {
  return entries.filter(entry => {
    for (const [key, expected] of Object.entries(filter)) {
      if (key === 'createdAt') {
        const at = new Date(entry.createdAt);
        if (expected.$gte && at < expected.$gte) return false;
        if (expected.$lte && at > expected.$lte) return false;
      } else if (entry[key] !== expected) {
        return false;
      }
    }
    return true;
  });
}

/**
 * @param {object} params userId, action, category, resourceId, resourceType,
 *                        status, from, to, page, limit
 * @returns {{logs: object[], pagination: object, source: 'database'|'memory'}}
 */
async function queryAuditLogs(params = {}) {
  const filter = buildFilter(params);
  const { page, limit, skip } = parsePagination(params);

  if (!isMongoConnected()) {
    const all = filterBuffer(getFallbackBuffer(), filter)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return {
      logs: all.slice(skip, skip + limit),
      pagination: { page, limit, total: all.length, pages: Math.ceil(all.length / limit) || 0 },
      source: 'memory'
    };
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(filter)
  ]);

  return {
    logs,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 0 },
    source: 'database'
  };
}

/** Come queryAuditLogs ma senza paginazione, per l'export. */
async function exportAuditLogs(params = {}) {
  const filter = buildFilter(params);
  const max = Math.min(parseInt(params.max, 10) || 10000, 50000);

  if (!isMongoConnected()) {
    return filterBuffer(getFallbackBuffer(), filter)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, max);
  }
  return AuditLog.find(filter).sort({ createdAt: -1 }).limit(max).lean();
}

/** Conteggi per categoria, azione ed esito sull'intervallo filtrato. */
async function getAuditStats(params = {}) {
  const { logs } = await queryAuditLogs({ ...params, limit: MAX_LIMIT, page: 1 });
  const all = isMongoConnected() ? await exportAuditLogs(params) : logs;

  const byCategory = {};
  const byAction = {};
  let failures = 0;

  for (const log of all) {
    byCategory[log.category] = (byCategory[log.category] || 0) + 1;
    byAction[log.action] = (byAction[log.action] || 0) + 1;
    if (log.status === 'failure') failures += 1;
  }

  return {
    total: all.length,
    failures,
    successes: all.length - failures,
    failureRate: all.length ? Number((failures / all.length).toFixed(4)) : 0,
    byCategory,
    byAction
  };
}

// ---------------------------------------------------------------- export

const CSV_COLUMNS = [
  'createdAt', 'action', 'category', 'status', 'userId', 'resourceType',
  'resourceId', 'method', 'path', 'statusCode', 'durationMs', 'ip', 'error'
];

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const str = value instanceof Date ? value.toISOString() : String(value);
  // RFC 4180: virgolette raddoppiate, campo quotato se contiene , " o newline.
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function toCSV(logs, columns = CSV_COLUMNS) {
  const rows = [columns.join(',')];
  for (const log of logs) {
    rows.push(columns.map(col => csvCell(log[col])).join(','));
  }
  // CRLF come da RFC 4180: è ciò che Excel si aspetta.
  return `${rows.join('\r\n')}\r\n`;
}

module.exports = {
  CRITICAL_ACTIONS,
  CSV_COLUMNS,
  resolveAction,
  listActions,
  sanitize,
  firstValue,
  logAudit,
  buildFilter,
  parsePagination,
  queryAuditLogs,
  exportAuditLogs,
  getAuditStats,
  toCSV,
  getFallbackBuffer,
  clearFallbackBuffer
};
