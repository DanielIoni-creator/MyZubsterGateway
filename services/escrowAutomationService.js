const crypto = require('node:crypto');

const HOUR_MS = 3600 * 1000;
const TERMINAL_STATES = new Set(['RELEASED', 'REFUNDED']);
const round = (n) => Number(Number(n).toFixed(12));

class MemoryEscrowStore {
  constructor() { this.items = new Map(); }
  async save(escrow) { this.items.set(escrow.jobId, structuredClone(escrow)); return structuredClone(escrow); }
  async get(jobId) { const item = this.items.get(jobId); return item ? structuredClone(item) : null; }
  async list() { return [...this.items.values()].map((item) => structuredClone(item)); }
}

class MongoEscrowStore {
  constructor(model) { this.model = model; }
  async save(escrow) {
    const saved = await this.model.findOneAndUpdate({ jobId: escrow.jobId }, escrow, { upsert: true, new: true, lean: true });
    return this.strip(saved);
  }
  async get(jobId) { return this.strip(await this.model.findOne({ jobId }).lean()); }
  async list() { return (await this.model.find().lean()).map((doc) => this.strip(doc)); }
  strip(doc) { if (!doc) return null; const { _id, __v, ...rest } = doc; return rest; }
}

/**
 * Automation layer over the robot escrow flow.
 *
 * The existing implementation schedules the payout with `setTimeout`, which is
 * lost on restart — funds then stay locked with nothing left to release them.
 * Here every deadline is a stored timestamp and `tick()` re-derives what is due,
 * so a restart costs nothing and the sweep is safe to run repeatedly.
 */
class EscrowAutomationService {
  constructor({
    wallet,
    store = new MemoryEscrowStore(),
    verifier = null,
    feePercent = 0.02,
    jobTimeoutHours = 24,
    disputeWindowHours = 48,
    clock = () => new Date(),
    idGenerator = () => crypto.randomUUID(),
  } = {}) {
    if (!wallet) throw new Error('A wallet adapter is required');
    this.wallet = wallet;
    this.store = store;
    this.verifier = verifier;
    this.feePercent = feePercent;
    this.jobTimeoutHours = jobTimeoutHours;
    this.disputeWindowHours = disputeWindowHours;
    this.clock = clock;
    this.idGenerator = idGenerator;
  }

  log(escrow, event, detail = {}) {
    escrow.events.push({ event, at: this.clock().toISOString(), ...detail });
    escrow.updatedAt = this.clock().toISOString();
    return escrow;
  }

  async open({ jobId, clientId, robotId, amount, currency, metadata = {} }) {
    if (!jobId || !clientId || !robotId) throw new Error('jobId, clientId and robotId are required');
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) throw new Error('amount must be positive');
    if (!['MYZ', 'XMR'].includes(currency)) throw new Error('currency must be MYZ or XMR');

    const existing = await this.store.get(jobId);
    if (existing) return existing;

    const now = this.clock();
    const fee = round(amount * this.feePercent);
    const lockTx = await this.wallet.lock(clientId, round(amount), currency);

    const escrow = {
      jobId,
      clientId,
      robotId,
      currency,
      amount: round(amount),
      fee,
      netAmount: round(amount - fee),
      state: 'LOCKED',
      lockTx,
      payouts: [],
      metadata,
      deliveredAt: null,
      deliveryDeadline: new Date(now.getTime() + this.jobTimeoutHours * HOUR_MS).toISOString(),
      disputeDeadline: null,
      events: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    this.log(escrow, 'LOCKED', { amount: escrow.amount, currency, lockTx });
    return this.store.save(escrow);
  }

  async markDelivered({ jobId, proof = null }) {
    const escrow = await this.require(jobId);
    if (escrow.state !== 'LOCKED') throw new Error(`Cannot deliver an escrow in state ${escrow.state}`);

    const now = this.clock();
    escrow.state = 'DELIVERED';
    escrow.deliveredAt = now.toISOString();
    escrow.proof = proof;
    escrow.disputeDeadline = new Date(now.getTime() + this.disputeWindowHours * HOUR_MS).toISOString();
    this.log(escrow, 'DELIVERED', { proof: proof ?? null, disputeDeadline: escrow.disputeDeadline });
    return this.store.save(escrow);
  }

  async dispute({ jobId, reason }) {
    const escrow = await this.require(jobId);
    if (TERMINAL_STATES.has(escrow.state)) throw new Error(`Escrow is already ${escrow.state}`);

    escrow.state = 'DISPUTED';
    this.log(escrow, 'DISPUTED', { reason: reason ?? null });
    return this.store.save(escrow);
  }

  /** Human resolution of a dispute: pay the robot or refund the client. */
  async resolve({ jobId, outcome, note = null }) {
    const escrow = await this.require(jobId);
    if (escrow.state !== 'DISPUTED') throw new Error('Only a disputed escrow can be resolved');
    if (!['RELEASE', 'REFUND'].includes(outcome)) throw new Error('outcome must be RELEASE or REFUND');

    this.log(escrow, 'DISPUTE_RESOLVED', { outcome, note });
    return outcome === 'RELEASE' ? this.release(escrow, 'DISPUTE_RESOLVED') : this.refund(escrow, 'DISPUTE_RESOLVED');
  }

