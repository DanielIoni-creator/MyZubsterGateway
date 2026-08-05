/**
 * Test per il sistema di audit logging - Bounty B14 (#279)
 *
 * Girano senza MongoDB: quando la connessione non è attiva l'audit service usa
 * il buffer circolare in memoria, che è anche il percorso di degrado testato qui.
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

const audit = require('../services/auditService');
const { auditLogger, errorFromBody, clientIp } = require('../middleware/auditLogger');
const auditRouter = require('../routes/audit');

// ------------------------------------------------------------------ utils

function fakeReq({ method = 'POST', url = '/', body = {}, params = {}, query = {}, headers = {}, ip = '10.0.0.1' } = {}) {
  return { method, originalUrl: url, url, body, params, query, headers, ip, connection: { remoteAddress: ip } };
}

/** res minimale che emette 'finish' come fa Express. */
function fakeRes() {
  const listeners = [];
  return {
    statusCode: 200,
    body: null,
    headers: {},
    on(event, cb) { if (event === 'finish') listeners.push(cb); },
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    send(body) { this.body = body; return this; },
    finish() { for (const cb of listeners) cb(); }
  };
}

function callRoute(method, path, query = {}) {
  const layer = auditRouter.stack.find(l => l.route && l.route.path === path && l.route.methods[method]);
  assert.ok(layer, `route ${method.toUpperCase()} ${path} non registrata`);
  const req = fakeReq({ method: method.toUpperCase(), url: path, query });
  const res = fakeRes();
  return Promise.resolve(layer.route.stack[0].handle(req, res, e => { throw e; }))
    .then(() => ({ statusCode: res.statusCode, body: res.body, headers: res.headers }));
}

// ------------------------------------------------------------ resolveAction

describe('resolveAction', () => {
  it('riconosce le azioni critiche di ogni dominio', () => {
    const cases = [
      ['POST', '/buy-myz', 'payment.buy_myz', 'payment'],
      ['POST', '/escrow/create', 'escrow.create', 'escrow'],
      ['POST', '/api/robot/escrow/create', 'escrow.robot_create', 'escrow'],
      ['POST', '/api/robot/escrow/dispute', 'escrow.robot_dispute', 'escrow'],
      ['POST', '/api/robot/create', 'robot.create', 'robot'],
      ['POST', '/api/robot/assign', 'robot.assign_job', 'robot'],
      ['POST', '/api/bounty/complete', 'bounty.complete', 'bounty'],
      ['POST', '/api/rewards/trigger', 'reward.trigger', 'reward'],
      ['POST', '/api/stake/stake', 'stake.create', 'stake'],
      ['POST', '/api/backup/restore', 'backup.restore', 'backup'],
      ['POST', '/api/webhooks/github', 'webhook.github_event', 'webhook'],
      ['POST', '/api/ratelimit/reset', 'admin.ratelimit_reset', 'admin']
    ];
    for (const [method, path, action, category] of cases) {
      const d = audit.resolveAction(method, path);
      assert.ok(d, `${method} ${path} dovrebbe essere tracciata`);
      assert.strictEqual(d.action, action);
      assert.strictEqual(d.category, category);
    }
  });

  it('ignora le letture e le route non critiche', () => {
    assert.strictEqual(audit.resolveAction('GET', '/health'), null);
    assert.strictEqual(audit.resolveAction('GET', '/api/robot/status/robot-1'), null);
    assert.strictEqual(audit.resolveAction('GET', '/api/bounty/list'), null);
    assert.strictEqual(audit.resolveAction('POST', '/api/robot/execute'), null);
  });

  it('ignora la query string e il trailing slash', () => {
    assert.strictEqual(audit.resolveAction('POST', '/buy-myz?debug=1').action, 'payment.buy_myz');
    assert.strictEqual(audit.resolveAction('POST', '/buy-myz/').action, 'payment.buy_myz');
  });

  it('distingue i metodi HTTP', () => {
    assert.strictEqual(audit.resolveAction('GET', '/api/robot/create'), null);
    assert.ok(audit.resolveAction('post', '/api/robot/create'), 'il metodo è case-insensitive');
  });

  it('non esplode con input mancanti', () => {
    assert.strictEqual(audit.resolveAction(undefined, '/buy-myz'), null);
    assert.strictEqual(audit.resolveAction('POST', undefined), null);
  });
});

// ----------------------------------------------------------------- sanitize

