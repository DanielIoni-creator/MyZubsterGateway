/**
 * Test di carico k6 per MyZubsterGateway - Bounty P5 (#269)
 *
 * Simula il traffico reale del gateway su tre flussi concorrenti:
 *   - browse   : health check e lettura stato robot (traffico di sola lettura)
 *   - robotJob : create robot -> assign job (crea escrow) -> read status
 *   - payments : buy-myz e escrow/create
 *
 * Uso:
 *   k6 run tests/load/k6/gateway-load.js
 *   BASE_URL=https://gateway.example k6 run tests/load/k6/gateway-load.js
 *   PEAK_VUS=200 k6 run tests/load/k6/gateway-load.js
 *   k6 run -e PROFILE=smoke tests/load/k6/gateway-load.js
 *
 * Il report viene scritto da handleSummary() in reports/load/ (JSON + Markdown
 * + HTML). Nessun import remoto: lo script gira anche senza rete.
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:10000').replace(/\/$/, '');
const PEAK_VUS = parseInt(__ENV.PEAK_VUS || '100', 10);
const PROFILE = __ENV.PROFILE || 'load';
const REPORT_DIR = __ENV.REPORT_DIR || 'reports/load';

// --------------------------------------------------------------- metriche

const errors = new Counter('gateway_errors');
const businessErrorRate = new Rate('gateway_business_error_rate');
// Il gateway ha un rate limiter globale: contare i 429 a parte evita di
// scambiare "limiter saturo" per "gateway lento".
const rateLimited = new Counter('gateway_rate_limited');

const healthLatency = new Trend('flow_health_duration', true);
const robotCreateLatency = new Trend('flow_robot_create_duration', true);
const robotAssignLatency = new Trend('flow_robot_assign_duration', true);
const robotStatusLatency = new Trend('flow_robot_status_duration', true);
const buyMyzLatency = new Trend('flow_buy_myz_duration', true);
const escrowCreateLatency = new Trend('flow_escrow_create_duration', true);

// --------------------------------------------------------------- profili

// Il criterio di accettazione chiede almeno 100 utenti concorrenti: il profilo
// "load" sale a PEAK_VUS (default 100), "stress" arriva al doppio.
const PROFILES = {
  smoke: [
    { duration: '10s', target: 5 },
    { duration: '20s', target: 5 },
    { duration: '5s', target: 0 }
  ],
  load: [
    { duration: '30s', target: Math.round(PEAK_VUS / 4) }, // warm-up
    { duration: '1m', target: PEAK_VUS },                  // salita al picco
    { duration: '2m', target: PEAK_VUS },                  // plateau
    { duration: '30s', target: 0 }                         // ramp-down
  ],
  stress: [
    { duration: '30s', target: PEAK_VUS },
    { duration: '1m', target: PEAK_VUS * 2 },
    { duration: '2m', target: PEAK_VUS * 2 },
    { duration: '30s', target: 0 }
  ],
  spike: [
    { duration: '10s', target: 10 },
    { duration: '10s', target: PEAK_VUS * 2 }, // picco improvviso
    { duration: '30s', target: PEAK_VUS * 2 },
    { duration: '10s', target: 10 },
    { duration: '20s', target: 10 }
  ]
};

export const options = {
  stages: PROFILES[PROFILE] || PROFILES.load,
  // Soglie: se non sono rispettate k6 esce con codice != 0, quindi il test è
  // utilizzabile come gate in CI.
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<800', 'p(99)<2000'],
    gateway_business_error_rate: ['rate<0.05'],
    flow_health_duration: ['p(95)<200'],
    flow_robot_assign_duration: ['p(95)<1500'],
    checks: ['rate>0.95']
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  discardResponseBodies: false,
  noConnectionReuse: false
};

// --------------------------------------------------------------- helpers

const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } };

/** Id univoco per VU/iterazione: evita collisioni fra utenti virtuali. */
function uid(prefix) {
  return `${prefix}-${__VU}-${__ITER}-${Date.now()}`;
}

/** Registra latenza + esito e ritorna la risposta. */
function track(trend, res, name, expectedStatuses) {
  trend.add(res.timings.duration);
  const ok = check(res, {
    [`${name}: status atteso`]: r => expectedStatuses.includes(r.status),
    [`${name}: risposta non vuota`]: r => r.body !== null && r.body.length > 0
  });
  businessErrorRate.add(!ok);
  if (res.status === 429) rateLimited.add(1, { flow: name });
  if (!ok) {
    errors.add(1, { flow: name, status: String(res.status) });
  }
  return res;
}

// --------------------------------------------------------------- scenario

