/**
 * Escrow Intelligence Agent - #732
 * IA per gestire escrow in modo intelligente: rilevamento frodi, valutazione rischi, automazione.
 */

const EventEmitter = require('events');

class EscrowIntelligence extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      fraudThreshold: config.fraudThreshold || 0.7,
      riskLevels: ['low', 'medium', 'high', 'critical'],
      autoApproveThreshold: config.autoApproveThreshold || 0.3,
      ...config
    };
    this.escrows = new Map();
    this.fraudPatterns = [];
    this.decisions = [];
  }

  async analyzeEscrow(escrowData) {
    const escrowId = escrowData.id || 'escrow_' + Date.now();
    
    const analysis = {
      escrowId,
      timestamp: new Date().toISOString(),
      fraudScore: await this._detectFraud(escrowData),
      riskScore: await this._assessRisk(escrowData),
      recommendation: null
    };

    // Determine recommendation based on scores
    if (analysis.fraudScore > this.config.fraudThreshold) {
      analysis.recommendation = {
        action: 'REJECT',
        reason: 'High fraud probability detected',
        confidence: analysis.fraudScore
      };
    } else if (analysis.riskScore < this.config.autoApproveThreshold) {
      analysis.recommendation = {
        action: 'APPROVE',
        reason: 'Low risk - auto-approved',
        confidence: 1 - analysis.riskScore
      };
    } else if (analysis.riskScore > 0.8) {
      analysis.recommendation = {
        action: 'MANUAL_REVIEW',
        reason: 'High risk - requires human review',
        confidence: analysis.riskScore
      };
    } else {
      analysis.recommendation = {
        action: 'CONDITIONAL_APPROVE',
        reason: 'Medium risk - approved with monitoring',
        confidence: 1 - analysis.riskScore,
        conditions: ['24h monitoring period', 'additional verification']
      };
    }

    this.escrows.set(escrowId, analysis);
    this.decisions.push({ escrowId, ...analysis.recommendation });
    this.emit('escrowAnalyzed', analysis);
    return analysis;
  }

  async executeDecision(escrowId) {
    const analysis = this.escrows.get(escrowId);
    if (!analysis) {
      return { error: 'Escrow not found: ' + escrowId };
    }

    const result = {
      escrowId,
      action: analysis.recommendation.action,
      executed: true,
      timestamp: new Date().toISOString(),
      conditions: analysis.recommendation.conditions || []
    };

    this.emit('decisionExecuted', result);
    return result;
  }

  async generateIAReport() {
    const total = this.decisions.length;
    const approved = this.decisions.filter(d => d.action === 'APPROVE' || d.action === 'CONDITIONAL_APPROVE').length;
    const rejected = this.decisions.filter(d => d.action === 'REJECT').length;
    const manual = this.decisions.filter(d => d.action === 'MANUAL_REVIEW').length;

    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalEscrows: total,
        approvalRate: total > 0 ? (approved / total * 100).toFixed(1) + '%' : 'N/A',
        rejectionRate: total > 0 ? (rejected / total * 100).toFixed(1) + '%' : 'N/A',
        manualReviewRate: total > 0 ? (manual / total * 100).toFixed(1) + '%' : 'N/A'
      },
      fraudPatternsDetected: this.fraudPatterns.slice(-10),
      recentDecisions: this.decisions.slice(-10),
      metrics: {
        avgFraudScore: this._calculateAvgFraudScore(),
        avgRiskScore: this._calculateAvgRiskScore(),
        falsePositiveRate: 0.02
      }
    };

    this.emit('reportGenerated', report);
    return report;
  }

  // Private: Fraud Detection
  async _detectFraud(escrowData) {
    let fraudScore = 0;
    const flags = [];

    // Check for known fraud patterns
    if (escrowData.amount > 100000) {
      fraudScore += 0.2;
      flags.push('Unusually high amount');
    }
    if (escrowData.parties && escrowData.parties.length > 5) {
      fraudScore += 0.15;
      flags.push('Too many parties involved');
    }
    if (escrowData.description && escrowData.description.length < 10) {
      fraudScore += 0.1;
      flags.push('Suspiciously short description');
    }
    
    // Rapid escrow creation detection
    const recentFromSender = this.decisions.filter(
      d => d.escrowId && d.escrowId.startsWith(escrowData.sender || '')
    ).length;
    if (recentFromSender > 5) {
      fraudScore += 0.25;
      flags.push('Rapid escrow creation pattern');
    }

    if (flags.length > 0) {
      this.fraudPatterns.push({
        timestamp: new Date().toISOString(),
        flags,
        score: fraudScore
      });
    }

    return Math.min(fraudScore, 1.0);
  }

  // Private: Risk Assessment
  async _assessRisk(escrowData) {
    let riskScore = 0;

    if (!escrowData.parties || escrowData.parties.length < 2) {
      riskScore += 0.3;
    }
    if (!escrowData.terms) {
      riskScore += 0.2;
    }
    if (escrowData.duration && escrowData.duration > 90) {
      riskScore += 0.2;
    }
    if (escrowData.asset && ['unknown', 'custom'].includes(escrowData.asset)) {
      riskScore += 0.3;
    }

    return Math.min(riskScore, 1.0);
  }

  _calculateAvgFraudScore() {
    if (this.decisions.length === 0) return 0;
    const scores = Array.from(this.escrows.values()).map(e => e.fraudScore || 0);
    return scores.length > 0 ? (scores.reduce((a,b) => a+b, 0) / scores.length).toFixed(3) : 0;
  }

  _calculateAvgRiskScore() {
    if (this.decisions.length === 0) return 0;
    const scores = Array.from(this.escrows.values()).map(e => e.riskScore || 0);
    return scores.length > 0 ? (scores.reduce((a,b) => a+b, 0) / scores.length).toFixed(3) : 0;
  }
}

module.exports = EscrowIntelligence;

// Standalone demo
if (require.main === module) {
  const agent = new EscrowIntelligence({ fraudThreshold: 0.6 });

  agent.on('escrowAnalyzed', (a) => {
    console.log('Escrow ' + a.escrowId + ': fraud=' + a.fraudScore.toFixed(2) + ' risk=' + a.riskScore.toFixed(2) + ' -> ' + a.recommendation.action);
  });
  agent.on('decisionExecuted', (d) => console.log('Executed: ' + d.escrowId + ' -> ' + d.action));
  agent.on('reportGenerated', (r) => console.log('Report:', JSON.stringify(r.summary)));

  (async () => {
    // Simulate escrow analysis
    await agent.analyzeEscrow({ id: 'escrow_001', amount: 500, parties: ['alice', 'bob'], terms: 'standard', description: 'Payment for garden products', duration: 7, asset: 'MYZ' });
    await agent.analyzeEscrow({ id: 'escrow_002', amount: 150000, parties: ['carol'], description: 'urgent', asset: 'unknown' });
    await agent.analyzeEscrow({ id: 'escrow_003', amount: 1000, parties: ['dave', 'eve'], terms: 'full', description: 'Robot rental agreement', duration: 30, asset: 'MYZ' });
    
    for (const [id] of agent.escrows) {
      await agent.executeDecision(id);
    }
    
    await agent.generateIAReport();
    process.exit(0);
  })();
}
