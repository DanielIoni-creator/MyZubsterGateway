const test = require('node:test');
const assert = require('node:assert/strict');

const {
  PaymentService,
  MemoryPaymentStore,
  createWebhookDispatcher,
  signWebhook,
  verifyWebhook,
  publicView,
} = require('../services/paymentService');

const FIXED = new Date('2026-08-07T10:00:00.000Z');

function fakeClient(responses = []) {
  const calls = [];
  return {
    calls,
    async post(url, body, config) {
      calls.push({ url, body, config });
      const next = responses.shift();
      if (next instanceof Error) throw next;
      return next || { status: 200 };
    },
  };
}

function buildService({ responses = [], attempts = 3 } = {}) {
  const client = fakeClient(responses);
  const dispatcher = createWebhookDispatcher({ client, attempts, sleep: async () => {}, clock: () => FIXED });
  const service = new PaymentService({ store: new MemoryPaymentStore(), dispatcher, clock: () => FIXED });
  return { service, client };
}

test('creates a pending payment and issues a webhook secret when a callback is set', async () => {
  const { service } = buildService();
  const payment = await service.createPayment({
    userId: 'user-1', amount: 12.5, currency: 'MYZ', reference: 'order-9', callbackUrl: 'https://shop.example/hooks',
  });

  assert.equal(payment.status, 'PENDING');
  assert.equal(payment.amount, 12.5);
  assert.equal(payment.confirmations, 0);
  assert.equal(typeof payment.webhookSecret, 'string');
  assert.equal(payment.webhookSecret.length, 64);
  assert.deepEqual(payment.audit, [{ status: 'PENDING', timestamp: FIXED.toISOString() }]);
});

test('omits the webhook secret when no callback is configured', async () => {
  const { service } = buildService();
  const payment = await service.createPayment({ userId: 'user-1', amount: 1, currency: 'XMR' });
  assert.equal(payment.webhookSecret, null);
});

test('rejects invalid input', async () => {
  const { service } = buildService();
  await assert.rejects(service.createPayment({ amount: 1, currency: 'MYZ' }), /userId is required/);
  await assert.rejects(service.createPayment({ userId: 'u', amount: 0, currency: 'MYZ' }), /amount must be positive/);
  await assert.rejects(service.createPayment({ userId: 'u', amount: -3, currency: 'MYZ' }), /amount must be positive/);
  await assert.rejects(service.createPayment({ userId: 'u', amount: 1, currency: 'BTC' }), /currency must be one of/);
  await assert.rejects(service.createPayment({ userId: 'u', amount: 1, currency: 'MYZ', callbackUrl: 'ftp://x/y' }), /http or https/);
  await assert.rejects(service.createPayment({ userId: 'u', amount: 1, currency: 'MYZ', callbackUrl: 'not a url' }), /valid URL/);
});

test('replays the same payment for a repeated idempotency key', async () => {
  const { service } = buildService();
  const first = await service.createPayment({ userId: 'u', amount: 5, currency: 'MYZ', idempotencyKey: 'key-1' });
  const second = await service.createPayment({ userId: 'u', amount: 5, currency: 'MYZ', idempotencyKey: 'key-1' });
  assert.equal(second.id, first.id);
  assert.equal((await service.list()).total, 1);
});

test('walks the status machine and records an audit trail', async () => {
  const { service } = buildService();
  const created = await service.createPayment({ userId: 'u', amount: 2, currency: 'XMR' });

  await service.transition(created.id, 'CONFIRMING', { confirmations: 1 });
  const done = await service.transition(created.id, 'COMPLETED', { txId: 'tx-abc', confirmations: 10 });

  assert.equal(done.status, 'COMPLETED');
  assert.equal(done.txId, 'tx-abc');
  assert.equal(done.confirmations, 10);
  assert.deepEqual(done.audit.map((entry) => entry.status), ['PENDING', 'CONFIRMING', 'COMPLETED']);
});

test('refuses illegal and post-terminal transitions', async () => {
  const { service } = buildService();
  const created = await service.createPayment({ userId: 'u', amount: 2, currency: 'XMR' });

  await assert.rejects(service.transition(created.id, 'REFUNDED'), /Cannot move payment from PENDING to REFUNDED/);

  await service.transition(created.id, 'COMPLETED');
  await assert.rejects(service.transition(created.id, 'FAILED'), /already COMPLETED/);
  await assert.rejects(service.transition('missing-id', 'COMPLETED'), /Payment not found/);
});

