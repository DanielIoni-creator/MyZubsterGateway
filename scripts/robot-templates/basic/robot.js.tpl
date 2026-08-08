// {{MODULE_FILE}} – Robot {{DISPLAY_NAME}}
// Generato da `npm run robot:create -- {{SLUG}} --template {{TEMPLATE}}` il {{GENERATED_AT}}.
//
// Ciclo di vita di un job:
//   create{{PASCAL_NAME}}Job  → blocca i fondi in escrow, job in stato `pending`
//   execute{{PASCAL_NAME}}Job → produce il risultato, job in stato `delivered`
//                               e l'escrow passa a DELIVERED
//
// Personalizza {{PERFORM_FN}}(): è l'unica funzione che contiene la logica
// specifica di questo robot. Tutto il resto è già cablato con escrow,
// notifiche e plugin.

const escrowRobot = require('./escrow_robot');
const { notifyUser, notifyRobot } = require('./notifications');
const { createPluginHost } = require('./services/robotPlugins');

const DEFAULT_AMOUNT = {{DEFAULT_AMOUNT}};
const DEFAULT_CURRENCY = 'MYZ';

// Stato in memoria, come gli altri robot del gateway.
const jobs = new Map();
const plugins = createPluginHost('{{SLUG}}');

// Contatore monotono: due job creati nello stesso millisecondo hanno lo stesso
// createdAt, quindi ordinare solo per timestamp non è deterministico.
let sequence = 0;

/**
 * Logica specifica del robot. Sostituisci il corpo con l'implementazione reale.
 *
 * @param {object} job il job corrente
 * @returns {Promise<any>} il risultato, salvato in `job.{{OUTPUT_FIELD}}`
 */
async function {{PERFORM_FN}}(job) {
{{PERFORM_BODY}}
}

/**
 * Crea un job e blocca i fondi in escrow.
 */
async function create{{PASCAL_NAME}}Job({
  jobId, clientId, robotId, {{INPUT_FIELD}},
  amount = DEFAULT_AMOUNT, currency = DEFAULT_CURRENCY
}) {
  if (!jobId) throw new Error('jobId è obbligatorio');
  if (!clientId) throw new Error('clientId è obbligatorio');
  if (!robotId) throw new Error('robotId è obbligatorio');
  if (!{{INPUT_FIELD}}) throw new Error('{{INPUT_FIELD}} è obbligatorio');
  if (jobs.has(jobId)) throw new Error(`Job ${jobId} già esistente`);

  const escrow = await escrowRobot.createEscrow({ jobId, clientId, robotId, amount, currency });

  const job = {
    jobId, clientId, robotId,
    seq: ++sequence,
    {{INPUT_FIELD}},
    {{OUTPUT_FIELD}}: null,
    status: 'pending',
    amount, currency,
    createdAt: Date.now(),
    deliveredAt: null
  };
  jobs.set(jobId, job);

  await plugins.emit('job:created', { jobId, job });
  await notifyUser(clientId, `🤖 Job {{TASK_NOUN}} ${jobId} creato. ${amount} ${currency} bloccati.`);

  return { ...job, escrow };
}

/**
 * Esegue il job e lo consegna, rilasciando l'escrow.
 */
async function execute{{PASCAL_NAME}}Job(jobId) {
  const job = jobs.get(jobId);
  if (!job) throw new Error(`Job ${jobId} non trovato`);
  if (job.status !== 'pending') throw new Error(`Job ${jobId} è già in stato ${job.status}`);

  await plugins.emit('job:executing', { jobId, job });

  try {
    job.{{OUTPUT_FIELD}} = await {{PERFORM_FN}}(job);
  } catch (err) {
    job.status = 'failed';
    job.error = err.message;
    await plugins.emit('job:failed', { jobId, job, error: err });
    await notifyUser(job.clientId, `❌ Job {{TASK_NOUN}} ${jobId} fallito: ${err.message}`);
    throw err;
  }

  job.status = 'delivered';
  job.deliveredAt = Date.now();

  await escrowRobot.markDelivered({ jobId });
  await plugins.emit('job:delivered', { jobId, job });
  await notifyUser(job.clientId, `✅ Job {{TASK_NOUN}} ${jobId} consegnato.`);
  await notifyRobot(job.robotId, `✅ Job {{TASK_NOUN}} ${jobId} completato.`);

  return { jobId, {{OUTPUT_FIELD}}: job.{{OUTPUT_FIELD}}, status: job.status };
}

/** Job singolo, con lo stato aggiornato dell'escrow. */
function get{{PASCAL_NAME}}Job(jobId) {
  const job = jobs.get(jobId);
  if (!job) return null;
  return { ...job, escrow: escrowRobot.getEscrow(jobId) };
}

/** Tutti i job, dal più recente. */
function list{{PASCAL_NAME}}Jobs() {
  return Array.from(jobs.values())
    .sort((a, b) => b.seq - a.seq)
    .map(({ jobId, status, clientId, robotId, amount, currency, createdAt, deliveredAt }) =>
      ({ jobId, status, clientId, robotId, amount, currency, createdAt, deliveredAt }));
}

/** Registra un plugin. Vedi services/robotPlugins.js per gli hook disponibili. */
function use(plugin) {
  return plugins.use(plugin);
}

/** Svuota lo stato in memoria. Usato dai test. */
function reset() {
  jobs.clear();
  plugins.clear();
  sequence = 0;
}

module.exports = {
  create{{PASCAL_NAME}}Job,
  execute{{PASCAL_NAME}}Job,
  get{{PASCAL_NAME}}Job,
  list{{PASCAL_NAME}}Jobs,
  {{PERFORM_FN}},
  use,
  reset,
  plugins
};
