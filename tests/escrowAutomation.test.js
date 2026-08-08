const test = require('node:test');
const assert = require('node:assert/strict');

const { EscrowAutomationService, MemoryEscrowStore, HOUR_MS } = require('../services/escrowAutomationService');

const START = new Date('2026-08-07T00:00:00.000Z');

function fakeWallet({ failRelease = [], failRefund = false } = {}) {
  const calls = [];
  const failures = [...failRelease];
  return {
    calls,
    async lock(userId, amount, currency) { calls.push(['lock', userId, amount, currency]); return `lock_${userId}_${amount}`; },
    async release(userId, amount, currency) {
      calls.push(['release', userId, amount, currency]);
      if (failures.length && failures.shift()) throw new Error('wallet unreachable');
      return `rel_${userId}_${amount}`;
    },
    async refund(userId, amount, currency) {
      calls.push(['refund', userId, amount, currency]);
      if (failRefund) throw new Error('refund failed');
      return `ref_${userId}_${amount}`;
    },
  };
}

function build(walletOptions = {}, serviceOptions = {}) {
  const clock = { now: START };
  const wallet = fakeWallet(walletOptions);
  const service = new EscrowAutomationService({
    wallet, store: new MemoryEscrowStore(), clock: () => clock.now, ...serviceOptions,
  });
  return { service, wallet, clock };
}

const job = (overrides = {}) => ({ jobId: 'job-1', clientId: 'client-1', robotId: 'robot-1', amount: 100, currency: 'MYZ', ...overrides });

test('requires a wallet adapter', () => {
  assert.throws(() => new EscrowAutomationService({}), /wallet adapter is required/);
});

test('locks funds and records the fee split', async () => {
  const { service, wallet } = build();
  const escrow = await service.open(job());

  assert.equal(escrow.state, 'LOCKED');
  assert.equal(escrow.fee, 2);
  assert.equal(escrow.netAmount, 98);
  assert.deepEqual(wallet.calls[0], ['lock', 'client-1', 100, 'MYZ']);
  assert.equal(escrow.events[0].event, 'LOCKED');
});

test('rejects malformed escrows and is idempotent on jobId', async () => {
  const { service } = build();
  await assert.rejects(service.open(job({ jobId: null })), /jobId, clientId and robotId are required/);
  await assert.rejects(service.open(job({ amount: 0 })), /amount must be positive/);
  await assert.rejects(service.open(job({ currency: 'BTC' })), /currency must be MYZ or XMR/);

  const first = await service.open(job());
  const second = await service.open(job({ amount: 999 }));
  assert.equal(second.amount, first.amount);
});

test('does not release before the dispute window closes', async () => {
  const { service, clock, wallet } = build();
  await service.open(job());
  await service.markDelivered({ jobId: 'job-1' });

  clock.now = new Date(START.getTime() + 47 * HOUR_MS);
  await service.tick();

  assert.equal((await service.get('job-1')).state, 'DELIVERED');
  assert.equal(wallet.calls.filter((call) => call[0] === 'release').length, 0);
});

test('releases to robot and platform once the window elapses', async () => {
  const { service, clock, wallet } = build();
  await service.open(job());
  await service.markDelivered({ jobId: 'job-1', proof: 'ipfs://proof' });

  clock.now = new Date(START.getTime() + 49 * HOUR_MS);
  await service.tick();

  const escrow = await service.get('job-1');
  assert.equal(escrow.state, 'RELEASED');
  assert.deepEqual(escrow.payouts.map((p) => [p.leg, p.amount]), [['ROBOT', 98], ['PLATFORM_FEE', 2]]);
  assert.deepEqual(wallet.calls.filter((c) => c[0] === 'release'), [
    ['release', 'robot-1', 98, 'MYZ'],
    ['release', 'PLATFORM_WALLET', 2, 'MYZ'],
  ]);
});

test('a restart between deadline and payout loses nothing', async () => {
  const store = new MemoryEscrowStore();
  const wallet = fakeWallet();
  const clock = { now: START };
  const options = { wallet, store, clock: () => clock.now };

  await new EscrowAutomationService(options).open(job());
  await new EscrowAutomationService(options).markDelivered({ jobId: 'job-1' });

  // Nothing is scheduled in memory: a fresh instance re-derives what is due
  // from the stored deadline, which a setTimeout-based flow could not do.
  clock.now = new Date(START.getTime() + 49 * HOUR_MS);
  await new EscrowAutomationService(options).tick();

  assert.equal((await store.get('job-1')).state, 'RELEASED');
});

test('refunds the client when the robot never delivers', async () => {
  const { service, clock, wallet } = build();
  await service.open(job());

  clock.now = new Date(START.getTime() + 25 * HOUR_MS);
  await service.tick();

  const escrow = await service.get('job-1');
  assert.equal(escrow.state, 'REFUNDED');
  assert.deepEqual(wallet.calls.at(-1), ['refund', 'client-1', 100, 'MYZ']);
  assert.ok(escrow.events.some((e) => e.event === 'REFUNDED' && e.reason === 'DELIVERY_TIMEOUT'));
});

