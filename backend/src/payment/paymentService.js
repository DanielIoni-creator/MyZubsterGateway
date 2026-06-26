const { randomUUID } = require('crypto');
const { normalizeConfirmations } = require('./config');

const PICONERO_PER_XMR = 1_000_000_000_000n;

class PaymentService {
  constructor({ config, paymentStore, moneroClient }) {
    this.config = config;
    this.paymentStore = paymentStore;
    this.moneroClient = moneroClient;
  }

  async createPayment({ amount, amountXmr, description, confirmations, metadata, webhookUrl }) {
    const id = randomUUID();
    const amountAtomic = parseXmrToAtomic(amountXmr ?? amount);
    const requiredConfirmations = normalizeConfirmations(confirmations ?? this.config.defaultConfirmations);
    const label = `myzubster:${id}`;
    const addressInfo = await this.moneroClient.createPaymentAddress({ label });
    const safeDescription = description || 'MyZubster payment';
    const payment = {
      id,
      address: addressInfo.address,
      amountAtomic: amountAtomic.toString(),
      amountXmr: formatAtomicToXmr(amountAtomic),
      description: safeDescription,
      requiredConfirmations,
      status: 'pending',
      paidAtomic: '0',
      confirmations: 0,
      txIds: [],
      subaddressIndex: addressInfo.subaddressIndex,
      externalId: addressInfo.externalId,
      metadata: metadata || {},
      webhookUrl: webhookUrl || null,
      uri: buildMoneroUri(addressInfo.address, amountAtomic, safeDescription),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.paymentStore.put(payment);
    return publicPayment(payment);
  }

  async getStatus(paymentId) {
    const payment = this.paymentStore.get(paymentId);
    if (!payment) return null;

    const chainState = await this.moneroClient.checkPayment(payment);
    const paidAtomic = chainState.paidAtomic;
    const requiredAmount = BigInt(payment.amountAtomic);
    const hasEnoughAmount = paidAtomic >= requiredAmount;
    const hasEnoughConfirmations = Number(chainState.confirmations || 0) >= Number(payment.requiredConfirmations || 0);
    const status = hasEnoughAmount && hasEnoughConfirmations
      ? 'confirmed'
      : hasEnoughAmount
        ? 'detected'
        : 'pending';

    const updated = this.paymentStore.update(payment.id, {
      status,
      paidAtomic: paidAtomic.toString(),
      paidXmr: formatAtomicToXmr(paidAtomic),
      confirmations: Number(chainState.confirmations || 0),
      txIds: chainState.txIds || []
    });

    return publicPayment(updated);
  }

  applyWebhook(payload) {
    const id = payload.paymentId || payload.payment_id || payload.id;
    const address = payload.address;
    const externalId = payload.externalId || payload.external_id;
    const payment = (id && this.paymentStore.get(id))
      || (address && this.paymentStore.findByAddress(address))
      || (externalId && this.paymentStore.findByExternalId(externalId));
    if (!payment) return null;

    const paidAtomic = BigInt(String(payload.amountAtomic ?? payload.amount_atomic ?? payload.paidAtomic ?? payload.paid_atomic ?? payment.paidAtomic ?? 0));
    const confirmations = Number(payload.confirmations ?? payment.confirmations ?? 0);
    const requiredAmount = BigInt(payment.amountAtomic);
    const status = paidAtomic >= requiredAmount && confirmations >= Number(payment.requiredConfirmations)
      ? 'confirmed'
      : paidAtomic >= requiredAmount
        ? 'detected'
        : payment.status;

    return publicPayment(this.paymentStore.update(payment.id, {
      status,
      paidAtomic: paidAtomic.toString(),
      paidXmr: formatAtomicToXmr(paidAtomic),
      confirmations,
      txIds: payload.txIds || payload.txids || payment.txIds || []
    }));
  }
}

function parseXmrToAtomic(value) {
  if (value === undefined || value === null || value === '') {
    throw new Error('amount is required');
  }
  const normalized = String(value).trim().replace(',', '.');
  if (!/^\d+(\.\d{1,12})?$/.test(normalized)) {
    throw new Error('amount must be a positive XMR value with up to 12 decimals');
  }
  const [whole, fraction = ''] = normalized.split('.');
  const atomic = BigInt(whole) * PICONERO_PER_XMR + BigInt((fraction + '0'.repeat(12)).slice(0, 12));
  if (atomic <= 0n) throw new Error('amount must be greater than zero');
  return atomic;
}

function formatAtomicToXmr(atomic) {
  const value = BigInt(atomic);
  const whole = value / PICONERO_PER_XMR;
  const fraction = (value % PICONERO_PER_XMR).toString().padStart(12, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function buildMoneroUri(address, amountAtomic, description) {
  const params = new URLSearchParams({
    amount: formatAtomicToXmr(amountAtomic),
    tx_description: description
  });
  return `monero:${address}?${params.toString()}`;
}

function publicPayment(payment) {
  if (!payment) return null;
  return {
    paymentId: payment.id,
    address: payment.address,
    amountXmr: payment.amountXmr,
    amountAtomic: payment.amountAtomic,
    description: payment.description,
    requiredConfirmations: payment.requiredConfirmations,
    status: payment.status,
    paidXmr: payment.paidXmr || '0',
    paidAtomic: payment.paidAtomic || '0',
    confirmations: payment.confirmations || 0,
    txIds: payment.txIds || [],
    uri: payment.uri,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt
  };
}

module.exports = {
  PaymentService,
  parseXmrToAtomic,
  formatAtomicToXmr,
  buildMoneroUri
};