  /**
   * Advances every escrow whose deadline has passed. Idempotent and safe to run
   * on a timer: terminal escrows are skipped, and a payout that failed halfway
   * is retried from where it stopped rather than paying the same leg twice.
   */
  async tick() {
    const now = this.clock().getTime();
    const results = [];

    for (const stored of await this.store.list()) {
      if (TERMINAL_STATES.has(stored.state) || stored.state === 'DISPUTED') continue;

      try {
        if (stored.state === 'PAYING_OUT') { results.push(await this.release(stored, 'PAYOUT_RETRY')); continue; }

        // Robot never delivered: give the client their money back rather than
        // leaving it locked forever, which is what happens today.
        if (stored.state === 'LOCKED' && new Date(stored.deliveryDeadline).getTime() <= now) {
          results.push(await this.refund(stored, 'DELIVERY_TIMEOUT'));
          continue;
        }

        if (stored.state === 'DELIVERED' && new Date(stored.disputeDeadline).getTime() <= now) {
          const verdict = await this.verify(stored);
          if (!verdict.ok) {
            this.log(stored, 'VERIFICATION_FAILED', { reason: verdict.reason });
            stored.state = 'DISPUTED';
            results.push(await this.store.save(stored));
            continue;
          }
          this.log(stored, 'VERIFIED', { reason: verdict.reason ?? null });
          results.push(await this.release(stored, 'DISPUTE_WINDOW_ELAPSED'));
        }
      } catch (error) {
        this.log(stored, 'TICK_ERROR', { error: error.message });
        results.push(await this.store.save(stored));
      }
    }

    return results;
  }

  /** Defaults to "delivery was recorded"; inject a verifier for stricter checks. */
  async verify(escrow) {
    if (!this.verifier) return { ok: Boolean(escrow.deliveredAt), reason: escrow.deliveredAt ? 'delivery recorded' : 'never delivered' };
    return this.verifier(escrow);
  }

  /**
   * Pays the robot, then the platform fee. Each leg is recorded as it lands, so
   * a failure between them leaves the escrow in PAYING_OUT and the next tick
   * resumes with the leg that is still outstanding — never re-sending the first.
   */
  async release(escrow, reason) {
    const paid = new Set(escrow.payouts.map((payout) => payout.leg));

    if (escrow.state !== 'PAYING_OUT') {
      escrow.state = 'PAYING_OUT';
      this.log(escrow, 'PAYOUT_STARTED', { reason });
      await this.store.save(escrow);
    }

    const legs = [
      { leg: 'ROBOT', to: escrow.robotId, amount: escrow.netAmount },
      { leg: 'PLATFORM_FEE', to: 'PLATFORM_WALLET', amount: escrow.fee },
    ].filter((leg) => leg.amount > 0 && !paid.has(leg.leg));

    for (const leg of legs) {
      try {
        const txId = await this.wallet.release(leg.to, leg.amount, escrow.currency);
        escrow.payouts.push({ leg: leg.leg, to: leg.to, amount: leg.amount, txId, at: this.clock().toISOString() });
        this.log(escrow, 'PAYOUT_LEG_SENT', { leg: leg.leg, amount: leg.amount, txId });
      } catch (error) {
        this.log(escrow, 'PAYOUT_LEG_FAILED', { leg: leg.leg, error: error.message });
        return this.store.save(escrow);
      }
    }

    escrow.state = 'RELEASED';
    this.log(escrow, 'RELEASED', { reason, total: round(escrow.netAmount + escrow.fee) });
    return this.store.save(escrow);
  }

  async refund(escrow, reason) {
    try {
      const txId = await this.wallet.refund(escrow.clientId, escrow.amount, escrow.currency);
      escrow.state = 'REFUNDED';
      escrow.payouts.push({ leg: 'REFUND', to: escrow.clientId, amount: escrow.amount, txId, at: this.clock().toISOString() });
      this.log(escrow, 'REFUNDED', { reason, txId });
    } catch (error) {
      this.log(escrow, 'REFUND_FAILED', { reason, error: error.message });
    }
    return this.store.save(escrow);
  }

  async require(jobId) {
    const escrow = await this.store.get(jobId);
    if (!escrow) throw new Error('Escrow not found');
    return escrow;
  }

  async get(jobId) { return this.require(jobId); }

  async auditLog(jobId) { return (await this.require(jobId)).events; }

  async summary() {
    const escrows = await this.store.list();
    const byState = {};
    let locked = 0;
    for (const escrow of escrows) {
      byState[escrow.state] = (byState[escrow.state] || 0) + 1;
      if (!TERMINAL_STATES.has(escrow.state)) locked = round(locked + escrow.amount);
    }
    return { generatedAt: this.clock().toISOString(), total: escrows.length, byState, valueInEscrow: locked };
  }
}

/** Adapter over the existing myz_wallet / xmr_wallet modules. */
function createWalletAdapter({ myz = require('../gateway/myz_wallet'), xmr = require('../gateway/xmr_wallet') } = {}) {
  const pick = (currency) => (currency === 'XMR' ? xmr : myz);
  return {
    lock: (userId, amount, currency) => (currency === 'XMR' ? pick(currency).lockXMR(userId, amount) : pick(currency).lockMYZ(userId, amount)),
    release: (userId, amount, currency) => (currency === 'XMR' ? pick(currency).releaseXMR(userId, amount) : pick(currency).releaseMYZ(userId, amount)),
    refund: (userId, amount, currency) => (currency === 'XMR' ? pick(currency).refundXMR(userId, amount) : pick(currency).refundMYZ(userId, amount)),
  };
}

module.exports = { EscrowAutomationService, MemoryEscrowStore, MongoEscrowStore, createWalletAdapter, HOUR_MS };
