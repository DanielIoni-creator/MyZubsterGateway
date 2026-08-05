const escrowRobot = require('./escrow_robot');
const { notifyRobot, notifyUser } = require('./notifications');
const robotState = new Map();

function createRobot(robotId, name, walletAddress) {
  if (robotState.has(robotId)) throw new Error(`Robot ${robotId} già esiste`);
  const robot = { robotId, name, walletAddress, status: 'idle', currentJob: null, reputation: 0, jobsCompleted: 0, totalEarned: 0, history: [], createdAt: Date.now() };
  robotState.set(robotId, robot);
  console.log(`🤖 Robot ${name} (${robotId}) creato`);
  return robot;
}

async function assignJobToRobot(robotId, jobId, clientId, amount, currency) {
  const robot = robotState.get(robotId);
  if (!robot) throw new Error(`Robot ${robotId} non trovato`);
  if (robot.status !== 'idle') throw new Error(`Robot ${robotId} è già occupato`);
  const escrow = await escrowRobot.createEscrow({ jobId, clientId, robotId, amount, currency });
  robot.status = 'working';
  robot.currentJob = { jobId, clientId, amount, currency, escrow };
  robot.history.push({ event: 'job_assigned', jobId, amount, currency, timestamp: Date.now() });
  await notifyRobot(robotId, `✅ Job ${jobId} assegnato. ${amount} ${currency} bloccati. Consegna entro 24h.`);
  await notifyUser(clientId, `🤖 Robot ${robot.name} ha accettato il job ${jobId}`);
  return robot;
}

async function executeJob(robotId) {
  const robot = robotState.get(robotId);
  if (!robot) throw new Error(`Robot ${robotId} non trovato`);
  if (robot.status !== 'working') throw new Error(`Robot ${robotId} non è in esecuzione`);
  console.log(`🔧 Robot ${robot.name} sta eseguendo job ${robot.currentJob.jobId}...`);
  await new Promise(resolve => setTimeout(resolve, 2000));
  robot.status = 'delivering';
  robot.history.push({ event: 'job_executed', jobId: robot.currentJob.jobId, timestamp: Date.now() });
  return { success: true, message: 'Lavoro eseguito' };
}

async function deliverJob(robotId) {
  const robot = robotState.get(robotId);
  if (!robot) throw new Error(`Robot ${robotId} non trovato`);
  if (robot.status !== 'delivering') throw new Error(`Robot ${robotId} non ha un lavoro da consegnare`);
  const jobId = robot.currentJob.jobId;
  await escrowRobot.markDelivered({ jobId });
  robot.status = 'idle';
  robot.jobsCompleted += 1;
  robot.reputation += 1;
  robot.totalEarned += robot.currentJob.amount - (robot.currentJob.amount * 0.02);
  robot.currentJob = null;
  robot.history.push({ event: 'job_delivered', jobId, timestamp: Date.now() });
  await notifyRobot(robotId, `✅ Job ${jobId} consegnato. In attesa di conferma o disputa.`);
  return { success: true, message: 'Job consegnato' };
}

async function handleDispute(robotId, jobId, reason) {
  const robot = robotState.get(robotId);
  if (!robot) throw new Error(`Robot ${robotId} non trovato`);
  await escrowRobot.openDispute({ jobId, reason });
  robot.status = 'dispute';
  robot.history.push({ event: 'dispute_opened', jobId, reason, timestamp: Date.now() });
  await notifyRobot(robotId, `⚠️ Disputa aperta per job ${jobId}. Motivo: ${reason}`);
  return { success: true, message: 'Disputa aperta' };
}

function getRobotStatus(robotId) {
  const robot = robotState.get(robotId);
  if (!robot) throw new Error(`Robot ${robotId} non trovato`);
  return {
    robotId: robot.robotId,
    name: robot.name,
    status: robot.status,
    currentJob: robot.currentJob,
    reputation: robot.reputation,
    jobsCompleted: robot.jobsCompleted,
    totalEarned: robot.totalEarned,
    history: robot.history.slice(-20)
  };
}

function getAllRobots() {
  return Array.from(robotState.values());
}

module.exports = { createRobot, assignJobToRobot, executeJob, deliverJob, handleDispute, getRobotStatus, getAllRobots };
