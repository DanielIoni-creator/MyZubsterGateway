const test = require('node:test');
const assert = require('node:assert/strict');

const {
  MoneroPaymentGateway,
  MemoryInvoiceStore,
  SimulatedWalletRpc,
  createWalletRpc,
  toAtomic,
  formatXmr,
  redact,
} = require('../services/moneroGatewayService');

const START = new Date('2026-08-07T00:00:00.000Z');

function build(options = {}) {
  const clock = { now: START };
  const rpc = new SimulatedWalletRpc();
  const gateway = new MoneroPaymentGateway({ rpc, store: new MemoryInvoiceStore(), clock: () => clock.now, ...options });
  return { gateway, rpc, clock };
}

const order = (overrides = {}) => ({ orderId: 'order-1', amountXmr: '0.5', stationId: 'station-7', pumpId: '3', ...overrides });

test('atomic conversion is exact at 12 decimals', () => {
  assert.equal(toAtomic('1').toString(), '1000000000000');
  assert.equal(toAtomic('0.000000000001').toString(), '1');
  assert.equal(toAtomic('0.1').toString(), '100000000000');

  // The float trap: 0.1 + 0.2 must be exactly 0.3.
  assert.equal(formatXmr(toAtomic('0.1') + toAtomic('0.2')), '0.3');
  assert.equal(formatXmr(toAtomic('12.345678901234')), '12.345678901234');
  assert.equal(formatXmr('1000000000000'), '1');
});

test('rejects amounts a payment gateway must not accept', () => {
  assert.throws(() => toAtomic('0'), /greater than zero/);
  assert.throws(() => toAtomic('-1'), /positive decimal/);
  assert.throws(() => toAtomic('0.0000000000001'), /at most 12 places/);
  assert.throws(() => toAtomic('abc'), /positive decimal/);
  assert.throws(() => toAtomic('1e-3'), /positive decimal/);
});

test('requires an rpc client', () => {
  assert.throws(() => new MoneroPaymentGateway({}), /RPC client is required/);
});

test('issues a fresh subaddress per invoice', async () => {
  const { gateway, rpc } = build();

  const first = await gateway.createInvoice(order());
  const second = await gateway.createInvoice(order({ orderId: 'order-2' }));

  assert.notEqual(first.address, second.address);
  assert.notEqual(first.addressIndex, second.addressIndex);
  assert.equal(first.state, 'AWAITING_PAYMENT');
  assert.equal(first.expectedXmr, '0.5');
  assert.equal(rpc.calls[0].params.label, 'order:order-1');
});

test('createInvoice is idempotent on orderId', async () => {
  const { gateway } = build();
  const first = await gateway.createInvoice(order());
  const again = await gateway.createInvoice(order({ amountXmr: '99' }));

  assert.equal(again.address, first.address);
  assert.equal(again.expectedXmr, '0.5');
});

test('rejects an invoice without an order id', async () => {
  const { gateway } = build();
  await assert.rejects(gateway.createInvoice({ amountXmr: '1' }), /orderId is required/);
});

test('an unconfirmed payment is CONFIRMING, never PAID', async () => {
  const { gateway, rpc } = build();
  const invoice = await gateway.createInvoice(order());
  rpc.credit({ addressIndex: invoice.addressIndex, amountXmr: '0.5', confirmations: 0 });

  const checked = await gateway.checkInvoice('order-1');

  // Dispensing fuel against a zero-confirmation transaction is a free tank.
  assert.equal(checked.state, 'CONFIRMING');
  assert.equal(checked.paidXmr, '0.5');
  assert.equal(checked.confirmations, 0);
});

test('settles once the confirmation threshold is met', async () => {
  const { gateway, rpc } = build({ requiredConfirmations: 3 });
  const invoice = await gateway.createInvoice(order());
  rpc.credit({ addressIndex: invoice.addressIndex, amountXmr: '0.5', confirmations: 3 });

  const checked = await gateway.checkInvoice('order-1');

  assert.equal(checked.state, 'PAID');
  assert.equal(checked.transactions.length, 1);
  assert.ok(checked.events.some((e) => e.event === 'PAID'));
});

test('a partial payment stays open so the customer can top up', async () => {
  const { gateway, rpc } = build({ requiredConfirmations: 1 });
  const invoice = await gateway.createInvoice(order());
  rpc.credit({ addressIndex: invoice.addressIndex, amountXmr: '0.2', confirmations: 5 });

  const partial = await gateway.checkInvoice('order-1');
  assert.equal(partial.state, 'PARTIALLY_PAID');
  assert.equal(partial.paidXmr, '0.2');

  rpc.credit({ addressIndex: invoice.addressIndex, amountXmr: '0.3', confirmations: 5 });
  const settled = await gateway.checkInvoice('order-1');

  assert.equal(settled.state, 'PAID');
  assert.equal(settled.paidXmr, '0.5');
  assert.equal(settled.transactions.length, 2);
});

test('the least-confirmed transfer gates a multi-transfer invoice', async () => {
  const { gateway, rpc } = build({ requiredConfirmations: 5 });
  const invoice = await gateway.createInvoice(order());
  rpc.credit({ addressIndex: invoice.addressIndex, amountXmr: '0.3', confirmations: 20 });
  rpc.credit({ addressIndex: invoice.addressIndex, amountXmr: '0.2', confirmations: 1 });

  const checked = await gateway.checkInvoice('order-1');

  // Enough money, but part of it is one block deep. The weakest leg decides.
  assert.equal(checked.state, 'CONFIRMING');
  assert.equal(checked.confirmations, 1);
});

