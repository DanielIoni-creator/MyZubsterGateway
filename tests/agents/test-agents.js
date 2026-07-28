// tests/agents/test-agents.js
const { Orchestrator } = require('../../src/agents/orchestrator');
const { InvestorAgent } = require('../../src/agents/investor-agent');
const { LegalAgent } = require('../../src/agents/legal-agent');
const { TechnicalAgent } = require('../../src/agents/technical-agent');

async function testAgents() {
  console.log('🧪 Testing Multi-Agent System...\n');

  const orchestrator = new Orchestrator();
  orchestrator.registerAgent('Investor Agent', new InvestorAgent());
  orchestrator.registerAgent('Legal Agent', new LegalAgent());
  orchestrator.registerAgent('Technical Agent', new TechnicalAgent());

  // Test Investor Agent
  console.log('📋 Testing Investor Agent...');
  const investorResult = await orchestrator.executeTask({
    type: 'investor',
    data: {
      action: 'onboard',
      email: 'test@example.com',
      name: 'Test User',
      netWorth: 2000000,
      documents: []
    },
    context: { source: 'test' }
  });
  console.log('Result:', investorResult.success ? '✅' : '❌', investorResult);

  // Test Legal Agent
  console.log('\n📋 Testing Legal Agent...');
  const legalResult = await orchestrator.executeTask({
    type: 'legal',
    data: {
      action: 'review-token',
      tokenData: {
        symbol: 'TST',
        name: 'Test Token',
        minInvestment: 10000,
        totalRaised: 100000,
        documents: [{ name: 'doc1.pdf', type: 'legal', content: 'test content' }]
      },
      jurisdiction: 'singapore'
    },
    context: { source: 'test' }
  });
  console.log('Result:', legalResult.success ? '✅' : '❌', legalResult);

  // Test Technical Agent
  console.log('\n📋 Testing Technical Agent...');
  const techResult = await orchestrator.executeTask({
    type: 'technical',
    data: {
      action: 'deploy-token',
      tokenConfig: {
        symbol: 'TST2',
        name: 'Test Token 2',
        supply: 10000,
        price: 100
      }
    },
    context: { source: 'test' }
  });
  console.log('Result:', techResult.success ? '✅' : '❌', techResult);

  // Get status
  console.log('\n📊 System Status:');
  const status = await orchestrator.getStatus();
  console.log(JSON.stringify(status, null, 2));

  console.log('\n✅ Tests completed!');
}

testAgents().catch(console.error);
