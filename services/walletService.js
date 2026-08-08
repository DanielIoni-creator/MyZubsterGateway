const crypto = require('node:crypto');

const CURRENCIES = ['MYZ', 'XMR'];
const ENTRY_TYPES = new Set(['TRANSFER', 'DEPOSIT', 'WITHDRAWAL', 'HOLD', 'RELEASE']);
const INTERVALS = new Set(['day', 'week', 'month']);

// XMR carries 12 decimals; rounding every sum at that precision keeps repeated
// float additions from drifting into 0.30000000000000004 territory.
const round = (n) => Number(Number(n).toFixed(12));

class MemoryLedgerStore {
  constructor() { this.entries = []; }
  // All-or-nothing: a transfer's two legs must never land half-written.
  async append(entries) {
    this.entries.push(...entries.map((entry) => structuredClone(entry)));
    return entries.map((entry) => structuredClone(entry));
  }
  async list() { return this.entries.map((entry) => structuredClone(entry)); }
}

class MongoLedgerStore {
  constructor(model) { this.model = model; }
  async append(entries) {
    const session = await this.model.db.startSession().catch(() => null);
    if (!session) {
      await this.model.insertMany(entries, { ordered: true });
      return entries;
    }
    try {
      await session.withTransaction(async () => { await this.model.insertMany(entries, { ordered: true, session }); });
      return entries;
    } finally {
      await session.endSession();
    }
  }
  async list() {
    return (await this.model.find().sort({ createdAt: 1 }).lean()).map(({ _id, __v, ...rest }) => rest);
  }
}

class WalletService {
  constructor({ store = new MemoryLedgerStore(), clock = () => new Date(), idGenerator = () => crypto.randomUUID() } = {}) {
    this.store = store;
    this.clock = clock;
    this.idGenerator = idGenerator;
    // Serialises balance-check -> append so two concurrent transfers cannot both
    // pass the check and overdraw. In-process only: a multi-instance deployment
    // needs the database-level transaction in MongoLedgerStore to carry this.
    this.chain = Promise.resolve();
  }

  async withLedgerLock(fn) {
    const previous = this.chain;
    let release;
    this.chain = new Promise((resolve) => { release = resolve; });
    await previous;
    try { return await fn(); } finally { release(); }
  }

  static signed(entry) {
    return entry.direction === 'CREDIT' ? entry.amount : -entry.amount;
  }

  async balance(userId) {
    if (!userId) throw new Error('userId is required');
    const mine = (await this.store.list()).filter((entry) => entry.userId === userId);
    const result = {};
    for (const currency of CURRENCIES) {
      const rows = mine.filter((entry) => entry.currency === currency);
      const posted = rows.filter((e) => e.state === 'POSTED').reduce((sum, e) => sum + WalletService.signed(e), 0);
      const pending = rows.filter((e) => e.state === 'PENDING').reduce((sum, e) => sum + WalletService.signed(e), 0);
      const locked = rows.filter((e) => e.state === 'LOCKED').reduce((sum, e) => sum + e.amount, 0);
      result[currency] = { available: round(posted - locked), pending: round(pending), locked: round(locked), posted: round(posted) };
    }
    return result;
  }

  buildEntry({ transferId, userId, counterparty = null, currency, direction, amount, state = 'POSTED', type, reference = null, idempotencyKey = null, metadata = {} }) {
    return {
      id: this.idGenerator(),
      transferId,
      userId,
      counterparty,
      currency,
      direction,
      amount: round(amount),
      state,
      type,
      reference,
      idempotencyKey,
      metadata,
      createdAt: this.clock().toISOString(),
    };
  }

  async findByIdempotencyKey(idempotencyKey) {
    if (!idempotencyKey) return null;
    const match = (await this.store.list()).find((entry) => entry.idempotencyKey === idempotencyKey);
    return match ? this.describeTransfer(match.transferId) : null;
  }

  async describeTransfer(transferId) {
    const entries = (await this.store.list()).filter((entry) => entry.transferId === transferId);
    if (!entries.length) throw new Error('Transfer not found');
    const debit = entries.find((entry) => entry.direction === 'DEBIT') || entries[0];
    return {
      transferId,
      from: debit.direction === 'DEBIT' ? debit.userId : null,
      to: entries.find((entry) => entry.direction === 'CREDIT')?.userId ?? null,
      amount: debit.amount,
      currency: debit.currency,
      type: debit.type,
      reference: debit.reference,
      createdAt: debit.createdAt,
      entries,
    };
  }

  async transfer({ from, to, amount, currency, reference = null, idempotencyKey = null, metadata = {} }) {
    if (!from || !to) throw new Error('from and to are required');
    if (from === to) throw new Error('from and to must differ');
    this.validateAmount(amount);
    this.validateCurrency(currency);

    return this.withLedgerLock(async () => {
      const replay = await this.findByIdempotencyKey(idempotencyKey);
      if (replay) return replay;

      const senderBalance = await this.balance(from);
      if (senderBalance[currency].available < round(amount)) {
        throw new Error(`Insufficient ${currency} balance`);
      }

      const transferId = this.idGenerator();
      const common = { transferId, currency, type: 'TRANSFER', reference, idempotencyKey, metadata };
      await this.store.append([
        this.buildEntry({ ...common, userId: from, counterparty: to, direction: 'DEBIT', amount }),
        this.buildEntry({ ...common, userId: to, counterparty: from, direction: 'CREDIT', amount }),
      ]);
      return this.describeTransfer(transferId);
    });
  }

