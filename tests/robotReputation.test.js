/**
 * Test per reputazione e feedback robot - Bounty BOT-6 (#343)
 *
 * Girano senza MongoDB: il servizio usa l'archivio in memoria, che è anche il
 * percorso di degrado testato qui.
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

const reputation = require('../services/reputationService');
const robotBrain = require('../robot_brain');
const router = require('../routes/robotFeedback');

// ------------------------------------------------------------------ utils

let seq = 0;
function uniqueId(prefix) {
  seq += 1;
  return `${prefix}-${process.pid}-${seq}`;
}

/** robot_brain tiene lo stato in un Map di modulo: servono id univoci. */
function seedRobot({ jobsCompleted = 0, disputes = 0, status = 'idle' } = {}) {
  const robotId = uniqueId('rep-robot');
  const robot = robotBrain.createRobot(robotId, `Robot ${robotId}`, `wallet_${robotId}`);
  robot.jobsCompleted = jobsCompleted;
  robot.status = status;
  robot.history = Array.from({ length: disputes }, () => ({ event: 'dispute_opened' }));
  return robot;
}

function callRoute(method, path, { params = {}, query = {}, body = {} } = {}) {
  const layer = router.stack.find(l => l.route && l.route.path === path && l.route.methods[method]);
  assert.ok(layer, `route ${method.toUpperCase()} ${path} non registrata`);
  const req = { method: method.toUpperCase(), params, query, body };
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(payload) { resolve({ statusCode: this.statusCode, body: payload }); }
    };
    Promise.resolve(layer.route.stack[0].handle(req, res, reject)).catch(reject);
  });
}

// -------------------------------------------------------------- computeScore

describe('computeScore', () => {
  it('dà 50 (neutro) a un robot senza feedback e senza job', () => {
    const { score, components } = reputation.computeScore({});
    assert.strictEqual(components.quality, 50, 'sconosciuto, non inaffidabile');
    assert.strictEqual(components.experience, 0);
    assert.strictEqual(components.reliability, 100);
    assert.strictEqual(score, 50 * 0.6 + 0 * 0.25 + 100 * 0.15);
  });

  it('mappa la media voti 1-5 su 0-100', () => {
    assert.strictEqual(reputation.computeScore({ averageRating: 5, totalFeedback: 1 }).components.quality, 100);
    assert.strictEqual(reputation.computeScore({ averageRating: 1, totalFeedback: 1 }).components.quality, 0);
    assert.strictEqual(reputation.computeScore({ averageRating: 3, totalFeedback: 1 }).components.quality, 50);
  });

  it('fa crescere l esperienza fino al plateau di 50 job', () => {
    assert.strictEqual(reputation.computeScore({ jobsCompleted: 25 }).components.experience, 50);
    assert.strictEqual(reputation.computeScore({ jobsCompleted: 50 }).components.experience, 100);
    assert.strictEqual(reputation.computeScore({ jobsCompleted: 500 }).components.experience, 100, 'non supera 100');
  });

  it('abbassa l affidabilità in proporzione alle dispute', () => {
    assert.strictEqual(reputation.computeScore({ jobsCompleted: 10, disputes: 0 }).components.reliability, 100);
    assert.strictEqual(reputation.computeScore({ jobsCompleted: 10, disputes: 2 }).components.reliability, 80);
    assert.strictEqual(reputation.computeScore({ jobsCompleted: 10, disputes: 10 }).components.reliability, 0);
  });

  it('non manda l affidabilità sotto zero con più dispute che job', () => {
    const { components } = reputation.computeScore({ jobsCompleted: 1, disputes: 5 });
    assert.strictEqual(components.reliability, 0);
  });

  it('tiene il punteggio dentro 0-100', () => {
    const best = reputation.computeScore({ averageRating: 5, totalFeedback: 30, jobsCompleted: 100, disputes: 0 });
    const worst = reputation.computeScore({ averageRating: 1, totalFeedback: 30, jobsCompleted: 5, disputes: 5 });
    assert.strictEqual(best.score, 100);
    assert.ok(worst.score >= 0 && worst.score < 20);
  });

  it('pesa la qualità più dell esperienza', () => {
    const qualitySwing = reputation.computeScore({ averageRating: 5, totalFeedback: 1 }).score
      - reputation.computeScore({ averageRating: 1, totalFeedback: 1 }).score;
    const experienceSwing = reputation.computeScore({ jobsCompleted: 50 }).score
      - reputation.computeScore({ jobsCompleted: 0 }).score;
    assert.ok(qualitySwing > experienceSwing);
  });
});

// --------------------------------------------------------------------- badge