describe('sanitize', () => {
  it('oscura i campi sensibili', () => {
    const out = audit.sanitize({
      userId: 'alice', password: 'hunter2', apiKey: 'k', api_key: 'k',
      privateKey: 'p', seed: 's', mnemonic: 'm', authorization: 'Bearer x', signature: 'sig'
    });
    assert.strictEqual(out.userId, 'alice');
    for (const key of ['password', 'apiKey', 'api_key', 'privateKey', 'seed', 'mnemonic', 'authorization', 'signature']) {
      assert.strictEqual(out[key], '[REDACTED]', `${key} deve essere oscurato`);
    }
  });

  it('oscura anche nei sotto-oggetti', () => {
    const out = audit.sanitize({ wallet: { address: 'addr', privateKey: 'segreto' } });
    assert.strictEqual(out.wallet.address, 'addr');
    assert.strictEqual(out.wallet.privateKey, '[REDACTED]');
  });

  it('tronca le stringhe molto lunghe', () => {
    const out = audit.sanitize({ note: 'x'.repeat(1000) });
    assert.ok(out.note.length < 1000);
    assert.match(out.note, /\[troncato\]$/);
  });

  it('limita la lunghezza degli array', () => {
    const out = audit.sanitize({ items: Array.from({ length: 50 }, (_, i) => i) });
    assert.strictEqual(out.items.length, 21);
    assert.match(out.items[20], /altri 30 elementi/);
  });

  it('si ferma alla profondità massima', () => {
    const deep = { a: { b: { c: { d: { e: 'troppo profondo' } } } } };
    assert.strictEqual(audit.sanitize(deep).a.b.c.d, '[profondità massima]');
  });

  it('gestisce null, numeri e booleani', () => {
    assert.strictEqual(audit.sanitize(null), null);
    assert.strictEqual(audit.sanitize(undefined), null);
    assert.strictEqual(audit.sanitize(42), 42);
    assert.strictEqual(audit.sanitize(true), true);
  });

  it('riassume i Buffer invece di enumerarli byte per byte', () => {
    const out = audit.sanitize({ raw: Buffer.from('payload di un webhook') });
    assert.strictEqual(out.raw, '[buffer 21 byte]');
  });

  it('serializza le date in ISO', () => {
    const out = audit.sanitize({ at: new Date('2025-01-01T00:00:00Z') });
    assert.strictEqual(out.at, '2025-01-01T00:00:00.000Z');
  });

  it('tronca gli oggetti con troppe chiavi', () => {
    const wide = {};
    for (let i = 0; i < 80; i++) wide[`k${i}`] = i;
    const out = audit.sanitize(wide);
    assert.strictEqual(Object.keys(out).length, 51, '50 chiavi + il marcatore');
    assert.strictEqual(out['…'], '[altre 30 chiavi]');
  });
});

// ---------------------------------------------------------------- firstValue

describe('firstValue', () => {
  it('prende il primo valore non vuoto rispettando la priorità delle chiavi', () => {
    assert.strictEqual(audit.firstValue([{ b: 'due' }, { a: 'uno' }], ['a', 'b']), 'uno');
    assert.strictEqual(audit.firstValue([{ b: 'due' }], ['a', 'b']), 'due');
  });

  it('salta stringhe vuote, null e undefined', () => {
    assert.strictEqual(audit.firstValue([{ a: '' }, { a: null }, { a: 'ok' }], ['a']), 'ok');
  });

  it('restituisce null se non trova nulla, e tollera sorgenti nulle', () => {
    assert.strictEqual(audit.firstValue([null, undefined, {}], ['a']), null);
    assert.strictEqual(audit.firstValue([{ a: 'x' }], undefined), null);
  });

  it('converte i valori in stringa', () => {
    assert.strictEqual(audit.firstValue([{ id: 42 }], ['id']), '42');
  });
});

// -------------------------------------------------------------- buildFilter