  async deposit({ userId, amount, currency, reference = null, idempotencyKey = null, state = 'POSTED' }) {
    return this.singleEntry({ userId, amount, currency, reference, idempotencyKey, state, direction: 'CREDIT', type: 'DEPOSIT' });
  }

  async withdraw({ userId, amount, currency, reference = null, idempotencyKey = null }) {
    return this.withLedgerLock(async () => {
      const replay = await this.findByIdempotencyKey(idempotencyKey);
      if (replay) return replay;
      this.validateAmount(amount);
      this.validateCurrency(currency);
      const balance = await this.balance(userId);
      if (balance[currency].available < round(amount)) throw new Error(`Insufficient ${currency} balance`);
      const transferId = this.idGenerator();
      await this.store.append([this.buildEntry({ transferId, userId, currency, direction: 'DEBIT', amount, type: 'WITHDRAWAL', reference, idempotencyKey })]);
      return this.describeTransfer(transferId);
    });
  }

  async singleEntry({ userId, amount, currency, reference, idempotencyKey, state, direction, type }) {
    if (!userId) throw new Error('userId is required');
    this.validateAmount(amount);
    this.validateCurrency(currency);
    return this.withLedgerLock(async () => {
      const replay = await this.findByIdempotencyKey(idempotencyKey);
      if (replay) return replay;
      const transferId = this.idGenerator();
      await this.store.append([this.buildEntry({ transferId, userId, currency, direction, amount, state, type, reference, idempotencyKey })]);
      return this.describeTransfer(transferId);
    });
  }

  async transactions({ userId, currency, type, state, from, to, limit = 50, offset = 0 } = {}) {
    const all = await this.store.list();
    const filtered = all
      .filter((entry) => (userId ? entry.userId === userId : true))
      .filter((entry) => (currency ? entry.currency === currency : true))
      .filter((entry) => (type ? entry.type === type : true))
      .filter((entry) => (state ? entry.state === state : true))
      .filter((entry) => (from ? entry.createdAt >= new Date(from).toISOString() : true))
      .filter((entry) => (to ? entry.createdAt <= new Date(to).toISOString() : true))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const size = Math.min(Number(limit) || 50, 200);
    const start = Math.max(Number(offset) || 0, 0);
    return { total: filtered.length, limit: size, offset: start, items: filtered.slice(start, start + size) };
  }

  static bucketOf(iso, interval) {
    const date = new Date(iso);
    if (interval === 'month') return iso.slice(0, 7);
    if (interval === 'week') {
      const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
      monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
      return monday.toISOString().slice(0, 10);
    }
    return iso.slice(0, 10);
  }

  async history({ userId, currency, interval = 'day', from, to } = {}) {
    if (!userId) throw new Error('userId is required');
    if (!INTERVALS.has(interval)) throw new Error(`interval must be one of ${[...INTERVALS].join(', ')}`);
    if (currency) this.validateCurrency(currency);

    const rows = (await this.store.list())
      .filter((entry) => entry.userId === userId && entry.state === 'POSTED')
      .filter((entry) => (currency ? entry.currency === currency : true))
      .filter((entry) => (from ? entry.createdAt >= new Date(from).toISOString() : true))
      .filter((entry) => (to ? entry.createdAt <= new Date(to).toISOString() : true))
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));

    const buckets = new Map();
    for (const entry of rows) {
      const key = WalletService.bucketOf(entry.createdAt, interval);
      const bucket = buckets.get(key) || { bucket: key, inflow: 0, outflow: 0 };
      if (entry.direction === 'CREDIT') bucket.inflow += entry.amount;
      else bucket.outflow += entry.amount;
      buckets.set(key, bucket);
    }

    let running = 0;
    const items = [...buckets.values()].map((bucket) => {
      const net = bucket.inflow - bucket.outflow;
      running += net;
      return { bucket: bucket.bucket, inflow: round(bucket.inflow), outflow: round(bucket.outflow), net: round(net), closingBalance: round(running) };
    });
    return { userId, currency: currency || 'ALL', interval, items };
  }

  validateAmount(amount) {
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) throw new Error('amount must be positive');
  }

  validateCurrency(currency) {
    if (!CURRENCIES.includes(currency)) throw new Error(`currency must be one of ${CURRENCIES.join(', ')}`);
  }
}

function toCsv(entries) {
  const columns = ['createdAt', 'transferId', 'type', 'direction', 'currency', 'amount', 'state', 'counterparty', 'reference'];
  const escape = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [columns.join(','), ...entries.map((entry) => columns.map((column) => escape(entry[column])).join(','))].join('\n');
}

module.exports = { WalletService, MemoryLedgerStore, MongoLedgerStore, toCsv, CURRENCIES, ENTRY_TYPES };
