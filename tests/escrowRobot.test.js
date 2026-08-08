/**
 * Unit test per escrow_robot.js - Bounty P9 (#273)
 *
 * myz_wallet, xmr_wallet e notifications sono sostituiti da mock che registrano
 * le chiamate. I mock vengono iniettati nella require cache PRIMA di richiedere
 * escrow_robot, così il modulo sotto test riceve le nostre implementazioni senza
 * bisogno di modificarne il codice di produzione.
 *
 * `markDelivered` pianifica `autoRelease` a 48h con setTimeout: i test usano i
 * timer finti di node:test per farlo scattare senza attese reali e senza
 * lasciare handle appesi che terrebbero vivo il processo.
 */

const { describe, it, before, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert');

// ---------------------------------------------------------------- mock setup

const calls = {
  lockMYZ: [], releaseMYZ: [], refundMYZ: [],
  lockXMR: [], releaseXMR: [], refundXMR: [],
  notifyUser: [], notifyRobot: []
};

function resetCalls() {
  for (const key of Object.keys(calls)) calls[key].length = 0;
}

/** Registra un modulo fittizio nella require cache al posto di quello reale. */
function stubModule(request, exports) {
  const filename = require.resolve(request);
  require.cache[filename] = {
    id: filename, filename, path: require('node:path').dirname(filename),
    loaded: true, exports, children: [], paths: []
  };
}

function recorder(name, result) {
  return async (...args) => {
    calls[name].push(args);
    return typeof result === 'function' ? result(...args) : result;
  };
}

stubModule('../gateway/myz_wallet', {
  lockMYZ: recorder('lockMYZ', 'mock_myz_lock_tx'),
  releaseMYZ: recorder('releaseMYZ', 'mock_myz_release_tx'),
  refundMYZ: recorder('refundMYZ', 'mock_myz_refund_tx')
});

stubModule('../gateway/xmr_wallet', {
  lockXMR: recorder('lockXMR', 'mock_xmr_lock_tx'),
  releaseXMR: recorder('releaseXMR', 'mock_xmr_release_tx'),
  refundXMR: recorder('refundXMR', 'mock_xmr_refund_tx')
});

stubModule('../notifications', {
  notifyUser: recorder('notifyUser'),
  notifyRobot: recorder('notifyRobot')
});

// Richiesto DOPO gli stub, altrimenti caricherebbe i moduli reali.
const escrowRobot = require('../escrow_robot');
const { createEscrow, markDelivered, autoRelease, openDispute, getEscrow } = escrowRobot;

// ------------------------------------------------------------------ helpers

const FEE_PERCENT = 0.02;
const DISPUTE_WINDOW_MS = 48 * 3600 * 1000;
const JOB_TIMEOUT_MS = 24 * 3600 * 1000;

let seq = 0;
/** escrows è una Map di modulo condivisa fra i test: serve un jobId univoco. */
function jobId(label = 'job') {
  seq += 1;
  return `${label}-${seq}`;
}

function baseJob(overrides = {}) {
  return { jobId: jobId(), clientId: 'client-1', robotId: 'robot-1', amount: 100, currency: 'MYZ', ...overrides };
}

/** Lascia girare le promise pendenti dopo che un timer finto è scattato. */
async function flush() {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

// -------------------------------------------------------------------- tests

describe('escrow_robot', () => {
  before(() => {
    assert.deepStrictEqual(
      Object.keys(escrowRobot).sort(),
      ['autoRelease', 'createEscrow', 'getEscrow', 'markDelivered', 'openDispute'],
      'API pubblica del modulo'
    );
  });

  beforeEach(() => {
    resetCalls();
    mock.timers.enable({ apis: ['setTimeout'] });
  });

  afterEach(() => {
    mock.timers.reset();
  });

  describe('createEscrow', () => {
    it('blocca MYZ e restituisce un escrow LOCKED con fee al 2%', async () => {
      const job = baseJob({ amount: 250 });
      const escrow = await createEscrow(job);

      assert.strictEqual(escrow.status, 'LOCKED');
      assert.strictEqual(escrow.jobId, job.jobId);
      assert.strictEqual(escrow.clientId, 'client-1');
      assert.strictEqual(escrow.robotId, 'robot-1');
      assert.strictEqual(escrow.amount, 250);
      assert.strictEqual(escrow.fee, 250 * FEE_PERCENT);
      assert.strictEqual(escrow.netAmount, 250 - 250 * FEE_PERCENT);
      assert.strictEqual(escrow.currency, 'MYZ');
      assert.strictEqual(escrow.lockTx, 'mock_myz_lock_tx');
    });

    it('chiama lockMYZ con clientId e importo lordo, non netto', async () => {
      await createEscrow(baseJob({ amount: 100, clientId: 'alice' }));
      assert.strictEqual(calls.lockMYZ.length, 1);
      assert.deepStrictEqual(calls.lockMYZ[0], ['alice', 100]);
      assert.strictEqual(calls.lockXMR.length, 0);
    });

    it('usa lockXMR quando la valuta è XMR', async () => {
      const escrow = await createEscrow(baseJob({ currency: 'XMR', amount: 2, clientId: 'bob' }));
      assert.strictEqual(escrow.lockTx, 'mock_xmr_lock_tx');
      assert.deepStrictEqual(calls.lockXMR[0], ['bob', 2]);
      assert.strictEqual(calls.lockMYZ.length, 0);
    });

    it('imposta una deadline a 24h dalla creazione', async () => {
      const escrow = await createEscrow(baseJob());
      assert.strictEqual(escrow.deadline - escrow.createdAt, JOB_TIMEOUT_MS);
    });

    it('notifica il robot del nuovo job', async () => {
      const job = baseJob({ robotId: 'robot-42', amount: 30, currency: 'XMR' });
      await createEscrow(job);

      assert.strictEqual(calls.notifyRobot.length, 1);
      const [robotId, message] = calls.notifyRobot[0];
      assert.strictEqual(robotId, 'robot-42');
      assert.match(message, new RegExp(job.jobId));
      assert.match(message, /30 XMR/);
    });

    it('rende l escrow recuperabile con getEscrow', async () => {
      const job = baseJob();
      const created = await createEscrow(job);
      assert.strictEqual(getEscrow(job.jobId), created);
    });

    // Caso limite: currency sconosciuta. Il modulo oggi non valida l'input,
    // quindi non blocca nulla e lockTx resta undefined: il test fissa il
    // comportamento attuale, così una futura validazione lo farà fallire
    // in modo esplicito invece che silenzioso.
    it('con una valuta sconosciuta non blocca fondi e lascia lockTx undefined', async () => {
      const escrow = await createEscrow(baseJob({ currency: 'DOGE' }));
      assert.strictEqual(escrow.lockTx, undefined);
      assert.strictEqual(escrow.status, 'LOCKED');
      assert.strictEqual(calls.lockMYZ.length, 0);
      assert.strictEqual(calls.lockXMR.length, 0);
    });

    it('con amount 0 produce fee e netAmount a 0', async () => {
      const escrow = await createEscrow(baseJob({ amount: 0 }));
      assert.strictEqual(escrow.fee, 0);
      assert.strictEqual(escrow.netAmount, 0);
    });

    it('sovrascrive un escrow con lo stesso jobId', async () => {
      const id = jobId('dup');
      await createEscrow({ jobId: id, clientId: 'c', robotId: 'r', amount: 10, currency: 'MYZ' });
      const second = await createEscrow({ jobId: id, clientId: 'c', robotId: 'r', amount: 99, currency: 'MYZ' });
      assert.strictEqual(getEscrow(id).amount, 99);
      assert.strictEqual(getEscrow(id), second);
    });
  });

  describe('markDelivered', () => {
    it('porta lo stato a DELIVERED e apre la finestra di disputa di 48h', async () => {
      const job = baseJob();
      await createEscrow(job);
      const escrow = await markDelivered({ jobId: job.jobId });

      assert.strictEqual(escrow.status, 'DELIVERED');
      assert.ok(escrow.deliveredAt, 'deliveredAt valorizzato');
      assert.strictEqual(escrow.disputeDeadline - escrow.deliveredAt, DISPUTE_WINDOW_MS);
    });

    it('notifica il cliente della consegna', async () => {
      const job = baseJob({ clientId: 'carol' });
      await createEscrow(job);
      resetCalls();
      await markDelivered({ jobId: job.jobId });

      assert.strictEqual(calls.notifyUser.length, 1);
      const [clientId, message] = calls.notifyUser[0];
      assert.strictEqual(clientId, 'carol');
      assert.match(message, /48h/);
    });

    it('lancia "Escrow non trovato" per un jobId inesistente', async () => {
      await assert.rejects(
        () => markDelivered({ jobId: 'inesistente' }),
        /Escrow non trovato/
      );
    });

    it('pianifica autoRelease a 48h: prima non rilascia nulla, dopo sì', async () => {
      const job = baseJob({ amount: 100 });
      await createEscrow(job);
      await markDelivered({ jobId: job.jobId });
      resetCalls();

      mock.timers.tick(DISPUTE_WINDOW_MS - 1);
      await flush();
      assert.strictEqual(calls.releaseMYZ.length, 0, 'nessun rilascio prima della scadenza');
      assert.strictEqual(getEscrow(job.jobId).status, 'DELIVERED');

      mock.timers.tick(1);
      await flush();
      assert.strictEqual(calls.releaseMYZ.length, 2, 'robot + piattaforma');
      assert.strictEqual(getEscrow(job.jobId).status, 'COMPLETED');
    });
  });

  describe('autoRelease', () => {
    it('paga il netto al robot e la fee al wallet di piattaforma (MYZ)', async () => {
      const job = baseJob({ amount: 100, robotId: 'robot-7' });
      await createEscrow(job);
      await markDelivered({ jobId: job.jobId });
      resetCalls();

      await autoRelease(job.jobId);

      assert.deepStrictEqual(calls.releaseMYZ[0], ['robot-7', 98]);
      assert.deepStrictEqual(calls.releaseMYZ[1], ['PLATFORM_WALLET', 2]);
      assert.strictEqual(calls.releaseXMR.length, 0);
      assert.strictEqual(getEscrow(job.jobId).status, 'COMPLETED');
    });

    it('usa releaseXMR per gli escrow in XMR', async () => {
      const job = baseJob({ amount: 10, currency: 'XMR', robotId: 'robot-8' });
      await createEscrow(job);
      await markDelivered({ jobId: job.jobId });
      resetCalls();

      await autoRelease(job.jobId);

      assert.deepStrictEqual(calls.releaseXMR[0], ['robot-8', 9.8]);
      assert.deepStrictEqual(calls.releaseXMR[1], ['PLATFORM_WALLET', 0.2]);
      assert.strictEqual(calls.releaseMYZ.length, 0);
    });

    it('notifica cliente e robot a pagamento avvenuto', async () => {
      const job = baseJob({ amount: 100, clientId: 'dave', robotId: 'robot-9' });
      await createEscrow(job);
      await markDelivered({ jobId: job.jobId });
      resetCalls();

      await autoRelease(job.jobId);

      assert.strictEqual(calls.notifyUser.length, 1);
      assert.strictEqual(calls.notifyUser[0][0], 'dave');
      assert.strictEqual(calls.notifyRobot.length, 1);
      assert.strictEqual(calls.notifyRobot[0][0], 'robot-9');
      assert.match(calls.notifyRobot[0][1], /98 MYZ/);
    });

    // Casi limite: uscita silenziosa, nessun pagamento.
    it('non fa nulla se l escrow non esiste', async () => {
      await assert.doesNotReject(() => autoRelease('mai-creato'));
      assert.strictEqual(calls.releaseMYZ.length, 0);
      assert.strictEqual(calls.releaseXMR.length, 0);
      assert.strictEqual(calls.notifyUser.length, 0);
    });

    it('non rilascia se lo stato è ancora LOCKED', async () => {
      const job = baseJob();
      await createEscrow(job);
      resetCalls();

      await autoRelease(job.jobId);

      assert.strictEqual(calls.releaseMYZ.length, 0);
      assert.strictEqual(getEscrow(job.jobId).status, 'LOCKED');
    });

    it('non rilascia se lo stato è CONTESTED', async () => {
      const job = baseJob();
      await createEscrow(job);
      await markDelivered({ jobId: job.jobId });
      await openDispute({ jobId: job.jobId, reason: 'qualità' });
      resetCalls();

      await autoRelease(job.jobId);

      assert.strictEqual(calls.releaseMYZ.length, 0);
      assert.strictEqual(getEscrow(job.jobId).status, 'CONTESTED');
    });

    it('è idempotente: la seconda chiamata non ripaga', async () => {
      const job = baseJob({ amount: 100 });
      await createEscrow(job);
      await markDelivered({ jobId: job.jobId });
      await autoRelease(job.jobId);
      resetCalls();

      await autoRelease(job.jobId);

      assert.strictEqual(calls.releaseMYZ.length, 0, 'stato già COMPLETED');
    });

    it('una disputa aperta prima delle 48h blocca il rilascio automatico', async () => {
      const job = baseJob();
      await createEscrow(job);
      await markDelivered({ jobId: job.jobId });
      await openDispute({ jobId: job.jobId, reason: 'lavoro incompleto' });
      resetCalls();

      mock.timers.tick(DISPUTE_WINDOW_MS);
      await flush();

      assert.strictEqual(calls.releaseMYZ.length, 0);
      assert.strictEqual(getEscrow(job.jobId).status, 'CONTESTED');
    });
  });

  describe('openDispute', () => {
    it('porta lo stato a CONTESTED', async () => {
      const job = baseJob();
      await createEscrow(job);
      await openDispute({ jobId: job.jobId, reason: 'consegna errata' });
      assert.strictEqual(getEscrow(job.jobId).status, 'CONTESTED');
    });

    it('notifica il cliente includendo il motivo', async () => {
      const job = baseJob({ clientId: 'erin' });
      await createEscrow(job);
      resetCalls();
      await openDispute({ jobId: job.jobId, reason: 'file corrotto' });

      assert.strictEqual(calls.notifyUser.length, 1);
      const [clientId, message] = calls.notifyUser[0];
      assert.strictEqual(clientId, 'erin');
      assert.match(message, /file corrotto/);
      assert.match(message, new RegExp(job.jobId));
    });

    it('lancia "Escrow non trovato" per un jobId inesistente', async () => {
      await assert.rejects(
        () => openDispute({ jobId: 'inesistente', reason: 'x' }),
        /Escrow non trovato/
      );
    });

    it('può essere aperta anche su un escrow ancora LOCKED', async () => {
      const job = baseJob();
      await createEscrow(job);
      await openDispute({ jobId: job.jobId, reason: 'nessuna consegna' });
      assert.strictEqual(getEscrow(job.jobId).status, 'CONTESTED');
    });

    it('non restituisce nulla', async () => {
      const job = baseJob();
      await createEscrow(job);
      assert.strictEqual(await openDispute({ jobId: job.jobId, reason: 'x' }), undefined);
    });
  });

  describe('getEscrow', () => {
    it('restituisce l escrow esistente', async () => {
      const job = baseJob();
      const created = await createEscrow(job);
      assert.strictEqual(getEscrow(job.jobId), created);
    });

    it('restituisce null (non undefined) per un jobId sconosciuto', () => {
      assert.strictEqual(getEscrow('sconosciuto'), null);
    });

    it('restituisce null per jobId undefined', () => {
      assert.strictEqual(getEscrow(undefined), null);
    });

    it('riflette i cambi di stato successivi', async () => {
      const job = baseJob();
      await createEscrow(job);
      assert.strictEqual(getEscrow(job.jobId).status, 'LOCKED');
      await markDelivered({ jobId: job.jobId });
      assert.strictEqual(getEscrow(job.jobId).status, 'DELIVERED');
      await autoRelease(job.jobId);
      assert.strictEqual(getEscrow(job.jobId).status, 'COMPLETED');
    });
  });

  describe('ciclo di vita completo', () => {
    it('create -> delivered -> autoRelease dopo 48h', async () => {
      const job = baseJob({ amount: 500, currency: 'XMR', clientId: 'frank', robotId: 'robot-99' });

      const escrow = await createEscrow(job);
      assert.strictEqual(escrow.status, 'LOCKED');
      assert.strictEqual(calls.lockXMR.length, 1);

      await markDelivered({ jobId: job.jobId });
      assert.strictEqual(getEscrow(job.jobId).status, 'DELIVERED');

      mock.timers.tick(DISPUTE_WINDOW_MS);
      await flush();

      const final = getEscrow(job.jobId);
      assert.strictEqual(final.status, 'COMPLETED');
      assert.deepStrictEqual(calls.releaseXMR[0], ['robot-99', 490]);
      assert.deepStrictEqual(calls.releaseXMR[1], ['PLATFORM_WALLET', 10]);
    });
  });
});
