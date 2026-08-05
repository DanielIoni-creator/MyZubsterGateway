/**
 * Test dello scaffolding robot - Bounty BOT-7 (#344)
 *
 * Verifica naming, ereditarietà dei template e interpolazione, e genera
 * davvero un robot in una directory temporanea per controllare che il codice
 * prodotto sia sintatticamente valido e funzionante.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const gen = require('../scripts/create-robot');
const { createPluginHost, HOOKS } = require('../services/robotPlugins');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'create-robot.js');

/** Esegue il generatore raccogliendo stdout ed exit code. */
function run(args, { expectFailure = false } = {}) {
  try {
    return { code: 0, out: execFileSync('node', [SCRIPT, ...args], { cwd: ROOT, encoding: 'utf8' }) };
  } catch (err) {
    if (!expectFailure) throw err;
    return { code: err.status, out: `${err.stdout || ''}${err.stderr || ''}` };
  }
}

// ------------------------------------------------------------------- naming

describe('naming', () => {
  it('normalizza in slug kebab-case', () => {
    assert.strictEqual(gen.toSlug('traduzione'), 'traduzione');
    assert.strictEqual(gen.toSlug('Mio Robot'), 'mio-robot');
    assert.strictEqual(gen.toSlug('mioRobot'), 'mio-robot');
    assert.strictEqual(gen.toSlug('  spazi   multipli '), 'spazi-multipli');
    assert.strictEqual(gen.toSlug('robot!!!strano???'), 'robot-strano');
  });

  it('toglie il prefisso "robot" ridondante', () => {
    assert.strictEqual(gen.toSlug('robot-traduzione'), 'traduzione');
    assert.strictEqual(gen.toSlug('robot_meteo'), 'meteo');
    assert.strictEqual(gen.toSlug('Robot Meteo'), 'meteo');
  });

  it('restituisce stringa vuota per nomi non utilizzabili', () => {
    assert.strictEqual(gen.toSlug('!!!'), '');
    assert.strictEqual(gen.toSlug('---'), '');
  });

  it('deriva le altre forme dallo slug', () => {
    assert.strictEqual(gen.toPascal('mio-robot'), 'MioRobot');
    assert.strictEqual(gen.toCamel('mio-robot'), 'mioRobot');
    assert.strictEqual(gen.toSnake('mio-robot'), 'mio_robot');
    assert.strictEqual(gen.toDisplay('mio-robot'), 'Mio Robot');
  });

  it('costruisce percorsi coerenti', () => {
    const template = gen.resolveTemplate('basic');
    const vars = gen.buildVars('mio-robot', template, { generatedAt: '2025-01-01' });
    assert.strictEqual(vars.MODULE_FILE, 'robot_mio_robot.js');
    assert.strictEqual(vars.ROUTE_FILE, 'routes/robotMioRobot.js');
    assert.strictEqual(vars.TEST_FILE, 'tests/robotMioRobot.test.js');
    assert.strictEqual(vars.DOC_FILE, 'docs/robots/mio-robot.md');
    assert.strictEqual(vars.MOUNT_PATH, '/api/robot/mio-robot');
    assert.strictEqual(vars.PERFORM_FN, 'performMioRobot');
    assert.strictEqual(vars.ROUTE_REQUIRE, './routes/robotMioRobot');
  });
});

// ------------------------------------------------------------------ template

describe('template', () => {
  it('elenca i quattro template inclusi', () => {
    const names = gen.listTemplates().map(t => t.name).sort();
    assert.deepStrictEqual(names, ['basic', 'code', 'logo', 'translation']);
  });

  it('risolve la catena di ereditarietà', () => {
    const resolved = gen.resolveTemplate('translation');
    assert.deepStrictEqual(resolved.chain, ['translation', 'basic']);
  });

  it('le variabili del figlio vincono su quelle del genitore', () => {
    assert.strictEqual(gen.resolveTemplate('basic').vars.INPUT_FIELD, 'input');
    assert.strictEqual(gen.resolveTemplate('translation').vars.INPUT_FIELD, 'text');
    assert.strictEqual(gen.resolveTemplate('logo').vars.OUTPUT_FIELD, 'imageUrl');
    assert.strictEqual(gen.resolveTemplate('code').vars.DEFAULT_AMOUNT, '150');
  });

  it('il figlio eredita le variabili che non ridefinisce', () => {
    // translation non dichiara TASK_LABEL... lo dichiara; usiamo una chiave
    // presente solo in basic per verificare l'ereditarietà.
    const basic = gen.resolveTemplate('basic').vars;
    const translation = gen.resolveTemplate('translation').vars;
    for (const key of Object.keys(basic)) {
      assert.ok(key in translation, `${key} deve essere ereditata`);
    }
  });

  it('rifiuta un template inesistente', () => {
    assert.throws(() => gen.resolveTemplate('inesistente'), /non trovato/);
  });
});

