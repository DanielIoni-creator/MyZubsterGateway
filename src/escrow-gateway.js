/**
 * Escrow Gateway — coordinates escrow flow between wallet, AI, and marketplace.
 * Closes #63
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ORDER_STATES = {
  PENDING: 'pending',
  FUNDED: 'funded',
  COMPLETED: 'completed',
  DISPUTED: 'disputed',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled',
};

class EscrowGateway {
  constructor(options = {}) {
    this.storePath = options.storePath || path.join(__dirname, '..', 'data', 'escrow-orders.json');
    this.orders = this._load();
  }

  _load() {
    try {
      const dir = path.dirname(this.storePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      if (fs.existsSync(this.storePath)) {
        return JSON.parse(fs.readFileSync(this.storePath, 'utf-8'));
      }
    } catch (e) {}
    return {};
  }

  _save() {
    try {
      const dir = path.dirname(this.storePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.storePath, JSON.stringify(this.orders, null, 2));
    } catch (e) {
      console.error('EscrowGateway save failed:', e.message);
    }
  }

  createOrder({ buyerId, sellerId, amount, itemId }) {
    if (!buyerId || !sellerId || !amount || amount <= 0) {
      throw new Error('Invalid: buyerId, sellerId, and positive amount required');
    }
    const orderId = crypto.randomUUID();
    this.orders[orderId] = {
      orderId, buyerId, sellerId, amount, itemId: itemId || null,
      state: ORDER_STATES.PENDING,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      multisigAddress: null, txId: null, aiVerification: null, disputeReason: null,
      history: [{ state: ORDER_STATES.PENDING, timestamp: new Date().toISOString(), note: 'Created' }],
    };
    this._save();
    return { ...this.orders[orderId] };
  }

  fundOrder(orderId, txId, multisigAddress) {
    const o = this._get(orderId);
    if (o.state !== ORDER_STATES.PENDING) throw new Error(`Cannot fund order in state: ${o.state}`);
    o.state = ORDER_STATES.FUNDED;
    o.txId = txId;
    o.multisigAddress = multisigAddress;
    o.updatedAt = new Date().toISOString();
    o.history.push({ state: ORDER_STATES.FUNDED, timestamp: o.updatedAt, txId });
    this._save();
    return { ...o };
  }

  completeOrder(orderId, aiVerification = null) {
    const o = this._get(orderId);
    if (o.state !== ORDER_STATES.FUNDED) throw new Error(`Cannot complete order in state: ${o.state}`);
    o.state = ORDER_STATES.COMPLETED;
    o.aiVerification = aiVerification;
    o.updatedAt = new Date().toISOString();
    o.history.push({ state: ORDER_STATES.COMPLETED, timestamp: o.updatedAt });
    this._save();
    return { ...o };
  }

  raiseDispute(orderId, reason, raisedBy) {
    const o = this._get(orderId);
    if (o.state !== ORDER_STATES.FUNDED && o.state !== ORDER_STATES.COMPLETED) {
      throw new Error(`Cannot dispute order in state: ${o.state}`);
    }
    o.state = ORDER_STATES.DISPUTED;
    o.disputeReason = reason;
    o.raisedBy = raisedBy;
    o.updatedAt = new Date().toISOString();
    o.history.push({ state: ORDER_STATES.DISPUTED, timestamp: o.updatedAt, reason, raisedBy });
    this._save();
    return { ...o };
  }

  resolveDispute(orderId, resolution, aiDecision = null) {
    const o = this._get(orderId);
    if (o.state !== ORDER_STATES.DISPUTED) throw new Error(`Cannot resolve dispute in state: ${o.state}`);
    o.state = resolution === 'refund' ? ORDER_STATES.REFUNDED : ORDER_STATES.COMPLETED;
    o.resolutionAiDecision = aiDecision;
    o.updatedAt = new Date().toISOString();
    o.history.push({ state: o.state, timestamp: o.updatedAt, resolution, aiDecision });
    this._save();
    return { ...o };
  }

  cancelOrder(orderId) {
    const o = this._get(orderId);
    if (o.state !== ORDER_STATES.PENDING) throw new Error(`Cannot cancel order in state: ${o.state}`);
    o.state = ORDER_STATES.CANCELLED;
    o.updatedAt = new Date().toISOString();
    o.history.push({ state: ORDER_STATES.CANCELLED, timestamp: o.updatedAt });
    this._save();
    return { ...o };
  }

  getOrder(orderId) { return { ...this._get(orderId) }; }

  listOrders(filter = {}) {
    let result = Object.values(this.orders);
    if (filter.buyerId) result = result.filter(o => o.buyerId === filter.buyerId);
    if (filter.sellerId) result = result.filter(o => o.sellerId === filter.sellerId);
    if (filter.state) result = result.filter(o => o.state === filter.state);
    return result.map(o => ({ ...o }));
  }

  _get(orderId) {
    if (!orderId || !this.orders[orderId]) throw new Error('Order not found: ' + orderId);
    return this.orders[orderId];
  }
}

module.exports = { EscrowGateway, ORDER_STATES };
