#!/usr/bin/env node
/**
 * Generatore di report per i test di carico - Bounty P5 (#269)
 *
 * Legge il JSON prodotto da k6 (`reports/load/summary.json`, scritto da
 * handleSummary) oppure da Artillery (`artillery run --output ...`) e produce un
 * report Markdown unico, con lo stesso formato per entrambi i tool.
 *
 *   node scripts/load-report.js reports/load/summary.json
 *   node scripts/load-report.js reports/load/artillery.json -o reports/load/report.md
 *
 * Esce con codice 1 se le soglie non sono rispettate, così può fare da gate in CI.
 * Nessuna dipendenza npm.
 */

const fs = require('node:fs');
const path = require('node:path');

// ------------------------------------------------------------------ utils

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(2);
}

function fmt(value, digits = 2, suffix = '') {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${value.toFixed(digits)}${suffix}`
    : 'n/d';
}

function table(header, rows) {
  return [
    `| ${header.join(' | ')} |`,
    `|${header.map(() => '---').join('|')}|`,
    ...rows.map(r => `| ${r.join(' | ')} |`)
  ].join('\n');
}

// ------------------------------------------------------------ parser k6

function isK6(raw) {
  return !!raw.metrics && (!!raw.metrics.http_reqs || !!raw.metrics.http_req_duration);
}

function parseK6(raw) {
  const m = raw.metrics;
  const val = (name, field) => (m[name] && m[name].values ? m[name].values[field] : undefined);

  const failedThresholds = [];
  for (const [name, metric] of Object.entries(m)) {
    if (!metric.thresholds) continue;
    for (const [expr, result] of Object.entries(metric.thresholds)) {
      if (result && result.ok === false) failedThresholds.push(`${name}: \`${expr}\``);
    }
  }

  const endpoints = Object.keys(m)
    .filter(name => name.startsWith('flow_') && name.endsWith('_duration'))
    .map(name => ({
      name: name.replace(/^flow_/, '').replace(/_duration$/, '').replace(/_/g, ' '),
      avg: val(name, 'avg'),
      p95: val(name, 'p(95)'),
      p99: val(name, 'p(99)'),
      max: val(name, 'max')
    }));

  return {
    tool: 'k6',
    meta: raw.meta || {},
    requests: val('http_reqs', 'count'),
    throughput: val('http_reqs', 'rate'),
    maxVus: val('vus_max', 'value') ?? val('vus_max', 'max'),
    errorRate: val('http_req_failed', 'rate'),
    checkRate: val('checks', 'rate'),
    latency: {
      avg: val('http_req_duration', 'avg'),
      min: val('http_req_duration', 'min'),
      med: val('http_req_duration', 'med'),
      p95: val('http_req_duration', 'p(95)'),
      p99: val('http_req_duration', 'p(99)'),
      max: val('http_req_duration', 'max')
    },
    endpoints,
    failedThresholds
  };
}

// ------------------------------------------------------- parser artillery

function isArtillery(raw) {
  return !!raw.aggregate && (!!raw.aggregate.counters || !!raw.aggregate.summaries);
}

function parseArtillery(raw) {
  const agg = raw.aggregate;
  const counters = agg.counters || {};
  const rates = agg.rates || {};
  const summaries = agg.summaries || {};
  const rt = summaries['http.response_time'] || {};

  const requests = counters['http.requests'] || 0;
  const responses = counters['http.responses'] || 0;
  const errorCodes = Object.entries(counters)
    .filter(([k]) => /^http\.codes\.[45]\d\d$/.test(k))
    .reduce((sum, [, v]) => sum + v, 0);
  const failures = Object.entries(counters)
    .filter(([k]) => k.startsWith('errors.'))
    .reduce((sum, [, v]) => sum + v, 0);

  const endpoints = Object.entries(summaries)
    .filter(([k]) => k.startsWith('plugins.metrics-by-endpoint.response_time.'))
    .map(([k, v]) => ({
      name: k.replace('plugins.metrics-by-endpoint.response_time.', ''),
      avg: v.mean,
      p95: v.p95,
      p99: v.p99,
      max: v.max
    }));

  const failedThresholds = [];
  if (typeof rt.p95 === 'number' && rt.p95 > 800) failedThresholds.push('`http.response_time.p95 < 800`');
  if (typeof rt.p99 === 'number' && rt.p99 > 2000) failedThresholds.push('`http.response_time.p99 < 2000`');
  if (counters['http.codes.500']) failedThresholds.push('`http.codes.500 < 1`');

  const total = requests || responses || 0;
  return {
    tool: 'artillery',
    meta: {},
    requests: total,
    throughput: rates['http.request_rate'],
    maxVus: counters['vusers.created'],
    errorRate: total ? (errorCodes + failures) / total : 0,
    checkRate: total ? (total - failures) / total : undefined,
    latency: { avg: rt.mean, min: rt.min, med: rt.median, p95: rt.p95, p99: rt.p99, max: rt.max },
    endpoints,
    failedThresholds
  };
}