test('signs outbound webhooks so the receiver can verify them', async () => {
  const { service, client } = buildService();
  const created = await service.createPayment({ userId: 'u', amount: 7, currency: 'MYZ', callbackUrl: 'https://shop.example/hooks' });

  await service.transition(created.id, 'COMPLETED', { txId: 'tx-1' });

  assert.equal(client.calls.length, 1);
  const [call] = client.calls;
  assert.equal(call.url, 'https://shop.example/hooks');
  assert.equal(call.config.headers['x-myz-event'], 'payment.completed');

  const timestamp = call.config.headers['x-myz-timestamp'];
  const signature = call.config.headers['x-myz-signature'];
  assert.ok(verifyWebhook(created.webhookSecret, timestamp, call.body, signature, { now: FIXED.getTime() }));

  const body = JSON.parse(call.body);
  assert.equal(body.event, 'payment.completed');
  assert.equal(body.paymentId, created.id);
  assert.equal(body.txId, 'tx-1');

  const stored = await service.store.get(created.id);
  assert.equal(stored.deliveries.length, 1);
  assert.equal(stored.deliveries[0].ok, true);
  assert.equal(stored.deliveries[0].attempts, 1);
});

test('retries a failing webhook and records the failure without blocking the transition', async () => {
  const boom = () => new Error('connect ECONNREFUSED');
  const { service, client } = buildService({ responses: [boom(), boom(), boom()] });
  const created = await service.createPayment({ userId: 'u', amount: 7, currency: 'MYZ', callbackUrl: 'https://down.example/hooks' });

  const result = await service.transition(created.id, 'FAILED', { reason: 'insufficient funds' });

  assert.equal(result.status, 'FAILED');
  assert.equal(client.calls.length, 3);
  assert.equal(result.deliveries[0].ok, false);
  assert.equal(result.deliveries[0].attempts, 3);
  assert.match(result.deliveries[0].error, /ECONNREFUSED/);
});

test('skips webhook delivery when no callback is configured', async () => {
  const { service, client } = buildService();
  const created = await service.createPayment({ userId: 'u', amount: 1, currency: 'MYZ' });
  await service.transition(created.id, 'COMPLETED');
  assert.equal(client.calls.length, 0);
});

test('filters and paginates history', async () => {
  const { service } = buildService();
  await service.createPayment({ userId: 'alice', amount: 1, currency: 'MYZ' });
  await service.createPayment({ userId: 'alice', amount: 2, currency: 'XMR' });
  const third = await service.createPayment({ userId: 'bob', amount: 3, currency: 'MYZ' });
  await service.transition(third.id, 'COMPLETED');

  assert.equal((await service.list({ userId: 'alice' })).total, 2);
  assert.equal((await service.list({ currency: 'XMR' })).total, 1);
  assert.equal((await service.list({ status: 'COMPLETED' })).total, 1);
  assert.equal((await service.list({ status: 'PENDING' })).total, 2);

  const page = await service.list({ limit: 2, offset: 0 });
  assert.equal(page.total, 3);
  assert.equal(page.items.length, 2);
  assert.equal(page.limit, 2);

  const rest = await service.list({ limit: 2, offset: 2 });
  assert.equal(rest.items.length, 1);
});

test('caps the page size', async () => {
  const { service } = buildService();
  assert.equal((await service.list({ limit: 5000 })).limit, 200);
});

test('rejects tampered payloads and stale timestamps', () => {
  const secret = 'a'.repeat(64);
  const now = FIXED.getTime();
  const body = JSON.stringify({ event: 'payment.completed', amount: 10 });
  const signature = signWebhook(secret, now, body);

  assert.ok(verifyWebhook(secret, now, body, signature, { now }));
  assert.ok(verifyWebhook(secret, now, body, `sha256=${signature}`, { now }));

  const tampered = JSON.stringify({ event: 'payment.completed', amount: 1000 });
  assert.equal(verifyWebhook(secret, now, tampered, signature, { now }), false);
  assert.equal(verifyWebhook('b'.repeat(64), now, body, signature, { now }), false);
  assert.equal(verifyWebhook(secret, now, body, signature, { now: now + 10 * 60 * 1000 }), false);
  assert.equal(verifyWebhook(secret, now, body, 'short', { now }), false);
});

test('publicView hides the webhook secret unless explicitly requested', async () => {
  const { service } = buildService();
  const created = await service.createPayment({ userId: 'u', amount: 1, currency: 'MYZ', callbackUrl: 'https://shop.example/hooks' });

  assert.equal(publicView(created).webhookSecret, undefined);
  assert.equal(publicView(created, { includeSecret: true }).webhookSecret, created.webhookSecret);
});
