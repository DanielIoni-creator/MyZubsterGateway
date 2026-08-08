class AIPaymentsService {
  constructor() {
    this.patterns = {
      highValue: { min: 500, flag: 'manual_review_required', risk: 'high' },
      recurring: { detect: /subscription|monthly|annual/i, flag: 'recurring_detected' },
      newRecipient: { flag: 'new_recipient_verification', risk: 'medium' },
      velocity: { maxPerHour: 10, flag: 'velocity_limit_exceeded', risk: 'high' },
      geoAnomaly: { flag: 'geo_mismatch_detected', risk: 'high' }
    };
    
    this.transactionHistory = [];
    this.paymentDecisions = [];
  }

  analyzePayment(amount, currency, sender, recipient, metadata = {}) {
    const flags = [];
    const riskScore = this.calculateRisk(amount, sender, recipient, metadata, flags);
    
    const decision = {
      approved: riskScore < 0.4,
      requiresReview: riskScore >= 0.4 && riskScore < 0.7,
      rejected: riskScore >= 0.7,
      riskScore,
      flags,
      recommendation: riskScore < 0.3 ? 'auto_approve' : 
                     riskScore < 0.7 ? 'manual_review' : 'block'
    };
    
    this.paymentDecisions.push({
      id: `AI-${Date.now()}`,
      amount, currency, sender, recipient,
      ...decision,
      timestamp: new Date().toISOString()
    });
    
    return decision;
  }

  calculateRisk(amount, sender, recipient, metadata, flags) {
    let score = 0;
    
    // High value check
    if (amount >= this.patterns.highValue.min) {
      score += 0.3;
      flags.push(this.patterns.highValue.flag);
    }
    
    // Recurring pattern
    if (metadata.description && this.patterns.recurring.detect.test(metadata.description)) {
      score += 0.1;
      flags.push(this.patterns.recurring.flag);
    }
    
    // Velocity check
    const recentTxs = this.transactionHistory.filter(
      t => t.sender === sender && (Date.now() - new Date(t.timestamp).getTime()) < 3600000
    );
    if (recentTxs.length >= this.patterns.velocity.maxPerHour) {
      score += 0.4;
      flags.push(this.patterns.velocity.flag);
    }
    
    // New recipient check
    const knownRecipients = new Set(this.transactionHistory.map(t => t.recipient));
    if (recipient && !knownRecipients.has(recipient) && amount > 100) {
      score += 0.2;
      flags.push(this.patterns.newRecipient.flag);
    }
    
    return Math.min(score, 1.0);
  }

  getOptimalRoute(amount, currency) {
    const routes = {
      USD: [
        { method: 'ach', fee: 0, maxAmount: 25000, speed: '1-3 days' },
        { method: 'wire', fee: 15, maxAmount: 1000000, speed: 'same day' },
        { method: 'instant', fee: amount * 0.015, maxAmount: 10000, speed: 'instant' }
      ],
      EUR: [
        { method: 'sepa', fee: 0, maxAmount: 100000, speed: '1-2 days' },
        { method: 'sepa_instant', fee: 0.50, maxAmount: 100000, speed: 'instant' }
      ],
      GBP: [
        { method: 'fps', fee: 0, maxAmount: 1000000, speed: 'instant' },
        { method: 'bacs', fee: 0, maxAmount: 250000, speed: '3 days' }
      ]
    };
    
    const currencyRoutes = routes[currency] || routes.USD;
    
    return currencyRoutes.map(r => ({
      ...r,
      isOptimal: amount <= r.maxAmount,
      totalCost: r.fee + (r.method === 'instant' ? amount * 0.015 : 0)
    })).sort((a, b) => a.totalCost - b.totalCost);
  }

  getHistory() {
    return {
      decisions: this.paymentDecisions.slice(-50),
      total: this.paymentDecisions.length,
      approved: this.paymentDecisions.filter(d => d.approved).length,
      reviewed: this.paymentDecisions.filter(d => d.requiresReview).length,
      rejected: this.paymentDecisions.filter(d => d.rejected).length
    };
  }
}

module.exports = new AIPaymentsService();
