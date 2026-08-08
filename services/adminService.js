const crypto = require('node:crypto');

const ROLES = ['user', 'operator', 'admin'];
const USER_STATES = ['ACTIVE', 'SUSPENDED'];
const MAX_PAGE = 500;
const round = (n) => Number(Number(n).toFixed(12));

class MemoryAdminStore {
  constructor({ payments = [], users = [] } = {}) {
    this.payments = payments.map((p) => structuredClone(p));
    this.users = new Map(users.map((u) => [u.userId, structuredClone(u)]));
    this.auditLog = [];
  }
  async listPayments() { return this.payments.map((p) => structuredClone(p)); }
  async listUsers() { return [...this.users.values()].map((u) => structuredClone(u)); }
  async getUser(userId) { const u = this.users.get(userId); return u ? structuredClone(u) : null; }
  async saveUser(user) { this.users.set(user.userId, structuredClone(user)); return structuredClone(user); }
  async appendAudit(entry) { this.auditLog.push(structuredClone(entry)); return structuredClone(entry); }
  async listAudit() { return this.auditLog.map((e) => structuredClone(e)); }
}

class ForbiddenError extends Error {
  constructor(message) { super(message); this.name = 'ForbiddenError'; this.status = 403; }
}

class AdminService {
  constructor({ store = new MemoryAdminStore(), clock = () => new Date(), idGenerator = () => crypto.randomUUID() } = {}) {
    this.store = store;
    this.clock = clock;
    this.idGenerator = idGenerator;
  }

  /**
   * The system always retains at least one active admin, and the two
   * self-action guards below are what enforce it: only an active admin may act,
   * so demoting or suspending *someone else* always leaves the actor behind.
   * The only way to reach zero is to act on yourself, which is refused. An
   * extra "last admin" head-count would be unreachable code implying a
   * protection that never runs.
   *
   * Every mutating call takes the acting admin explicitly. Passing an actor
   * around rather than reading an ambient session means an action can always
   * be attributed in the audit log, and the check cannot be forgotten.
   */
  async requireAdmin(actorId) {
    if (!actorId) throw new ForbiddenError('actor is required');
    const actor = await this.store.getUser(actorId);
    if (!actor) throw new ForbiddenError('unknown actor');
    if (actor.role !== 'admin') throw new ForbiddenError('admin role required');
    if (actor.state !== 'ACTIVE') throw new ForbiddenError('suspended admins cannot act');
    return actor;
  }

  async audit(actorId, action, target, detail = {}) {
    return this.store.appendAudit({
      id: this.idGenerator(),
      actorId,
      action,
      target,
      detail,
      at: this.clock().toISOString(),
    });
  }

  // ---- Panoramica pagamenti -------------------------------------------------

  async overview({ actorId, from = null, to = null } = {}) {
    await this.requireAdmin(actorId);
    const payments = this.applyWindow(await this.store.listPayments(), from, to);

    const byState = {};
    const byCurrency = {};
    const perDay = new Map();
    let failed = 0;

    for (const payment of payments) {
      byState[payment.status] = (byState[payment.status] || 0) + 1;
      if (payment.status === 'FAILED') failed += 1;

      const bucket = byCurrency[payment.currency] || { currency: payment.currency, count: 0, volume: 0, settled: 0 };
      bucket.count += 1;
      bucket.volume = round(bucket.volume + Number(payment.amount));
      if (payment.status === 'COMPLETED') bucket.settled = round(bucket.settled + Number(payment.amount));
      byCurrency[payment.currency] = bucket;

      const day = String(payment.createdAt).slice(0, 10);
      const row = perDay.get(day) || { date: day, count: 0, volume: 0 };
      row.count += 1;
      row.volume = round(row.volume + Number(payment.amount));
      perDay.set(day, row);
    }

    return {
      generatedAt: this.clock().toISOString(),
      window: { from, to },
      total: payments.length,
      byState,
      byCurrency: Object.values(byCurrency),
      daily: [...perDay.values()].sort((a, b) => (a.date < b.date ? -1 : 1)),
      failureRate: payments.length ? round(failed / payments.length) : 0,
    };
  }

  applyWindow(payments, from, to) {
    return payments
      .filter((payment) => (from ? payment.createdAt >= new Date(from).toISOString() : true))
      .filter((payment) => (to ? payment.createdAt <= new Date(to).toISOString() : true));
  }

  // ---- Filtri avanzati ------------------------------------------------------

