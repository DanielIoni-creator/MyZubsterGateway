const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {
  MemoryPaymentStore,
  RobotPaymentService,
  verifyWebhookSignature,
} = require('../services/robotPaymentService');

function fixture() {
  const refunds = [];
  const adapter = {
    async createAddress(reference) { return { address: `wallet-${reference}`, walletReference: reference }; },
    async refund(request) { refunds.push(request); return { transactionHash: 'refund-tx' }; },
  };
  const service = new RobotPaymentService({
    adapters: { MYZ: adapter, XMR: adapter },
    store: new MemoryPaymentStore(),
    clock: () => new Date('2026-08-06T00:00:00.000Z'),
  });
  return { service, refunds };
}

async function create(service, asset = 'MYZ') {
  return service.createPayment({ customerId: 'customer-1', robotId: 'robot-1', asset, amount: '25', refundAddress: 'refund-address' });
}

describe('robot payment integration', () => {
  it('creates a unique temporary address', async () => {
    const { service } = fixture();
    const payment = await create(service);
    assert.equal(payment.status, 'AWAITING_PAYMENT');
    assert.match(payment.paymentAddress, /^wallet-/);
  });

  it('holds confirmed MYZ in escrow and releases it', async () => {
    const { service } = fixture();
    const payment = await create(service);
    const confirming = await service.recordConfirmation({ paymentId: payment.id, transactionHash: 'myz-tx', confirmations: 2, amount: '25' });
    assert.equal(confirming.status, 'CONFIRMING');
    const escrowed = await service.recordConfirmation({ paymentId: payment.id, transactionHash: 'myz-tx', confirmations: 3, amount: '25' });
    assert.equal(escrowed.status, 'IN_ESCROW');
    assert.equal((await service.release(payment.id)).status, 'RELEASED');
  });

  it('requires ten confirmations for XMR', async () => {
    const { service } = fixture();
    const payment = await create(service, 'XMR');
    assert.equal((await service.recordConfirmation({ paymentId: payment.id, transactionHash: 'xmr-tx', confirmations: 9, amount: '25' })).status, 'CONFIRMING');
    assert.equal((await service.recordConfirmation({ paymentId: payment.id, transactionHash: 'xmr-tx', confirmations: 10, amount: '25' })).status, 'IN_ESCROW');
  });

  it('refunds a disputed escrow payment through its wallet adapter', async () => {
    const { service, refunds } = fixture();
    const payment = await create(service);
    await service.recordConfirmation({ paymentId: payment.id, transactionHash: 'myz-tx', confirmations: 3, amount: '25' });
    await service.dispute(payment.id, 'service not delivered');
    const refunded = await service.refund(payment.id, 'approved');
    assert.equal(refunded.refundTransactionHash, 'refund-tx');
    assert.equal(refunds.length, 1);
  });

  it('rejects underpayments and forged webhooks', async () => {
    const { service } = fixture();
    const payment = await create(service);
    await assert.rejects(service.recordConfirmation({ paymentId: payment.id, transactionHash: 'tx', confirmations: 3, amount: '24' }), /below/);
    const body = Buffer.from('{"paymentId":"1"}');
    const valid = crypto.createHmac('sha256', 'secret').update(body).digest('hex');
    assert.equal(verifyWebhookSignature(body, `sha256=${valid}`, 'secret'), true);
    assert.equal(verifyWebhookSignature(body, `sha256=${'0'.repeat(64)}`, 'secret'), false);
  });
});
