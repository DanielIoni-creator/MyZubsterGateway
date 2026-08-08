/**
 * Test per il generatore di report dei test di carico - Bounty P5 (#269)
 *
 * Verifica che i summary di k6 e di Artillery vengano riconosciuti e resi nello
 * stesso formato Markdown, e che le soglie non rispettate vengano rilevate.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

const { parseK6, parseArtillery, render, isK6, isArtillery } = require('../scripts/load-report');

const k6Summary = {
  meta: { generatedAt: '2025-01-01T00:00:00.000Z', baseUrl: 'http://localhost:10000', profile: 'load', peakVus: 100 },
  metrics: {
    http_reqs: { values: { count: 12000, rate: 55.5 } },
    http_req_failed: { values: { rate: 0.012 }, thresholds: { 'rate<0.05': { ok: true } } },
    http_req_duration: {
      values: { avg: 120.4, min: 3.1, med: 95, 'p(95)': 410.2, 'p(99)': 890.7, max: 1900 },
      thresholds: { 'p(95)<800': { ok: true }, 'p(99)<2000': { ok: true } }
    },
    checks: { values: { rate: 0.998 } },
    vus_max: { values: { value: 100 } },
    flow_health_duration: { values: { avg: 12.3, 'p(95)': 40.1, 'p(99)': 60, max: 120 } },
    flow_robot_assign_duration: { values: { avg: 220.5, 'p(95)': 700.2, 'p(99)': 1200, max: 1800 } }
  }
};

const artilleryReport = {
  aggregate: {
    counters: {
      'http.requests': 8000,
      'http.responses': 7990,
      'http.codes.200': 7900,
      'http.codes.400': 90,
      'vusers.created': 2000,
      'errors.ETIMEDOUT': 10
    },
    rates: { 'http.request_rate': 44.2 },
    summaries: {
      'http.response_time': { min: 4, max: 1500, mean: 130.5, median: 88, p95: 420, p99: 950 },
      'plugins.metrics-by-endpoint.response_time.GET /health': { mean: 10.2, p95: 30, p99: 55, max: 90 }
    }
  }
};

describe('riconoscimento del formato', () => {
  it('riconosce un summary k6', () => {
    assert.strictEqual(isK6(k6Summary), true);
    assert.strictEqual(isArtillery(k6Summary), false);
  });

  it('riconosce un report Artillery', () => {
    assert.strictEqual(isArtillery(artilleryReport), true);
    assert.strictEqual(isK6(artilleryReport), false);
  });

  it('non riconosce JSON estranei', () => {
    assert.strictEqual(isK6({ foo: 1 }), false);
    assert.strictEqual(isArtillery({ foo: 1 }), false);
  });
});

describe('parseK6', () => {
  it('estrae throughput, errori e latenza', () => {
    const r = parseK6(k6Summary);
    assert.strictEqual(r.tool, 'k6');
    assert.strictEqual(r.requests, 12000);
    assert.strictEqual(r.throughput, 55.5);
    assert.strictEqual(r.maxVus, 100);
    assert.strictEqual(r.errorRate, 0.012);
    assert.strictEqual(r.latency.p95, 410.2);
    assert.strictEqual(r.latency.p99, 890.7);
    assert.deepStrictEqual(r.failedThresholds, []);
  });

  it('estrae le trend per endpoint', () => {
    const r = parseK6(k6Summary);
    assert.deepStrictEqual(r.endpoints.map(e => e.name).sort(), ['health', 'robot assign']);
    assert.strictEqual(r.endpoints.find(e => e.name === 'health').p95, 40.1);
  });

  it('segnala le soglie non rispettate', () => {
    const broken = JSON.parse(JSON.stringify(k6Summary));
    broken.metrics.http_req_duration.thresholds['p(95)<800'] = { ok: false };
    const r = parseK6(broken);
    assert.strictEqual(r.failedThresholds.length, 1);
    assert.match(r.failedThresholds[0], /http_req_duration/);
  });

  it('non esplode se mancano delle metriche', () => {
    const r = parseK6({ metrics: { http_reqs: { values: { count: 1 } } } });
    assert.strictEqual(r.requests, 1);
    assert.strictEqual(r.latency.p95, undefined);
    assert.deepStrictEqual(r.endpoints, []);
  });
});

describe('parseArtillery', () => {
  it('calcola il tasso di errore da codici 4xx/5xx ed errori di rete', () => {
    const r = parseArtillery(artilleryReport);
    assert.strictEqual(r.tool, 'artillery');
    assert.strictEqual(r.requests, 8000);
    assert.strictEqual(r.maxVus, 2000);
    assert.strictEqual(r.errorRate, (90 + 10) / 8000);
    assert.strictEqual(r.latency.p95, 420);
    assert.strictEqual(r.latency.med, 88);
  });

  it('estrae gli endpoint dal plugin metrics-by-endpoint', () => {
    const r = parseArtillery(artilleryReport);
    assert.strictEqual(r.endpoints.length, 1);
    assert.strictEqual(r.endpoints[0].name, 'GET /health');
    assert.strictEqual(r.endpoints[0].p95, 30);
  });

  it('marca come fallite le soglie superate', () => {
    const slow = JSON.parse(JSON.stringify(artilleryReport));
    slow.aggregate.summaries['http.response_time'].p95 = 1200;
    slow.aggregate.counters['http.codes.500'] = 3;
    const r = parseArtillery(slow);
    assert.strictEqual(r.failedThresholds.length, 2);
  });

  it('non divide per zero senza richieste', () => {
    const r = parseArtillery({ aggregate: { counters: {}, summaries: {} } });
    assert.strictEqual(r.requests, 0);
    assert.strictEqual(r.errorRate, 0);
  });
});

describe('render', () => {
  it('produce un report Markdown con le sezioni attese', () => {
    const md = render(parseK6(k6Summary));
    assert.match(md, /# Report test di carico/);
    assert.match(md, /## Riepilogo/);
    assert.match(md, /## Latenza \(ms\)/);
    assert.match(md, /## Latenza per endpoint/);
    assert.match(md, /## Soglie/);
    assert.match(md, /tutte le soglie rispettate/);
    assert.match(md, /55\.50 req\/s/);
    assert.match(md, /1\.20 %/); // error rate in percentuale
  });

  it('elenca le soglie fallite', () => {
    const broken = JSON.parse(JSON.stringify(k6Summary));
    broken.metrics.http_req_failed.thresholds['rate<0.05'] = { ok: false };
    const md = render(parseK6(broken));
    assert.match(md, /soglie non rispettate/);
    assert.match(md, /- ❌ http_req_failed/);
  });

  it('usa lo stesso formato per k6 e Artillery', () => {
    const sections = md => md.split('\n').filter(l => l.startsWith('## '));
    assert.deepStrictEqual(
      sections(render(parseK6(k6Summary))),
      sections(render(parseArtillery(artilleryReport)))
    );
  });

  it('scrive n/d al posto dei valori mancanti', () => {
    const md = render(parseK6({ metrics: { http_reqs: { values: { count: 5 } } } }));
    assert.match(md, /n\/d/);
  });
});
