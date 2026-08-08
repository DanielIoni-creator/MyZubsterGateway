const test = require('node:test');
const assert = require('node:assert/strict');

const {
  PaymentVerificationService,
  MemoryVerificationStore,
  SimulatedChain,
} = require('../services/paymentVerificationService');

const NOW = new Date('2026-08-07T12:00:00.000Z');

function build({ transactions = {}, requiredConfirmations = 10, now = NOW } = {}) {
  const clock = { now };
  const chain = new SimulatedChain(transactions);
  const service = new PaymentVerificationService({
    chain,
    store: new MemoryVerificationStore(),
    requiredConfirmations,
    clock: () => clock.now,
  });
  return { service, chain, clock };
}

const subject = (overrides = {}) => ({
  paymentId: 'pay-1',
  txId: 'tx-1',
  expectedAmount: 0.5,
  expectedAddress: '45ADDR',
  currency: 'XMR',
  createdAt: NOW.toISOString(),
  ...overrides,
});

test('requires a chain adapter', () => {
  assert.throws(() => new PaymentVerificationService({}), /chain adapter is required/);
});

test('rejects malformed subjects', async () => {
  const { service } = build();
  await assert.rejects(service.verify({ txId: 'tx-1', expectedAmount: 1 }), /paymentId is required/);
  await assert.rejects(service.verify({ paymentId: 'p', expectedAmount: 1 }), /txId is required/);
  await assert.rejects(service.verify({ paymentId: 'p', txId: 't', expectedAmount: 0 }), /expectedAmount must be positive/);
});

test('stays PENDING until the confirmation target is reached', async () => {
  const { service } = build({ transactions: { 'tx-1': { amount: 0.5, address: '45ADDR', confirmations: 3, height: 100 } } });

  const record = await service.verify(subject());

  assert.equal(record.verdict, 'PENDING');
  assert.equal(record.confirmations, 3);
  assert.equal(record.requiredConfirmations, 10);
  assert.deepEqual(record.anomalies, []);
});

test('confirms once enough blocks are on top', async () => {
  const { service, chain } = build({ transactions: { 'tx-1': { amount: 0.5, address: '45ADDR', confirmations: 3, height: 100 } } });
  await service.verify(subject());

  chain.set('tx-1', { amount: 0.5, address: '45ADDR', confirmations: 12, height: 100 });
  const record = await service.verify(subject());

  assert.equal(record.verdict, 'CONFIRMED');
  assert.equal(record.observedAmount, 0.5);
  assert.deepEqual(record.history.map((entry) => entry.verdict), ['PENDING', 'CONFIRMED']);
});

test('tolerates a briefly missing transaction, then rejects a stale one', async () => {
  const { service, clock } = build();

  const fresh = await service.verify(subject());
  assert.equal(fresh.verdict, 'PENDING');
  assert.deepEqual(fresh.anomalies, []);

  clock.now = new Date(NOW.getTime() + 2 * 60 * 60 * 1000);
  const stale = await service.verify(subject());

  assert.equal(stale.verdict, 'REJECTED');
  assert.equal(stale.anomalies[0].code, 'TX_NOT_FOUND');
});

test('flags an underpayment and refuses to confirm it', async () => {
  const { service } = build({ transactions: { 'tx-1': { amount: 0.4, address: '45ADDR', confirmations: 50 } } });

  const record = await service.verify(subject());

  assert.equal(record.verdict, 'REJECTED');
  assert.equal(record.anomalies[0].code, 'UNDERPAID');
  assert.match(record.anomalies[0].detail, /delta -0\.1/);
});

test('flags an overpayment but still confirms it', async () => {
  const { service } = build({ transactions: { 'tx-1': { amount: 0.7, address: '45ADDR', confirmations: 50 } } });

  const record = await service.verify(subject());

  // The customer is not short-changed by holding their goods hostage over a
  // surplus, so an overpayment is reported without blocking settlement.
  assert.equal(record.verdict, 'CONFIRMED');
  assert.equal(record.anomalies[0].code, 'OVERPAID');
});

test('flags a payment sent to the wrong address', async () => {
  const { service } = build({ transactions: { 'tx-1': { amount: 0.5, address: '45SOMEONEELSE', confirmations: 50 } } });

  const record = await service.verify(subject());

  assert.equal(record.verdict, 'REJECTED');
  assert.equal(record.anomalies[0].code, 'ADDRESS_MISMATCH');
});

