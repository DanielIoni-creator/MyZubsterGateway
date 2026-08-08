#!/usr/bin/env node
/**
 * Runner di carico senza dipendenze - Bounty P5 (#269)
 *
 * k6 e Artillery sono binari esterni: questo runner usa solo il modulo http di
 * Node, così il test di carico è eseguibile ovunque (CI incluse) senza installare
 * nulla. Replica gli stessi flussi dello scenario k6 e produce un summary nello
 * stesso formato, quindi `scripts/load-report.js` genera un report identico.
 *
 *   node scripts/load-test-node.js
 *   node scripts/load-test-node.js --vus 150 --duration 60
 *   node scripts/load-test-node.js --url http://localhost:10000 --vus 100
 *
 * Esce con codice 1 se le soglie non sono rispettate.
 */

const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

// ------------------------------------------------------------------ config

const DEFAULTS = {
  url: process.env.BASE_URL || 'http://localhost:10000',
  vus: 100,          // il bounty chiede almeno 100 utenti concorrenti
  duration: 60,      // secondi
  rampUp: 10,        // secondi di salita graduale
  think: 0.3,        // pausa media fra le iterazioni di un VU, in secondi
  reportDir: 'reports/load'
};

const THRESHOLDS = [
  { name: 'http_req_failed', expr: 'rate<0.05', test: s => s.errorRate < 0.05 },
  { name: 'http_req_duration', expr: 'p(95)<800', test: s => s.latency.p95 < 800 },
  { name: 'http_req_duration', expr: 'p(99)<2000', test: s => s.latency.p99 < 2000 }
];

function parseArgs(argv) {
  const opts = { ...DEFAULTS };
  const args = argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const next = () => args[++i];
    switch (args[i]) {
      case '--url': opts.url = next(); break;
      case '--vus': opts.vus = parseInt(next(), 10); break;
      case '--duration': opts.duration = parseInt(next(), 10); break;
      case '--ramp-up': opts.rampUp = parseInt(next(), 10); break;
      case '--think': opts.think = parseFloat(next()); break;
      case '--report-dir': opts.reportDir = next(); break;
      case '-h': case '--help': opts.help = true; break;
      default:
        console.error(`Opzione sconosciuta: ${args[i]}`);
        process.exit(2);
    }
  }
  return opts;
}

// ------------------------------------------------------------------- http

const agents = {
  'http:': new http.Agent({ keepAlive: true, maxSockets: Infinity }),
  'https:': new https.Agent({ keepAlive: true, maxSockets: Infinity })
};

function request(target, { method = 'GET', body = null } = {}) {
  return new Promise(resolve => {
    const url = new URL(target);
    const client = url.protocol === 'https:' ? https : http;
    const payload = body === null ? null : Buffer.from(JSON.stringify(body));
    const started = process.hrtime.bigint();

    const req = client.request({
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      agent: agents[url.protocol],
      timeout: 20000,
      headers: payload
        ? { 'Content-Type': 'application/json', 'Content-Length': payload.length }
        : {}
    }, res => {
      res.resume(); // scarta il body: interessano status e latenza
      res.on('end', () => {
        const duration = Number(process.hrtime.bigint() - started) / 1e6;
        resolve({ status: res.statusCode, duration, error: null });
      });
    });

    const failed = message => {
      req.destroy();
      const duration = Number(process.hrtime.bigint() - started) / 1e6;
      resolve({ status: 0, duration, error: message });
    };

    req.on('timeout', () => failed('timeout'));
    req.on('error', err => failed(err.code || err.message));
    if (payload) req.write(payload);
    req.end();
  });
}

// -------------------------------------------------------------- raccolta

function createStats() {
  return { total: 0, failed: 0, rateLimited: 0, durations: [], byFlow: new Map() };
}

