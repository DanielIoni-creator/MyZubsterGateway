// escrow_robot.js – Escrow automatico per Robot 24/7 (MYZ + XMR)
const { lockMYZ, releaseMYZ, refundMYZ } = require('./gateway/myz_wallet');
const { lockXMR, releaseXMR, refundXMR } = require('./gateway/xmr_wallet');
const { notifyUser, notifyRobot } = require('./notifications');

const FEE_PERCENT = 0.02;
const DISPUTE_WINDOW_HOURS = 48;
const JOB_TIMEOUT_HOURS = 24;
const escrows = new Map();

async function createEscrow({ jobId, clientId, robotId, amount, currency }) {
  const fee = amount * FEE_PERCENT;
  const netAmount = amount - fee;
  let lockTx;
  if (currency === 'MYZ') lockTx = await lockMYZ(clientId, amount);
  else if (currency === 'XMR') lockTx = await lockXMR(clientId, amount);
  const escrow = { jobId, clientId, robotId, amount, fee, netAmount, currency, status: 'LOCKED', lockTx, createdAt: Date.now(), deadline: Date.now() + JOB_TIMEOUT_HOURS * 3600 * 1000 };
  escrows.set(jobId, escrow);
  await notifyRobot(robotId, `Nuovo job ${jobId}. ${amount} ${currency} bloccati. Consegna entro 24h.`);
  return escrow;
}

async function markDelivered({ jobId }) {
  const escrow = escrows.get(jobId);
  if (!escrow) throw new Error('Escrow non trovato');
  escrow.status = 'DELIVERED';
  escrow.deliveredAt = Date.now();
  escrow.disputeDeadline = Date.now() + DISPUTE_WINDOW_HOURS * 3600 * 1000;
  await notifyUser(escrow.clientId, `Robot ha consegnato job ${jobId}. Hai 48h per contestare.`);
  setTimeout(() => autoRelease(jobId), DISPUTE_WINDOW_HOURS * 3600 * 1000);
  return escrow;
}

async function autoRelease(jobId) {
  const escrow = escrows.get(jobId);
  if (!escrow || escrow.status !== 'DELIVERED') return;
  if (escrow.currency === 'MYZ') {
    await releaseMYZ(escrow.robotId, escrow.netAmount);
    await releaseMYZ('PLATFORM_WALLET', escrow.fee);
  } else {
    await releaseXMR(escrow.robotId, escrow.netAmount);
    await releaseXMR('PLATFORM_WALLET', escrow.fee);
  }
  escrow.status = 'COMPLETED';
  await notifyUser(escrow.clientId, `Job ${jobId} completato. Fondi rilasciati.`);
  await notifyRobot(escrow.robotId, `Job ${jobId} pagato: ${escrow.netAmount} ${escrow.currency}`);
}

async function openDispute({ jobId, reason }) {
  const escrow = escrows.get(jobId);
  if (!escrow) throw new Error('Escrow non trovato');
  escrow.status = 'CONTESTED';
  await notifyUser(escrow.clientId, `Disputa aperta per ${jobId}. Motivo: ${reason}`);
}

function getEscrow(jobId) { return escrows.get(jobId) || null; }

function getAllEscrows() {
  return Array.from(escrows.values());
}

module.exports = { createEscrow, markDelivered, openDispute, getEscrow, autoRelease, getAllEscrows };