test('records an overpayment and still settles', async () => {
  const { gateway, rpc } = build({ requiredConfirmations: 1 });
  const invoice = await gateway.createInvoice(order());
  rpc.credit({ addressIndex: invoice.addressIndex, amountXmr: '0.7', confirmations: 5 });

  const checked = await gateway.checkInvoice('order-1');

  assert.equal(checked.state, 'PAID');
  assert.ok(checked.events.some((e) => e.event === 'OVERPAID' && e.overpaidXmr === '0.2'));
});

test('ignores a transfer the daemon flagged as a double spend', async () => {
  const { gateway, rpc } = build({ requiredConfirmations: 1 });
  const invoice = await gateway.createInvoice(order());
  rpc.credit({ addressIndex: invoice.addressIndex, amountXmr: '0.5', confirmations: 9 });
  rpc.transfers.at(-1).double_spend_seen = true;

  const checked = await gateway.checkInvoice('order-1');

  assert.equal(checked.paidXmr, '0');
  assert.equal(checked.state, 'AWAITING_PAYMENT');
  assert.ok(checked.events.some((e) => e.event === 'DOUBLE_SPEND_IGNORED'));
});

test('never credits another invoice\'s subaddress', async () => {
  const { gateway, rpc } = build({ requiredConfirmations: 1 });
  const mine = await gateway.createInvoice(order());
  const theirs = await gateway.createInvoice(order({ orderId: 'order-2' }));
  rpc.credit({ addressIndex: theirs.addressIndex, amountXmr: '0.5', confirmations: 9 });

  assert.equal((await gateway.checkInvoice('order-1')).paidXmr, '0');
  assert.equal((await gateway.checkInvoice('order-2')).state, 'PAID');
  assert.ok(mine.addressIndex !== theirs.addressIndex);
});

test('expires an unpaid invoice after its ttl', async () => {
  const { gateway, clock } = build({ invoiceTtlMinutes: 30 });
  await gateway.createInvoice(order());

  clock.now = new Date(START.getTime() + 31 * 60_000);
  const expired = await gateway.checkInvoice('order-1');

  assert.equal(expired.state, 'EXPIRED');
});

test('does not expire an invoice that was already paid into', async () => {
  const { gateway, rpc, clock } = build({ invoiceTtlMinutes: 30, requiredConfirmations: 1 });
  const invoice = await gateway.createInvoice(order());
  rpc.credit({ addressIndex: invoice.addressIndex, amountXmr: '0.2', confirmations: 5 });

  clock.now = new Date(START.getTime() + 31 * 60_000);
  const checked = await gateway.checkInvoice('order-1');

  // The customer's money is already on chain; expiring it would strand funds.
  assert.equal(checked.state, 'PARTIALLY_PAID');
});

test('sweep skips settled invoices and isolates failures', async () => {
  const { gateway, rpc } = build({ requiredConfirmations: 1 });
  const paid = await gateway.createInvoice(order());
  rpc.credit({ addressIndex: paid.addressIndex, amountXmr: '0.5', confirmations: 5 });
  await gateway.checkInvoice('order-1');
  await gateway.createInvoice(order({ orderId: 'order-2' }));

  const callsBefore = rpc.calls.filter((c) => c.method === 'get_transfers').length;
  const swept = await gateway.sweep();

  assert.equal(swept.length, 1);
  assert.equal(swept[0].orderId, 'order-2');
  assert.equal(rpc.calls.filter((c) => c.method === 'get_transfers').length, callsBefore + 1);
});

test('validates addresses through the wallet rather than trusting the caller', async () => {
  const { gateway } = build();
  assert.deepEqual(await gateway.validateAddress('45GOOD'), { address: '45GOOD', valid: true, nettype: 'mainnet' });
  assert.equal((await gateway.validateAddress('nonsense')).valid, false);
  await assert.rejects(gateway.validateAddress(''), /address is required/);
});

test('reports health from the wallet height', async () => {
  const { gateway } = build();
  const health = await gateway.health();
  assert.equal(health.connected, true);
  assert.ok(health.height > 0);
});

test('summarises the invoice book', async () => {
  const { gateway, rpc } = build({ requiredConfirmations: 1 });
  const first = await gateway.createInvoice(order());
  rpc.credit({ addressIndex: first.addressIndex, amountXmr: '0.5', confirmations: 5 });
  await gateway.checkInvoice('order-1');
  await gateway.createInvoice(order({ orderId: 'order-2' }));

  const summary = await gateway.summary();
  assert.equal(summary.total, 2);
  assert.equal(summary.byState.PAID, 1);
  assert.equal(summary.settledXmr, '0.5');

  await assert.rejects(gateway.get('nope'), /Invoice not found/);
});

test('rpc errors never leak the wallet password', async () => {
  const password = 'sup3r-s3cret-rpc-pw';
  const client = {
    create: () => ({
      async post() { throw new Error(`connect ECONNREFUSED with auth password=${password}`); },
    }),
  };
  const rpc = createWalletRpc({ url: 'http://127.0.0.1:18083', username: 'gateway', password, client });

  await assert.rejects(rpc.call('get_height'), (error) => {
    assert.ok(!error.message.includes(password), 'password leaked into the error');
    assert.match(error.message, /\*\*\*/);
    return true;
  });
});

test('redact scrubs credential-shaped text', () => {
  assert.equal(redact('password=hunter2'), 'password=***');
  assert.equal(redact('{"viewkey":"deadbeef"}'), '{"viewkey":"***"}');
  assert.equal(redact('token abc', ['abc']), 'token ***');
  assert.equal(redact('nothing sensitive'), 'nothing sensitive');
});

test('createWalletRpc demands a url', () => {
  assert.throws(() => createWalletRpc({ url: null }), /MONERO_WALLET_RPC_URL is required/);
});
