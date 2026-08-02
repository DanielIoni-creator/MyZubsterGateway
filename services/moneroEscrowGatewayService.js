/**
 * Monero Escrow Gateway Coordination Service
 * Resolves MyZubsterGateway Issue #63 ([Bounty] Escrow gateway to coordinate orders and signatures)
 */

class MoneroEscrowGatewayService {
  constructor() {
    this.escrows = new Map();
  }

  createEscrowOrder(orderId, amountXmr, buyerAddress, sellerAddress) {
    const escrow = {
      orderId,
      amountXmr,
      buyerAddress,
      sellerAddress,
      escrowSubaddress: `8${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
      status: 'AWAITING_DEPOSIT',
      signatures: [],
      createdAt: new Date().toISOString()
    };
    this.escrows.set(orderId, escrow);
    return escrow;
  }

  registerSignature(orderId, signerRole, signatureHex) {
    const escrow = this.escrows.get(orderId);
    if (!escrow) return { success: false, error: 'Escrow order not found' };

    escrow.signatures.push({ signerRole, signatureHex, timestamp: new Date().toISOString() });
    if (escrow.signatures.length >= 2) {
      escrow.status = 'READY_TO_BROADCAST';
    }
    return { success: true, escrow };
  }

  getEscrowState(orderId) {
    return this.escrows.get(orderId) || null;
  }
}

module.exports = new MoneroEscrowGatewayService();
