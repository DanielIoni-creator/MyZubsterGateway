const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

const robotBrain = require('../robot_brain');
const { getRobotStats, clearRobotStatsCache, buildStats } = require('../services/robotStatsService');
const router = require('../routes/robot');

// robot_brain tiene lo stato in un Map di modulo: i robot creati qui restano
// visibili per tutta la suite, quindi ogni test usa id univoci.
let seq = 0;
function uniqueId(prefix) {
  seq += 1;
  return `${prefix}-${process.pid}-${seq}`;
}

function seedRobot({ status = 'idle', jobsCompleted = 0, reputation = 0, totalEarned = 0, currentJob = null } = {}) {
  const robotId = uniqueId('stats-robot');
  const robot = robotBrain.createRobot(robotId, `Robot ${robotId}`, `wallet_${robotId}`);
  Object.assign(robot, { status, jobsCompleted, reputation, totalEarned, currentJob });
  return robot;
}

/** Esegue una route del router express raccogliendo la risposta. */
function callRoute(method, path, { query = {}, params = {} } = {}) {
  const layer = router.stack.find(l => l.route && l.route.path === path && l.route.methods[method]);
  assert.ok(layer, `route ${method.toUpperCase()} ${path} non registrata`);

  const req = { method: method.toUpperCase(), query, params, body: {} };
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { resolve({ statusCode: this.statusCode, body }); }
    };
    Promise.resolve(layer.route.stack[0].handle(req, res, reject)).catch(reject);
  });
}

describe('buildStats', () => {
  it('conta robot attivi, idle e in disputa', () => {
    const stats = buildStats([
      { robotId: 'a', name: 'A', status: 'idle', jobsCompleted: 2, reputation: 2, totalEarned: 10, hasCurrentJob: false },
      { robotId: 'b', name: 'B', status: 'working', jobsCompleted: 4, reputation: 4, totalEarned: 20, hasCurrentJob: true },
      { robotId: 'c', name: 'C', status: 'delivering', jobsCompleted: 6, reputation: 6, totalEarned: 30, hasCurrentJob: true },
      { robotId: 'd', name: 'D', status: 'dispute', jobsCompleted: 0, reputation: 0, totalEarned: 0, hasCurrentJob: true }
    ], { memory: 4, database: 0 });

    assert.strictEqual(stats.totalRobots, 4);
    assert.strictEqual(stats.activeRobots, 2, 'working + delivering');
    assert.strictEqual(stats.idleRobots, 1);
    assert.strictEqual(stats.disputeRobots, 1);
    assert.strictEqual(stats.jobsInProgress, 3);
    assert.strictEqual(stats.totalJobsCompleted, 12);
    assert.strictEqual(stats.averageJobsCompleted, 3);
    assert.strictEqual(stats.totalEarned, 60);
    assert.deepStrictEqual(stats.byStatus, { idle: 1, working: 1, delivering: 1, dispute: 1 });
  });

  it('non divide per zero quando non ci sono robot', () => {
    const stats = buildStats([], { memory: 0, database: 0 });
    assert.strictEqual(stats.totalRobots, 0);
    assert.strictEqual(stats.averageJobsCompleted, 0);
    assert.strictEqual(stats.averageReputation, 0);
    assert.deepStrictEqual(stats.topRobots, []);
  });

  it('arrotonda le medie a 2 decimali', () => {
    const stats = buildStats([
      { robotId: 'a', status: 'idle', jobsCompleted: 1, reputation: 1, totalEarned: 1.256, hasCurrentJob: false },
      { robotId: 'b', status: 'idle', jobsCompleted: 2, reputation: 2, totalEarned: 0, hasCurrentJob: false },
      { robotId: 'c', status: 'idle', jobsCompleted: 2, reputation: 2, totalEarned: 0, hasCurrentJob: false }
    ], { memory: 3, database: 0 });
    assert.strictEqual(stats.averageJobsCompleted, 1.67);
    assert.strictEqual(stats.totalEarned, 1.26);
  });

  it('ordina topRobots per job completati e limita a 5', () => {
    const robots = Array.from({ length: 8 }, (_, i) => ({
      robotId: `r${i}`, name: `R${i}`, status: 'idle', jobsCompleted: i, reputation: i, totalEarned: i, hasCurrentJob: false
    }));
    const stats = buildStats(robots, { memory: 8, database: 0 });
    assert.strictEqual(stats.topRobots.length, 5);
    assert.deepStrictEqual(stats.topRobots.map(r => r.robotId), ['r7', 'r6', 'r5', 'r4', 'r3']);
  });

  it('tiene traccia di status non previsti senza perderli', () => {
    const stats = buildStats([
      { robotId: 'x', status: 'maintenance', jobsCompleted: 0, reputation: 0, totalEarned: 0, hasCurrentJob: false }
    ], { memory: 1, database: 0 });
    assert.strictEqual(stats.byStatus.maintenance, 1);
    assert.strictEqual(stats.activeRobots, 0);
  });
});