describe('buildFilter', () => {
  it('costruisce i filtri semplici', () => {
    assert.deepStrictEqual(audit.buildFilter({ userId: 'alice' }), { userId: 'alice' });
    assert.deepStrictEqual(
      audit.buildFilter({ action: 'escrow.create', category: 'escrow', status: 'failure' }),
      { action: 'escrow.create', category: 'escrow', status: 'failure' }
    );
  });

  it('costruisce l intervallo di date', () => {
    const filter = audit.buildFilter({ from: '2025-01-01', to: '2025-02-01' });
    assert.ok(filter.createdAt.$gte instanceof Date);
    assert.ok(filter.createdAt.$lte instanceof Date);
  });

  it('accetta un solo estremo dell intervallo', () => {
    assert.ok(audit.buildFilter({ from: '2025-01-01' }).createdAt.$gte);
    assert.strictEqual(audit.buildFilter({ from: '2025-01-01' }).createdAt.$lte, undefined);
  });

  it('rifiuta le date non valide', () => {
    assert.throws(() => audit.buildFilter({ from: 'ieri' }), /from non è una data valida/);
    assert.throws(() => audit.buildFilter({ to: 'domani' }), /to non è una data valida/);
  });

  it('rifiuta un intervallo invertito', () => {
    assert.throws(
      () => audit.buildFilter({ from: '2025-02-01', to: '2025-01-01' }),
      /from non può essere successiva a to/
    );
  });

  it('rifiuta uno status sconosciuto', () => {
    assert.throws(() => audit.buildFilter({ status: 'boh' }), /status deve essere/);
  });

  it('ignora i parametri non riconosciuti', () => {
    assert.deepStrictEqual(audit.buildFilter({ sortBy: 'x', foo: 'bar' }), {});
  });
});

describe('parsePagination', () => {
  it('usa i valori di default', () => {
    assert.deepStrictEqual(audit.parsePagination({}), { page: 1, limit: 50, skip: 0 });
  });

  it('calcola lo skip', () => {
    assert.deepStrictEqual(audit.parsePagination({ page: 3, limit: 20 }), { page: 3, limit: 20, skip: 40 });
  });

  it('normalizza i valori fuori scala', () => {
    assert.strictEqual(audit.parsePagination({ page: 0 }).page, 1);
    assert.strictEqual(audit.parsePagination({ page: -5 }).page, 1);
    assert.strictEqual(audit.parsePagination({ limit: 99999 }).limit, 500);
    assert.strictEqual(audit.parsePagination({ limit: 0 }).limit, 50);
  });
});

// ------------------------------------------------------- logAudit + query

describe('logAudit senza MongoDB', () => {
  beforeEach(() => audit.clearFallbackBuffer());

  it('scrive nel buffer in memoria e normalizza i campi', async () => {
    await audit.logAudit({ action: 'escrow.create', category: 'escrow', userId: 'alice' });
    const [entry] = audit.getFallbackBuffer();

    assert.strictEqual(entry.action, 'escrow.create');
    assert.strictEqual(entry.category, 'escrow');
    assert.strictEqual(entry.userId, 'alice');
    assert.strictEqual(entry.status, 'success');
    assert.ok(entry.createdAt instanceof Date);
    assert.deepStrictEqual(entry.metadata, {});
  });

  it('ignora le voci senza action', async () => {
    assert.strictEqual(await audit.logAudit({}), null);
    assert.strictEqual(await audit.logAudit(null), null);
    assert.strictEqual(audit.getFallbackBuffer().length, 0);
  });

  it('oscura i segreti nei metadata', async () => {
    await audit.logAudit({ action: 'payment.buy_myz', metadata: { amount: 10, privateKey: 'segreto' } });
    const [entry] = audit.getFallbackBuffer();
    assert.strictEqual(entry.metadata.amount, 10);
    assert.strictEqual(entry.metadata.privateKey, '[REDACTED]');
  });

  it('restituisce le voci filtrate e ordinate dalla più recente', async () => {
    await audit.logAudit({ action: 'a.one', userId: 'alice', createdAt: new Date('2025-01-01') });
    await audit.logAudit({ action: 'a.two', userId: 'bob', createdAt: new Date('2025-01-02') });
    await audit.logAudit({ action: 'a.three', userId: 'alice', createdAt: new Date('2025-01-03') });

    const all = await audit.queryAuditLogs({});
    assert.strictEqual(all.source, 'memory');
    assert.strictEqual(all.pagination.total, 3);
    assert.strictEqual(all.logs[0].action, 'a.three', 'più recente per prima');

    const byUser = await audit.queryAuditLogs({ userId: 'alice' });
    assert.strictEqual(byUser.pagination.total, 2);
    assert.ok(byUser.logs.every(l => l.userId === 'alice'));
  });

  it('filtra per intervallo di date', async () => {
    await audit.logAudit({ action: 'a.old', createdAt: new Date('2024-01-01') });
    await audit.logAudit({ action: 'a.new', createdAt: new Date('2025-06-01') });

    const result = await audit.queryAuditLogs({ from: '2025-01-01' });
    assert.strictEqual(result.pagination.total, 1);
    assert.strictEqual(result.logs[0].action, 'a.new');
  });

  it('pagina i risultati', async () => {
    for (let i = 0; i < 12; i++) {
      await audit.logAudit({ action: `a.${i}`, createdAt: new Date(2025, 0, i + 1) });
    }
    const page2 = await audit.queryAuditLogs({ page: 2, limit: 5 });
    assert.strictEqual(page2.logs.length, 5);
    assert.strictEqual(page2.pagination.total, 12);
    assert.strictEqual(page2.pagination.pages, 3);
  });

  it('mantiene il buffer entro il limite configurato', async () => {
    for (let i = 0; i < 600; i++) await audit.logAudit({ action: `a.${i}` });
    assert.strictEqual(audit.getFallbackBuffer().length, 500);
    assert.strictEqual(audit.getFallbackBuffer()[0].action, 'a.100', 'le più vecchie vengono scartate');
  });

  it('getAuditStats aggrega per categoria, azione ed esito', async () => {
    await audit.logAudit({ action: 'escrow.create', category: 'escrow', status: 'success' });
    await audit.logAudit({ action: 'escrow.create', category: 'escrow', status: 'failure' });
    await audit.logAudit({ action: 'payment.buy_myz', category: 'payment', status: 'success' });

    const stats = await audit.getAuditStats({});
    assert.strictEqual(stats.total, 3);
    assert.strictEqual(stats.failures, 1);
    assert.strictEqual(stats.successes, 2);
    assert.strictEqual(stats.byCategory.escrow, 2);
    assert.strictEqual(stats.byAction['escrow.create'], 2);
    assert.ok(Math.abs(stats.failureRate - 1 / 3) < 0.001);
  });
});

