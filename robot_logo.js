// robot_logo.js – Robot per generazione loghi 24/7
const axios = require('axios');
const escrowRobot = require('./escrow_robot');
const { notifyUser, notifyRobot } = require('./notifications');

// Configurazione AI (OpenAI DALL-E o Replicate)
// Usa variabili d'ambiente per le API keys
const AI_API_KEY = process.env.OPENAI_API_KEY || process.env.REPLICATE_API_KEY;
const AI_PROVIDER = process.env.AI_PROVIDER || 'openai'; // 'openai' o 'replicate'

// Memoria dei loghi generati
const generatedLogos = new Map();

// Genera un logo usando AI
async function generateLogo(prompt, style = 'modern') {
  console.log(`🎨 Generando logo con prompt: "${prompt}"...`);
  
  let imageUrl;
  
  if (AI_PROVIDER === 'openai') {
    // OpenAI DALL-E
    const response = await axios.post(
      'https://api.openai.com/v1/images/generations',
      {
        model: 'dall-e-3',
        prompt: `Create a professional logo: ${prompt}. Style: ${style}. Clean, minimal, modern.`,
        n: 1,
        size: '1024x1024',
        quality: 'standard'
      },
      { headers: { 'Authorization': `Bearer ${AI_API_KEY}` } }
    );
    imageUrl = response.data.data[0].url;
  } else if (AI_PROVIDER === 'replicate') {
    // Replicate (Stable Diffusion)
    const response = await axios.post(
      'https://api.replicate.com/v1/predictions',
      {
        version: 'stability-ai/stable-diffusion-3',
        input: {
          prompt: `Professional logo design: ${prompt}`,
          negative_prompt: 'text, letters, words, low quality, blurry',
          width: 1024,
          height: 1024,
          num_outputs: 1
        }
      },
      { headers: { 'Authorization': `Token ${AI_API_KEY}` } }
    );
    
    // Aspetta il risultato (Replicate è asincrono)
    const predictionId = response.data.id;
    let result;
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const status = await axios.get(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: { 'Authorization': `Token ${AI_API_KEY}` }
      });
      if (status.data.status === 'succeeded') {
        imageUrl = status.data.output[0];
        break;
      }
    }
  }
  
  if (!imageUrl) throw new Error('Impossibile generare il logo');
  
  return imageUrl;
}

// Crea un job per il robot logo
async function createLogoJob(jobId, clientId, robotId, prompt, style = 'modern', amount = 100, currency = 'MYZ') {
  // Crea escrow
  const escrow = await escrowRobot.createEscrow({ jobId, clientId, robotId, amount, currency });
  
  // Salva il job
  generatedLogos.set(jobId, { 
    prompt, 
    style, 
    status: 'pending', 
    escrow,
    createdAt: Date.now()
  });
  
  await notifyUser(clientId, `🎨 Job logo ${jobId} creato. Sto generando il logo...`);
  
  return { jobId, escrow };
}

// Genera e consegna il logo
async function generateAndDeliver(jobId) {
  const job = generatedLogos.get(jobId);
  if (!job) throw new Error(`Job ${jobId} non trovato`);
  if (job.status !== 'pending') throw new Error(`Job ${jobId} già completato`);
  
  // Genera il logo
  const imageUrl = await generateLogo(job.prompt, job.style);
  
  // Salva il risultato
  job.status = 'delivered';
  job.imageUrl = imageUrl;
  job.deliveredAt = Date.now();
  
  // Marca come consegnato nell'escrow
  await escrowRobot.markDelivered({ jobId });
  
  await notifyUser(job.escrow.clientId, `✅ Logo per job ${jobId} pronto: ${imageUrl}`);
  await notifyRobot(job.escrow.robotId, `✅ Logo per job ${jobId} generato e consegnato. In attesa di conferma.`);
  
  return { jobId, imageUrl };
}

// Ottieni lo stato di un job logo
function getLogoJob(jobId) {
  const job = generatedLogos.get(jobId);
  if (!job) return null;
  return {
    ...job,
    escrow: escrowRobot.getEscrow(jobId)
  };
}

// Lista tutti i job logo
function listLogoJobs() {
  return Array.from(generatedLogos.entries()).map(([id, data]) => ({
    jobId: id,
    status: data.status,
    prompt: data.prompt,
    imageUrl: data.imageUrl || null,
    createdAt: data.createdAt
  }));
}

module.exports = { 
  createLogoJob, 
  generateAndDeliver, 
  getLogoJob, 
  listLogoJobs,
  generateLogo 
};