describe('getRobotStats', () => {
  beforeEach(() => clearRobotStatsCache());

  it('include i robot presenti in memoria', async () => {
    const before = await getRobotStats({ refresh: true });
    seedRobot({ status: 'working', jobsCompleted: 3, reputation: 3, totalEarned: 100, currentJob: { jobId: 'j1' } });
    const after = await getRobotStats({ refresh: true });

    assert.strictEqual(after.totalRobots, before.totalRobots + 1);
    assert.strictEqual(after.sources.memory, before.sources.memory + 1);
    assert.strictEqual(after.byStatus.working, (before.byStatus.working || 0) + 1);
    assert.strictEqual(after.jobsInProgress, before.jobsInProgress + 1);
    assert.strictEqual(after.totalJobsCompleted, before.totalJobsCompleted + 3);
    assert.strictEqual(after.totalEarned, before.totalEarned + 100);
  });

  it('serve la seconda chiamata dalla cache', async () => {
    process.env.ROBOT_STATS_CACHE_TTL = '30';
    const first = await getRobotStats({ refresh: true });
    assert.strictEqual(first.cache.cached, false);
    assert.strictEqual(first.cache.ttlSeconds, 30);

    seedRobot(); // non deve comparire finché la cache è valida
    const second = await getRobotStats();
    assert.strictEqual(second.cache.cached, true);
    assert.strictEqual(second.totalRobots, first.totalRobots);
    delete process.env.ROBOT_STATS_CACHE_TTL;
  });

  it('refresh=true bypassa la cache', async () => {
    process.env.ROBOT_STATS_CACHE_TTL = '30';
    const first = await getRobotStats({ refresh: true });
    seedRobot();
    const second = await getRobotStats({ refresh: true });
    assert.strictEqual(second.cache.cached, false);
    assert.strictEqual(second.totalRobots, first.totalRobots + 1);
    delete process.env.ROBOT_STATS_CACHE_TTL;
  });

  it('con TTL 0 non mette nulla in cache', async () => {
    process.env.ROBOT_STATS_CACHE_TTL = '0';
    await getRobotStats({ refresh: true });
    const second = await getRobotStats();
    assert.strictEqual(second.cache.cached, false);
    delete process.env.ROBOT_STATS_CACHE_TTL;
  });
});

describe('GET /api/robot/stats', () => {
  beforeEach(() => clearRobotStatsCache());

  it('risponde 200 con success e data', async () => {
    seedRobot({ status: 'dispute' });
    const { statusCode, body } = await callRoute('get', '/stats', { query: { refresh: 'true' } });

    assert.strictEqual(statusCode, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(typeof body.data.totalRobots, 'number');
    assert.strictEqual(typeof body.data.activeRobots, 'number');
    assert.strictEqual(typeof body.data.averageJobsCompleted, 'number');
    assert.ok(body.data.disputeRobots >= 1);
    assert.ok(Array.isArray(body.data.topRobots));
    assert.strictEqual(body.data.cache.cached, false);
  });

  it('senza refresh riusa la cache', async () => {
    await callRoute('get', '/stats', { query: { refresh: 'true' } });
    const { body } = await callRoute('get', '/stats');
    assert.strictEqual(body.data.cache.cached, true);
  });

  it('accetta refresh=1 come refresh=true', async () => {
    await callRoute('get', '/stats', { query: { refresh: 'true' } });
    const { body } = await callRoute('get', '/stats', { query: { refresh: '1' } });
    assert.strictEqual(body.data.cache.cached, false);
  });

  it('non ruba il path a GET /status/:robotId', async () => {
    const robot = seedRobot({ jobsCompleted: 7 });
    const { statusCode, body } = await callRoute('get', '/status/:robotId', { params: { robotId: robot.robotId } });
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(body.data.robotId, robot.robotId);
    assert.strictEqual(body.data.jobsCompleted, 7);
  });
});