// -------------------------------------------------------------- interpolate

describe('interpolate', () => {
  it('sostituisce i segnaposto', () => {
    assert.strictEqual(gen.interpolate('ciao {{NAME}}', { NAME: 'mondo' }), 'ciao mondo');
    assert.strictEqual(gen.interpolate('{{A}}-{{B}}', { A: '1', B: '2' }), '1-2');
  });

  it('lascia intatti i segnaposto senza valore', () => {
    assert.strictEqual(gen.interpolate('ciao {{IGNOTO}}', {}), 'ciao {{IGNOTO}}');
  });

  it('risolve i segnaposto annidati', () => {
    assert.strictEqual(gen.interpolate('{{A}}', { A: '{{B}}', B: 'finale' }), 'finale');
  });

  it('missingPlaceholders segnala ciò che resta', () => {
    assert.deepStrictEqual(gen.missingPlaceholders('ok {{X}} {{Y}} {{X}}'), ['{{X}}', '{{Y}}']);
    assert.deepStrictEqual(gen.missingPlaceholders('tutto risolto'), []);
  });
});

// ---------------------------------------------------------------- plugin host

describe('plugin host', () => {
  it('esegue gli hook in ordine di registrazione', async () => {
    const host = createPluginHost('test');
    const seen = [];
    host.use({ name: 'uno', hooks: { 'job:created': () => seen.push('uno') } });
    host.use({ name: 'due', hooks: { 'job:created': () => seen.push('due') } });
    await host.emit('job:created', {});
    assert.deepStrictEqual(seen, ['uno', 'due']);
  });

  it('passa il contesto agli hook', async () => {
    const host = createPluginHost('test');
    let received = null;
    host.use({ name: 'spy', hooks: { 'job:delivered': ctx => { received = ctx; } } });
    await host.emit('job:delivered', { jobId: 'j1' });
    assert.strictEqual(received.jobId, 'j1');
    assert.strictEqual(received.robot, 'test');
    assert.strictEqual(received.hook, 'job:delivered');
  });

  it('isola un plugin che lancia', async () => {
    const host = createPluginHost('test');
    const seen = [];
    host.use({ name: 'rotto', hooks: { 'job:created': () => { throw new Error('boom'); } } });
    host.use({ name: 'sano', hooks: { 'job:created': () => seen.push('sano') } });
    await assert.doesNotReject(() => host.emit('job:created', {}));
    assert.deepStrictEqual(seen, ['sano'], 'gli altri plugin girano comunque');
  });

  it('supporta hook asincroni', async () => {
    const host = createPluginHost('test');
    const seen = [];
    host.use({ name: 'async', hooks: { 'job:created': async () => { await Promise.resolve(); seen.push('ok'); } } });
    await host.emit('job:created', {});
    assert.deepStrictEqual(seen, ['ok']);
  });

  it('rifiuta plugin malformati e hook sconosciuti', () => {
    const host = createPluginHost('test');
    assert.throws(() => host.use(null), /oggetto/);
    assert.throws(() => host.use({ hooks: {} }), /name/);
    assert.throws(() => host.use({ name: 'x' }), /hooks/);
    assert.throws(() => host.use({ name: 'x', hooks: { 'job:boh': () => {} } }), /sconosciuti/);
  });

  it('list e clear', () => {
    const host = createPluginHost('test');
    host.use({ name: 'a', hooks: { 'job:created': () => {} } });
    assert.deepStrictEqual(host.list(), [{ name: 'a', hooks: ['job:created'] }]);
    host.clear();
    assert.deepStrictEqual(host.list(), []);
  });

  it('espone gli hook disponibili', () => {
    assert.deepStrictEqual(HOOKS, ['job:created', 'job:executing', 'job:delivered', 'job:failed']);
  });
});

// ---------------------------------------------------------------------- CLI

