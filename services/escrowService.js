const EscrowOrder = require('../models/EscrowOrder');
const { v4: uuidv4 } = require('uuid');

class EscrowService {
  async createOrder({ buyer, seller, amount, currency='XMR', marketplaceOrderId=null, metadata={} }) {
    const order = new EscrowOrder({ orderId: uuidv4(), buyer, seller, amount, currency, marketplaceOrderId, metadata, status: 'pending' });
    await order.save();
    return order;
  }
  async markFunded(orderId, multisigAddress) {
    const order = await EscrowOrder.findOne({ orderId });
    if (!order) throw new Error('Order not found');
    if (order.status !== 'pending') throw new Error(`Cannot fund order in ${order.status} status`);
    order.status = 'funded'; order.multisigAddress = multisigAddress; order.fundedAt = new Date();
    await order.save(); return order;
  }
  async markCompleted(orderId) {
    const order = await EscrowOrder.findOne({ orderId });
    if (!order) throw new Error('Order not found');
    if (order.status !== 'funded') throw new Error(`Cannot complete order in ${order.status} status`);
    order.status = 'completed'; order.completedAt = new Date();
    await order.save(); return order;
  }
  async markDisputed(orderId, reason) {
    const order = await EscrowOrder.findOne({ orderId });
    if (!order) throw new Error('Order not found');
    if (!['funded','completed'].includes(order.status)) throw new Error(`Cannot dispute order in ${order.status} status`);
    order.status = 'disputed'; order.metadata.disputeReason = reason; order.metadata.disputedAt = new Date().toISOString();
    await order.save(); return order;
  }
  async refundOrder(orderId, reason) {
    const order = await EscrowOrder.findOne({ orderId });
    if (!order) throw new Error('Order not found');
    if (!['funded','disputed'].includes(order.status)) throw new Error(`Cannot refund order in ${order.status} status`);
    order.status = 'refunded'; order.metadata.refundReason = reason; order.metadata.refundedAt = new Date().toISOString();
    await order.save(); return order;
  }
  async getOrder(orderId) { return EscrowOrder.findOne({ orderId }); }
  async listOrders({ buyer, seller, status, limit=20, offset=0 }) {
    const query = {};
    if (buyer) query.buyer = buyer;
    if (seller) query.seller = seller;
    if (status) query.status = status;
    return EscrowOrder.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit);
  }
}
module.exports = new EscrowService();
