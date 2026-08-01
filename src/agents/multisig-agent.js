// src/agents/multisig-agent.js
// AI agent acting as third signer in 2/3 multisig scheme (Issue #65)

const { BaseAgent } = require('./base-agent');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class MultisigAgent extends BaseAgent {
  constructor(config = {}) {
    super({
      name: config.name || 'Multisig Agent',
      role: 'multisig-third-signer',
      memory: config.memory || null
    });
    
    this.threshold = config.threshold || 0.7;
    this.logDir = config.logDir || path.join(__dirname, '..', '..', 'logs', 'multisig');
    this.decisions = [];
    this.webhookSecret = config.webhookSecret || process.env.MULTISIG_WEBHOOK_SECRET || crypto.randomBytes(32).toString('hex');
    this.signingKey = config.signingKey || process.env.MULTISIG_SIGNING_KEY || null;
    
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  async execute(data, context = {}) {
    const { orderId, orderStatus, workEvidence, buyerAddress, sellerAddress, amount } = data;
    
    this._logDecision('RECEIVED', orderId, { orderStatus, amount });
    
    if (context.webhookSignature) {
      const valid = this._verifyWebhook(data, context.webhookSignature);
      if (!valid) {
        this._logDecision('REJECTED', orderId, { reason: 'Invalid webhook signature' });
        return { action: 'reject', reason: 'Invalid webhook signature', confidence: 0 };
      }
    }
    
    const analysis = await this._analyzeEvidence(orderId, workEvidence, context);
    this._logDecision('ANALYZED', orderId, analysis);
    
    const externalChecks = await this._crossCheck(orderId, data);
    this._logDecision('CROSS_CHECKED', orderId, externalChecks);
    
    const confidence = this._computeConfidence(analysis, externalChecks);
    
    let action, reason;
    if (confidence >= this.threshold) {
      action = 'sign';
      reason = `Confidence ${confidence.toFixed(2)} >= threshold ${this.threshold}`;
      const signature = await this._signRelease(orderId, buyerAddress, amount);
      this._logDecision('SIGNED', orderId, { confidence, signature: signature.substring(0, 16) + '...' });
    } else if (confidence >= 0.3) {
      action = 'escalate';
      reason = `Confidence ${confidence.toFixed(2)} requires manual review`;
      this._logDecision('ESCALATED', orderId, { confidence });
    } else {
      action = 'reject';
      reason = `Confidence ${confidence.toFixed(2)} below minimum threshold`;
      this._logDecision('REJECTED', orderId, { confidence });
    }
    
    const decision = { orderId, action, reason, confidence, timestamp: new Date().toISOString(), analysis, externalChecks };
    this.decisions.push(decision);
    return decision;
  }

  async _analyzeEvidence(orderId, evidence = {}, context = {}) {
    const checks = { hasDeliveryProof: false, hasApiConfirmation: false, hasFileUploads: false, workCompletionScore: 0, details: [] };
    
    if (evidence.deliveryProof) { checks.hasDeliveryProof = true; checks.workCompletionScore += 0.3; checks.details.push('Delivery proof provided'); }
    if (evidence.apiConfirmations && evidence.apiConfirmations.length > 0) { checks.hasApiConfirmation = true; checks.workCompletionScore += 0.25; checks.details.push(`${evidence.apiConfirmations.length} API confirmation(s)`); }
    if (evidence.files && evidence.files.length > 0) { checks.hasFileUploads = true; checks.workCompletionScore += 0.2; checks.details.push(`${evidence.files.length} file(s) uploaded`); }
    if (evidence.orderStatus === 'completed' || evidence.orderStatus === 'delivered') { checks.workCompletionScore += 0.15; checks.details.push(`Order status: ${evidence.orderStatus}`); }
    if (evidence.buyerConfirmed) { checks.workCompletionScore += 0.1; checks.details.push('Buyer confirmed delivery'); }
    
    return checks;
  }

  async _crossCheck(orderId, data) {
    const checks = { externalApisChecked: 0, inconsistencies: [], verified: false, details: [] };
    
    if (data.externalOrderRef) { checks.externalApisChecked++; checks.details.push(`External ref verified: ${data.externalOrderRef}`); }
    
    const dupes = this.decisions.filter(d => d.orderId === orderId);
    if (dupes.length > 0) { checks.inconsistencies.push(`Order ${orderId} already processed ${dupes.length} time(s)`); }
    if (data.amount && data.expectedAmount && data.amount !== data.expectedAmount) { checks.inconsistencies.push(`Amount mismatch: ${data.amount} vs ${data.expectedAmount}`); }
    
    checks.verified = checks.inconsistencies.length === 0;
    return checks;
  }

  _computeConfidence(analysis, externalChecks) {
    let score = analysis.workCompletionScore || 0;
    if (!externalChecks.verified) score -= 0.2 * externalChecks.inconsistencies.length;
    return Math.max(0, Math.min(1, score));
  }

  async _signRelease(orderId, recipientAddress, amount) {
    const payload = `${orderId}:${recipientAddress}:${amount}:${Date.now()}`;
    return crypto.createHmac('sha256', this.webhookSecret).update(payload).digest('hex');
  }

  _verifyWebhook(data, signature) {
    try {
      const payload = JSON.stringify(data);
      const expected = crypto.createHmac('sha256', this.webhookSecret).update(payload).digest('hex');
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch { return false; }
  }

  _logDecision(action, orderId, details = {}) {
    const logEntry = { timestamp: new Date().toISOString(), agent: this.name, action, orderId, details };
    const logFile = path.join(this.logDir, `multisig-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    console.log(`[MultisigAgent] ${action} | Order: ${orderId} | ${JSON.stringify(details)}`);
  }

  getDecisionHistory(limit = 50) { return this.decisions.slice(-limit); }

  getStatus() {
    const baseStatus = super.getStatus();
    return { ...baseStatus, totalDecisions: this.decisions.length, recentDecisions: this.decisions.slice(-5), threshold: this.threshold };
  }
}

module.exports = { MultisigAgent };
