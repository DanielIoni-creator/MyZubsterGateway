const test = require('node:test');
const assert = require('node:assert/strict');

const { WalletService, MemoryLedgerStore, toCsv } = require('../services/walletService');

function buildService(start = '2026-08-01T00:00:00.000Z') {
  const clock = { now: new Date(start) };
  const service = new WalletService({ store: new MemoryLedgerStore(), clock: () => clock.now });
  return { service, clock };
}

const fund = (service, userId, amount, currency = 'MYZ') => service.deposit({ userId, amount, currency, reference: 'seed' });

test('reports zero balances for an account with no entries', async () => {
  const { service } = buildService();
  const balance = await service.balance('nobody');
  assert.deepEqual(balance.MYZ, { available: 0, pending: 0, locked: 0, posted: 0 });
  assert.deepEqual(balance.XMR, { available: 0, pending: 0, locked: 0, posted: 0 });
});

test('derives balance from ledger entries rather than a stored field', async () => {
  const { service } = buildService();
  await fund(service, 'alice', 100);
  await fund(service, 'alice', 25.5);
  await service.withdraw({ userId: 'alice', amount: 30, currency: 'MYZ' });

  const balance = await service.balance('alice');
  assert.equal(balance.MYZ.available, 95.5);
  assert.equal(balance.XMR.available, 0);

  const entries = (await service.transactions({ userId: 'alice' })).items;
  const sum = entries.reduce((total, entry) => total + (entry.direction === 'CREDIT' ? entry.amount : -entry.amount), 0);
  assert.equal(Number(sum.toFixed(12)), balance.MYZ.available);
});

test('keeps pending and locked out of the available balance', async () => {
  const { service } = buildService();
  await fund(service, 'alice', 100);
  await service.deposit({ userId: 'alice', amount: 40, currency: 'MYZ', state: 'PENDING' });

  const balance = await service.balance('alice');
  assert.equal(balance.MYZ.available, 100);
  assert.equal(balance.MYZ.pending, 40);
});

test('transfer writes both legs and moves the money', async () => {
  const { service } = buildService();
  await fund(service, 'alice', 100);

  const transfer = await service.transfer({ from: 'alice', to: 'bob', amount: 30, currency: 'MYZ', reference: 'order-1' });

  assert.equal(transfer.from, 'alice');
  assert.equal(transfer.to, 'bob');
  assert.equal(transfer.entries.length, 2);
  assert.equal((await service.balance('alice')).MYZ.available, 70);
  assert.equal((await service.balance('bob')).MYZ.available, 30);

  const [debit, credit] = transfer.entries;
  assert.equal(debit.direction, 'DEBIT');
  assert.equal(credit.direction, 'CREDIT');
  assert.equal(debit.transferId, credit.transferId);
  assert.equal(debit.counterparty, 'bob');
  assert.equal(credit.counterparty, 'alice');
});

test('rejects an overdraft and writes nothing', async () => {
  const { service } = buildService();
  await fund(service, 'alice', 10);

  await assert.rejects(service.transfer({ from: 'alice', to: 'bob', amount: 50, currency: 'MYZ' }), /Insufficient MYZ balance/);

  assert.equal((await service.balance('alice')).MYZ.available, 10);
  assert.equal((await service.balance('bob')).MYZ.available, 0);
  assert.equal((await service.transactions({ userId: 'bob' })).total, 0);
});

test('rejects malformed transfers', async () => {
  const { service } = buildService();
  await fund(service, 'alice', 100);

  await assert.rejects(service.transfer({ to: 'bob', amount: 1, currency: 'MYZ' }), /from and to are required/);
  await assert.rejects(service.transfer({ from: 'alice', to: 'alice', amount: 1, currency: 'MYZ' }), /must differ/);
  await assert.rejects(service.transfer({ from: 'alice', to: 'bob', amount: 0, currency: 'MYZ' }), /amount must be positive/);
  await assert.rejects(service.transfer({ from: 'alice', to: 'bob', amount: -5, currency: 'MYZ' }), /amount must be positive/);
  await assert.rejects(service.transfer({ from: 'alice', to: 'bob', amount: 1, currency: 'BTC' }), /currency must be one of/);
});

test('replays a transfer for a repeated idempotency key instead of double-spending', async () => {
  const { service } = buildService();
  await fund(service, 'alice', 100);

  const first = await service.transfer({ from: 'alice', to: 'bob', amount: 40, currency: 'MYZ', idempotencyKey: 'order-7' });
  const second = await service.transfer({ from: 'alice', to: 'bob', amount: 40, currency: 'MYZ', idempotencyKey: 'order-7' });

  assert.equal(second.transferId, first.transferId);
  assert.equal((await service.balance('alice')).MYZ.available, 60);
  assert.equal((await service.balance('bob')).MYZ.available, 40);
});

test('serialises concurrent transfers so the account cannot be overdrawn', async () => {
  const { service } = buildService();
  await fund(service, 'alice', 100);

  const results = await Promise.allSettled([
    service.transfer({ from: 'alice', to: 'bob', amount: 60, currency: 'MYZ' }),
    service.transfer({ from: 'alice', to: 'carol', amount: 60, currency: 'MYZ' }),
  ]);

  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(results.filter((r) => r.status === 'rejected').length, 1);
  assert.equal((await service.balance('alice')).MYZ.available, 40);
});