export function setup() {
  const res = http.get(`${BASE_URL}/health`, { timeout: '10s' });
  if (res.status === 429) {
    throw new Error(
      `Il gateway su ${BASE_URL} risponde 429: il rate limiter globale è già saturo. ` +
      'Riavvialo con RATE_LIMIT_MAX=10000000 RATE_LIMIT_WINDOW=60 npm start, ' +
      'altrimenti il test misura il limiter e non il gateway.'
    );
  }
  if (res.status !== 200) {
    throw new Error(
      `Gateway non raggiungibile su ${BASE_URL}/health (status ${res.status}). ` +
      'Avvia il gateway con "npm start" oppure imposta BASE_URL.'
    );
  }
  return { baseUrl: BASE_URL, startedAt: new Date().toISOString() };
}

export default function (data) {
  const base = data.baseUrl;

  group('browse', () => {
    track(healthLatency, http.get(`${base}/health`, { tags: { flow: 'health' } }), 'health', [200]);
  });

  group('robotJob', () => {
    const robotId = uid('lt-robot');

    const created = track(
      robotCreateLatency,
      http.post(`${base}/api/robot/create`, JSON.stringify({
        robotId, name: `LoadTest ${robotId}`, walletAddress: `wallet_${robotId}`
      }), { ...JSON_HEADERS, tags: { flow: 'robot_create' } }),
      'robot_create',
      [200]
    );

    if (created.status !== 200) return;

    track(
      robotAssignLatency,
      http.post(`${base}/api/robot/assign`, JSON.stringify({
        robotId,
        jobId: uid('lt-job'),
        clientId: uid('lt-client'),
        amount: 100,
        currency: __VU % 2 === 0 ? 'MYZ' : 'XMR'
      }), { ...JSON_HEADERS, tags: { flow: 'robot_assign' } }),
      'robot_assign',
      [200]
    );

    track(
      robotStatusLatency,
      http.get(`${base}/api/robot/status/${robotId}`, { tags: { flow: 'robot_status' } }),
      'robot_status',
      [200]
    );
  });

  group('payments', () => {
    track(
      buyMyzLatency,
      http.post(`${base}/buy-myz`, JSON.stringify({
        userTariWallet: uid('tari'), amountMYZ: 50
      }), { ...JSON_HEADERS, tags: { flow: 'buy_myz' } }),
      'buy_myz',
      [200]
    );

    track(
      escrowCreateLatency,
      http.post(`${base}/escrow/create`, JSON.stringify({
        escrowId: uid('lt-escrow'), buyer: uid('buyer'), seller: uid('seller'), amount: 42
      }), { ...JSON_HEADERS, tags: { flow: 'escrow_create' } }),
      'escrow_create',
      // 400 è accettabile: l'escrow simulator rifiuta gli id duplicati.
      [200, 400]
    );
  });

  // Think time: senza pausa i VU non simulano utenti ma un flood sintetico.
  sleep(Math.random() * 2 + 0.5);
}

// --------------------------------------------------------------- reporting

function pick(metrics, name, field) {
  const metric = metrics[name];
  if (!metric || !metric.values) return null;
  const value = metric.values[field];
  return typeof value === 'number' ? value : null;
}

function fmt(value, digits = 2, suffix = '') {
  return value === null ? 'n/d' : `${value.toFixed(digits)}${suffix}`;
}

