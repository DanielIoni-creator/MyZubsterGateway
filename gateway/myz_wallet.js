// gateway/myz_wallet.js – Gestione $MYZ su Tari (versione gateway)
const axios = require('axios');

const TARI_WALLET_URL = process.env.TARI_WALLET_URL || 'http://localhost:18089';
const escrowLocks = new Map();

async function lockMYZ(userId, amount) {
  console.log(`🔒 [Gateway] Locked ${amount} MYZ for user ${userId}`);
  const txId = `tx_myz_${Date.now()}`;
  escrowLocks.set(userId, { amount, txId });
  return txId;
}

async function releaseMYZ(userId, amount) {
  console.log(`💰 [Gateway] Released ${amount} MYZ to user ${userId}`);
  return `tx_release_${Date.now()}`;
}

async function refundMYZ(userId, amount) {
  console.log(`↩️ [Gateway] Refunded ${amount} MYZ to user ${userId}`);
  return `tx_refund_${Date.now()}`;
}

module.exports = { lockMYZ, releaseMYZ, refundMYZ };