function record(stats, flow, res, expected) {
  const ok = expected.includes(res.status);
  stats.total += 1;
  if (!ok) stats.failed += 1;
  // Il gateway ha un rate limiter globale: contare i 429 a parte evita di
  // scambiare "limiter saturo" per "gateway lento".
  if (res.status === 429) stats.rateLimited += 1;
  stats.durations.push(res.duration);
  if (!stats.byFlow.has(flow)) stats.byFlow.set(flow, []);
  stats.byFlow.get(flow).push(res.duration);
  return ok;
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

function summarize(durations) {
  const sorted = durations.slice().sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    avg: sorted.length ? sum / sorted.length : 0,
    min: sorted[0] ?? 0,
    med: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    max: sorted[sorted.length - 1] ?? 0
  };
}

// -------------------------------------------------------------- scenario

let counter = 0;
function uid(prefix) {
  counter += 1;
  return `${prefix}-${process.pid}-${counter}-${Math.random().toString(36).slice(2, 7)}`;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Una iterazione = i tre gruppi dello scenario k6. */
async function iteration(base, stats) {
  record(stats, 'health', await request(`${base}/health`), [200]);

  const robotId = uid('lt-robot');
  const created = await request(`${base}/api/robot/create`, {
    method: 'POST',
    body: { robotId, name: `LoadTest ${robotId}`, walletAddress: `wallet_${robotId}` }
  });
  if (record(stats, 'robot_create', created, [200])) {
    record(stats, 'robot_assign', await request(`${base}/api/robot/assign`, {
      method: 'POST',
      body: {
        robotId, jobId: uid('lt-job'), clientId: uid('lt-client'),
        amount: 100, currency: counter % 2 === 0 ? 'MYZ' : 'XMR'
      }
    }), [200]);
    record(stats, 'robot_status', await request(`${base}/api/robot/status/${robotId}`), [200]);
  }

  record(stats, 'buy_myz', await request(`${base}/buy-myz`, {
    method: 'POST', body: { userTariWallet: uid('tari'), amountMYZ: 50 }
  }), [200]);

  // 400 accettabile: l'escrow simulator rifiuta gli id duplicati.
  record(stats, 'escrow_create', await request(`${base}/escrow/create`, {
    method: 'POST',
    body: { escrowId: uid('lt-escrow'), buyer: uid('buyer'), seller: uid('seller'), amount: 42 }
  }), [200, 400]);
}

async function virtualUser(base, stats, endsAt, think, startDelayMs) {
  await sleep(startDelayMs);
  while (Date.now() < endsAt) {
    await iteration(base, stats);
    await sleep(Math.random() * think * 2000);
  }
}

// ------------------------------------------------------------------ main

/** Scrive un summary nello stesso formato di quello prodotto da k6. */
function toK6Summary(stats, opts, wallSeconds, results) {
  const metrics = {
    http_reqs: { values: { count: stats.total, rate: stats.total / wallSeconds } },
    http_req_failed: {
      values: { rate: results.errorRate },
      thresholds: {}
    },
    http_req_duration: {
      values: {
        avg: results.latency.avg, min: results.latency.min, med: results.latency.med,
        'p(95)': results.latency.p95, 'p(99)': results.latency.p99, max: results.latency.max
      },
      thresholds: {}
    },
    checks: { values: { rate: stats.total ? (stats.total - stats.failed) / stats.total : 0 } },
    vus_max: { values: { value: opts.vus } }
  };

  for (const t of THRESHOLDS) {
    metrics[t.name].thresholds[t.expr] = { ok: t.test(results) };
  }

  for (const [flow, durations] of stats.byFlow) {
    const s = summarize(durations);
    metrics[`flow_${flow}_duration`] = {
      values: { avg: s.avg, min: s.min, med: s.med, 'p(95)': s.p95, 'p(99)': s.p99, max: s.max }
    };
  }

  return {
    meta: {
      tool: 'node (scripts/load-test-node.js)',
      generatedAt: new Date().toISOString(),
      baseUrl: opts.url,
      profile: `${opts.duration}s di plateau + ${opts.rampUp}s di ramp-up`,
      peakVus: opts.vus,
      reportDir: opts.reportDir
    },
    metrics
  };
}

async function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) {
    console.log([
      'Uso: node scripts/load-test-node.js [opzioni]',
      '',
      '  --url <url>          target (default http://localhost:10000)',
      '  --vus <n>            utenti concorrenti (default 100)',
      '  --duration <sec>     durata del plateau (default 60)',
      '  --ramp-up <sec>      salita graduale dei VU (default 10)',
      '  --think <sec>        pausa media fra iterazioni (default 0.3)',
      '  --report-dir <dir>   cartella del report (default reports/load)'
    ].join('\n'));
    return 0;
  }

  const base = opts.url.replace(/\/$/, '');

  const health = await request(`${base}/health`);
  if (health.status !== 200) {
    console.error(`❌ Gateway non raggiungibile su ${base}/health (status ${health.status}${health.error ? `, ${health.error}` : ''}).`);
    console.error('   Avvialo con "npm start" oppure passa --url.');
    return 2;
  }

  console.log(`📈 Test di carico — ${opts.vus} VU per ${opts.duration}s su ${base} (ramp-up ${opts.rampUp}s)`);

  const stats = createStats();
  const startedAt = Date.now();
  const endsAt = startedAt + (opts.rampUp + opts.duration) * 1000;

  const progress = setInterval(() => {
    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    process.stdout.write(`\r   ${elapsed}s — ${stats.total} richieste, ${stats.failed} fallite   `);
  }, 1000);
  progress.unref();

  await Promise.all(
    Array.from({ length: opts.vus }, (_, i) =>
      virtualUser(base, stats, endsAt, opts.think, (i / opts.vus) * opts.rampUp * 1000)
    )
  );

  clearInterval(progress);
  process.stdout.write('\r');

  const wallSeconds = (Date.now() - startedAt) / 1000;
  const results = {
    errorRate: stats.total ? stats.failed / stats.total : 0,
    latency: summarize(stats.durations)
  };

  const summary = toK6Summary(stats, opts, wallSeconds, results);
  fs.mkdirSync(opts.reportDir, { recursive: true });
  const summaryPath = path.join(opts.reportDir, 'summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  const failed = THRESHOLDS.filter(t => !t.test(results));

  console.log([
    '',
    '  ── Test di carico MyZubsterGateway ──────────────────────',
    `  target        ${base}`,
    `  utenti        ${opts.vus} concorrenti`,
    `  durata        ${wallSeconds.toFixed(1)} s`,
    `  richieste     ${stats.total}  (${(stats.total / wallSeconds).toFixed(2)} req/s)`,
    `  fallite       ${(results.errorRate * 100).toFixed(2)} %`,
    `  latenza avg   ${results.latency.avg.toFixed(1)} ms`,
    `  latenza p95   ${results.latency.p95.toFixed(1)} ms`,
    `  latenza p99   ${results.latency.p99.toFixed(1)} ms`,
    `  summary       ${summaryPath}`,
    '  ─────────────────────────────────────────────────────────',
    ''
  ].join('\n'));

  if (stats.rateLimited > 0) {
    const share = ((stats.rateLimited / stats.total) * 100).toFixed(1);
    console.warn(
      `⚠️  ${stats.rateLimited} richieste (${share}%) respinte con 429 dal rate limiter globale.\n` +
      '   I risultati misurano il limiter, non il gateway. Riavvia il server con\n' +
      '   un limite più alto, es.:  RATE_LIMIT_MAX=10000000 RATE_LIMIT_WINDOW=60 npm start'
    );
  }

  // Report automatico subito dopo il test, senza passaggi manuali.
  const { render, parseK6 } = require('./load-report');
  const reportPath = path.join(opts.reportDir, 'report.md');
  fs.writeFileSync(reportPath, render(parseK6(summary)));
  console.log(`📄 Report scritto in ${reportPath}`);

  if (failed.length) {
    console.error(`\n❌ ${failed.length} soglie non rispettate: ${failed.map(t => `${t.name} ${t.expr}`).join(', ')}`);
    return 1;
  }
  console.log('\n✅ Tutte le soglie rispettate.');
  return 0;
}

if (require.main === module) {
  main().then(code => process.exit(code)).catch(err => {
    console.error(err);
    process.exit(2);
  });
}

module.exports = { summarize, percentile, toK6Summary };