// ----------------------------------------------------------- rendering

function render(r) {
  const passed = r.failedThresholds.length === 0;
  const meta = r.meta || {};

  const lines = [
    '# Report test di carico — MyZubsterGateway',
    '',
    // I summary del runner Node dichiarano il tool in meta; k6 e Artillery no.
    `- **Tool**: ${meta.tool || r.tool}`,
    `- **Data**: ${meta.generatedAt || new Date().toISOString()}`,
    `- **Target**: ${meta.baseUrl || 'n/d'}`,
    meta.profile ? `- **Profilo**: \`${meta.profile}\` (picco ${meta.peakVus} VU)` : null,
    `- **Esito**: ${passed ? '✅ tutte le soglie rispettate' : `❌ ${r.failedThresholds.length} soglie non rispettate`}`,
    '',
    '## Riepilogo',
    '',
    table(['Metrica', 'Valore'], [
      ['Richieste totali', typeof r.requests === 'number' ? String(r.requests) : 'n/d'],
      ['Throughput', fmt(r.throughput, 2, ' req/s')],
      ['Utenti concorrenti (max)', typeof r.maxVus === 'number' ? String(r.maxVus) : 'n/d'],
      ['Richieste fallite', fmt(typeof r.errorRate === 'number' ? r.errorRate * 100 : undefined, 2, ' %')],
      ['Check superati', fmt(typeof r.checkRate === 'number' ? r.checkRate * 100 : undefined, 2, ' %')]
    ]),
    '',
    '## Latenza (ms)',
    '',
    table(['min', 'avg', 'mediana', 'p(95)', 'p(99)', 'max'], [[
      fmt(r.latency.min, 1), fmt(r.latency.avg, 1), fmt(r.latency.med, 1),
      fmt(r.latency.p95, 1), fmt(r.latency.p99, 1), fmt(r.latency.max, 1)
    ]])
  ];

  if (r.endpoints.length) {
    lines.push('', '## Latenza per endpoint (ms)', '');
    lines.push(table(['Endpoint', 'avg', 'p(95)', 'p(99)', 'max'],
      r.endpoints.map(e => [`\`${e.name}\``, fmt(e.avg, 1), fmt(e.p95, 1), fmt(e.p99, 1), fmt(e.max, 1)])));
  }

  lines.push('', '## Soglie', '');
  if (passed) {
    lines.push('Tutte le soglie configurate sono state rispettate. ✅');
  } else {
    lines.push('Soglie **non** rispettate:', '');
    for (const t of r.failedThresholds) lines.push(`- ❌ ${t}`);
  }

  lines.push('', '---', '', '_Generato da `scripts/load-report.js`._', '');
  return lines.filter(l => l !== null).join('\n');
}

// ---------------------------------------------------------------- main

function main(argv) {
  const args = argv.slice(2);
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    console.log([
      'Uso: node scripts/load-report.js <summary.json> [-o report.md]',
      '',
      'Accetta il JSON di k6 (reports/load/summary.json) o di Artillery',
      '(artillery run --output report.json) e produce un report Markdown.',
      'Esce con codice 1 se qualche soglia non è rispettata.'
    ].join('\n'));
    return 0;
  }

  const inputPath = args.find(a => !a.startsWith('-'));
  const outIndex = Math.max(args.indexOf('-o'), args.indexOf('--output'));
  const outputPath = outIndex >= 0 ? args[outIndex + 1] : path.join(path.dirname(inputPath), 'report.md');

  if (!fs.existsSync(inputPath)) fail(`File non trovato: ${inputPath}`);

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  } catch (err) {
    fail(`JSON non valido in ${inputPath}: ${err.message}`);
  }

  let parsed;
  if (isK6(raw)) parsed = parseK6(raw);
  else if (isArtillery(raw)) parsed = parseArtillery(raw);
  else fail(`Formato non riconosciuto in ${inputPath} (atteso un summary k6 o Artillery).`);

  const markdown = render(parsed);
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
  fs.writeFileSync(outputPath, markdown);

  console.log(markdown);
  console.log(`\n📄 Report scritto in ${outputPath}`);

  if (parsed.failedThresholds.length > 0) {
    console.error(`\n❌ ${parsed.failedThresholds.length} soglie non rispettate.`);
    return 1;
  }
  console.log('\n✅ Tutte le soglie rispettate.');
  return 0;
}

if (require.main === module) {
  process.exit(main(process.argv));
}

module.exports = { parseK6, parseArtillery, render, isK6, isArtillery };
