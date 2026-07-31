/**
 * AI Multisig Agent — Third Signer Module
 * Bounty #65: https://github.com/MyZubster-Ecosystem/MyZubsterGateway/issues/65
 */

const crypto = require('crypto');
const EventEmitter = require('events');

class AISignerAgent extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      riskThreshold: config.riskThreshold || 0.7,
      minConfidence: config.minConfidence || 0.85,
      maxOrderValue: config.maxOrderValue || Infinity,
      blacklistedAddresses: new Set(config.blacklistedAddresses || []),
      ...config
    };
    this.decisionLog = [];
    this.stats = { totalOrders: 0, approvedOrders: 0, rejectedOrders: 0, averageConfidence: 0 };
  }

  async analyseOrder(order, context = {}) {
    this.stats.totalOrders++;
    const signals = await this._gatherSignals(order, context);
    const risk = this._calculateRisk(signals);
    const confidence = 1 - risk;
    
    const decision = {
      approved: confidence >= this.config.minConfidence && risk <= this.config.riskThreshold,
      confidence: Math.round(confidence * 100) / 100,
      risk: Math.round(risk * 100) / 100,
      reason: this._generateReason(signals, risk),
      timestamp: new Date().toISOString(),
      orderId: order.id || order.orderId,
      signals: Object.keys(signals).filter(k => signals[k] === true)
    };

    if (decision.approved) {
      this.stats.approvedOrders++;
      decision.signature = this._generateSignature(order);
    } else {
      this.stats.rejectedOrders++;
    }

    this.decisionLog.push(decision);
    this.emit('decision', decision);
    return decision;
  }

  async _gatherSignals(order, context) {
    const signals = {};
    const value = parseFloat(order.amount || order.value || 0);
    signals.excessiveValue = value > this.config.maxOrderValue;
    signals.reasonableValue = !signals.excessiveValue;
    const buyerAddr = order.buyerAddress || order.buyer || '';
    const sellerAddr = order.sellerAddress || order.seller || '';
    signals.blacklistedBuyer = this.config.blacklistedAddresses.has(buyerAddr);
    signals.blacklistedSeller = this.config.blacklistedAddresses.has(sellerAddr);
    signals.hasRequiredFields = !!(order.id && order.amount && buyerAddr && sellerAddr);
    signals.hasDescription = !!(order.description && order.description.length > 10);
    const now = Date.now();
    const orderAge = order.createdAt ? (now - new Date(order.createdAt).getTime()) : 0;
    signals.rushedOrder = orderAge < 60000;
    if (context.marketData) {
      signals.marketVolatile = context.marketData.volatility > 0.3;
      signals.priceAnomaly = context.marketData.priceAnomaly === true;
    }
    if (context.userHistory) {
      signals.newUser = context.userHistory.totalOrders < 3;
      signals.goodHistory = context.userHistory.disputeRate < 0.05;
      signals.disputedRecently = context.userHistory.recentDisputes > 0;
    }
    if (context.externalChecks) {
      signals.amlFlag = context.externalChecks.amlFlag === true;
      signals.sanctionsMatch = context.externalChecks.sanctionsMatch === true;
    }
    return signals;
  }

  _calculateRisk(signals) {
    const weights = {
      amlFlag: 0.5, sanctionsMatch: 0.5, blacklistedBuyer: 0.4, blacklistedSeller: 0.4,
      excessiveValue: 0.2, hasRequiredFields: -0.3, goodHistory: -0.2, disputedRecently: 0.25,
      marketVolatile: 0.15, priceAnomaly: 0.2, newUser: 0.1, rushedOrder: 0.05
    };
    let risk = 0.3;
    for (const [signal, weight] of Object.entries(weights)) {
      if (signals[signal]) risk += weight;
    }
    return Math.max(0, Math.min(1, risk));
  }

  _generateReason(signals, risk) {
    const reasons = [];
    if (signals.amlFlag) reasons.push('AML flag raised');
    if (signals.sanctionsMatch) reasons.push('Sanctions list match');
    if (signals.blacklistedBuyer) reasons.push('Buyer blacklisted');
    if (signals.blacklistedSeller) reasons.push('Seller blacklisted');
    if (signals.excessiveValue) reasons.push('Value exceeds threshold');
    if (!signals.hasRequiredFields) reasons.push('Missing required fields');
    if (signals.rushedOrder) reasons.push('Order too recent');
    if (signals.disputedRecently) reasons.push('Recent disputes');
    if (signals.newUser) reasons.push('New user');
    if (reasons.length === 0) reasons.push(risk < 0.3 ? 'Low risk' : 'Acceptable risk');
    return reasons.join('; ');
  }

  _generateSignature(order) {
    const payload = JSON.stringify({
      id: order.id, amount: order.amount, buyer: order.buyerAddress,
      seller: order.sellerAddress, timestamp: order.createdAt || new Date().toISOString()
    });
    return crypto.createHmac('sha256', this.config.secretKey || 'ai-signer-default').update(payload).digest('hex');
  }

  async handleWebhook(payload) {
    const { type, order, context } = payload;
    if (type === 'order.created' || (type === 'order.status_change' && order.status === 'pending_signature')) {
      return this.analyseOrder(order, context);
    }
    return { acknowledged: true };
  }

  getStats() {
    const total = this.stats.totalOrders || 1;
    return { ...this.stats, approvalRate: Math.round((this.stats.approvedOrders / total) * 100) / 100, totalDecisions: this.decisionLog.length };
  }

  exportLog(format = 'json') {
    if (format === 'csv') {
      const header = 'timestamp,orderId,approved,confidence,risk,reason';
      const rows = this.decisionLog.map(d => `${d.timestamp},${d.orderId},${d.approved},${d.confidence},${d.risk},"${d.reason}"`);
      return [header, ...rows].join('\n');
    }
    return JSON.stringify(this.decisionLog, null, 2);
  }
}

module.exports = { AISignerAgent };