// --------------------------------------------------------------- export CSV

describe('toCSV', () => {
  it('scrive intestazione e righe', () => {
    const csv = audit.toCSV([{ action: 'escrow.create', category: 'escrow', status: 'success', userId: 'alice' }]);
    const [header, row] = csv.trim().split('\r\n');
    assert.strictEqual(header, audit.CSV_COLUMNS.join(','));
    assert.match(row, /escrow\.create/);
    assert.match(row, /alice/);
  });

  it('quota i campi con virgole, virgolette e newline', () => {
    const csv = audit.toCSV([{ action: 'a', error: 'errore, grave' }]);
    assert.match(csv, /"errore, grave"/);

    const quoted = audit.toCSV([{ action: 'a', error: 'dice "no"' }]);
    assert.match(quoted, /"dice ""no"""/);

    const multiline = audit.toCSV([{ action: 'a', error: 'riga1\nriga2' }]);
    assert.match(multiline, /"riga1\nriga2"/);
  });

  it('scrive celle vuote per i valori mancanti', () => {
    const csv = audit.toCSV([{ action: 'a' }]);
    const row = csv.trim().split('\r\n')[1];
    assert.strictEqual(row.split(',').length, audit.CSV_COLUMNS.length);
  });

  it('serializza le date in ISO', () => {
    const csv = audit.toCSV([{ action: 'a', createdAt: new Date('2025-01-01T10:00:00Z') }]);
    assert.match(csv, /2025-01-01T10:00:00\.000Z/);
  });

  it('produce solo l intestazione con una lista vuota', () => {
    assert.strictEqual(audit.toCSV([]).trim(), audit.CSV_COLUMNS.join(','));
  });
});

// ---------------------------------------------------------------- middleware

