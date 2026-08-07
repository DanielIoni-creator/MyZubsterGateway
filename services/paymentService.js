const crypto = require('node:crypto');
const axios = require('axios');

const CURRENCIES = new Set(['MYZ', 'XMR']);
const TERMINAL_STATES = new Set(['COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED']);
const TRANSITIONS = {
  PENDING: ['CONFIRMING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'],
  CONFIRMING: ['COMPLETED', 'FAILED'],
};

class MemoryPaymentStore {
  constructor() { this.items = new Map(); }
  async save(payment) { this.items.set(payment.id, structuredClone(payment)); return structuredClone(payment); }
  async get(id) { const item = this.items.get(id); return item ? structuredClone(item) : null; }
  async list() { return [...this.items.values()].map((item) => structuredClone(item)); }
}

class MongoPaymentStore {
  constructor(model) { this.model = model; }
  async save(payment) {
    const saved = await this.model.findOneAndUpdate({ id: payment.id }, payment, { upsert: true, new: true, lean: true });
    return this.strip(saved);
  }
  async get(id) { return this.strip(await this.model.findOne({ id }).lean()); }
  async list() { return (await this.model.find().sort({ createdAt: -1 }).lean()).map((item) => this.strip(item)); }
  strip(doc) {
    if (!doc) return null;
    const { _id, __v, ...rest } = doc;
    return rest;
  }
}

// Signature scheme shared with consumers: HMAC-SHA256 over `${timestamp}.${body}`.
// The timestamp is signed too, so a captured delivery cannot be replayed later.
function signWebhook(secret, timestamp, body) {
  return crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

function verifyWebhook(secret, timestamp, body, signature, { toleranceMs = 5 * 60 * 1000, now = Date.now() } = {}) {
  const received = String(signature || '').replace(/^sha256=/, '');
  const expected = signWebhook(secret, timestamp, body);
  if (received.length !== expected.length) return false;
  if (Math.abs(now - Number(timestamp)) > toleranceMs) return false;
  return crypto.timingSafeEqual(Buffer.from(received, 'utf8'), Buffer.from(expected, 'utf8'));
}

function createWebhookDispatcher({ client = axios, attempts = 3, backoffMs = 500, sleep, clock = () => new Date() } = {}) {
  const wait = sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  return {
    async deliver({ url, payload, secret }) {
      const body = JSON.stringify(payload);
      let lastError = null;
      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        const timestamp = clock().getTime();
        try {
          const response = await client.post(url, body, {
            timeout: 10000,
            headers: {
              'content-type': 'application/json',
              'x-myz-event': payload.event,
              'x-myz-timestamp': String(timestamp),
              'x-myz-signature': `sha256=${signWebhook(secret, timestamp, body)}`,
            },
          });
          return { ok: true, attempts: attempt, statusCode: response?.status ?? 200 };
        } catch (error) {
          lastError = error;
          if (attempt < attempts) await wait(backoffMs * 2 ** (attempt - 1));
        }
      }
      return { ok: false, attempts, statusCode: lastError?.response?.status ?? null, error: lastError?.message ?? 'delivery failed' };
    },
  };
}

class PaymentService {
  constructor({ store = new MemoryPaymentStore(), dispatcher = createWebhookDispatcher(), clock = () => new Date(), idGenerator = () => crypto.randomUUID(), secretGenerator = () => crypto.randomBytes(32).toString('hex') } = {}) {
    this.store = store;
    this.dispatcher = dispatcher;
    this.clock = clock;
    this.idGenerator = idGenerator;
    this.secretGenerator = secretGenerator;
  }

