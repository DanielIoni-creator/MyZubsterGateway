// robot_code_persistent.js – Versione con persistenza MongoDB
const axios = require('axios');
const escrowRobot = require('./escrow_robot');
const CodeJob = require('./models/CodeJob');
const { notifyUser, notifyRobot } = require('./notifications');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

async function generateCode(prompt, language = 'javascript') {
  console.log(`💻 Generando codice ${language} per: "${prompt}"...`);
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: `Sei un esperto sviluppatore ${language}.` },
        { role: 'user', content: `Genera codice ${language} per: ${prompt}. Aggiungi commenti.` }
      ],
      temperature: 0.7,
      max_tokens: 2000
    },
    { headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` } }
  );
  return response.data.choices[0].message.content;
}

async function createCodeJob(jobId, clientId, robotId, prompt, language = 'javascript', amount = 100, currency = 'MYZ') {
  const escrow = await escrowRobot.createEscrow({ jobId, clientId, robotId, amount, currency });
  
  const job = new CodeJob({
    jobId,
    clientId,
    robotId,
    prompt,
    language,
    status: 'pending',
    escrowId: jobId,
    createdAt: new Date()
  });
  await job.save();
  
  await notifyUser(clientId, `💻 Job di codice ${jobId} creato.`);
  return { jobId, escrow };
}

async function generateAndDeliverCode(jobId) {
  const job = await CodeJob.findOne({ jobId });
  if (!job) throw new Error(`Job ${jobId} non trovato`);
  if (job.status !== 'pending') throw new Error(`Job ${jobId} già completato`);
  
  const code = await generateCode(job.prompt, job.language);
  job.status = 'delivered';
  job.code = code;
  job.deliveredAt = new Date();
  await job.save();
  
  await escrowRobot.markDelivered({ jobId });
  await notifyUser(job.clientId, `✅ Codice per job ${jobId} pronto.`);
  await notifyRobot(job.robotId, `✅ Codice per job ${jobId} generato.`);
  
  return { jobId, code };
}

async function createPullRequest(jobId, repo, branch = 'main', prTitle = 'AI-generated code') {
  const job = await CodeJob.findOne({ jobId });
  if (!job) throw new Error(`Job ${jobId} non trovato`);
  if (!job.code) throw new Error(`Nessun codice per job ${jobId}`);
  if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN non configurato');
  
  const response = await axios.post(
    `https://api.github.com/repos/${repo}/pulls`,
    {
      title: prTitle || `AI: ${job.prompt.substring(0, 50)}`,
      head: `ai-${jobId}-${Date.now()}`,
      base: branch,
      body: `🤖 PR generata per job ${jobId}.\n\n${job.prompt}`
    },
    { headers: { 'Authorization': `token ${GITHUB_TOKEN}` } }
  );
  
  job.prUrl = response.data.html_url;
  job.prNumber = response.data.number;
  await job.save();
  
  return { prUrl: response.data.html_url, prNumber: response.data.number };
}

async function getCodeJob(jobId) {
  return await CodeJob.findOne({ jobId });
}

async function listCodeJobs() {
  return await CodeJob.find().sort({ createdAt: -1 });
}

module.exports = { createCodeJob, generateAndDeliverCode, createPullRequest, getCodeJob, listCodeJobs };
