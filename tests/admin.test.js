const test = require('node:test');
const assert = require('node:assert/strict');

const { AdminService, MemoryAdminStore, toCsv } = require('../services/adminService');

const NOW = new Date('2026-08-08T12:00:00.000Z');

const payment = (overrides = {}) => ({
  id: 'pay-1',
  createdAt: '2026-08-05T10:00:00.000Z',
  userId: 'alice',
  currency: 'MYZ',
  amount: 100,
  status: 'COMPLETED',
  txId: null,
  reference: null,
  ...overrides,
});

const user = (overrides = {}) => ({ userId: 'alice', email: 'alice@example.com', role: 'user', state: 'ACTIVE', ...overrides });

function build({ payments = [], users = [] } = {}) {
  const store = new MemoryAdminStore({
    payments,
    users: [user({ userId: 'root', role: 'admin' }), user({ userId: 'root2', role: 'admin' }), ...users],
  });
  const service = new AdminService({ store, clock: () => NOW });
  return { service, store };
}

const asRoot = (extra = {}) => ({ actorId: 'root', ...extra });

// ---- access control ---------------------------------------------------------

test('refuses anyone who is not an active admin', async () => {
  const { service } = build({ users: [user({ userId: 'bob' }), user({ userId: 'ghost', role: 'admin', state: 'SUSPENDED' })] });

  await assert.rejects(service.overview({}), /actor is required/);
  await assert.rejects(service.overview({ actorId: 'nobody' }), /unknown actor/);
  await assert.rejects(service.overview({ actorId: 'bob' }), /admin role required/);
  await assert.rejects(service.overview({ actorId: 'ghost' }), /suspended admins cannot act/);
});

test('forbidden errors carry a 403 for the route layer', async () => {
  const { service } = build({ users: [user({ userId: 'bob' })] });
  await assert.rejects(service.listUsers({ actorId: 'bob' }), (error) => {
    assert.equal(error.status, 403);
    assert.equal(error.name, 'ForbiddenError');
    return true;
  });
});

// ---- panoramica pagamenti ---------------------------------------------------

test('summarises payments by state, currency and day', async () => {
  const { service } = build({
    payments: [
      payment({ id: 'p1', amount: 100, status: 'COMPLETED', createdAt: '2026-08-05T10:00:00.000Z' }),
      payment({ id: 'p2', amount: 50, status: 'FAILED', createdAt: '2026-08-05T12:00:00.000Z' }),
      payment({ id: 'p3', amount: 0.5, currency: 'XMR', status: 'COMPLETED', createdAt: '2026-08-06T09:00:00.000Z' }),
    ],
  });

  const overview = await service.overview(asRoot());

  assert.equal(overview.total, 3);
  assert.deepEqual(overview.byState, { COMPLETED: 2, FAILED: 1 });
  assert.equal(overview.failureRate, round(1 / 3));

  const myz = overview.byCurrency.find((row) => row.currency === 'MYZ');
  assert.deepEqual(myz, { currency: 'MYZ', count: 2, volume: 150, settled: 100 });
  assert.deepEqual(overview.daily.map((d) => d.date), ['2026-08-05', '2026-08-06']);
});

function round(n) { return Number(Number(n).toFixed(12)); }

test('honours the date window', async () => {
  const { service } = build({
    payments: [
      payment({ id: 'old', createdAt: '2026-07-01T10:00:00.000Z' }),
      payment({ id: 'new', createdAt: '2026-08-06T10:00:00.000Z' }),
    ],
  });

  const overview = await service.overview(asRoot({ from: '2026-08-01T00:00:00.000Z' }));
  assert.equal(overview.total, 1);
});

test('reports a zero failure rate on an empty window rather than dividing by zero', async () => {
  const { service } = build();
  const overview = await service.overview(asRoot());
  assert.equal(overview.total, 0);
  assert.equal(overview.failureRate, 0);
});

// ---- filtri avanzati --------------------------------------------------------

