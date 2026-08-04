// xmr_wallet.js – Gestione XMR su Monero (stub per ora)
const escrowLocks = new Map();

async function lockXMR(userId, amount) {
  console.log(`🔒 Locked ${amount} XMR for user ${userId}`);
  const address = `xmr_escrow_${userId}_${Date.now()}`;
  escrowLocks.set(userId, { amount, address });
  return address;
}

async function releaseXMR(userId, amount) {
  console.log(`💰 Released ${amount} XMR to user ${userId}`);
  return `tx_release_xmr_${Date.now()}`;
}

async function refundXMR(userId, amount) {
  console.log(`↩️ Refunded ${amount} XMR to user ${userId}`);
  return `tx_refund_xmr_${Date.now()}`;
}

module.exports = { lockXMR, releaseXMR, refundXMR };