describe('badge', () => {
  it('assegna i quattro livelli in base a punteggio e job', () => {
    assert.strictEqual(reputation.badgeFor(95, 60).name, 'Platinum');
    assert.strictEqual(reputation.badgeFor(80, 25).name, 'Gold');
    assert.strictEqual(reputation.badgeFor(65, 10).name, 'Silver');
    assert.strictEqual(reputation.badgeFor(30, 2).name, 'Bronze');
  });

  it('non promuove chi ha il punteggio ma non i job', () => {
    assert.strictEqual(reputation.badgeFor(95, 3).name, 'Bronze', '95 punti ma solo 3 job');
    assert.strictEqual(reputation.badgeFor(95, 10).name, 'Silver');
    assert.strictEqual(reputation.badgeFor(95, 20).name, 'Gold');
  });

  it('nextBadge dice quanto manca', () => {
    const next = reputation.nextBadge(65, 10);
    assert.strictEqual(next.name, 'Gold');
    assert.strictEqual(next.scoreNeeded, 10);
    assert.strictEqual(next.jobsNeeded, 10);
  });

  it('nextBadge è null per Platinum', () => {
    assert.strictEqual(reputation.nextBadge(95, 60), null);
  });

  it('nextBadge non restituisce valori negativi', () => {
    const next = reputation.nextBadge(95, 25); // Gold, gli manca solo l'esperienza
    assert.strictEqual(next.name, 'Platinum');
    assert.strictEqual(next.scoreNeeded, 0);
    assert.strictEqual(next.jobsNeeded, 25);
  });
});

// ---------------------------------------------------------------- validazione

describe('validateFeedback', () => {
  const valid = { robotId: 'r1', clientId: 'c1', jobId: 'j1', rating: 4 };

  it('accetta un payload valido e normalizza', () => {
    const out = reputation.validateFeedback({ ...valid, rating: '5', disputed: 'true' });
    assert.strictEqual(out.rating, 5);
    assert.strictEqual(out.disputed, true);
    assert.strictEqual(out.comment, null);
    assert.ok(out.createdAt instanceof Date);
  });

  it('richiede i campi obbligatori', () => {
    for (const field of ['robotId', 'clientId', 'jobId']) {
      const payload = { ...valid };
      delete payload[field];
      assert.throws(() => reputation.validateFeedback(payload), new RegExp(`${field} è obbligatorio`));
    }
  });

  it('rifiuta rating fuori scala, non interi e non numerici', () => {
    assert.throws(() => reputation.validateFeedback({ ...valid, rating: 0 }), /fra 1 e 5/);
    assert.throws(() => reputation.validateFeedback({ ...valid, rating: 6 }), /fra 1 e 5/);
    assert.throws(() => reputation.validateFeedback({ ...valid, rating: 3.5 }), /intero/);
    assert.throws(() => reputation.validateFeedback({ ...valid, rating: 'ottimo' }), /deve essere un numero/);
    assert.throws(() => reputation.validateFeedback({ ...valid, rating: undefined }), /obbligatorio/);
  });

  it('rifiuta commenti non stringa o troppo lunghi', () => {
    assert.throws(() => reputation.validateFeedback({ ...valid, comment: 42 }), /stringa/);
    assert.throws(() => reputation.validateFeedback({ ...valid, comment: 'x'.repeat(1001) }), /1000 caratteri/);
  });
});

// ------------------------------------------------------------------ scrittura

describe('submitFeedback', () => {
  beforeEach(() => reputation.clearMemoryFeedback());

  it('registra un feedback', async () => {
    const robot = seedRobot();
    await reputation.submitFeedback({ robotId: robot.robotId, clientId: 'alice', jobId: 'j1', rating: 5 });
    assert.strictEqual(reputation.getMemoryFeedback().length, 1);
  });

  it('rifiuta un secondo feedback dello stesso cliente sullo stesso job', async () => {
    const robot = seedRobot();
    const payload = { robotId: robot.robotId, clientId: 'alice', jobId: 'j1', rating: 5 };
    await reputation.submitFeedback(payload);
    await assert.rejects(() => reputation.submitFeedback({ ...payload, rating: 1 }), reputation.ConflictError);
    assert.strictEqual(reputation.getMemoryFeedback().length, 1);
  });

  it('accetta clienti diversi sullo stesso job', async () => {
    const robot = seedRobot();
    await reputation.submitFeedback({ robotId: robot.robotId, clientId: 'alice', jobId: 'j1', rating: 5 });
    await reputation.submitFeedback({ robotId: robot.robotId, clientId: 'bob', jobId: 'j1', rating: 4 });
    assert.strictEqual(reputation.getMemoryFeedback().length, 2);
  });

  it('accetta job diversi dallo stesso cliente', async () => {
    const robot = seedRobot();
    await reputation.submitFeedback({ robotId: robot.robotId, clientId: 'alice', jobId: 'j1', rating: 5 });
    await reputation.submitFeedback({ robotId: robot.robotId, clientId: 'alice', jobId: 'j2', rating: 3 });
    assert.strictEqual(reputation.getMemoryFeedback().length, 2);
  });
});

