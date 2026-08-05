// robot_logo.js – Robot per generazione loghi 24/7 (Replicate Stable Diffusion)
const axios = require('axios');
const escrowRobot = require('./escrow_robot');
const { notifyUser, notifyRobot } = require('./notifications');

const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY;
const generatedLogos = new Map();

async function generateLogo(prompt, style = 'modern') {
  console.log(`🎨 Generando logo con Replicate: "${prompt}"...`);

  // Avvia la generazione su Replicate
  const response = await axios.post(
    'https://api.replicate.com/v1/predictions',
    {
      version: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
      input: {
        prompt: `Professional logo design: ${prompt}. Style: ${style}. Clean, minimal, modern, no text.`,
        negative_prompt: 'text, letters, words, low quality, blurry',
        width: 1024,
        height: 1024,
        num_outputs: 1
      }
    },
    { headers: { 'Authorization': `Token ${REPLICATE_API_KEY}` } }
  );

  const predictionId = response.data.id;

  // Aspetta il risultato (polling)
  let result;
  for (let i = 0; i < 30; i++) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    const status = await axios.get(
      `https://api.replicate.com/v1/predictions/${predictionId}`,
      { headers: { 'Authorization': `Token ${REPLICATE_API_KEY}` } }
    );
    if (status.data.status === 'succeeded') {
      result = status.data.output;
      break;
    }
    if (status.data.status === 'failed') {
      throw new Error('Replicate generation failed');
    }
  }

  if (!result) throw new Error('Timeout waiting for Replicate');
  return result[0]; // URL dell'immagine
}

async function createLogoJob(jobId, clientId, robotId, prompt, style = 'modern', amount = 100, currency = 'MYZ') {
  const escrow = await escrowRobot.createEscrow({ jobId, clientId, robotId, amount, currency });
  generatedLogos.set(jobId, { prompt, style, status: 'pending', escrow, createdAt: Date.now() });
  await notifyUser(clientId, `🎨 Job logo ${jobId} creato. Generando...`);
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
  await notifyUser(job.escrow.clientId, `✅ Logo per job ${jobId} pronto: ${imageUrl}`);
  await notifyRobot(job.escrow.robotId, `✅ Logo per job ${jobId} generato.`);

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
