const crypto = require('node:crypto');
const axios = require('axios');

const ASSETS = Object.freeze({
  MYZ: { confirmations: 3 },
  XMR: { confirmations: 10 },
});

class MemoryPaymentStore {
  constructor() {
    this.payments = new Map();
  }
  async save(payment) {
    this.payments.set(payment.id, structuredClone(payment));
    return structuredClone(payment);
  }
  async get(id) {
    const payment = this.payments.get(id);
    return payment ? structuredClone(payment) : null;
  }
  async list() {
    return [...this.payments.values()].map((payment) => structuredClone(payment)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

function createRpcWalletAdapter({ asset, baseUrl, token }) {
  if (!ASSETS[asset]) throw new Error(`Unsupported asset: ${asset}`);
  if (!baseUrl) throw new Error(`${asset} wallet URL is required`);
  const client = axios.create({
    baseURL: baseUrl,
    timeout: 15000,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  return {
    asset,
    async createAddress(reference) {
      const response = await client.post('/addresses', { reference });
      if (!response.data?.address) throw new Error(`${asset} wallet did not return an address`);
      return { address: response.data.address, walletReference: response.data.reference || reference };
    },
    async refund({ address, amount, reference }) {
      const response = await client.post('/refunds', { address, amount, reference });
      if (!response.data?.transactionHash) throw new Error(`${asset} wallet did not return a transaction hash`);
      return { transactionHash: response.data.transactionHash };
    },
  };
}

function verifyWebhookSignature(rawBody, signature, secret) {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const provided = signature.replace(/^sha256=/, '');
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

class RobotPaymentService {
  constructor({ adapters, store = new MemoryPaymentStore(), clock = () => new Date() }) {
    this.adapters = adapters || {};
    this.store = store;
    this.clock = clock;
  }

  async createPayment({ customerId, robotId, asset, amount, refundAddress }) {
    asset = String(asset || '').toUpperCase();
    if (!customerId || !robotId) throw new Error('customerId and robotId are required');
    if (!ASSETS[asset] || !this.adapters[asset]) throw new Error(`Unsupported asset: ${asset}`);
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) throw new Error('amount must be positive');
    if (!refundAddress) throw new Error('refundAddress is required');

    const id = crypto.randomUUID();
    const wallet = await this.adapters[asset].createAddress(id);
    return this.store.save({
      id,
      customerId,
      robotId,
      asset,
      amount: String(amount),
      refundAddress,
      paymentAddress: wallet.address,
      walletReference: wallet.walletReference,
      status: 'AWAITING_PAYMENT',
      confirmations: 0,
      requiredConfirmations: ASSETS[asset].confirmations,
      transactionHash: null,
      refundTransactionHash: null,
      createdAt: this.clock().toISOString(),
      updatedAt: this.clock().toISOString(),
    });
  }

  async recordConfirmation({ paymentId, transactionHash, confirmations, amount }) {
    const payment = await this.requirePayment(paymentId);
    if (!['AWAITING_PAYMENT', 'CONFIRMING'].includes(payment.status)) return payment;
    if (!transactionHash) throw new Error('transactionHash is required');
    if (Number(amount) < Number(payment.amount)) throw new Error('Payment amount is below the requested amount');

    payment.transactionHash = transactionHash;
    payment.confirmations = Math.max(payment.confirmations, Number(confirmations) || 0);
    payment.status = payment.confirmations >= payment.requiredConfirmations ? 'IN_ESCROW' : 'CONFIRMING';
    payment.updatedAt = this.clock().toISOString();
    return this.store.save(payment);
  }

  async release(paymentId) {
    const payment = await this.requirePayment(paymentId);
    if (payment.status !== 'IN_ESCROW') throw new Error('Only escrowed payments can be released');
    payment.status = 'RELEASED';
    payment.releasedAt = this.clock().toISOString();
    payment.updatedAt = payment.releasedAt;
    return this.store.save(payment);
  }

  async refund(paymentId, reason) {
    const payment = await this.requirePayment(paymentId);
    if (!['IN_ESCROW', 'DISPUTED'].includes(payment.status)) throw new Error('Only escrowed or disputed payments can be refunded');
    const result = await this.adapters[payment.asset].refund({
      address: payment.refundAddress,
      amount: payment.amount,
      reference: payment.id,
    });
    payment.status = 'REFUNDED';
    payment.refundReason = reason || 'dispute resolved in customer favour';
    payment.refundTransactionHash = result.transactionHash;
    payment.updatedAt = this.clock().toISOString();
    return this.store.save(payment);
  }

  async dispute(paymentId, reason) {
    const payment = await this.requirePayment(paymentId);
    if (payment.status !== 'IN_ESCROW') throw new Error('Only escrowed payments can be disputed');
    payment.status = 'DISPUTED';
    payment.disputeReason = reason || 'not specified';
    payment.updatedAt = this.clock().toISOString();
    return this.store.save(payment);
  }

  async requirePayment(id) {
    const payment = await this.store.get(id);
    if (!payment) throw new Error('Payment not found');
    return payment;
  }
}

module.exports = {
  ASSETS,
  MemoryPaymentStore,
  RobotPaymentService,
  createRpcWalletAdapter,
  verifyWebhookSignature,
};
