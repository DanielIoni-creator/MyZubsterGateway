#!/usr/bin/env node
/**
 * Scaffolding per nuovi robot - Bounty BOT-7 (#344)
 *
 * Genera modulo, route Express, test e documentazione per un nuovo robot,
 * già cablati con escrow, notifiche e sistema di plugin.
 *
 *   npm run robot:create -- traduzione
 *   npm run robot:create -- traduzione --template translation
 *   npm run robot:create -- mio-robot --dry-run
 *   npm run robot:create -- mio-robot --wire        # monta la route in server.js
 *   npm run robot:create -- --list                  # elenca i template
 *
 * I template stanno in scripts/robot-templates/. Ognuno può ereditare da un
 * altro con `"extends"`, così un nuovo template deve dichiarare solo ciò che
 * cambia. Nessuna dipendenza npm.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const TEMPLATES_DIR = path.join(__dirname, 'robot-templates');
const DEFAULT_TEMPLATE = 'basic';

// ------------------------------------------------------------------- naming

/** `Robot Traduzione!` → `traduzione` */
function toSlug(input) {
  return String(input)
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // accenti
    .replace(/^robot[-_\s]+/i, '')                     // prefisso ridondante
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')            // camelCase → kebab
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const toPascal = slug => slug.split('-').filter(Boolean)
  .map(p => p[0].toUpperCase() + p.slice(1)).join('');

const toCamel = slug => {
  const pascal = toPascal(slug);
  return pascal[0].toLowerCase() + pascal.slice(1);
};

const toSnake = slug => slug.replace(/-/g, '_');

const toDisplay = slug => slug.split('-').filter(Boolean)
  .map(p => p[0].toUpperCase() + p.slice(1)).join(' ');

// ----------------------------------------------------------------- template

function listTemplates() {
  if (!fs.existsSync(TEMPLATES_DIR)) return [];
  return fs.readdirSync(TEMPLATES_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => {
      const meta = readTemplateMeta(e.name);
      return { name: e.name, description: meta.description || '', extends: meta.extends || null };
    });
}

function readTemplateMeta(name) {
  const file = path.join(TEMPLATES_DIR, name, 'template.json');
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`template.json non valido in ${name}: ${err.message}`);
  }
}

/**
 * Risolve la catena di ereditarietà di un template, unendo le variabili
 * (il figlio vince) e restituendo l'ordine di ricerca dei file.
 */
function resolveTemplate(name, seen = []) {
  if (!fs.existsSync(path.join(TEMPLATES_DIR, name))) {
    const available = listTemplates().map(t => t.name).join(', ');
    throw new Error(`Template "${name}" non trovato. Disponibili: ${available}`);
  }
  if (seen.includes(name)) {
    throw new Error(`Ciclo di ereditarietà fra i template: ${[...seen, name].join(' → ')}`);
  }

  const meta = readTemplateMeta(name);
  const chain = [name];
  let vars = { ...(meta.vars || {}) };

  if (meta.extends) {
    const parent = resolveTemplate(meta.extends, [...seen, name]);
    chain.push(...parent.chain);
    vars = { ...parent.vars, ...vars }; // il figlio sovrascrive il genitore
  }

  return { name, description: meta.description || '', chain, vars };
}

/** Cerca un file lungo la catena di ereditarietà. */
function findTemplateFile(chain, filename) {
  for (const template of chain) {
    const candidate = path.join(TEMPLATES_DIR, template, filename);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/** Sostituisce {{VAR}}. Ripetuta finché restano segnaposto annidati. */
function interpolate(content, vars) {
  let out = content;
  for (let pass = 0; pass < 3; pass++) {
    const next = out.replace(/\{\{([A-Z0-9_]+)\}\}/g, (match, key) =>
      Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match);
    if (next === out) break;
    out = next;
  }
  return out;
}

/** Segnaposto rimasti senza valore: sarebbero un bug silenzioso nel generato. */
function missingPlaceholders(content) {
  return [...new Set((content.match(/\{\{([A-Z0-9_]+)\}\}/g) || []))];
}

// ------------------------------------------------------------------ options

function parseArgs(argv) {
  const opts = { template: DEFAULT_TEMPLATE, force: false, dryRun: false, wire: false, tests: true };
  const rest = [];

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--template': case '-t': opts.template = argv[++i]; break;
      case '--force': case '-f': opts.force = true; break;
      case '--dry-run': opts.dryRun = true; break;
      case '--wire': opts.wire = true; break;
      case '--no-test': opts.tests = false; break;
      case '--list': case '-l': opts.list = true; break;
      case '--help': case '-h': opts.help = true; break;
      default:
        if (arg.startsWith('-')) throw new Error(`Opzione sconosciuta: ${arg}`);
        rest.push(arg);
    }
  }

  opts.name = rest[0];
  return opts;
}

