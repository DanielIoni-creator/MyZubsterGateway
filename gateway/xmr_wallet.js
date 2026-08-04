// gateway/xmr_wallet.js – Gestione XMR su Monero wallet RPC (BOUNTY B5)
const axios = require('axios');

const MONERO_RPC_URL = process.env.MONERO_RPC_URL || 'http://localhost:18082/json_rpc';
const MONERO_WALLET_RPC = process.env.MONERO_WALLET_RPC || 'http://localhost:18083/json_rpc';
const ESCROW_MAIN_ADDRESS = process.env.MONERO_ESCROW_ADDRESS || 'xmr_escrow_platform';
const escrowLocks = new Map();

async function moneroRpc(url, method, params = {}) {
  try {
    const response = await axios.post(url, {
      jsonrpc: '2.0',
      id: Date.now().toString(),
      method,
      params
    }, { timeout: 30000 });
    if (response.data.error) {
      throw new Error(`Monero RPC error: ${response.data.error.message}`);
    }
    return response.data.result;
  } catch (err) {
    console.error(`❌ Monero RPC call failed (${method}): ${err.message}`);
    throw err;
  }
}

async function getBalance() {
  const result = await moneroRpc(MONERO_WALLET_RPC, 'get_balance');
  return {
    balance: result.balance / 1e12,  // Convert from atomic units
    unlocked_balance: result.unlocked_balance / 1e12
  };
}

async function createSubAccount(label) {
  const result = await moneroRpc(MONERO_WALLET_RPC, 'create_account', {
    label: `escrow_${label}`
  });
  return {
    account_index: result.account_index,
    address: result.address
  };
}

async function lockXMR(userId, amount) {
  console.log(`🔒 Locking ${amount} XMR for user ${userId}...`);
  
  // Create escrow sub-account
  let escrowAccount;
  try {
    escrowAccount = await createSubAccount(`${userId}_${Date.now()}`);
  } catch {
    escrowAccount = {
      account_index: 0,
      address: ESCROW_MAIN_ADDRESS
    };
  }
  
  // Transfer to escrow
  const transferParams = {
    destinations: [{
      amount: Math.floor(amount * 1e12), // Convert to atomic units
      address: escrowAccount.address || ESCROW_MAIN_ADDRESS
    }],
    priority: 0,
    ring_size: 16
  };

  try {
    const result = await moneroRpc(MONERO_WALLET_RPC, 'transfer', transferParams);
    const txId = result.tx_hash || `xmr_tx_${Date.now()}`;
    
    escrowLocks.set(userId, {
      amount,
      txId,
      escrowAddress: escrowAccount.address || ESCROW_MAIN_ADDRESS,
      escrowAccountIndex: escrowAccount.account_index,
      lockedAt: new Date().toISOString(),
      status: 'locked'
    });

    console.log(`✅ Locked ${amount} XMR for user ${userId} | TX: ${txId}`);
    return txId;
  } catch (err) {
    console.error(`❌ Failed to lock XMR for user ${userId}: ${err.message}`);
    throw err;
  }
}

async function releaseXMR(userId, amount) {
  console.log(`💰 Releasing ${amount} XMR for user ${userId}...`);
  const lock = escrowLocks.get(userId);
  const destAddress = lock ? lock.escrowAddress : ESCROW_MAIN_ADDRESS;
  
  const result = await moneroRpc(MONERO_WALLET_RPC, 'transfer', {
    destinations: [{
      amount: Math.floor(amount * 1e12),
      address: destAddress
    }],
    priority: 0,
    ring_size: 16
  });

  if (lock) {
    lock.status = 'released';
    lock.releasedAt = new Date().toISOString();
  }

  const txId = result.tx_hash || `xmr_release_${Date.now()}`;
  console.log(`✅ Released ${amount} XMR to ${userId} | TX: ${txId}`);
  return txId;
}

async function refundXMR(userId, amount) {
  console.log(`↩️ Refunding ${amount} XMR to user ${userId}...`);
  const lock = escrowLocks.get(userId);
  
  const result = await moneroRpc(MONERO_WALLET_RPC, 'transfer', {
    destinations: [{
      amount: Math.floor(amount * 1e12),
      address: userId // Refund back to user
    }],
    priority: 0,
    ring_size: 16
  });

  if (lock) {
    lock.status = 'refunded';
    lock.refundedAt = new Date().toISOString();
  }

  const txId = result.tx_hash || `xmr_refund_${Date.now()}`;
  console.log(`✅ Refunded ${amount} XMR to ${userId} | TX: ${txId}`);
  return txId;
}

async function getEscrowStatus(userId) {
  const lock = escrowLocks.get(userId);
  if (!lock) return null;
  try {
    const balance = await getBalance();
    return { ...lock, walletBalance: balance };
  } catch {
    return lock;
  }
}

module.exports = { lockXMR, releaseXMR, refundXMR, getEscrowStatus, getBalance, createSubAccount };