test('flags a daemon-reported double spend', async () => {
  const { service, chain } = build();
  chain.transactions.set('tx-1', { amount: 0.5, address: '45ADDR', confirmations: 50, doubleSpendSeen: true });

  const record = await service.verify(subject());

  assert.equal(record.verdict, 'REJECTED');
  assert.ok(record.anomalies.some((a) => a.code === 'DOUBLE_SPEND_SEEN'));
});

test('detects a reorg when confirmations move backwards', async () => {
  const { service, chain } = build({ transactions: { 'tx-1': { amount: 0.5, address: '45ADDR', confirmations: 8 } } });
  await service.verify(subject());

  chain.set('tx-1', { amount: 0.5, address: '45ADDR', confirmations: 2 });
  const record = await service.verify(subject());

  assert.equal(record.verdict, 'REJECTED');
  assert.ok(record.anomalies.some((a) => a.code === 'REORG_SUSPECTED'));
});

test('refuses to credit the same transaction to two payments', async () => {
  const { service } = build({ transactions: { 'tx-1': { amount: 0.5, address: '45ADDR', confirmations: 50 } } });
  await service.verify(subject());

  const second = await service.verify(subject({ paymentId: 'pay-2' }));

  assert.equal(second.verdict, 'REJECTED');
  assert.ok(second.anomalies.some((a) => a.code === 'TXID_REUSED'));
});

test('sweep skips records that already reached a terminal verdict', async () => {
  const { service, chain } = build({ transactions: { 'tx-1': { amount: 0.5, address: '45ADDR', confirmations: 50 } } });
  const subjects = [subject()];

  const [first] = await service.sweep(subjects);
  assert.equal(first.verdict, 'CONFIRMED');

  // Even if the chain view changes afterwards, a settled payment is not reopened.
  chain.set('tx-1', { amount: 0.1, address: '45ADDR', confirmations: 50 });
  const [second] = await service.sweep(subjects);
  assert.equal(second.verdict, 'CONFIRMED');
  assert.equal(second.observedAmount, 0.5);
});

test('sweep isolates a failing chain lookup to one subject', async () => {
  const { service } = build({ transactions: { 'tx-ok': { amount: 0.5, address: '45ADDR', confirmations: 50 } } });
  service.chain.getTransaction = async (txId) => {
    if (txId === 'tx-bad') throw new Error('daemon unreachable');
    return { found: true, amount: 0.5, address: '45ADDR', confirmations: 50, doubleSpendSeen: false };
  };

  const results = await service.sweep([
    subject({ paymentId: 'pay-bad', txId: 'tx-bad' }),
    subject({ paymentId: 'pay-ok', txId: 'tx-ok' }),
  ]);

  assert.equal(results[0].verdict, 'ERROR');
  assert.match(results[0].error, /daemon unreachable/);
  assert.equal(results[1].verdict, 'CONFIRMED');
});

test('builds a verification report', async () => {
  const { service } = build({
    transactions: {
      'tx-1': { amount: 0.5, address: '45ADDR', confirmations: 50 },
      'tx-2': { amount: 0.2, address: '45ADDR', confirmations: 50 },
      'tx-3': { amount: 1, address: '45ADDR', confirmations: 1 },
    },
  });

  await service.verify(subject());
  await service.verify(subject({ paymentId: 'pay-2', txId: 'tx-2', expectedAmount: 0.3 }));
  await service.verify(subject({ paymentId: 'pay-3', txId: 'tx-3', expectedAmount: 1 }));

  const report = await service.report();

  assert.equal(report.total, 3);
  assert.equal(report.byVerdict.CONFIRMED, 1);
  assert.equal(report.byVerdict.REJECTED, 1);
  assert.equal(report.byVerdict.PENDING, 1);
  assert.equal(report.byAnomaly.UNDERPAID, 1);
  assert.equal(report.confirmedValue, 0.5);

  const anomalies = await service.anomalies();
  assert.equal(anomalies.length, 1);
  assert.equal(anomalies[0].paymentId, 'pay-2');
});

test('get() rejects an unknown payment', async () => {
  const { service } = build();
  await assert.rejects(service.get('nope'), /Verification record not found/);
});
