// robot_code.js – Robot per generazione codice 24/7
const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const escrowRobot = require('./escrow_robot');
const { notifyUser, notifyRobot } = require('./notifications');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Memoria dei job di codice
const codeJobs = new Map();

// Genera codice usando OpenAI
async function generateCode(prompt, language = 'javascript', framework = 'nodejs') {
  console.log(`💻 Generando codice ${language} per: "${prompt}"...`);
  
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: `Sei un esperto sviluppatore ${language}. Genera codice pulito, ben commentato e funzionante.` },
        { role: 'user', content: `Genera codice ${language} per: ${prompt}. Usa ${framework}. Aggiungi commenti.` }
      ],
      temperature: 0.7,
      max_tokens: 2000
    },
    { headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` } }
  );
  
  return response.data.choices[0].message.content;
}

// Crea un job di codice
async function createCodeJob(jobId, clientId, robotId, prompt, language = 'javascript', amount = 100, currency = 'MYZ') {
  const escrow = await escrowRobot.createEscrow({ jobId, clientId, robotId, amount, currency });
  
  codeJobs.set(jobId, { 
    prompt, 
    language, 
    status: 'pending',
    code: null,
    escrow,
    createdAt: Date.now()
  });
  
  await notifyUser(clientId, `💻 Job di codice ${jobId} creato. Sto generando...`);
  
  return { jobId, escrow };
}

// Genera il codice
async function generateAndDeliverCode(jobId) {
  const job = codeJobs.get(jobId);
  if (!job) throw new Error(`Job ${jobId} non trovato`);
  if (job.status !== 'pending') throw new Error(`Job ${jobId} già completato`);
  
  // Genera il codice
  const code = await generateCode(job.prompt, job.language);
  
  job.status = 'delivered';
  job.code = code;
  job.deliveredAt = Date.now();
  
  // Marca come consegnato nell'escrow
  await escrowRobot.markDelivered({ jobId });
  
  await notifyUser(job.escrow.clientId, `✅ Codice per job ${jobId} pronto. Ecco il codice:\n\n\`\`\`${job.language}\n${code}\n\`\`\``);
  await notifyRobot(job.escrow.robotId, `✅ Codice per job ${jobId} generato e consegnato.`);
  
  return { jobId, code };
}

// Crea PR su GitHub con il codice
async function createPullRequest(jobId, repo, branch = 'main', prTitle = 'AI-generated code') {
  const job = codeJobs.get(jobId);
  if (!job) throw new Error(`Job ${jobId} non trovato`);
  if (!job.code) throw new Error(`Nessun codice per job ${jobId}`);
  
  // Crea un nuovo branch
  const branchName = `ai-${jobId}-${Date.now()}`;
  
  // 1. Crea il file
  const fileName = `${jobId}-${Date.now()}.${job.language}`;
  
  // 2. Crea PR via GitHub API
  const response = await axios.post(
    `https://api.github.com/repos/${repo}/pulls`,
    {
      title: prTitle || `AI: ${job.prompt.substring(0, 50)}`,
      head: branchName,
      base: branch,
      body: `🤖 Questa PR è stata generata automaticamente per il job ${jobId}.\n\n${job.prompt}\n\n---\n*Generato da AI*`
    },
    { headers: { 'Authorization': `token ${GITHUB_TOKEN}` } }
  );
  
  job.prUrl = response.data.html_url;
  job.prNumber = response.data.number;
  
  await notifyUser(job.escrow.clientId, `🔗 PR creata: ${response.data.html_url}`);
  
  return { prUrl: response.data.html_url, prNumber: response.data.number };
}

// Ottieni lo stato di un job di codice
function getCodeJob(jobId) {
  const job = codeJobs.get(jobId);
  if (!job) return null;
  return {
    ...job,
    escrow: escrowRobot.getEscrow(jobId)
  };
}

// Lista tutti i job di codice
function listCodeJobs() {
  return Array.from(codeJobs.entries()).map(([id, data]) => ({
    jobId: id,
    status: data.status,
    prompt: data.prompt,
    language: data.language,
    prUrl: data.prUrl || null,
    createdAt: data.createdAt
  }));
}

module.exports = { 
  createCodeJob, 
  generateAndDeliverCode, 
  createPullRequest, 
  getCodeJob, 
  listCodeJobs,
  generateCode 
};