function usage() {
  return [
    'Scaffolding per nuovi robot MyZubster',
    '',
    'Uso:  npm run robot:create -- <nome> [opzioni]',
    '',
    'Opzioni:',
    '  -t, --template <nome>   template da usare (default: basic)',
    '  -l, --list              elenca i template disponibili',
    '  -f, --force             sovrascrive i file esistenti',
    '      --dry-run           mostra cosa verrebbe generato, senza scrivere',
    '      --wire              monta la route in server.js',
    '      --no-test           non generare il file di test',
    '  -h, --help              questo messaggio',
    '',
    'Esempi:',
    '  npm run robot:create -- traduzione --template translation',
    '  npm run robot:create -- mio-robot --dry-run',
    '  node scripts/create-robot.js meteo --wire'
  ].join('\n');
}

// --------------------------------------------------------------- generation

function buildVars(slug, template, extra = {}) {
  const pascal = toPascal(slug);
  const snake = toSnake(slug);

  return {
    SLUG: slug,
    PASCAL_NAME: pascal,
    CAMEL_NAME: toCamel(slug),
    SNAKE_NAME: snake,
    DISPLAY_NAME: toDisplay(slug),
    MODULE_NAME: `robot_${snake}`,
    MODULE_FILE: `robot_${snake}.js`,
    ROUTE_FILE: `routes/robot${pascal}.js`,
    ROUTE_REQUIRE: `./routes/robot${pascal}`,
    TEST_FILE: `tests/robot${pascal}.test.js`,
    DOC_FILE: `docs/robots/${slug}.md`,
    MOUNT_PATH: `/api/robot/${slug}`,
    PERFORM_FN: `perform${pascal}`,
    TEMPLATE: template.name,
    TEMPLATE_DESCRIPTION: template.description,
    DESCRIPTION: extra.description || template.description,
    GENERATED_AT: extra.generatedAt,
    ...template.vars
  };
}

function plan(slug, template, vars, opts) {
  const files = [
    { key: 'robot.js.tpl', target: vars.MODULE_FILE },
    { key: 'route.js.tpl', target: vars.ROUTE_FILE },
    { key: 'doc.md.tpl', target: vars.DOC_FILE }
  ];
  if (opts.tests) files.splice(2, 0, { key: 'test.js.tpl', target: vars.TEST_FILE });

  // Il corpo di perform() è un frammento a parte, così i template di esempio
  // ridefiniscono solo la logica senza duplicare tutto il modulo.
  const snippetPath = findTemplateFile(template.chain, 'perform.snippet');
  const performBody = snippetPath
    ? interpolate(fs.readFileSync(snippetPath, 'utf8').replace(/\n$/, ''), vars)
    : '  return null;';
  const allVars = { ...vars, PERFORM_BODY: performBody };

  return files.map(({ key, target }) => {
    const source = findTemplateFile(template.chain, key);
    if (!source) throw new Error(`Template file mancante nella catena ${template.chain.join(' → ')}: ${key}`);
    const content = interpolate(fs.readFileSync(source, 'utf8'), allVars);
    const missing = missingPlaceholders(content);
    if (missing.length) {
      throw new Error(`Variabili non risolte in ${target}: ${missing.join(', ')}`);
    }
    return { target, absolute: path.join(ROOT, target), content };
  });
}