function buildMarkdown(data, meta) {
  const m = data.metrics;
  const reqs = pick(m, 'http_reqs', 'count');
  const rps = pick(m, 'http_reqs', 'rate');
  const failRate = pick(m, 'http_req_failed', 'rate');
  const checkRate = pick(m, 'checks', 'rate');
  const throttled = pick(m, 'gateway_rate_limited', 'count') || 0;

  const flows = [
    ['GET /health', 'flow_health_duration'],
    ['POST /api/robot/create', 'flow_robot_create_duration'],
    ['POST /api/robot/assign', 'flow_robot_assign_duration'],
    ['GET /api/robot/status/:id', 'flow_robot_status_duration'],
    ['POST /buy-myz', 'flow_buy_myz_duration'],
    ['POST /escrow/create', 'flow_escrow_create_duration']
  ];

  const failed = Object.entries(m)
    .filter(([, metric]) => metric.thresholds)
    .flatMap(([name, metric]) =>
      Object.entries(metric.thresholds)
        .filter(([, t]) => t.ok === false)
        .map(([expr]) => `${name}: \`${expr}\``)
    );

  const lines = [
    '# Report test di carico — MyZubsterGateway',
    '',
    `- **Data**: ${meta.generatedAt}`,
    `- **Target**: ${meta.baseUrl}`,
    `- **Profilo**: \`${meta.profile}\` (picco ${meta.peakVus} VU)`,
    `- **Esito soglie**: ${failed.length === 0 ? '✅ tutte rispettate' : `❌ ${failed.length} non rispettate`}`,
    '',
    '## Riepilogo',
    '',
    '| Metrica | Valore |',
    '|---|---|',
    `| Richieste totali | ${reqs === null ? 'n/d' : reqs} |`,
    `| Throughput | ${fmt(rps, 2, ' req/s')} |`,
    `| VU massimi | ${pick(m, 'vus_max', 'value') ?? meta.peakVus} |`,
    `| Richieste fallite | ${fmt(failRate === null ? null : failRate * 100, 2, ' %')} |`,
    `| Check superati | ${fmt(checkRate === null ? null : checkRate * 100, 2, ' %')} |`,
    `| Latenza media | ${fmt(pick(m, 'http_req_duration', 'avg'), 1, ' ms')} |`,
    `| Latenza p(95) | ${fmt(pick(m, 'http_req_duration', 'p(95)'), 1, ' ms')} |`,
    `| Latenza p(99) | ${fmt(pick(m, 'http_req_duration', 'p(99)'), 1, ' ms')} |`,
    `| Latenza max | ${fmt(pick(m, 'http_req_duration', 'max'), 1, ' ms')} |`,
    '',
    '## Latenza per endpoint',
    '',
    '| Endpoint | avg | p(95) | p(99) | max |',
    '|---|---|---|---|---|'
  ];

  for (const [label, metric] of flows) {
    lines.push(
      `| \`${label}\` | ${fmt(pick(m, metric, 'avg'), 1, ' ms')} | ${fmt(pick(m, metric, 'p(95)'), 1, ' ms')} ` +
      `| ${fmt(pick(m, metric, 'p(99)'), 1, ' ms')} | ${fmt(pick(m, metric, 'max'), 1, ' ms')} |`
    );
  }

  if (throttled > 0) {
    lines.push(
      '',
      '## ⚠️ Rate limiting',
      '',
      `**${throttled} richieste sono state respinte con 429 dal rate limiter globale.**`,
      'I numeri qui sopra misurano il limiter, non il gateway. Riavvia il server con',
      '`RATE_LIMIT_MAX=10000000 RATE_LIMIT_WINDOW=60 npm start` e ripeti il test.'
    );
  }

  lines.push('', '## Soglie', '');
  if (failed.length === 0) {
    lines.push('Tutte le soglie configurate sono state rispettate. ✅');
  } else {
    lines.push('Soglie **non** rispettate:', '');
    for (const f of failed) lines.push(`- ❌ ${f}`);
  }

  lines.push('', '---', '', '_Generato automaticamente da `tests/load/k6/gateway-load.js`._', '');
  return lines.join('\n');
}

function buildHtml(markdown, meta) {
  const escaped = markdown.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Load test — MyZubsterGateway (${meta.generatedAt})</title>
<style>
  body { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; margin: 2rem auto; max-width: 60rem; padding: 0 1rem; line-height: 1.5; }
  pre { white-space: pre-wrap; word-break: break-word; }
</style>
</head>
<body><pre>${escaped}</pre></body>
</html>`;
}

/** Riepilogo testuale minimale per stdout (nessun import remoto). */
function buildText(data, meta) {
  const m = data.metrics;
  const failRate = pick(m, 'http_req_failed', 'rate');
  return [
    '',
    '  ── Test di carico MyZubsterGateway ──────────────────────',
    `  target        ${meta.baseUrl}`,
    `  profilo       ${meta.profile} (picco ${meta.peakVus} VU)`,
    `  richieste     ${pick(m, 'http_reqs', 'count') ?? 'n/d'}  (${fmt(pick(m, 'http_reqs', 'rate'), 2, ' req/s')})`,
    `  fallite       ${fmt(failRate === null ? null : failRate * 100, 2, ' %')}`,
    `  p(95)         ${fmt(pick(m, 'http_req_duration', 'p(95)'), 1, ' ms')}`,
    `  p(99)         ${fmt(pick(m, 'http_req_duration', 'p(99)'), 1, ' ms')}`,
    `  report        ${meta.reportDir}/`,
    '  ─────────────────────────────────────────────────────────',
    ''
  ].join('\n');
}

export function handleSummary(data) {
  const meta = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    profile: PROFILE,
    peakVus: PEAK_VUS,
    reportDir: REPORT_DIR
  };

  const markdown = buildMarkdown(data, meta);

  return {
    stdout: buildText(data, meta),
    [`${REPORT_DIR}/summary.json`]: JSON.stringify({ meta, metrics: data.metrics }, null, 2),
    [`${REPORT_DIR}/report.md`]: markdown,
    [`${REPORT_DIR}/report.html`]: buildHtml(markdown, meta)
  };
}
