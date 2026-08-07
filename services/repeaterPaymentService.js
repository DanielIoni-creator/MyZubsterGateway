const crypto = require('node:crypto');
const axios = require('axios');

const SUPPORTED_CURRENCIES = new Set(['MYZ', 'XMR']);
const MIN_PAYMENT_AMOUNT = { MYZ: 1, XMR: 0.0001 };
const DISTRIBUTION_CACHE_TTL_MS = 60_000; // 1 minute

// --- Memory Store ---
class MemoryRepeaterPaymentStore {
  constructor() { this.payments = new Map(); this.contributions = new Map(); }
  async savePayment(p) { this.payments.set(p.id, structuredClone(p)); return structuredClone(p); }
  async getPayment(id) { const p = this.payments.get(id); return p ? structuredClone(p) : null; }
  async listPayments(filter = {}) {
    let items = [...this.payments.values()];
    if (filter.nodeId) items = items.filter(p => p.nodeId === filter.nodeId);
    if (filter.status) items = items.filter(p => p.status === filter.status);
    return items.map(p => structuredClone(p)).sort((a, b) => b.createdAt - a.createdAt);
  }
  async saveContribution(c) { this.contributions.set(c.nodeId + ':' + c.period, structuredClone(c)); return structuredClone(c); }
  async getContributions(nodeId) {
    return [...this.contributions.values()]
      .filter(c => c.nodeId === nodeId)
      .map(c => structuredClone(c));
  }
}

// --- Mongo Store ---
class MongoRepeaterPaymentStore {
  constructor(model, contribModel) { this.model = model; this.contribModel = contribModel; }
  async savePayment(p) {
    const saved = await this.model.findOneAndUpdate({ id: p.id }, p, { upsert: true, new: true, lean: true });
    return this._strip(saved);
  }
  async getPayment(id) { return this._strip(await this.model.findOne({ id }).lean()); }
  async listPayments(filter = {}) {
    const q = {};
    if (filter.nodeId) q.nodeId = filter.nodeId;
    if (filter.status) q.status = filter.status;
    return (await this.model.find(q).sort({ createdAt: -1 }).lean()).map(d => this._strip(d));
  }
  async saveContribution(c) {
    const saved = await this.contribModel.findOneAndUpdate(
      { nodeId: c.nodeId, period: c.period }, c, { upsert: true, new: true, lean: true }
    );
    return this._strip(saved);
  }
  async getContributions(nodeId) {
    return (await this.contribModel.find({ nodeId }).sort({ period: -1 }).lean()).map(d => this._strip(d));
  }
  _strip(doc) { if (!doc) return null; const { _id, __v, ...rest } = doc; return rest; }
}

