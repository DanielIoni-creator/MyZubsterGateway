// gateway/xmr_wallet.js – Gestione XMR (mock per test)
const escrowLocks = new Map();

async function lockXMR(userId, amount) {
  console.log(`🔒 [MOCK] Locked ${amount} XMR for user ${userId}`);
  const mockTx = `mock_xmr_tx_${Date.now()}`;
  escrowLocks.set(userId, { amount, txId: mockTx });
  return mockTx;
}

async function releaseXMR(userId, amount) {
  console.log(`💰 [MOCK] Released ${amount} XMR to user ${userId}`);
  return `mock_release_${Date.now()}`;
}

async function refundXMR(userId, amount) {
  console.log(`↩️ [MOCK] Refunded ${amount} XMR to user ${userId}`);
  return `mock_refund_${Date.now()}`;
}

module.exports = { lockXMR, releaseXMR, refundXMR };
