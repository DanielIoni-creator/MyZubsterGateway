// gateway/myz_wallet.js – Gestione $MYZ su Tari wallet RPC (BOUNTY B4)
const axios = require('axios');

const TARI_RPC_URL = process.env.TARI_RPC_URL || 'http://localhost:12021/json_rpc';
const ESCROW_ADDRESS = process.env.TARI_ESCROW_ADDRESS || 'tari_escrow_platform';
const escrowLocks = new Map();

async function tariRpc(method, params = {}) {
  try {
    const response = await axios.post(TARI_RPC_URL, {
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params
    }, { timeout: 15000 });
    if (response.data.error) {
      throw new Error(`Tari RPC error: ${response.data.error.message}`);
    }
    return response.data.result;
  } catch (err) {
    console.error(`❌ Tari RPC call failed (${method}): ${err.message}`);
    throw err;
  }
}

async function getBalance() {
  const result = await tariRpc('get_balance');
  return result.available_balance || result.balance || 0;
}

async function lockMYZ(userId, amount) {
  console.log(`🔒 Locking ${amount} MYZ for user ${userId}...`);
  
  // Create escrow sub-account or use main wallet
  const escrowAccount = `escrow_${userId}_${Date.now()}`;
  
  // Transfer MYZ from user to escrow account
  const transferParams = {
    destinations: [{
      address: ESCROW_ADDRESS,
      amount: amount * 1e6 // Convert to microTari (smallest unit)
    }],
    fee: 100, // Default fee
    payment_id: escrowAccount
  };

  try {
    const result = await tariRpc('transfer', transferParams);
    const txId = result.tx_id || `tx_${Date.now()}`;
    
    escrowLocks.set(userId, {
      amount,
      txId,
      escrowAccount,
      lockedAt: new Date().toISOString(),
      status: 'locked'
    });

    console.log(`✅ Locked ${amount} MYZ for user ${userId} | TX: ${txId}`);
    return txId;
  } catch (err) {
    console.error(`❌ Failed to lock MYZ for user ${userId}: ${err.message}`);
    throw err;
  }
}

async function releaseMYZ(userId, amount) {
  console.log(`💰 Releasing ${amount} MYZ for user ${userId}...`);
  const lock = escrowLocks.get(userId);
  
  const result = await tariRpc('transfer', {
    destinations: [{
      address: userId, // Release back to user/robot
      amount: amount * 1e6
    }],
    fee: 100
  });

  if (lock) {
    lock.status = 'released';
    lock.releasedAt = new Date().toISOString();
  }

  const txId = result.tx_id || `tx_release_${Date.now()}`;
  console.log(`✅ Released ${amount} MYZ to ${userId} | TX: ${txId}`);
  return txId;
}

async function refundMYZ(userId, amount) {
  console.log(`↩️ Refunding ${amount} MYZ to user ${userId}...`);
  const lock = escrowLocks.get(userId);
  
  const result = await tariRpc('transfer', {
    destinations: [{
      address: userId,
      amount: amount * 1e6
    }],
    fee: 100
  });

  if (lock) {
    lock.status = 'refunded';
    lock.refundedAt = new Date().toISOString();
  }

  const txId = result.tx_id || `tx_refund_${Date.now()}`;
  console.log(`✅ Refunded ${amount} MYZ to ${userId} | TX: ${txId}`);
  return txId;
}

async function getEscrowStatus(userId) {
  const lock = escrowLocks.get(userId);
  if (!lock) return null;
  
  try {
    const balance = await getBalance();
    return { ...lock, platformBalance: balance };
  } catch {
    return lock;
  }
}

module.exports = { lockMYZ, releaseMYZ, refundMYZ, getEscrowStatus, getBalance };
