const escrowLocks = new Map();
async function lockMYZ(userId, amount) {
  console.log(`🔒 Locked ${amount} MYZ for user ${userId}`);
  escrowLocks.set(userId, { amount, txId: `tx_${Date.now()}` });
  return `tx_${Date.now()}`;
}
async function releaseMYZ(userId, amount) {
  console.log(`💰 Released ${amount} MYZ to user ${userId}`);
  return `tx_release_${Date.now()}`;
}
async function refundMYZ(userId, amount) {
  console.log(`↩️ Refunded ${amount} MYZ to user ${userId}`);
  return `tx_refund_${Date.now()}`;
}
module.exports = { lockMYZ, releaseMYZ, refundMYZ };