// -------------------------------------------------------------------- summary

describe('summarize', () => {
  it('calcola media, distribuzione e dispute', () => {
    const s = reputation.summarize([
      { rating: 5, disputed: false }, { rating: 4, disputed: false },
      { rating: 5, disputed: false }, { rating: 2, disputed: true }
    ]);
    assert.strictEqual(s.totalFeedback, 4);
    assert.strictEqual(s.averageRating, 4);
    assert.strictEqual(s.disputedFeedback, 1);
    assert.deepStrictEqual(s.ratingDistribution, { 1: 0, 2: 1, 3: 0, 4: 1, 5: 2 });
  });

  it('restituisce averageRating null senza feedback', () => {
    const s = reputation.summarize([]);
    assert.strictEqual(s.averageRating, null);
    assert.strictEqual(s.totalFeedback, 0);
  });
});

// ------------------------------------------------------------- getReputation

describe('getReputation', () => {
  beforeEach(() => reputation.clearMemoryFeedback());

  it('combina feedback e statistiche del robot_brain', async () => {
    const robot = seedRobot({ jobsCompleted: 25, disputes: 1 });
    await reputation.submitFeedback({ robotId: robot.robotId, clientId: 'a', jobId: 'j1', rating: 5 });
    await reputation.submitFeedback({ robotId: robot.robotId, clientId: 'b', jobId: 'j2', rating: 4 });

    const rep = await reputation.getReputation(robot.robotId);
    assert.strictEqual(rep.robotId, robot.robotId);
    assert.strictEqual(rep.totalFeedback, 2);
    assert.strictEqual(rep.averageRating, 4.5);
    assert.strictEqual(rep.jobsCompleted, 25);
    assert.strictEqual(rep.disputes, 1);
    assert.strictEqual(rep.knownToGateway, true);
    assert.ok(rep.score > 50);
    assert.ok(['Bronze', 'Silver', 'Gold', 'Platinum'].includes(rep.badge));
  });

  it('non conta due volte la stessa disputa', async () => {
    const robot = seedRobot({ jobsCompleted: 10, disputes: 2 });
    await reputation.submitFeedback({ robotId: robot.robotId, clientId: 'a', jobId: 'j1', rating: 2, disputed: true });
    const rep = await reputation.getReputation(robot.robotId);
    assert.strictEqual(rep.disputes, 2, 'max(2 dal brain, 1 dai feedback)');
  });

  it('gestisce un robot sconosciuto al gateway', async () => {
    const rep = await reputation.getReputation('mai-esistito');
    assert.strictEqual(rep.knownToGateway, false);
    assert.strictEqual(rep.jobsCompleted, 0);
    assert.strictEqual(rep.totalFeedback, 0);
    assert.strictEqual(rep.averageRating, null);
    assert.strictEqual(rep.badge, 'Bronze');
  });

  it('richiede un robotId', async () => {
    await assert.rejects(() => reputation.getReputation(''), reputation.ValidationError);
  });

  it('i voti bassi abbassano il punteggio', async () => {
    const good = seedRobot({ jobsCompleted: 10 });
    const bad = seedRobot({ jobsCompleted: 10 });
    await reputation.submitFeedback({ robotId: good.robotId, clientId: 'a', jobId: 'j1', rating: 5 });
    await reputation.submitFeedback({ robotId: bad.robotId, clientId: 'a', jobId: 'j1', rating: 1 });

    const goodRep = await reputation.getReputation(good.robotId);
    const badRep = await reputation.getReputation(bad.robotId);
    assert.ok(goodRep.score > badRep.score);
  });
});

// -------------------------------------------------------------- leaderboard

