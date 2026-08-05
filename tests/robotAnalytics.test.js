const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { aggregate, createRobotAnalyticsService } = require('../services/robotAnalyticsService');
const { createRobotAnalyticsRouter } = require('../routes/robotAnalytics');

function memoryStore() {
  const events = [];
  return {
    async create(event) { events.push(structuredClone(event)); return structuredClone(event); },
    async find() { return structuredClone(events); }
  };
}

function route(router, method, path, { body = {}, query = {} } = {}) {
  const layer = router.stack.find(item => item.route?.path === path && item.route.methods[method]);
  assert.ok(layer, `missing ${method} ${path}`);
  return new Promise((resolve, reject) => {
    const headers = {};
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      set(key, value) { headers[key] = value; return this; },
      json(payload) { resolve({ statusCode: this.statusCode, payload, headers }); },
      send(payload) { resolve({ statusCode: this.statusCode, payload, headers }); }
    };
    Promise.resolve(layer.route.stack[0].handle({ body, query }, res, reject)).catch(reject);
  });
}

describe('robot analytics', () => {
  let service;

  beforeEach(() => { service = createRobotAnalyticsService(memoryStore()); });

  it('calculates robot and category ROI', async () => {
    await service.record({ robotId: 'r1', category: 'logo', eventType: 'cost', amountMYZ: 20 });
    await service.record({ robotId: 'r1', category: 'logo', eventType: 'revenue', amountMYZ: 50 });
    await service.record({ robotId: 'r1', category: 'logo', eventType: 'job_completed' });
    const report = await service.report();
    assert.equal(report.byRobot[0].roiPercent, 150);
    assert.equal(report.byCategory[0].jobsCompleted, 1);
  });

  it('ranks posts by weighted engagement', () => {
    const report = aggregate([
      { robotId: 'r1', category: 'social', eventType: 'post_engagement', amountMYZ: 0, postId: 'a', impressions: 100, likes: 5, comments: 1, shares: 0 },
      { robotId: 'r2', category: 'social', eventType: 'post_engagement', amountMYZ: 0, postId: 'b', impressions: 100, likes: 2, comments: 2, shares: 2 }
    ]);
    assert.equal(report.topPosts[0].postId, 'b');
    assert.equal(report.topPosts[0].engagement, 12);
  });

  it('exports a CSV report', async () => {
    await service.record({ robotId: 'r1', category: 'code', eventType: 'revenue', amountMYZ: 12 });
    const csv = await service.csv();
    assert.match(csv, /robotId/);
    assert.match(csv, /"r1","12"/);
  });

  it('exposes event, summary, and CSV routes', async () => {
    const router = createRobotAnalyticsRouter(service);
    const created = await route(router, 'post', '/events', { body: { robotId: 'r1', category: 'code', eventType: 'revenue', amountMYZ: 9 } });
    assert.equal(created.statusCode, 201);
    const summary = await route(router, 'get', '/summary');
    assert.equal(summary.payload.data.totalEvents, 1);
    const csv = await route(router, 'get', '/report.csv');
    assert.equal(csv.headers['Content-Type'], 'text/csv; charset=utf-8');
  });
});