describe('auditLogger middleware', () => {
  beforeEach(() => audit.clearFallbackBuffer());

  it('lascia passare le richieste non critiche senza registrare nulla', () => {
    const recorded = [];
    const middleware = auditLogger({ log: e => recorded.push(e) });
    const req = fakeReq({ method: 'GET', url: '/health' });
    const res = fakeRes();

    let nextCalled = false;
    middleware(req, res, () => { nextCalled = true; });
    res.finish();

    assert.strictEqual(nextCalled, true);
    assert.strictEqual(recorded.length, 0);
  });

  it('registra un azione critica riuscita con utente e risorsa', () => {
    const recorded = [];
    const middleware = auditLogger({ log: e => recorded.push(e) });
    const req = fakeReq({
      method: 'POST', url: '/api/robot/escrow/create',
      body: { jobId: 'job-1', clientId: 'alice', robotId: 'robot-1', amount: 100, currency: 'MYZ' },
      headers: { 'user-agent': 'test-agent' }
    });
    const res = fakeRes();

    middleware(req, res, () => {});
    res.json({ success: true });
    res.finish();

    assert.strictEqual(recorded.length, 1);
    const entry = recorded[0];
    assert.strictEqual(entry.action, 'escrow.robot_create');
    assert.strictEqual(entry.category, 'escrow');
    assert.strictEqual(entry.userId, 'alice');
    assert.strictEqual(entry.resourceId, 'job-1');
    assert.strictEqual(entry.status, 'success');
    assert.strictEqual(entry.statusCode, 200);
    assert.strictEqual(entry.userAgent, 'test-agent');
    assert.strictEqual(entry.method, 'POST');
    assert.strictEqual(typeof entry.durationMs, 'number');
    assert.strictEqual(entry.metadata.amount, 100);
  });

  it('marca come failure le risposte 4xx e ne salva il messaggio', () => {
    const recorded = [];
    const middleware = auditLogger({ log: e => recorded.push(e) });
    const req = fakeReq({ method: 'POST', url: '/api/robot/create', body: { robotId: 'r1' } });
    const res = fakeRes();

    middleware(req, res, () => {});
    res.status(400).json({ error: 'Missing robotId, name, or walletAddress' });
    res.finish();

    assert.strictEqual(recorded[0].status, 'failure');
    assert.strictEqual(recorded[0].statusCode, 400);
    assert.match(recorded[0].error, /Missing robotId/);
  });

  it('non registra un errore quando la risposta è andata a buon fine', () => {
    const recorded = [];
    const middleware = auditLogger({ log: e => recorded.push(e) });
    const req = fakeReq({ method: 'POST', url: '/buy-myz', body: { userTariWallet: 'tari-1', amountMYZ: 50 } });
    const res = fakeRes();

    middleware(req, res, () => {});
    res.json({ orderId: 'order-9', status: 'pending' });
    res.finish();

    assert.strictEqual(recorded[0].error, null);
    assert.strictEqual(recorded[0].userId, 'tari-1');
    // orderId è generato dal server: si recupera dal body di risposta.
    assert.strictEqual(recorded[0].resourceId, 'order-9');
  });

  it('oscura i segreti presenti nel body', () => {
    const recorded = [];
    const middleware = auditLogger({ log: e => recorded.push(e) });
    const req = fakeReq({ method: 'POST', url: '/api/bounty/complete', body: { issueId: '1', walletAddress: 'w', privateKey: 'segreto' } });
    const res = fakeRes();

    middleware(req, res, () => {});
    res.json({ success: true });
    res.finish();

    assert.strictEqual(recorded[0].metadata.privateKey, '[REDACTED]');
    assert.strictEqual(recorded[0].metadata.issueId, '1');
  });

  it('preserva il valore di ritorno di res.json', () => {
    const middleware = auditLogger({ log: () => {} });
    const req = fakeReq({ method: 'POST', url: '/api/robot/create', body: {} });
    const res = fakeRes();

    middleware(req, res, () => {});
    assert.strictEqual(res.json({ ok: true }), res, 'res.json deve restare concatenabile');
  });

  it('non propaga gli errori dell audit alla richiesta', () => {
    const middleware = auditLogger({ log: () => { throw new Error('database esploso'); } });
    const req = fakeReq({ method: 'POST', url: '/api/robot/create', body: {} });
    const res = fakeRes();

    middleware(req, res, () => {});
    res.json({ success: true });
    assert.doesNotThrow(() => res.finish());
  });

  it('sopravvive a un resolver che lancia', () => {
    const middleware = auditLogger({ resolve: () => { throw new Error('boom'); } });
    const req = fakeReq({ method: 'POST', url: '/buy-myz' });
    const res = fakeRes();

    let nextCalled = false;
    assert.doesNotThrow(() => middleware(req, res, () => { nextCalled = true; }));
    assert.strictEqual(nextCalled, true);
  });

  it('preferisce x-forwarded-for per l IP del client', () => {
    assert.strictEqual(clientIp(fakeReq({ headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } })), '1.2.3.4');
    assert.strictEqual(clientIp(fakeReq({ ip: '9.9.9.9' })), '9.9.9.9');
  });

  it('errorFromBody legge entrambe le forme di errore del gateway', () => {
    assert.strictEqual(errorFromBody({ error: 'testo' }), 'testo');
    assert.strictEqual(errorFromBody({ success: false, error: 'testo' }), 'testo');
    assert.strictEqual(errorFromBody({ error: { message: 'oggetto' } }), 'oggetto');
    assert.strictEqual(errorFromBody({ success: true }), null);
    assert.strictEqual(errorFromBody(null), null);
  });

  it('scrive davvero nel buffer usando il logger di default', () => {
    const middleware = auditLogger();
    const req = fakeReq({ method: 'POST', url: '/api/stake/stake', body: { userId: 'alice', amount: 10 } });
    const res = fakeRes();

    middleware(req, res, () => {});
    res.json({ success: true });
    res.finish();

    const buffered = audit.getFallbackBuffer();
    assert.strictEqual(buffered.length, 1);
    assert.strictEqual(buffered[0].action, 'stake.create');
    assert.strictEqual(buffered[0].userId, 'alice');
  });
});

