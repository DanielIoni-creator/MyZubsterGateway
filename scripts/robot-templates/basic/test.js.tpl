// {{TEST_FILE}} – Test del robot {{DISPLAY_NAME}}
// Generato da `npm run robot:create -- {{SLUG}} --template {{TEMPLATE}}` il {{GENERATED_AT}}.
//
// escrow_robot e notifications sono sostituiti da mock iniettati nella require
// cache prima del require del robot: i test girano senza wallet né database.

const { describe, it, beforeEach, mock } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

function stubModule(request, exports) {
  const filename = require.resolve(request);
  require.cache[filename] = {
    id: filename, filename, path: path.dirname(filename),
    loaded: true, exports, children: [], paths: []
  };
}

const escrows = new Map();
stubModule('../escrow_robot', {
  createEscrow: async ({ jobId, clientId, robotId, amount, currency }) => {
    const escrow = { jobId, clientId, robotId, amount, currency, status: 'LOCKED' };
    escrows.set(jobId, escrow);
    return escrow;
  },
  markDelivered: async ({ jobId }) => {
    const escrow = escrows.get(jobId);
    if (!escrow) throw new Error('Escrow non trovato');
    escrow.status = 'DELIVERED';
    return escrow;
  },
  getEscrow: jobId => escrows.get(jobId) || null,
  openDispute: async () => {},
  autoRelease: async () => {}
});

stubModule('../notifications', {
  notifyUser: async () => {},
  notifyRobot: async () => {}
});

const robot = require('../{{MODULE_NAME}}');

function baseJob(overrides = {}) {
  return {
    jobId: 'job-1', clientId: 'alice', robotId: 'robot-1',
    {{INPUT_FIELD}}: {{SAMPLE_INPUT}},
    ...overrides
  };
}

describe('{{DISPLAY_NAME}} robot', () => {
  beforeEach(() => {
    robot.reset();
    escrows.clear();
  });

  describe('create{{PASCAL_NAME}}Job', () => {
    it('crea un job in stato pending e blocca l escrow', async () => {
      const job = await robot.create{{PASCAL_NAME}}Job(baseJob());
      assert.strictEqual(job.status, 'pending');
      assert.strictEqual(job.escrow.status, 'LOCKED');
      assert.strictEqual(job.amount, {{DEFAULT_AMOUNT}});
      assert.strictEqual(job.currency, 'MYZ');
    });

    it('richiede i campi obbligatori', async () => {
      for (const field of ['jobId', 'clientId', 'robotId', '{{INPUT_FIELD}}']) {
        const payload = baseJob();
        delete payload[field];
        await assert.rejects(() => robot.create{{PASCAL_NAME}}Job(payload), new RegExp(field));
      }
    });

    it('rifiuta un jobId duplicato', async () => {
      await robot.create{{PASCAL_NAME}}Job(baseJob());
      await assert.rejects(() => robot.create{{PASCAL_NAME}}Job(baseJob()), /già esistente/);
    });
  });

  describe('execute{{PASCAL_NAME}}Job', () => {
    it('produce un risultato e consegna l escrow', async () => {
      await robot.create{{PASCAL_NAME}}Job(baseJob());
      const result = await robot.execute{{PASCAL_NAME}}Job('job-1');

      assert.strictEqual(result.status, 'delivered');
      assert.ok(result.{{OUTPUT_FIELD}}, 'il risultato è valorizzato');
      assert.strictEqual(escrows.get('job-1').status, 'DELIVERED');
    });

    it('lancia su job inesistente', async () => {
      await assert.rejects(() => robot.execute{{PASCAL_NAME}}Job('mai-creato'), /non trovato/);
    });

    it('non esegue due volte lo stesso job', async () => {
      await robot.create{{PASCAL_NAME}}Job(baseJob());
      await robot.execute{{PASCAL_NAME}}Job('job-1');
      await assert.rejects(() => robot.execute{{PASCAL_NAME}}Job('job-1'), /già in stato delivered/);
    });
  });

  describe('lettura', () => {
    it('get restituisce il job con l escrow, null se sconosciuto', async () => {
      await robot.create{{PASCAL_NAME}}Job(baseJob());
      assert.strictEqual(robot.get{{PASCAL_NAME}}Job('job-1').escrow.status, 'LOCKED');
      assert.strictEqual(robot.get{{PASCAL_NAME}}Job('sconosciuto'), null);
    });

    it('list restituisce i job dal più recente', async () => {
      await robot.create{{PASCAL_NAME}}Job(baseJob({ jobId: 'job-1' }));
      await robot.create{{PASCAL_NAME}}Job(baseJob({ jobId: 'job-2' }));
      const list = robot.list{{PASCAL_NAME}}Jobs();
      assert.strictEqual(list.length, 2);
      assert.strictEqual(list[0].jobId, 'job-2');
    });
  });

  describe('plugin', () => {
    it('esegue gli hook registrati', async () => {
      const seen = [];
      robot.use({
        name: 'spy',
        hooks: {
          'job:created': ({ jobId }) => seen.push(`created:${jobId}`),
          'job:delivered': ({ jobId }) => seen.push(`delivered:${jobId}`)
        }
      });

      await robot.create{{PASCAL_NAME}}Job(baseJob());
      await robot.execute{{PASCAL_NAME}}Job('job-1');

      assert.deepStrictEqual(seen, ['created:job-1', 'delivered:job-1']);
    });

    it('un plugin che lancia non rompe il robot', async () => {
      robot.use({ name: 'rotto', hooks: { 'job:created': () => { throw new Error('boom'); } } });
      const job = await robot.create{{PASCAL_NAME}}Job(baseJob());
      assert.strictEqual(job.status, 'pending');
    });

    it('rifiuta hook sconosciuti', () => {
      assert.throws(() => robot.use({ name: 'x', hooks: { 'job:inesistente': () => {} } }), /sconosciuti/);
    });
  });
});