test('keeps currencies independent', async () => {
  const { service } = buildService();
  await fund(service, 'alice', 100, 'MYZ');
  await fund(service, 'alice', 2, 'XMR');

  await assert.rejects(service.transfer({ from: 'alice', to: 'bob', amount: 5, currency: 'XMR' }), /Insufficient XMR/);
  await service.transfer({ from: 'alice', to: 'bob', amount: 1.5, currency: 'XMR' });

  const balance = await service.balance('alice');
  assert.equal(balance.XMR.available, 0.5);
  assert.equal(balance.MYZ.available, 100);
});

test('survives repeated fractional amounts without float drift', async () => {
  const { service } = buildService();
  await fund(service, 'alice', 0.1, 'XMR');
  await fund(service, 'alice', 0.2, 'XMR');
  assert.equal((await service.balance('alice')).XMR.available, 0.3);
});

test('rejects a withdrawal beyond the available balance', async () => {
  const { service } = buildService();
  await fund(service, 'alice', 10);
  await assert.rejects(service.withdraw({ userId: 'alice', amount: 11, currency: 'MYZ' }), /Insufficient MYZ/);
  assert.equal((await service.balance('alice')).MYZ.available, 10);
});

test('filters and paginates transactions', async () => {
  const { service, clock } = buildService();
  await fund(service, 'alice', 100, 'MYZ');
  clock.now = new Date('2026-08-02T00:00:00.000Z');
  await fund(service, 'alice', 3, 'XMR');
  clock.now = new Date('2026-08-03T00:00:00.000Z');
  await service.transfer({ from: 'alice', to: 'bob', amount: 20, currency: 'MYZ' });

  assert.equal((await service.transactions({ userId: 'alice' })).total, 3);
  assert.equal((await service.transactions({ userId: 'alice', currency: 'XMR' })).total, 1);
  assert.equal((await service.transactions({ userId: 'alice', type: 'TRANSFER' })).total, 1);
  assert.equal((await service.transactions({ userId: 'alice', from: '2026-08-02T00:00:00.000Z' })).total, 2);

  const page = await service.transactions({ userId: 'alice', limit: 2 });
  assert.equal(page.items.length, 2);
  assert.equal(page.total, 3);
  assert.equal((await service.transactions({ userId: 'alice', limit: 9999 })).limit, 200);
});

test('buckets history and carries a closing balance', async () => {
  const { service, clock } = buildService();
  await fund(service, 'alice', 100);
  clock.now = new Date('2026-08-02T09:00:00.000Z');
  await service.transfer({ from: 'alice', to: 'bob', amount: 30, currency: 'MYZ' });
  clock.now = new Date('2026-08-02T18:00:00.000Z');
  await service.transfer({ from: 'alice', to: 'bob', amount: 10, currency: 'MYZ' });

  const daily = await service.history({ userId: 'alice', currency: 'MYZ', interval: 'day' });
  assert.deepEqual(daily.items, [
    { bucket: '2026-08-01', inflow: 100, outflow: 0, net: 100, closingBalance: 100 },
    { bucket: '2026-08-02', inflow: 0, outflow: 40, net: -40, closingBalance: 60 },
  ]);

  const monthly = await service.history({ userId: 'alice', currency: 'MYZ', interval: 'month' });
  assert.equal(monthly.items.length, 1);
  assert.equal(monthly.items[0].bucket, '2026-08');
  assert.equal(monthly.items[0].closingBalance, 60);

  assert.equal(daily.items.at(-1).closingBalance, (await service.balance('alice')).MYZ.available);
});

test('rejects an unknown history interval', async () => {
  const { service } = buildService();
  await assert.rejects(service.history({ userId: 'alice', interval: 'fortnight' }), /interval must be one of/);
  await assert.rejects(service.history({ interval: 'day' }), /userId is required/);
});

test('exports transactions as CSV with escaped fields', async () => {
  const { service } = buildService();
  await service.deposit({ userId: 'alice', amount: 5, currency: 'MYZ', reference: 'note, with comma' });

  const csv = toCsv((await service.transactions({ userId: 'alice' })).items);
  const [header, row] = csv.split('\n');
  assert.equal(header, 'createdAt,transferId,type,direction,currency,amount,state,counterparty,reference');
  assert.match(row, /"note, with comma"/);
  assert.match(row, /DEPOSIT,CREDIT,MYZ,5,POSTED/);
});

test('describeTransfer reports both sides and rejects unknown ids', async () => {
  const { service } = buildService();
  await fund(service, 'alice', 50);
  const transfer = await service.transfer({ from: 'alice', to: 'bob', amount: 5, currency: 'MYZ' });

  const described = await service.describeTransfer(transfer.transferId);
  assert.equal(described.from, 'alice');
  assert.equal(described.to, 'bob');
  assert.equal(described.amount, 5);
  await assert.rejects(service.describeTransfer('missing'), /Transfer not found/);
});
