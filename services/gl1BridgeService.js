const crypto = require('node:crypto');
const axios = require('axios');

const TERMINAL_STATES = new Set(['COMPLETED', 'REFUNDED', 'FAILED']);

class MemoryTransferStore {
  constructor() { this.items = new Map(); }
  async save(transfer) { this.items.set(transfer.id, structuredClone(transfer)); return structuredClone(transfer); }
  async get(id) { const item = this.items.get(id); return item ? structuredClone(item) : null; }
  async list() { return [...this.items.values()].map((item) => structuredClone(item)); }
}

function createGl1Client({ baseUrl, token }) {
  if (!baseUrl) throw new Error('GL1_API_URL is required');
  const client = axios.create({
    baseURL: baseUrl,
    timeout: 15000,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  return {
    async quote(request) { return (await client.post('/v1/quotes', request)).data; },
    async lock(request) { return (await client.post('/v1/locks', request)).data; },
    async mint(request) { return (await client.post('/v1/mints', request)).data; },
    async unlock(request) { return (await client.post('/v1/unlocks', request)).data; },
  };
}

class Gl1BridgeService {
  constructor({ gl1, myzLedger, store = new MemoryTransferStore(), clock = () => new Date() }) {
    if (!gl1 || !myzLedger) throw new Error('GL1 and MYZ ledger adapters are required');
    this.gl1 = gl1;
    this.myzLedger = myzLedger;
    this.store = store;
    this.clock = clock;
  }

  async quote({ direction, amount, gl1Asset }) {
    this.validateAmount(amount);
    if (!['MYZ_TO_GL1', 'GL1_TO_MYZ'].includes(direction)) throw new Error('Unsupported direction');
    if (!gl1Asset) throw new Error('gl1Asset is required');
    const quote = await this.gl1.quote({ direction, amount: String(amount), sourceAsset: direction === 'MYZ_TO_GL1' ? 'MYZ' : gl1Asset, targetAsset: direction === 'MYZ_TO_GL1' ? gl1Asset : 'MYZ' });
    if (!quote?.id || !quote?.rate || !quote?.expiresAt) throw new Error('GL1 returned an invalid quote');
    return quote;
  }

  async createTransfer({ quote, sender, beneficiary, idempotencyKey }) {
    if (!quote?.id || !quote.direction) throw new Error('A complete quote is required');
    if (!sender || !beneficiary) throw new Error('sender and beneficiary are required');
    if (!idempotencyKey) throw new Error('idempotencyKey is required');
    const existing = (await this.store.list()).find((item) => item.idempotencyKey === idempotencyKey);
    if (existing) return existing;
    if (new Date(quote.expiresAt) <= this.clock()) throw new Error('Quote has expired');

    const transfer = {
      id: crypto.randomUUID(),
      idempotencyKey,
      quote,
      sender,
      beneficiary,
      state: 'CREATED',
      sourceLockId: null,
      destinationTransactionId: null,
      audit: [],
      createdAt: this.clock().toISOString(),
      updatedAt: this.clock().toISOString(),
    };
    this.record(transfer, 'CREATED');
    await this.store.save(transfer);
    return this.execute(transfer.id);
  }

  async execute(id) {
    const transfer = await this.requireTransfer(id);
    if (TERMINAL_STATES.has(transfer.state)) return transfer;
    try {
      if (transfer.state === 'CREATED') await this.lockSource(transfer);
      if (transfer.state === 'SOURCE_LOCKED') await this.issueDestination(transfer);
      if (transfer.state === 'DESTINATION_ISSUED') {
        transfer.state = 'COMPLETED';
        this.record(transfer, 'COMPLETED');
        await this.store.save(transfer);
      }
      return transfer;
    } catch (error) {
      transfer.error = error.message;
      if (transfer.state === 'SOURCE_LOCKED') {
        await this.rollback(transfer);
      } else {
        transfer.state = 'FAILED';
        this.record(transfer, 'FAILED', { error: error.message });
      }
      await this.store.save(transfer);
      throw error;
    }
  }

  async lockSource(transfer) {
    const request = { reference: transfer.id, sender: transfer.sender, amount: transfer.quote.sourceAmount };
    const lock = transfer.quote.direction === 'MYZ_TO_GL1' ? await this.myzLedger.lock(request) : await this.gl1.lock({ ...request, asset: transfer.quote.sourceAsset });
    if (!lock?.lockId) throw new Error('Source ledger did not return a lock ID');
    transfer.sourceLockId = lock.lockId;
    transfer.state = 'SOURCE_LOCKED';
    this.record(transfer, 'SOURCE_LOCKED', { lockId: lock.lockId });
    await this.store.save(transfer);
  }

  async issueDestination(transfer) {
    const request = { reference: transfer.id, beneficiary: transfer.beneficiary, amount: transfer.quote.targetAmount, sourceLockId: transfer.sourceLockId };
    const issued = transfer.quote.direction === 'MYZ_TO_GL1' ? await this.gl1.mint({ ...request, asset: transfer.quote.targetAsset }) : await this.myzLedger.mint(request);
    if (!issued?.transactionId) throw new Error('Destination ledger did not return a transaction ID');
    transfer.destinationTransactionId = issued.transactionId;
    transfer.state = 'DESTINATION_ISSUED';
    this.record(transfer, 'DESTINATION_ISSUED', { transactionId: issued.transactionId });
    await this.store.save(transfer);
  }

  async rollback(transfer) {
    const request = { reference: transfer.id, lockId: transfer.sourceLockId };
    if (transfer.quote.direction === 'MYZ_TO_GL1') await this.myzLedger.unlock(request);
    else await this.gl1.unlock({ ...request, asset: transfer.quote.sourceAsset });
    transfer.state = 'REFUNDED';
    this.record(transfer, 'REFUNDED', { reason: transfer.error });
  }

  async requireTransfer(id) {
    const transfer = await this.store.get(id);
    if (!transfer) throw new Error('Transfer not found');
    return transfer;
  }

  record(transfer, state, details = {}) {
    const timestamp = this.clock().toISOString();
    transfer.updatedAt = timestamp;
    transfer.audit.push({ state, timestamp, ...details });
  }

  validateAmount(amount) {
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) throw new Error('amount must be positive');
  }
}

module.exports = { Gl1BridgeService, MemoryTransferStore, createGl1Client };
