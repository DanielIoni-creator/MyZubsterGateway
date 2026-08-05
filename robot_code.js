const escrowRobot = require('./escrow_robot');
const { notifyUser, notifyRobot } = require('./notifications');
const codeJobs = new Map();

async function generateCode(prompt, language) {
  console.log(`💻 Mock: generando codice per "${prompt}"...`);
  return `// ${prompt}\nconsole.log('Hello from mock!');\n`;
}

async function createCodeJob(jobId, clientId, robotId, prompt, language, amount = 100, currency = 'MYZ') {
  const escrow = await escrowRobot.createEscrow({ jobId, clientId, robotId, amount, currency });
  codeJobs.set(jobId, { prompt, language, status: 'pending', code: null, escrow, createdAt: Date.now() });
  await notifyUser(clientId, `💻 Job di codice ${jobId} creato.`);
  return { jobId, escrow };
}

async function generateAndDeliverCode(jobId) {
  const job = codeJobs.get(jobId);
  if (!job) throw new Error(`Job ${jobId} non trovato`);
  if (job.status !== 'pending') throw new Error(`Job ${jobId} già completato`);
  const code = await generateCode(job.prompt, job.language);
  job.status = 'delivered';
  job.code = code;
  job.deliveredAt = Date.now();
  await escrowRobot.markDelivered({ jobId });
  await notifyUser(job.escrow.clientId, `✅ Codice per job ${jobId} pronto.`);
  await notifyRobot(job.escrow.robotId, `✅ Codice mock per job ${jobId} generato.`);
  return { jobId, code };
}

async function createPullRequest(jobId, repo, branch, prTitle) {
  const job = codeJobs.get(jobId);
  if (!job) throw new Error(`Job ${jobId} non trovato`);
  if (!job.code) throw new Error(`Nessun codice per job ${jobId}`);
  const prUrl = `https://github.com/${repo}/pull/mock-${jobId}`;
  job.prUrl = prUrl;
  return { prUrl };
}

function getCodeJob(jobId) {
  const job = codeJobs.get(jobId);
  if (!job) return null;
  return { ...job, escrow: escrowRobot.getEscrow(jobId) };
}

function listCodeJobs() {
  return Array.from(codeJobs.entries()).map(([id, data]) => ({ jobId: id, ...data }));
}

module.exports = { createCodeJob, generateAndDeliverCode, createPullRequest, getCodeJob, listCodeJobs };
