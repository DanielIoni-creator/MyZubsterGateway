// myz_wallet.js – Gestione $MYZ su Tari
const axios = require('axios');

const TARI_WALLET_URL = process.env.TARI_WALLET_URL || 'http://localhost:18089';
const PLATFORM_WALLET = process.env.PLATFORM_WALLET_ID || 'platform_wallet_id';

// Per semplicità, manteniamo uno stato in memoria per i test
// In produzione, sostituisci con chiamate RPC reali a Tari
const escrowLocks = new Map();

async function lockMYZ(userId, amount) {
  console.log(`🔒 Locked ${amount} MYZ for user ${userId}`);
  
  // Simula lock (in produzione, chiama Tari RPC)
  const txId = `tx_myz_${Date.now()}`;
  escrowLocks.set(userId, { amount, txId });
  
  // In produzione, usa:
  // const response = await axios.post(`${TARI_WALLET_URL}/transfer`, {
  //   destination: process.env.ESCROW_WALLET_ADDRESS,
  //   amount: amount * 1000, // Tari usa micro-MYZ
  //   message: `ESCROW_LOCK_${userId}`
  // });
  // return response.data.tx_id;
  
  return txId;
}

async function releaseMYZ(userId, amount) {
  console.log(`💰 Released ${amount} MYZ to user ${userId}`);
  
  // Simula release (in produzione, chiama Tari RPC)
  const txId = `tx_release_${Date.now()}`;
  
  // In produzione, usa:
  // const response = await axios.post(`${TARI_WALLET_URL}/transfer`, {
  //   destination: getUserWallet(userId),
  //   amount: amount * 1000,
  //   message: `ESCROW_RELEASE_${userId}`
  // });
  // return response.data.tx_id;
  
  return txId;
}

async function refundMYZ(userId, amount) {
  console.log(`↩️ Refunded ${amount} MYZ to user ${userId}`);
  return `tx_refund_${Date.now()}`;
}

function getUserWallet(userId) {
  // In produzione, prendi dal database
  return `wallet_${userId}`;
}

module.exports = { lockMYZ, releaseMYZ, refundMYZ };
