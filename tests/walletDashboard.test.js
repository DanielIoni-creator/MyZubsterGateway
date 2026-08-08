const test = require('node:test');
const assert = require('node:assert/strict');

const {
  formatAmount,
  summariseBalances,
  buildSeries,
  sparklinePath,
  balanceAlerts,
  toCsv,
} = require('../frontend/dist/assets/wallet-dashboard.js');

const tx = (overrides = {}) => ({
  createdAt: '2026-08-05T10:00:00.000Z',
  currency: 'XMR',
  direction: 'CREDIT',
  amount: 1,
  state: 'POSTED',
  counterparty: null,
  reference: null,
  ...overrides,
});

test('formats each currency at its own precision without scientific notation', () => {
  assert.equal(formatAmount(0.000000000001, 'XMR'), '0.000000000001');
  assert.equal(formatAmount(1.5, 'XMR'), '1.5');
  assert.equal(formatAmount(2, 'XMR'), '2');
  assert.equal(formatAmount(1234.5678, 'MYZ'), '1234.5678');
  assert.equal(formatAmount(0.00001, 'MYZ'), '0');
});

test('derives balances per currency from the transactions', () => {
  const balances = summariseBalances([
    tx({ currency: 'XMR', direction: 'CREDIT', amount: 2 }),
    tx({ currency: 'XMR', direction: 'DEBIT', amount: 0.5 }),
    tx({ currency: 'MYZ', direction: 'CREDIT', amount: 100 }),
  ]);

  assert.equal(balances.XMR.available, 1.5);
  assert.equal(balances.XMR.inflow, 2);
  assert.equal(balances.XMR.outflow, 0.5);
  assert.equal(balances.XMR.transactions, 2);
  assert.equal(balances.MYZ.available, 100);
});

test('keeps pending funds out of the available balance', () => {
  const balances = summariseBalances([
    tx({ amount: 1, state: 'POSTED' }),
    tx({ amount: 5, state: 'PENDING' }),
  ]);

  assert.equal(balances.XMR.available, 1);
  assert.equal(balances.XMR.pending, 5);
  assert.equal(balances.XMR.inflow, 1);
});

test('reports zeroes for a currency with no activity', () => {
  const balances = summariseBalances([]);
  assert.deepEqual(balances.MYZ, { currency: 'MYZ', available: 0, pending: 0, inflow: 0, outflow: 0, transactions: 0 });
});

test('does not accumulate float error across many fractional entries', () => {
  const balances = summariseBalances([
    tx({ amount: 0.1 }),
    tx({ amount: 0.2 }),
  ]);
  assert.equal(balances.XMR.available, 0.3);
});

test('builds one point per day, including days with no activity', () => {
  const series = buildSeries(
    [
      tx({ createdAt: '2026-08-05T10:00:00.000Z', amount: 2 }),
      tx({ createdAt: '2026-08-07T09:00:00.000Z', amount: 1 }),
    ],
    { currency: 'XMR', days: 4, today: '2026-08-07T23:00:00.000Z' },
  );

  assert.deepEqual(series.map((point) => point.date), ['2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07']);
  // A quiet day carries the previous balance forward rather than vanishing.
  assert.deepEqual(series.map((point) => point.balance), [0, 2, 2, 3]);
  assert.deepEqual(series.map((point) => point.net), [0, 2, 0, 1]);
});

test('folds activity older than the window into the opening balance', () => {
  const series = buildSeries(
    [
      tx({ createdAt: '2026-07-01T10:00:00.000Z', amount: 5 }),
      tx({ createdAt: '2026-08-07T10:00:00.000Z', amount: 1 }),
    ],
    { currency: 'XMR', days: 3, today: '2026-08-07T23:00:00.000Z' },
  );

  // The old deposit is not drawn, but the line does not start from zero either.
  assert.equal(series[0].balance, 5);
  assert.equal(series.at(-1).balance, 6);
});

test('excludes other currencies and pending rows from the series', () => {
  const series = buildSeries(
    [
      tx({ createdAt: '2026-08-07T10:00:00.000Z', amount: 1, currency: 'MYZ' }),
      tx({ createdAt: '2026-08-07T11:00:00.000Z', amount: 9, state: 'PENDING' }),
    ],
    { currency: 'XMR', days: 2, today: '2026-08-07T23:00:00.000Z' },
  );

  assert.deepEqual(series.map((point) => point.balance), [0, 0]);
});

test('draws a sparkline path inside its box', () => {
  const points = [{ balance: 0 }, { balance: 5 }, { balance: 10 }];
  const path = sparklinePath(points, 100, 40, 4);

  assert.match(path, /^M 4\.00 36\.00 L /);
  const ys = [...path.matchAll(/[ML] [\d.]+ ([\d.]+)/g)].map((match) => Number(match[1]));
  assert.ok(Math.min(...ys) >= 4 && Math.max(...ys) <= 36);
});

test('a flat or single-point series still produces a line', () => {
  assert.equal(sparklinePath([], 100, 40), '');
  assert.match(sparklinePath([{ balance: 7 }], 100, 40, 4), /^M 4 20 L 96 20$/);

  // A balance that did not move is drawn mid-box, not pinned to the floor:
  // a line along the bottom reads as "empty wallet", which would be wrong.
  const flat = sparklinePath([{ balance: 3 }, { balance: 3 }], 100, 40, 4);
  const ys = [...flat.matchAll(/[ML] [\d.]+ ([\d.]+)/g)].map((match) => Number(match[1]));
  assert.deepEqual(ys, [20, 20]);
});

test('raises a low-balance warning on settled funds only', () => {
  const balances = summariseBalances([
    tx({ currency: 'XMR', amount: 0.05, state: 'POSTED' }),
    tx({ currency: 'XMR', amount: 10, state: 'PENDING' }),
  ]);
  const alerts = balanceAlerts(balances, { XMR: { low: 0.1 } });

  // The pending 10 must not silence the warning: it is not spendable yet.
  assert.ok(alerts.some((alert) => alert.code === 'LOW_BALANCE' && alert.currency === 'XMR'));
  assert.ok(alerts.some((alert) => alert.code === 'PENDING_FUNDS'));
});

test('stays quiet when the balance is healthy', () => {
  const balances = summariseBalances([tx({ currency: 'XMR', amount: 5 })]);
  assert.deepEqual(balanceAlerts(balances, { XMR: { low: 1 } }), []);
});

test('flags a negative balance as an error', () => {
  const balances = summariseBalances([tx({ currency: 'XMR', direction: 'DEBIT', amount: 3 })]);
  const alerts = balanceAlerts(balances, {});

  assert.ok(alerts.some((alert) => alert.code === 'NEGATIVE_BALANCE' && alert.level === 'error'));
});

test('exports CSV with a header and escaped fields', () => {
  const csv = toCsv([tx({ reference: 'note, with comma', counterparty: 'bob' })]);
  const [header, row] = csv.split('\n');

  assert.equal(header, 'createdAt,currency,direction,amount,state,counterparty,reference');
  assert.match(row, /"note, with comma"/);
  assert.match(row, /XMR,CREDIT,1,POSTED,bob/);
});

test('neutralises spreadsheet formula injection in exported cells', () => {
  const csv = toCsv([tx({ reference: '=cmd|calc!A1' })]);

  // A cell starting with = would execute on open in Excel; it is quoted off.
  assert.match(csv.split('\n')[1], /'=cmd\|calc!A1/);
  assert.ok(!/,=cmd/.test(csv));
});

test('exports a header even with no rows', () => {
  assert.equal(toCsv([]), 'createdAt,currency,direction,amount,state,counterparty,reference');
});