test('resumes a half-finished payout without paying the first leg twice', async () => {
  const { service, clock, wallet } = build({ failRelease: [false, true] });
  await service.open(job());
  await service.markDelivered({ jobId: 'job-1' });

  clock.now = new Date(START.getTime() + 49 * HOUR_MS);
  await service.tick();

  const halfway = await service.get('job-1');
  assert.equal(halfway.state, 'PAYING_OUT');
  assert.deepEqual(halfway.payouts.map((p) => p.leg), ['ROBOT']);
  assert.ok(halfway.events.some((e) => e.event === 'PAYOUT_LEG_FAILED'));

  await service.tick();

  const done = await service.get('job-1');
  assert.equal(done.state, 'RELEASED');
  assert.deepEqual(done.payouts.map((p) => p.leg), ['ROBOT', 'PLATFORM_FEE']);
  // The robot leg was sent once, not twice.
  assert.equal(wallet.calls.filter((c) => c[0] === 'release' && c[1] === 'robot-1').length, 1);
});

test('a dispute freezes the escrow until a human resolves it', async () => {
  const { service, clock, wallet } = build();
  await service.open(job());
  await service.markDelivered({ jobId: 'job-1' });
  await service.dispute({ jobId: 'job-1', reason: 'not delivered as described' });

  clock.now = new Date(START.getTime() + 100 * HOUR_MS);
  await service.tick();

  assert.equal((await service.get('job-1')).state, 'DISPUTED');
  assert.equal(wallet.calls.filter((c) => c[0] === 'release').length, 0);

  const resolved = await service.resolve({ jobId: 'job-1', outcome: 'REFUND', note: 'client was right' });
  assert.equal(resolved.state, 'REFUNDED');
});

test('rejects an invalid resolution', async () => {
  const { service } = build();
  await service.open(job());
  await assert.rejects(service.resolve({ jobId: 'job-1', outcome: 'RELEASE' }), /Only a disputed escrow/);
  await service.markDelivered({ jobId: 'job-1' });
  await service.dispute({ jobId: 'job-1', reason: 'x' });
  await assert.rejects(service.resolve({ jobId: 'job-1', outcome: 'MAYBE' }), /outcome must be RELEASE or REFUND/);
});

test('a failing verifier sends the escrow to dispute instead of paying out', async () => {
  const { service, clock, wallet } = build({}, { verifier: async () => ({ ok: false, reason: 'no proof attached' }) });
  await service.open(job());
  await service.markDelivered({ jobId: 'job-1' });

  clock.now = new Date(START.getTime() + 49 * HOUR_MS);
  await service.tick();

  const escrow = await service.get('job-1');
  assert.equal(escrow.state, 'DISPUTED');
  assert.equal(wallet.calls.filter((c) => c[0] === 'release').length, 0);
  assert.ok(escrow.events.some((e) => e.event === 'VERIFICATION_FAILED' && e.reason === 'no proof attached'));
});

test('tick is idempotent over settled escrows', async () => {
  const { service, clock, wallet } = build();
  await service.open(job());
  await service.markDelivered({ jobId: 'job-1' });
  clock.now = new Date(START.getTime() + 49 * HOUR_MS);

  await service.tick();
  await service.tick();
  await service.tick();

  assert.equal(wallet.calls.filter((c) => c[0] === 'release').length, 2);
});

test('records a failed refund without pretending it settled', async () => {
  const { service, clock } = build({ failRefund: true });
  await service.open(job());
  clock.now = new Date(START.getTime() + 25 * HOUR_MS);
  await service.tick();

  const escrow = await service.get('job-1');
  assert.notEqual(escrow.state, 'REFUNDED');
  assert.ok(escrow.events.some((e) => e.event === 'REFUND_FAILED'));
});

test('keeps a full audit trail and a portfolio summary', async () => {
  const { service, clock } = build();
  await service.open(job());
  await service.markDelivered({ jobId: 'job-1', proof: 'ipfs://p' });
  await service.open(job({ jobId: 'job-2', amount: 50 }));

  clock.now = new Date(START.getTime() + 49 * HOUR_MS);
  await service.tick();

  const trail = (await service.auditLog('job-1')).map((entry) => entry.event);
  assert.deepEqual(trail, ['LOCKED', 'DELIVERED', 'VERIFIED', 'PAYOUT_STARTED', 'PAYOUT_LEG_SENT', 'PAYOUT_LEG_SENT', 'RELEASED']);

  const summary = await service.summary();
  assert.equal(summary.total, 2);
  assert.equal(summary.byState.RELEASED, 1);
});

test('get() rejects an unknown job', async () => {
  const { service } = build();
  await assert.rejects(service.get('nope'), /Escrow not found/);
});
