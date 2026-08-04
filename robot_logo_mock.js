const escrowRobot = require('./escrow_robot');
const { notifyUser, notifyRobot } = require('./notifications');

const generatedLogos = new Map();

async function generateLogo(prompt, style) {
  console.log(`🎨 Mock: generando logo per "${prompt}"...`);
  return `https://via.placeholder.com/1024x1024/4A90D9/FFFFFF?text=LOGO+MOCK`;
}

async function createLogoJob(jobId, clientId, robotId, prompt, style = 'modern', amount = 100, currency = 'MYZ') {
  const escrow = await escrowRobot.createEscrow({ jobId, clientId, robotId, amount, currency });
  generatedLogos.set(jobId, { prompt, style, status: 'pending', escrow, createdAt: Date.now() });
  await notifyUser(clientId, `🎨 Job logo ${jobId} creato.`);
  return { jobId, escrow };
}

async function generateAndDeliver(jobId) {
  const job = generatedLogos.get(jobId);
  if (!job) throw new Error(`Job ${jobId} non trovato`);
  if (job.status !== 'pending') throw new Error(`Job ${jobId} già completato`);
  
  const imageUrl = await generateLogo(job.prompt, job.style);
  job.status = 'delivered';
  job.imageUrl = imageUrl;
  job.deliveredAt = Date.now();
  
  await escrowRobot.markDelivered({ jobId });
  await notifyUser(job.escrow.clientId, `✅ Logo mock per job ${jobId} pronto: ${imageUrl}`);
  await notifyRobot(job.escrow.robotId, `✅ Logo mock per job ${jobId} generato.`);
  
  return { jobId, imageUrl };
}

function getLogoJob(jobId) {
  const job = generatedLogos.get(jobId);
  if (!job) return null;
  return { ...job, escrow: escrowRobot.getEscrow(jobId) };
}

function listLogoJobs() {
  return Array.from(generatedLogos.entries()).map(([id, data]) => ({
    jobId: id,
    status: data.status,
    prompt: data.prompt,
    imageUrl: data.imageUrl || null,
    createdAt: data.createdAt
  }));
}

module.exports = { createLogoJob, generateAndDeliver, getLogoJob, listLogoJobs };
