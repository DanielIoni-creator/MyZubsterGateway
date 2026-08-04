// src/agents/investor-agent.js
const { BaseAgent } = require('./base-agent');
const { AgentMemory } = require('./memory');

class InvestorAgent extends BaseAgent {
  constructor() {
    super({
      name: 'Investor Agent',
      role: 'Investor Onboarding & KYC'
    });
    this.memory = new AgentMemory();
    this.kycStatus = new Map();
  }

  async execute(data, context) {
    const { action, email, name, netWorth, documents } = data;

    switch (action) {
      case 'onboard':
        return this.onboardInvestor(email, name, netWorth, documents, context);
      case 'verify':
        return this.verifyInvestor(email, context);
      case 'portfolio':
        return this.getPortfolio(email, context);
      case 'history':
        return this.getHistory(email, context);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  async onboardInvestor(email, name, netWorth, documents, context) {
    // Check if investor exists
    const existing = await this.memory.retrieveLongTerm(`investor:${email}`);
    if (existing) {
      this.memory.addShortTerm({
        type: 'investor-onboard',
        action: 'returning',
        email,
        context
      });
      
      return {
        status: 'existing',
        message: 'Investor already onboarded',
        investor: existing.value,
        history: this.memory.getEvents('investor')
      };
    }

    // New investor - perform KYC
    const kycResult = await this.performKYC(name, netWorth, documents);

    // Store in memory
    const investorData = {
      email,
      name,
      netWorth,
      kycStatus: kycResult.status,
      onboardedAt: new Date().toISOString(),
      documents: documents || []
    };

    await this.memory.storeLongTerm(`investor:${email}`, investorData, {
      type: 'investor',
      status: kycResult.status
    });

    this.memory.addEvent({
      type: 'investor',
      action: 'onboard',
      email,
      status: kycResult.status
    });

    this.memory.addShortTerm({
      type: 'investor-onboard',
      action: 'new',
      email,
      status: kycResult.status,
      context
    });

    return {
      status: kycResult.status,
      message: kycResult.message,
      investorId: `inv_${Date.now()}`,
      nextSteps: kycResult.nextSteps || ['Complete verification']
    };
  }

  async performKYC(name, netWorth, documents) {
    // Simulazione KYC
    const status = netWorth >= 1000000 ? 'verified' : 'pending';
    return {
      status,
      message: status === 'verified' ? 'KYC approved' : 'KYC needs review',
      nextSteps: status === 'verified' ? ['Ready to invest'] : ['Submit additional documents']
    };
  }

  async verifyInvestor(email, context) {
    const investor = await this.memory.retrieveLongTerm(`investor:${email}`);
    if (!investor) {
      return {
        status: 'not-found',
        message: 'Investor not found'
      };
    }

    this.memory.addShortTerm({
      type: 'investor-verify',
      email,
      context
    });

    return {
      status: investor.value.kycStatus,
      investor: investor.value,
      history: this.memory.getEvents('investor', 5)
    };
  }

  async getPortfolio(email, context) {
    // Implementazione portfolio
    return {
      status: 'success',
      portfolio: {
        tokens: [],
        totalValue: 0,
        lastUpdated: new Date().toISOString()
      }
    };
  }

  async getHistory(email, context) {
    const history = this.memory.getEvents('investor', 20);
    return {
      status: 'success',
      history: history.filter(e => e.email === email || !e.email)
    };
  }
}

module.exports = { InvestorAgent };