test('composes filters with AND', async () => {
  const { service } = build({
    payments: [
      payment({ id: 'a', userId: 'alice', currency: 'MYZ', amount: 10, status: 'COMPLETED' }),
      payment({ id: 'b', userId: 'alice', currency: 'XMR', amount: 0.5, status: 'COMPLETED' }),
      payment({ id: 'c', userId: 'bob', currency: 'MYZ', amount: 900, status: 'FAILED', reference: 'INV-42' }),
    ],
  });

  assert.equal((await service.searchPayments(asRoot({ userId: 'alice' }))).total, 2);
  assert.equal((await service.searchPayments(asRoot({ userId: 'alice', currency: 'XMR' }))).total, 1);
  assert.equal((await service.searchPayments(asRoot({ status: 'FAILED' }))).total, 1);
  assert.equal((await service.searchPayments(asRoot({ minAmount: 5, maxAmount: 100 }))).total, 1);
  assert.equal((await service.searchPayments(asRoot({ reference: 'inv-42' }))).total, 1);
  assert.equal((await service.searchPayments(asRoot({ reference: 'nope' }))).total, 0);
});

test('rejects an inverted amount range and an unknown sort key', async () => {
  const { service } = build();
  await assert.rejects(service.searchPayments(asRoot({ minAmount: 10, maxAmount: 1 })), /minAmount cannot exceed maxAmount/);
  await assert.rejects(service.searchPayments(asRoot({ sort: 'password' })), /sort must be createdAt, amount or status/);
});

test('sorts and paginates', async () => {
  const { service } = build({
    payments: [
      payment({ id: 'a', amount: 10, createdAt: '2026-08-01T00:00:00.000Z' }),
      payment({ id: 'b', amount: 300, createdAt: '2026-08-02T00:00:00.000Z' }),
      payment({ id: 'c', amount: 20, createdAt: '2026-08-03T00:00:00.000Z' }),
    ],
  });

  assert.deepEqual((await service.searchPayments(asRoot({ sort: 'amount', order: 'asc' }))).items.map((p) => p.id), ['a', 'c', 'b']);
  assert.deepEqual((await service.searchPayments(asRoot({ sort: 'createdAt', order: 'desc' }))).items.map((p) => p.id), ['c', 'b', 'a']);

  const page = await service.searchPayments(asRoot({ limit: 2, offset: 1, sort: 'amount', order: 'asc' }));
  assert.deepEqual(page.items.map((p) => p.id), ['c', 'b']);
  assert.equal(page.total, 3);
});

test('caps the page size so one request cannot dump the table', async () => {
  const { service } = build();
  assert.equal((await service.searchPayments(asRoot({ limit: 100000 }))).limit, 500);
  assert.equal((await service.searchPayments(asRoot({ limit: 0 }))).limit, 50);
});

// ---- export -----------------------------------------------------------------

test('exports filtered rows as CSV and records the export', async () => {
  const { service, store } = build({
    payments: [payment({ id: 'p1', reference: 'note, with comma' }), payment({ id: 'p2', userId: 'bob' })],
  });

  const result = await service.exportPayments(asRoot({ userId: 'alice' }));

  assert.match(result.filename, /^payments-2026-08-08\.csv$/);
  const lines = result.csv.split('\n');
  assert.equal(lines[0], 'id,createdAt,userId,currency,amount,status,txId,reference');
  assert.equal(lines.length, 2);
  assert.match(lines[1], /"note, with comma"/);

  // An export is a bulk read of customer data; it belongs in the audit log.
  const trail = await store.listAudit();
  assert.equal(trail[0].action, 'EXPORT_PAYMENTS');
  assert.equal(trail[0].actorId, 'root');
});

