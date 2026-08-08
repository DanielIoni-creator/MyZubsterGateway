// src/agents/legal-agent.js
const { BaseAgent } = require('./base-agent');
const { AgentMemory } = require('./memory');

class LegalAgent extends BaseAgent {
  constructor() {
    super({
      name: 'Legal Agent',
      role: 'Compliance & Documentation'
    });
    this.memory = new AgentMemory();
    this.complianceRules = this.loadComplianceRules();
  }

  loadComplianceRules() {
    return {
      singapore: {
        accreditedInvestor: { minNetWorth: 2000000, minIncome: 300000 },
        smallOffer: { maxAmount: 5000000, maxInvestors: 50 },
        prospectusExemption: true
      },
      hongKong: {
        professionalInvestor: { minPortfolio: 8000000 },
        minInvestment: 500000,
        smallOffer: { maxAmount: 5000000 }
      }
    };
  }

  async execute(data, context) {
    const { action, tokenData, jurisdiction, documents } = data;

    switch (action) {
      case 'review-token':
        return this.reviewToken(tokenData, jurisdiction, context);
      case 'check-compliance':
        return this.checkCompliance(tokenData, jurisdiction, context);
      case 'analyze-document':
        return this.analyzeDocument(documents, context);
      case 'get-requirements':
        return this.getRequirements(jurisdiction, context);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  async reviewToken(tokenData, jurisdiction, context) {
    const compliance = await this.checkCompliance(tokenData, jurisdiction, context);
    const docs = await this.analyzeDocument(tokenData.documents, context);

    const result = {
      compliant: compliance.status === 'compliant',
      issues: compliance.issues,
      recommendations: compliance.recommendations,
      documentStatus: docs.status,
      jurisdiction: jurisdiction || 'singapore'
    };

    // Store in memory
    await this.memory.storeLongTerm(
      `token-review:${tokenData.symbol || Date.now()}`,
      result,
      { type: 'legal-review', jurisdiction }
    );

    this.memory.addEvent({
      type: 'legal',
      action: 'review-token',
      symbol: tokenData.symbol,
      status: result.compliant ? 'passed' : 'needs-review'
    });

    return result;
  }

  async checkCompliance(tokenData, jurisdiction, context) {
    const rules = this.complianceRules[jurisdiction || 'singapore'];
    const issues = [];
    const recommendations = [];

    // Check accredited investor requirements
    if (tokenData.minInvestment < rules.minInvestment) {
      issues.push('Minimum investment below threshold');
      recommendations.push(`Increase minimum investment to S$${rules.minInvestment}`);
    }

    // Check small offer exemption
    if (tokenData.totalRaised > rules.smallOffer.maxAmount) {
      issues.push('Exceeds small offer exemption limit');
      recommendations.push(`Consider splitting into multiple offerings`);
    }

    // Check document completeness
    if (!tokenData.documents || tokenData.documents.length < 3) {
      issues.push('Insufficient legal documentation');
      recommendations.push('Provide: Title deed, Valuation report, SPV incorporation');
    }

    return {
      status: issues.length === 0 ? 'compliant' : 'needs-review',
      issues,
      recommendations
    };
  }

  async analyzeDocument(documents, context) {
    if (!documents || documents.length === 0) {
      return {
        status: 'missing',
        message: 'No documents provided for analysis'
      };
    }

    // Simulazione analisi documenti
    const analyzed = documents.map(doc => ({
      name: doc.name || 'Unnamed document',
      type: doc.type || 'unknown',
      status: 'processed',
      contentLength: doc.content?.length || 0
    }));

    this.memory.addShortTerm({
      type: 'document-analysis',
      count: documents.length,
      context
    });

    return {
      status: 'processed',
      documents: analyzed,
      summary: `${documents.length} documents analyzed`
    };
  }

  async getRequirements(jurisdiction, context) {
    const rules = this.complianceRules[jurisdiction || 'singapore'];
    return {
      jurisdiction: jurisdiction || 'singapore',
      requirements: rules,
      summary: this.summarizeRequirements(rules)
    };
  }

  summarizeRequirements(rules) {
    const parts = [];
    if (rules.accreditedInvestor) {
      parts.push(`Accredited investor: Net worth > S$${rules.accreditedInvestor.minNetWorth}`);
    }
    if (rules.minInvestment) {
      parts.push(`Minimum investment: S$${rules.minInvestment}`);
    }
    if (rules.smallOffer) {
      parts.push(`Small offer limit: S$${rules.smallOffer.maxAmount}`);
    }
    return parts.join('; ');
  }
}

module.exports = { LegalAgent };