// --- HMAC helpers (shared with consumers) ---
function signWebhook(secret, timestamp, body) {
  return crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

function verifyWebhook(secret, timestamp, body, signature, { toleranceMs = 5 * 60 * 1000, now = Date.now() } = {}) {
  if (!signature || !timestamp) return false;
  const received = String(signature).replace(/^sha256=/, '');
  const expected = signWebhook(secret, timestamp, body);
  if (received.length !== expected.length) return false;
  if (Math.abs(now - Number(timestamp)) > toleranceMs) return false;
  return crypto.timingSafeEqual(Buffer.from(received, 'utf8'), Buffer.from(expected, 'utf8'));
}

// --- Main Service ---
class RepeaterPaymentService {
  constructor({ store, escrowService, webhookSecret, currency = 'MYZ' } = {}) {
    this.store = store || new MemoryRepeaterPaymentStore();
    this.escrowService = escrowService;
    this.webhookSecret = webhookSecret || process.env.REPEATER_WEBHOOK_SECRET || 'dev-secret-change-me';
    this.defaultCurrency = SUPPORTED_CURRENCIES.has(currency) ? currency : 'MYZ';
    this._distributionCache = { data: null, ts: 0 };
  }

  /**
   * Create a new repeater payment with escrow hold via 2-of-3 multisig.
   * @param {Object} params
   * @param {string} params.fromNodeId - payer node
   * @param {string} params.toNodeId - payee node
   * @param {number} params.amount - payment amount
   * @param {string} [params.currency] - MYZ or XMR (default: MYZ)
   * @param {string} [params.memo] - optional description
   * @returns {Object} payment record
   */
  async createPayment({ fromNodeId, toNodeId, amount, currency, memo }) {
    const cur = currency || this.defaultCurrency;
    if (!SUPPORTED_CURRENCIES.has(cur)) throw new Error(`Unsupported currency: ${cur}`);
    if (amount < (MIN_PAYMENT_AMOUNT[cur] || 0)) throw new Error(`Amount below minimum for ${cur}`);

    const payment = {
      id: `rpay_${crypto.randomUUID()}`,
      fromNodeId,
      toNodeId,
      amount,
      currency: cur,
      memo: memo || '',
      status: 'PENDING',
      escrowId: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Create escrow hold if escrow service is available
    if (this.escrowService) {
      try {
        const escrow = await this.escrowService.createEscrow({
          from: fromNodeId,
          to: toNodeId,
          amount,
          currency: cur,
          type: '2-of-3',
          metadata: { paymentId: payment.id, type: 'repeater-payment' },
        });
        payment.escrowId = escrow.id;
        payment.status = 'HELD';
      } catch (err) {
        payment.status = 'FAILED';
        payment.error = `Escrow creation failed: ${err.message}`;
      }
    }

    return this.store.savePayment(payment);
  }

  /**
   * Release escrowed payment to payee (requires 2-of-3 signatures).
   */
  async releasePayment(paymentId, signatures) {
    const payment = await this.store.getPayment(paymentId);
    if (!payment) throw new Error('Payment not found');
    if (payment.status !== 'HELD') throw new Error(`Cannot release payment in status: ${payment.status}`);

    if (this.escrowService && payment.escrowId) {
      await this.escrowService.releaseEscrow(payment.escrowId, signatures);
    }

    payment.status = 'COMPLETED';
    payment.updatedAt = Date.now();
    return this.store.savePayment(payment);
  }

  /**
   * Distribute rewards proportionally across repeater nodes based on contribution metrics.
   * @param {number} totalReward - total reward pool
   * @param {Array<{nodeId: string, packetsRelayed: number, uptime: number}>} contributions
   * @param {string} [currency] - MYZ or XMR
   * @returns {Array<{nodeId: string, share: number, amount: number}>}
   */
  async distributeRewards(totalReward, contributions, currency) {
    const cur = currency || this.defaultCurrency;
    if (!contributions || contributions.length === 0) return [];

    // Weight: 70% packets relayed, 30% uptime
    const totalPackets = contributions.reduce((s, c) => s + (c.packetsRelayed || 0), 0);
    const totalUptime = contributions.reduce((s, c) => s + (c.uptime || 0), 0);

    const distributions = contributions.map(c => {
      const packetWeight = totalPackets > 0 ? (c.packetsRelayed || 0) / totalPackets : 0;
      const uptimeWeight = totalUptime > 0 ? (c.uptime || 0) / totalUptime : 0;
      const share = packetWeight * 0.7 + uptimeWeight * 0.3;
      return {
        nodeId: c.nodeId,
        share: Math.round(share * 10000) / 100,
        amount: Math.round(totalReward * share * 100) / 100,
        currency: cur,
      };
    });

    // Persist contributions for audit
    const period = `${Date.now()}`;
    for (const c of contributions) {
      await this.store.saveContribution({ ...c, period, rewardDistributed: distributions.find(d => d.nodeId === c.nodeId)?.amount || 0 });
    }

    this._distributionCache = { data: distributions, ts: Date.now() };
    return distributions;
  }

  /**
   * Get cached distribution rates (TTL: 1 min).
   */
  async getDistributionRates() {
    if (this._distributionCache.data && (Date.now() - this._distributionCache.ts) < DISTRIBUTION_CACHE_TTL_MS) {
      return this._distributionCache.data;
    }
    return [];
  }

  /**
   * Get earnings dashboard for a node.
   */
  async getNodeEarnings(nodeId) {
    const payments = await this.store.listPayments({ nodeId, status: 'COMPLETED' });
    const contributions = await this.store.getContributions(nodeId);

    const totalEarned = {};
    for (const p of payments) {
      if (p.toNodeId === nodeId) {
        totalEarned[p.currency] = (totalEarned[p.currency] || 0) + p.amount;
      }
    }

    const totalFromDistributions = {};
    for (const c of contributions) {
      totalFromDistributions[c.currency || 'MYZ'] = (totalFromDistributions[c.currency || 'MYZ'] || 0) + (c.rewardDistributed || 0);
    }

    return {
      nodeId,
      earnedPayments: totalEarned,
      earnedDistributions: totalFromDistributions,
      paymentCount: payments.length,
      contributionPeriods: contributions.length,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Verify incoming webhook signature.
   */
  verifyIncomingWebhook(timestamp, body, signature) {
    return verifyWebhook(this.webhookSecret, timestamp, body, signature);
  }

  /**
   * Sign outgoing webhook payload.
   */
  signOutgoingWebhook(body) {
    const ts = Date.now().toString();
    return { timestamp: ts, signature: signWebhook(this.webhookSecret, ts, body) };
  }
}

module.exports = { RepeaterPaymentService, MemoryRepeaterPaymentStore, MongoRepeaterPaymentStore };