  /**
   * Filters compose with AND. `limit` is capped rather than trusted: an admin
   * endpoint that will happily serialise the entire payment table on request is
   * an availability problem, not a feature.
   */
  async searchPayments({ actorId, userId, status, currency, from, to, minAmount, maxAmount, reference, sort = 'createdAt', order = 'desc', limit = 50, offset = 0 } = {}) {
    await this.requireAdmin(actorId);

    if (minAmount !== undefined && maxAmount !== undefined && Number(minAmount) > Number(maxAmount)) {
      throw new Error('minAmount cannot exceed maxAmount');
    }
    if (!['createdAt', 'amount', 'status'].includes(sort)) throw new Error('sort must be createdAt, amount or status');

    const needle = reference ? String(reference).toLowerCase() : null;
    const rows = this.applyWindow(await this.store.listPayments(), from, to)
      .filter((p) => (userId ? p.userId === userId : true))
      .filter((p) => (status ? p.status === status : true))
      .filter((p) => (currency ? p.currency === currency : true))
      .filter((p) => (minAmount !== undefined ? Number(p.amount) >= Number(minAmount) : true))
      .filter((p) => (maxAmount !== undefined ? Number(p.amount) <= Number(maxAmount) : true))
      .filter((p) => (needle ? String(p.reference ?? '').toLowerCase().includes(needle) : true));

    const direction = order === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      if (sort === 'amount') return (Number(a.amount) - Number(b.amount)) * direction;
      return (a[sort] < b[sort] ? -1 : a[sort] > b[sort] ? 1 : 0) * direction;
    });

    const size = Math.min(Math.max(Number(limit) || 50, 1), MAX_PAGE);
    const start = Math.max(Number(offset) || 0, 0);
    return { total: rows.length, limit: size, offset: start, items: rows.slice(start, start + size) };
  }

  // ---- Export dati ----------------------------------------------------------

  async exportPayments(filters) {
    const page = await this.searchPayments({ ...filters, limit: MAX_PAGE, offset: 0 });
    await this.audit(filters.actorId, 'EXPORT_PAYMENTS', null, { rows: page.items.length });
    return { filename: `payments-${this.clock().toISOString().slice(0, 10)}.csv`, csv: toCsv(page.items) };
  }

  // ---- Gestione utenti ------------------------------------------------------

  async listUsers({ actorId, role, state, search, limit = 50, offset = 0 } = {}) {
    await this.requireAdmin(actorId);
    const needle = search ? String(search).toLowerCase() : null;
    const rows = (await this.store.listUsers())
      .filter((u) => (role ? u.role === role : true))
      .filter((u) => (state ? u.state === state : true))
      .filter((u) => (needle ? `${u.userId} ${u.email ?? ''}`.toLowerCase().includes(needle) : true))
      .sort((a, b) => (a.userId < b.userId ? -1 : 1));

    const size = Math.min(Math.max(Number(limit) || 50, 1), MAX_PAGE);
    const start = Math.max(Number(offset) || 0, 0);
    return { total: rows.length, limit: size, offset: start, items: rows.slice(start, start + size) };
  }

  async setRole({ actorId, userId, role }) {
    const actor = await this.requireAdmin(actorId);
    if (!ROLES.includes(role)) throw new Error(`role must be one of ${ROLES.join(', ')}`);

    const user = await this.requireUser(userId);
    if (user.role === role) return user;

    // Demoting yourself is how an admin accidentally locks themselves out of
    // the tool they are standing in.
    if (actor.userId === userId && role !== 'admin') throw new ForbiddenError('an admin cannot demote themselves');

    const previous = user.role;
    user.role = role;
    user.updatedAt = this.clock().toISOString();
    await this.store.saveUser(user);
    await this.audit(actorId, 'SET_ROLE', userId, { from: previous, to: role });
    return user;
  }

  async setState({ actorId, userId, state, reason = null }) {
    const actor = await this.requireAdmin(actorId);
    if (!USER_STATES.includes(state)) throw new Error(`state must be one of ${USER_STATES.join(', ')}`);

    const user = await this.requireUser(userId);
    if (user.state === state) return user;

    if (actor.userId === userId && state === 'SUSPENDED') throw new ForbiddenError('an admin cannot suspend themselves');

    const previous = user.state;
    user.state = state;
    user.updatedAt = this.clock().toISOString();
    await this.store.saveUser(user);
    await this.audit(actorId, 'SET_STATE', userId, { from: previous, to: state, reason });
    return user;
  }

  async requireUser(userId) {
    const user = await this.store.getUser(userId);
    if (!user) throw new Error('User not found');
    return user;
  }

  async auditTrail({ actorId, limit = 100 } = {}) {
    await this.requireAdmin(actorId);
    const entries = (await this.store.listAudit()).sort((a, b) => (a.at < b.at ? 1 : -1));
    return entries.slice(0, Math.min(Number(limit) || 100, MAX_PAGE));
  }
}

const CSV_COLUMNS = ['id', 'createdAt', 'userId', 'currency', 'amount', 'status', 'txId', 'reference'];

function csvCell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  // A cell opening with =, +, - or @ is executed as a formula by spreadsheets.
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows) {
  return [CSV_COLUMNS.join(','), ...rows.map((row) => CSV_COLUMNS.map((column) => csvCell(row[column])).join(','))].join('\n');
}

module.exports = { AdminService, MemoryAdminStore, ForbiddenError, toCsv, CSV_COLUMNS, ROLES, USER_STATES, MAX_PAGE };