test('neutralises formula injection in exported cells', () => {
  const csv = toCsv([payment({ reference: '=cmd|calc!A1' })]);
  assert.match(csv.split('\n')[1], /'=cmd\|calc!A1/);
  assert.ok(!/,=cmd/.test(csv));
});

// ---- gestione utenti --------------------------------------------------------

test('lists and filters users', async () => {
  const { service } = build({ users: [user({ userId: 'bob', role: 'operator' }), user({ userId: 'carol', state: 'SUSPENDED' })] });

  assert.equal((await service.listUsers(asRoot())).total, 4);
  assert.equal((await service.listUsers(asRoot({ role: 'admin' }))).total, 2);
  assert.equal((await service.listUsers(asRoot({ state: 'SUSPENDED' }))).total, 1);
  assert.equal((await service.listUsers(asRoot({ search: 'CAROL' }))).total, 1);
});

test('changes a role and writes an audit entry', async () => {
  const { service, store } = build({ users: [user({ userId: 'bob' })] });

  const updated = await service.setRole({ actorId: 'root', userId: 'bob', role: 'operator' });

  assert.equal(updated.role, 'operator');
  const entry = (await store.listAudit()).at(-1);
  assert.deepEqual({ action: entry.action, target: entry.target, detail: entry.detail, actorId: entry.actorId }, {
    action: 'SET_ROLE', target: 'bob', detail: { from: 'user', to: 'operator' }, actorId: 'root',
  });
});

test('rejects an unknown role or user', async () => {
  const { service } = build({ users: [user({ userId: 'bob' })] });
  await assert.rejects(service.setRole({ actorId: 'root', userId: 'bob', role: 'superuser' }), /role must be one of/);
  await assert.rejects(service.setRole({ actorId: 'root', userId: 'ghost', role: 'user' }), /User not found/);
});

test('an admin cannot demote or suspend themselves', async () => {
  const { service } = build();

  await assert.rejects(service.setRole({ actorId: 'root', userId: 'root', role: 'user' }), /cannot demote themselves/);
  await assert.rejects(service.setState({ actorId: 'root', userId: 'root', state: 'SUSPENDED' }), /cannot suspend themselves/);
});

test('the system always retains an active admin', async () => {
  const { service, store } = build();

  // An admin may demote another admin: the actor is still standing afterwards.
  await service.setRole({ actorId: 'root', userId: 'root2', role: 'user' });

  // root is now the only admin, and cannot remove itself by either route.
  await assert.rejects(service.setRole({ actorId: 'root', userId: 'root', role: 'user' }), /cannot demote themselves/);
  await assert.rejects(service.setState({ actorId: 'root', userId: 'root', state: 'SUSPENDED' }), /cannot suspend themselves/);

  // And nobody else is left with the standing to do it for them.
  await assert.rejects(service.setRole({ actorId: 'root2', userId: 'root', role: 'user' }), /admin role required/);

  const admins = (await store.listUsers()).filter((u) => u.role === 'admin' && u.state === 'ACTIVE');
  assert.equal(admins.length, 1);
});

test('demoting a non-last admin is allowed', async () => {
  const { service } = build();
  const updated = await service.setRole({ actorId: 'root', userId: 'root2', role: 'user' });
  assert.equal(updated.role, 'user');
});

test('suspending and reactivating a user is idempotent', async () => {
  const { service, store } = build({ users: [user({ userId: 'bob' })] });

  const suspended = await service.setState({ actorId: 'root', userId: 'bob', state: 'SUSPENDED', reason: 'fraud review' });
  assert.equal(suspended.state, 'SUSPENDED');

  const again = await service.setState({ actorId: 'root', userId: 'bob', state: 'SUSPENDED' });
  assert.equal(again.state, 'SUSPENDED');

  // The no-op must not add a second audit entry claiming a change happened.
  assert.equal((await store.listAudit()).filter((e) => e.action === 'SET_STATE').length, 1);
});

test('exposes the audit trail newest first, to admins only', async () => {
  const { service } = build({ users: [user({ userId: 'bob' })] });
  await service.setRole({ actorId: 'root', userId: 'bob', role: 'operator' });
  await service.setState({ actorId: 'root', userId: 'bob', state: 'SUSPENDED' });

  const trail = await service.auditTrail(asRoot());
  assert.deepEqual(trail.map((e) => e.action), ['SET_STATE', 'SET_ROLE']);
  await assert.rejects(service.auditTrail({ actorId: 'bob' }), /admin role required/);
});