/** Inserisce la route in server.js accanto agli altri robot. */
function wireServer(vars, dryRun) {
  const serverPath = path.join(ROOT, 'server.js');
  const line = `app.use('${vars.MOUNT_PATH}', require('${vars.ROUTE_REQUIRE}'));`;
  const source = fs.readFileSync(serverPath, 'utf8');

  if (source.includes(line)) return { status: 'già presente', line };

  // Si aggancia all'ultimo mount /api/robot/... esistente.
  const mounts = [...source.matchAll(/^app\.use\('\/api\/robot\/[^']*',.*\);$/gm)];
  if (!mounts.length) return { status: 'non riuscito', line };

  const last = mounts[mounts.length - 1];
  const insertAt = last.index + last[0].length;
  const updated = `${source.slice(0, insertAt)}\n${line}${source.slice(insertAt)}`;

  if (!dryRun) fs.writeFileSync(serverPath, updated);
  return { status: dryRun ? 'da inserire' : 'inserita', line };
}

// ------------------------------------------------------------------- main

function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    console.error(`❌ ${err.message}\n`);
    console.error(usage());
    return 2;
  }

  if (opts.help) {
    console.log(usage());
    return 0;
  }

  if (opts.list) {
    console.log('Template disponibili:\n');
    for (const t of listTemplates()) {
      const inherits = t.extends ? ` (estende ${t.extends})` : '';
      console.log(`  ${t.name.padEnd(14)}${t.description}${inherits}`);
    }
    return 0;
  }

  if (!opts.name) {
    console.error('❌ Manca il nome del robot.\n');
    console.error(usage());
    return 2;
  }

  const slug = toSlug(opts.name);
  if (!slug) {
    console.error(`❌ "${opts.name}" non produce un nome valido. Usa lettere e numeri.`);
    return 2;
  }

  let template;
  let files;
  const vars = {};
  try {
    template = resolveTemplate(opts.template);
    Object.assign(vars, buildVars(slug, template, { generatedAt: new Date().toISOString().slice(0, 10) }));
    files = plan(slug, template, vars, opts);
  } catch (err) {
    console.error(`❌ ${err.message}`);
    return 2;
  }

  const existing = files.filter(f => fs.existsSync(f.absolute));
  if (existing.length && !opts.force) {
    console.error('❌ Questi file esistono già:');
    for (const f of existing) console.error(`   ${f.target}`);
    console.error('\n   Usa --force per sovrascriverli.');
    return 1;
  }

  console.log(`\n🤖 Robot "${vars.DISPLAY_NAME}"  ·  template ${template.name}${opts.dryRun ? '  ·  DRY RUN' : ''}\n`);

  for (const file of files) {
    if (!opts.dryRun) {
      fs.mkdirSync(path.dirname(file.absolute), { recursive: true });
      fs.writeFileSync(file.absolute, file.content);
    }
    const mark = existing.includes(file) ? 'sovrascritto' : 'creato';
    console.log(`   ${opts.dryRun ? 'genererebbe' : mark.padEnd(12)}  ${file.target}`);
  }

  console.log('');

  if (opts.wire) {
    const result = wireServer(vars, opts.dryRun);
    console.log(`   route in server.js: ${result.status}`);
    if (result.status === 'non riuscito') {
      console.log(`   Aggiungila a mano:\n     ${result.line}`);
    }
    console.log('');
  } else {
    console.log('   Per attivarlo, aggiungi in server.js:');
    console.log(`     app.use('${vars.MOUNT_PATH}', require('${vars.ROUTE_REQUIRE}'));\n`);
  }

  if (opts.tests && !opts.dryRun) {
    console.log(`   Test:  node --test ${vars.TEST_FILE}`);
  }
  console.log(`   Docs:  ${vars.DOC_FILE}\n`);
  console.log(`   Implementa la logica in ${vars.PERFORM_FN}() dentro ${vars.MODULE_FILE}.\n`);

  return 0;
}

if (require.main === module) {
  process.exit(main(process.argv));
}

module.exports = { toSlug, toPascal, toCamel, toSnake, toDisplay, interpolate, missingPlaceholders, resolveTemplate, listTemplates, buildVars, parseArgs, main };