describe('getLeaderboard', () => {
  beforeEach(() => reputation.clearMemoryFeedback());

  it('ordina per punteggio decrescente', async () => {
    const top = seedRobot({ jobsCompleted: 40 });
    const low = seedRobot({ jobsCompleted: 1 });
    await reputation.submitFeedback({ robotId: top.robotId, clientId: 'a', jobId: 'j1', rating: 5 });
    await reputation.submitFeedback({ robotId: low.robotId, clientId: 'a', jobId: 'j1', rating: 1 });

    const board = await reputation.getLeaderboard({ limit: 100 });
    const topIndex = board.findIndex(r => r.robotId === top.robotId);
    const lowIndex = board.findIndex(r => r.robotId === low.robotId);
    assert.ok(topIndex >= 0 && lowIndex >= 0);
    assert.ok(topIndex < lowIndex, 'il robot migliore viene prima');
  });

  it('rispetta il limite', async () => {
    seedRobot(); seedRobot(); seedRobot();
    assert.strictEqual((await reputation.getLeaderboard({ limit: 2 })).length, 2);
  });

  it('filtra per badge', async () => {
    seedRobot({ jobsCompleted: 1 });
    const board = await reputation.getLeaderboard({ limit: 100, badge: 'Bronze' });
    assert.ok(board.every(r => r.badge === 'Bronze'));
  });

  it('include anche robot noti solo dai feedback', async () => {
    await reputation.submitFeedback({ robotId: 'robot-esterno', clientId: 'a', jobId: 'j1', rating: 4 });
    const board = await reputation.getLeaderboard({ limit: 100 });
    assert.ok(board.some(r => r.robotId === 'robot-esterno'));
  });
});

// ---------------------------------------------------------------------- API

describe('API feedback e reputazione', () => {
  beforeEach(() => reputation.clearMemoryFeedback());

  it('POST /feedback risponde 201 con feedback e reputazione aggiornata', async () => {
    const robot = seedRobot({ jobsCompleted: 5 });
    const { statusCode, body } = await callRoute('post', '/feedback', {
      body: { robotId: robot.robotId, clientId: 'alice', jobId: 'j1', rating: 5, comment: 'Ottimo lavoro' }
    });

    assert.strictEqual(statusCode, 201);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.feedback.rating, 5);
    assert.strictEqual(body.data.feedback.comment, 'Ottimo lavoro');
    assert.strictEqual(body.data.reputation.totalFeedback, 1);
    assert.ok(body.data.reputation.badge);
  });

  it('POST /feedback risponde 400 su payload non valido', async () => {
    const { statusCode, body } = await callRoute('post', '/feedback', {
      body: { robotId: 'r1', clientId: 'c1', jobId: 'j1', rating: 9 }
    });
    assert.strictEqual(statusCode, 400);
    assert.strictEqual(body.success, false);
    assert.match(body.error, /fra 1 e 5/);
  });

  it('POST /feedback risponde 409 sul duplicato', async () => {
    const robot = seedRobot();
    const body = { robotId: robot.robotId, clientId: 'alice', jobId: 'j1', rating: 5 };
    await callRoute('post', '/feedback', { body });
    const second = await callRoute('post', '/feedback', { body });
    assert.strictEqual(second.statusCode, 409);
    assert.match(second.body.error, /già presente/);
  });

  it('GET /feedback/:robotId restituisce lo storico paginato', async () => {
    const robot = seedRobot();
    for (let i = 0; i < 5; i++) {
      await reputation.submitFeedback({ robotId: robot.robotId, clientId: `c${i}`, jobId: `j${i}`, rating: 4 });
    }
    const { statusCode, body } = await callRoute('get', '/feedback/:robotId', {
      params: { robotId: robot.robotId }, query: { limit: '2', page: '2' }
    });
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(body.data.length, 2);
    assert.strictEqual(body.pagination.total, 5);
    assert.strictEqual(body.pagination.pages, 3);
  });

  it('GET /reputation/:robotId restituisce punteggio e componenti', async () => {
    const robot = seedRobot({ jobsCompleted: 30 });
    await reputation.submitFeedback({ robotId: robot.robotId, clientId: 'a', jobId: 'j1', rating: 5 });
    const { statusCode, body } = await callRoute('get', '/reputation/:robotId', {
      params: { robotId: robot.robotId }
    });
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(typeof body.data.score, 'number');
    assert.ok(body.data.components.quality >= 0);
    assert.ok('nextBadge' in body.data);
  });

  it('GET /reputation restituisce la classifica', async () => {
    seedRobot({ jobsCompleted: 3 });
    const { statusCode, body } = await callRoute('get', '/reputation', { query: { limit: '5' } });
    assert.strictEqual(statusCode, 200);
    assert.ok(Array.isArray(body.data));
    assert.strictEqual(body.count, body.data.length);
  });

  it('GET /badges elenca le quattro soglie', async () => {
    const { body } = await callRoute('get', '/badges');
    assert.strictEqual(body.data.length, 4);
    assert.deepStrictEqual(body.data.map(b => b.name), ['Platinum', 'Gold', 'Silver', 'Bronze']);
  });
});