// -------------------------------------------------------------------- API

describe('API /api/audit', () => {
  beforeEach(async () => {
    audit.clearFallbackBuffer();
    await audit.logAudit({ action: 'escrow.create', category: 'escrow', userId: 'alice', status: 'success' });
    await audit.logAudit({ action: 'payment.buy_myz', category: 'payment', userId: 'bob', status: 'failure' });
  });

  it('GET / restituisce le voci con la paginazione', async () => {
    const { statusCode, body } = await callRoute('get', '/');
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.length, 2);
    assert.strictEqual(body.pagination.total, 2);
    assert.strictEqual(body.source, 'memory');
  });

  it('GET /?userId=xxx filtra per utente', async () => {
    const { body } = await callRoute('get', '/', { userId: 'alice' });
    assert.strictEqual(body.data.length, 1);
    assert.strictEqual(body.data[0].userId, 'alice');
  });

  it('GET /?status=failure filtra per esito', async () => {
    const { body } = await callRoute('get', '/', { status: 'failure' });
    assert.strictEqual(body.data.length, 1);
    assert.strictEqual(body.data[0].action, 'payment.buy_myz');
  });

  it('GET / risponde 400 su un filtro non valido', async () => {
    const invalidDate = await callRoute('get', '/', { from: 'ieri' });
    assert.strictEqual(invalidDate.statusCode, 400);
    assert.strictEqual(invalidDate.body.success, false);

    const invalidStatus = await callRoute('get', '/', { status: 'boh' });
    assert.strictEqual(invalidStatus.statusCode, 400);
  });

  it('GET /export?format=csv restituisce un CSV scaricabile', async () => {
    const { statusCode, body, headers } = await callRoute('get', '/export', { format: 'csv' });
    assert.strictEqual(statusCode, 200);
    assert.match(headers['Content-Type'], /text\/csv/);
    assert.match(headers['Content-Disposition'], /attachment; filename="audit-log-.*\.csv"/);
    assert.match(body, new RegExp(`^${audit.CSV_COLUMNS.join(',')}`));
    assert.match(body, /escrow\.create/);
  });

  it('GET /export senza format restituisce JSON', async () => {
    const { body, headers } = await callRoute('get', '/export');
    assert.match(headers['Content-Type'], /application\/json/);
    const parsed = JSON.parse(body);
    assert.strictEqual(parsed.count, 2);
    assert.strictEqual(parsed.logs.length, 2);
    assert.ok(parsed.exportedAt);
  });

  it('GET /export rispetta i filtri', async () => {
    const { body } = await callRoute('get', '/export', { format: 'csv', userId: 'bob' });
    assert.match(body, /payment\.buy_myz/);
    assert.doesNotMatch(body, /escrow\.create/);
  });

  it('GET /export rifiuta un formato sconosciuto', async () => {
    const { statusCode, body } = await callRoute('get', '/export', { format: 'xml' });
    assert.strictEqual(statusCode, 400);
    assert.match(body.error, /csv/);
  });

  it('GET /stats aggrega i conteggi', async () => {
    const { body } = await callRoute('get', '/stats');
    assert.strictEqual(body.data.total, 2);
    assert.strictEqual(body.data.failures, 1);
    assert.strictEqual(body.data.byCategory.escrow, 1);
  });

  it('GET /actions elenca il catalogo delle azioni tracciate', async () => {
    const { body } = await callRoute('get', '/actions');
    assert.ok(body.count >= 15);
    assert.strictEqual(body.count, body.data.length);
    assert.ok(body.data.every(a => a.action && a.category && a.method));
    assert.ok(body.data.some(a => a.action === 'escrow.create'));
  });
});