  async createPayment({ userId, amount, currency, reference = null, callbackUrl = null, idempotencyKey = null, metadata = {} }) {
    if (!userId) throw new Error('userId is required');
    this.validateAmount(amount);
    if (!CURRENCIES.has(currency)) throw new Error(`currency must be one of ${[...CURRENCIES].join(', ')}`);
    if (callbackUrl) this.validateCallbackUrl(callbackUrl);

    if (idempotencyKey) {
      const existing = (await this.store.list()).find((item) => item.idempotencyKey === idempotencyKey);
      if (existing) return existing;
    }

    const timestamp = this.clock().toISOString();
    const payment = {
      id: this.idGenerator(),
      idempotencyKey,
      userId,
      amount: Number(amount),
      currency,
      reference,
      callbackUrl,
      metadata,
      status: 'PENDING',
      txId: null,
      confirmations: 0,
      webhookSecret: callbackUrl ? this.secretGenerator() : null,
      audit: [{ status: 'PENDING', timestamp }],
      deliveries: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    return this.store.save(payment);
  }

  async requirePayment(id) {
    const payment = await this.store.get(id);
    if (!payment) throw new Error('Payment not found');
    return payment;
  }

  async transition(id, status, { txId = null, confirmations = null, reason = null } = {}) {
    const payment = await this.requirePayment(id);
    if (payment.status === status) return payment;
    if (TERMINAL_STATES.has(payment.status)) throw new Error(`Payment is already ${payment.status}`);
    if (!TRANSITIONS[payment.status]?.includes(status)) throw new Error(`Cannot move payment from ${payment.status} to ${status}`);

    const timestamp = this.clock().toISOString();
    payment.status = status;
    payment.updatedAt = timestamp;
    if (txId !== null) payment.txId = txId;
    if (confirmations !== null) payment.confirmations = confirmations;
    payment.audit.push({ status, timestamp, ...(txId ? { txId } : {}), ...(reason ? { reason } : {}) });
    await this.store.save(payment);

    await this.notify(payment, `payment.${status.toLowerCase()}`);
    return this.store.get(payment.id);
  }

  // Webhook failures are recorded but never roll back a status change: the ledger
  // is the source of truth, delivery is best-effort.
  async notify(payment, event) {
    if (!payment.callbackUrl) return null;
    const result = await this.dispatcher.deliver({
      url: payment.callbackUrl,
      secret: payment.webhookSecret,
      payload: { event, paymentId: payment.id, status: payment.status, amount: payment.amount, currency: payment.currency, txId: payment.txId, reference: payment.reference, occurredAt: this.clock().toISOString() },
    });
    payment.deliveries.push({ event, url: payment.callbackUrl, timestamp: this.clock().toISOString(), ...result });
    await this.store.save(payment);
    return result;
  }

  async list({ userId, status, currency, from, to, limit = 50, offset = 0 } = {}) {
    const all = await this.store.list();
    const filtered = all
      .filter((item) => (userId ? item.userId === userId : true))
      .filter((item) => (status ? item.status === status : true))
      .filter((item) => (currency ? item.currency === currency : true))
      .filter((item) => (from ? item.createdAt >= new Date(from).toISOString() : true))
      .filter((item) => (to ? item.createdAt <= new Date(to).toISOString() : true))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const size = Math.min(Number(limit) || 50, 200);
    const start = Math.max(Number(offset) || 0, 0);
    return { total: filtered.length, limit: size, offset: start, items: filtered.slice(start, start + size) };
  }

  validateAmount(amount) {
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) throw new Error('amount must be positive');
  }

  validateCallbackUrl(callbackUrl) {
    let parsed;
    try { parsed = new URL(callbackUrl); } catch { throw new Error('callbackUrl must be a valid URL'); }
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('callbackUrl must use http or https');
  }
}

// The webhook secret is returned once, on creation, and never again.
function publicView(payment, { includeSecret = false } = {}) {
  if (!payment) return payment;
  const { webhookSecret, ...rest } = payment;
  return includeSecret && webhookSecret ? { ...rest, webhookSecret } : rest;
}

module.exports = { PaymentService, MemoryPaymentStore, MongoPaymentStore, createWebhookDispatcher, signWebhook, verifyWebhook, publicView, TERMINAL_STATES, TRANSITIONS };
