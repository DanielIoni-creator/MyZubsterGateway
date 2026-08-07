const crypto = require('node:crypto');
const axios = require('axios');

const ATOMIC_PER_XMR = 1e12;
const TERMINAL_VERDICTS = new Set(['CONFIRMED', 'REJECTED']);
const round = (n) => Number(Number(n).toFixed(12));

class MemoryVerificationStore {
  constructor() { this.items = new Map(); }
  async save(record) { this.items.set(record.paymentId, structuredClone(record)); return structuredClone(record); }
  async get(paymentId) { const item = this.items.get(paymentId); return item ? structuredClone(item) : null; }
  async list() { return [...this.items.values()].map((item) => structuredClone(item)); }
}

class MongoVerificationStore {
  constructor(model) { this.model = model; }
  async save(record) {
    const saved = await this.model.findOneAndUpdate({ paymentId: record.paymentId }, record, { upsert: true, new: true, lean: true });
    return this.strip(saved);
  }
  async get(paymentId) { return this.strip(await this.model.findOne({ paymentId }).lean()); }
  async list() { return (await this.model.find().sort({ updatedAt: -1 }).lean()).map((doc) => this.strip(doc)); }
  strip(doc) { if (!doc) return null; const { _id, __v, ...rest } = doc; return rest; }
}

// Reads confirmations straight from monero-wallet-rpc. Injectable so the
// verifier can be tested — and run locally — without a wallet or a daemon.
function createMoneroChain({ walletUrl = process.env.XMR_WALLET_URL, client = axios } = {}) {
  if (!walletUrl) throw new Error('XMR_WALLET_URL is required for the Monero chain client');
  return {
    async getTransaction(txId) {
      const response = await client.post(`${walletUrl}/json_rpc`, {
        jsonrpc: '2.0', id: 'myz-gateway', method: 'get_transfer_by_txid', params: { txid: txId },
      }, { timeout: 15000 });

      const transfer = response?.data?.result?.transfer;
      if (!transfer) return { found: false };
      return {
        found: true,
        amount: round(transfer.amount / ATOMIC_PER_XMR),
        address: transfer.address ?? null,
        confirmations: transfer.confirmations ?? 0,
        height: transfer.height ?? null,
        doubleSpendSeen: Boolean(transfer.double_spend_seen),
      };
    },
  };
}

class SimulatedChain {
  constructor(transactions = {}) { this.transactions = new Map(Object.entries(transactions)); }
  set(txId, transaction) { this.transactions.set(txId, transaction); return this; }
  async getTransaction(txId) {
    const transaction = this.transactions.get(txId);
    return transaction ? { found: true, doubleSpendSeen: false, ...transaction } : { found: false };
  }
}

class PaymentVerificationService {
  constructor({
    chain,
    store = new MemoryVerificationStore(),
    requiredConfirmations = Number(process.env.XMR_MIN_CONFIRMATIONS || 10),
    missingTxGraceMs = 60 * 60 * 1000,
    amountTolerance = 0,
    clock = () => new Date(),
  } = {}) {
    if (!chain) throw new Error('A chain adapter is required');
    this.chain = chain;
    this.store = store;
    this.requiredConfirmations = requiredConfirmations;
    this.missingTxGraceMs = missingTxGraceMs;
    this.amountTolerance = amountTolerance;
    this.clock = clock;
  }