describe('CLI', () => {
  it('--list mostra i template', () => {
    const { out } = run(['--list']);
    for (const name of ['basic', 'translation', 'logo', 'code']) {
      assert.match(out, new RegExp(name));
    }
  });

  it('--help mostra le istruzioni', () => {
    assert.match(run(['--help']).out, /robot:create/);
  });

  it('senza nome esce con errore', () => {
    const { code, out } = run([], { expectFailure: true });
    assert.strictEqual(code, 2);
    assert.match(out, /Manca il nome/);
  });

  it('con un nome non valido esce con errore', () => {
    const { code, out } = run(['!!!'], { expectFailure: true });
    assert.strictEqual(code, 2);
    assert.match(out, /non produce un nome valido/);
  });

  it('con un template inesistente esce con errore', () => {
    const { code, out } = run(['x', '--template', 'inesistente'], { expectFailure: true });
    assert.strictEqual(code, 2);
    assert.match(out, /non trovato/);
  });

  it('con un opzione sconosciuta esce con errore', () => {
    const { code, out } = run(['x', '--boh'], { expectFailure: true });
    assert.strictEqual(code, 2);
    assert.match(out, /Opzione sconosciuta/);
  });

  it('--dry-run non scrive nulla', () => {
    const slug = 'tmp-dry-run-robot';
    const { out } = run([slug, '--dry-run']);
    assert.match(out, /DRY RUN/);
    assert.strictEqual(fs.existsSync(path.join(ROOT, 'robot_tmp_dry_run_robot.js')), false);
  });

  it('rifiuta di sovrascrivere senza --force', () => {
    // package.json esiste di sicuro: si usa un template fittizio? No: si genera
    // davvero e si riprova, ripulendo subito dopo.
    const slug = 'tmp-overwrite-robot';
    const created = [
      'robot_tmp_overwrite_robot.js',
      'routes/robotTmpOverwriteRobot.js',
      'tests/robotTmpOverwriteRobot.test.js',
      'docs/robots/tmp-overwrite-robot.md'
    ];
    try {
      run([slug]);
      const { code, out } = run([slug], { expectFailure: true });
      assert.strictEqual(code, 1);
      assert.match(out, /esistono già/);
      assert.doesNotThrow(() => run([slug, '--force']));
    } finally {
      for (const f of created) fs.rmSync(path.join(ROOT, f), { force: true });
    }
  });
});

// ------------------------------------------------- codice generato reale

describe('codice generato', () => {
  const slug = 'tmp-generated-robot';
  const files = [
    'robot_tmp_generated_robot.js',
    'routes/robotTmpGeneratedRobot.js',
    'tests/robotTmpGeneratedRobot.test.js',
    'docs/robots/tmp-generated-robot.md'
  ];

  before(() => run([slug, '--template', 'translation']));
  after(() => { for (const f of files) fs.rmSync(path.join(ROOT, f), { force: true }); });

  it('crea tutti e quattro i file', () => {
    for (const f of files) {
      assert.ok(fs.existsSync(path.join(ROOT, f)), `${f} deve esistere`);
    }
  });

  it('non lascia segnaposto non risolti', () => {
    for (const f of files) {
      const content = fs.readFileSync(path.join(ROOT, f), 'utf8');
      assert.deepStrictEqual(gen.missingPlaceholders(content), [], `${f} contiene segnaposto`);
    }
  });

  it('produce JavaScript sintatticamente valido', () => {
    for (const f of files.filter(f => f.endsWith('.js'))) {
      assert.doesNotThrow(
        () => execFileSync('node', ['--check', path.join(ROOT, f)], { stdio: 'pipe' }),
        `${f} non è JavaScript valido`
      );
    }
  });

  it('usa le variabili del template scelto', () => {
    const module = fs.readFileSync(path.join(ROOT, files[0]), 'utf8');
    assert.match(module, /job\.text/, 'usa INPUT_FIELD del template translation');
    assert.match(module, /translation:/, 'usa OUTPUT_FIELD del template translation');
    assert.match(module, /const DEFAULT_AMOUNT = 50;/);
  });

  it('i test generati passano', () => {
    // NODE_TEST_CONTEXT è ereditato da questo processo di test e farebbe usare
    // al figlio il reporter interno, che non stampa il riepilogo TAP.
    const env = { ...process.env };
    delete env.NODE_TEST_CONTEXT;

    const result = execFileSync('node', ['--test', files[2]], { cwd: ROOT, encoding: 'utf8', env });
    assert.match(result, /# fail 0/);
    assert.doesNotMatch(result, /# pass 0/);
  });

  it('la documentazione generata cita gli endpoint reali', () => {
    const doc = fs.readFileSync(path.join(ROOT, files[3]), 'utf8');
    assert.match(doc, /POST \/api\/robot\/tmp-generated-robot\/create/);
    assert.match(doc, /POST \/api\/robot\/tmp-generated-robot\/execute/);
    assert.match(doc, /performTmpGeneratedRobot/);
  });
});