  /**
   * Checks one payment against the chain and records the outcome.
   * `subject` is { paymentId, txId, expectedAmount, expectedAddress, currency, createdAt }.
   */
  async verify(subject) {
    this.validateSubject(subject);
    const previous = await this.store.get(subject.paymentId);
    const now = this.clock();
    const anomalies = [];

    const onChain = await this.chain.getTransaction(subject.txId);

    if (!onChain.found) {
      const age = now.getTime() - new Date(subject.createdAt ?? now).getTime();
      // A transaction can legitimately be absent for a short while after
      // broadcast, so only an old one that never appeared is an anomaly.
      if (age > this.missingTxGraceMs) anomalies.push({ code: 'TX_NOT_FOUND', detail: `no transaction ${subject.txId} after ${Math.round(age / 60000)} minutes` });
      return this.record(subject, { verdict: anomalies.length ? 'REJECTED' : 'PENDING', confirmations: 0, anomalies, onChain: null, previous, now });
    }

    if (onChain.doubleSpendSeen) anomalies.push({ code: 'DOUBLE_SPEND_SEEN', detail: 'daemon flagged a double spend' });

    if (subject.expectedAddress && onChain.address && onChain.address !== subject.expectedAddress) {
      anomalies.push({ code: 'ADDRESS_MISMATCH', detail: `paid to ${onChain.address}, expected ${subject.expectedAddress}` });
    }

    const delta = round(onChain.amount - subject.expectedAmount);
    if (Math.abs(delta) > this.amountTolerance) {
      anomalies.push({ code: delta < 0 ? 'UNDERPAID' : 'OVERPAID', detail: `on-chain ${onChain.amount}, expected ${subject.expectedAmount} (delta ${delta})` });
    }

    // Confirmations only ever move forward on a healthy chain; going backwards
    // means the block was orphaned and the payment is no longer settled.
    if (previous && onChain.confirmations < previous.confirmations) {
      anomalies.push({ code: 'REORG_SUSPECTED', detail: `confirmations fell from ${previous.confirmations} to ${onChain.confirmations}` });
    }

    const reused = (await this.store.list()).find((record) => record.txId === subject.txId && record.paymentId !== subject.paymentId);
    if (reused) anomalies.push({ code: 'TXID_REUSED', detail: `transaction already credited to payment ${reused.paymentId}` });

    const blocking = anomalies.filter((anomaly) => anomaly.code !== 'OVERPAID');
    let verdict = 'PENDING';
    if (blocking.length) verdict = 'REJECTED';
    else if (onChain.confirmations >= this.requiredConfirmations) verdict = 'CONFIRMED';

    return this.record(subject, { verdict, confirmations: onChain.confirmations, anomalies, onChain, previous, now });
  }

  async record(subject, { verdict, confirmations, anomalies, onChain, previous, now }) {
    const history = previous?.history ?? [];
    if (!previous || previous.verdict !== verdict) {
      history.push({ verdict, confirmations, at: now.toISOString(), ...(anomalies.length ? { anomalies: anomalies.map((a) => a.code) } : {}) });
    }

    return this.store.save({
      paymentId: subject.paymentId,
      txId: subject.txId,
      currency: subject.currency ?? 'XMR',
      expectedAmount: round(subject.expectedAmount),
      observedAmount: onChain ? onChain.amount : null,
      expectedAddress: subject.expectedAddress ?? null,
      verdict,
      confirmations,
      requiredConfirmations: this.requiredConfirmations,
      anomalies,
      height: onChain?.height ?? null,
      history,
      firstSeenAt: previous?.firstSeenAt ?? now.toISOString(),
      updatedAt: now.toISOString(),
    });
  }

  /**
   * Sweeps a batch of subjects, skipping any that already reached a terminal
   * verdict so a scheduler can call this on a timer without extra bookkeeping.
   */
  async sweep(subjects = []) {
    const results = [];
    for (const subject of subjects) {
      const existing = await this.store.get(subject.paymentId);
      if (existing && TERMINAL_VERDICTS.has(existing.verdict)) { results.push(existing); continue; }
      try {
        results.push(await this.verify(subject));
      } catch (error) {
        results.push({ paymentId: subject.paymentId, verdict: 'ERROR', error: error.message });
      }
    }
    return results;
  }

  async get(paymentId) {
    const record = await this.store.get(paymentId);
    if (!record) throw new Error('Verification record not found');
    return record;
  }

  async anomalies() {
    return (await this.store.list()).filter((record) => record.anomalies.length > 0);
  }

  async report() {
    const records = await this.store.list();
    const byVerdict = {};
    const byAnomaly = {};
    let confirmedValue = 0;

    for (const record of records) {
      byVerdict[record.verdict] = (byVerdict[record.verdict] || 0) + 1;
      for (const anomaly of record.anomalies) byAnomaly[anomaly.code] = (byAnomaly[anomaly.code] || 0) + 1;
      if (record.verdict === 'CONFIRMED') confirmedValue += record.observedAmount ?? 0;
    }

    return {
      generatedAt: this.clock().toISOString(),
      requiredConfirmations: this.requiredConfirmations,
      total: records.length,
      byVerdict,
      byAnomaly,
      confirmedValue: round(confirmedValue),
      anomalyRate: records.length ? round(Object.values(byAnomaly).reduce((a, b) => a + b, 0) / records.length) : 0,
    };
  }

  validateSubject(subject) {
    if (!subject?.paymentId) throw new Error('paymentId is required');
    if (!subject.txId) throw new Error('txId is required');
    if (!Number.isFinite(Number(subject.expectedAmount)) || Number(subject.expectedAmount) <= 0) {
      throw new Error('expectedAmount must be positive');
    }
  }
}

module.exports = {
  PaymentVerificationService,
  MemoryVerificationStore,
  MongoVerificationStore,
  SimulatedChain,
  createMoneroChain,
  ATOMIC_PER_XMR,
};
