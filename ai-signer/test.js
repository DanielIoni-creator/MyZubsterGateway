const { AISignerAgent } = require('./index');
const assert = require('assert');

async function runTests() {
  console.log('=== AI Signer Agent Tests ===\n');
  let passed = 0, failed = 0;
  function check(name, condition, detail) {
    if (condition) { console.log('  PASS ' + name); passed++; }
    else { console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); failed++; }
  }

  const agent = new AISignerAgent({ secretKey: 'test-key', maxOrderValue: 100 });
  check('Agent created', agent instanceof AISignerAgent);

  const validOrder = { id: 'ord_001', amount: '50', buyerAddress: 'buyer1', sellerAddress: 'seller1', description: 'Test product', createdAt: new Date(Date.now() - 300000).toISOString() };
  const r1 = await agent.analyseOrder(validOrder, { userHistory: { totalOrders: 15, disputeRate: 0.02, recentDisputes: 0 }, marketData: { volatility: 0.1, priceAnomaly: false } });
  check('Valid order approved', r1.approved);
  check('Has signature', r1.signature && r1.signature.length === 64);

  const expensiveOrder = { id: 'ord_002', amount: '5000', buyerAddress: 'buyer2', sellerAddress: 'seller2', description: 'Expensive', createdAt: new Date().toISOString() };
  const r2 = await agent.analyseOrder(expensiveOrder, { userHistory: { totalOrders: 2, disputeRate: 0.1, recentDisputes: 0 }, marketData: { volatility: 0.05, priceAnomaly: false } });
  check('Expensive order rejected', !r2.approved);

  const blAgent = new AISignerAgent({ blacklistedAddresses: ['scammer'] });
  const r3 = await blAgent.analyseOrder({ id: 'ord_003', amount: '10', buyerAddress: 'scammer', sellerAddress: 'seller3', description: 'Bad', createdAt: new Date(Date.now() - 600000).toISOString() });
  check('Blacklisted rejected', !r3.approved);

  const wh = await agent.handleWebhook({ type: 'order.created', order: validOrder, context: { userHistory: { totalOrders: 20, disputeRate: 0.01, recentDisputes: 0 }, marketData: { volatility: 0.08, priceAnomaly: false } } });
  check('Webhook returns decision', wh.approved !== undefined);

  const stats = agent.getStats();
  check('Stats include approvalRate', typeof stats.approvalRate === 'number');

  const jsonLog = agent.exportLog('json');
  const csvLog = agent.exportLog('csv');
  check('JSON log valid', jsonLog.length > 0);
  check('CSV log has header', csvLog.startsWith('timestamp'));
  check('CSV log has data rows', csvLog.split('\n').length > 1);

  let eventFired = false;
  agent.on('decision', () => { eventFired = true; });
  await agent.analyseOrder(validOrder, { userHistory: { totalOrders: 10, disputeRate: 0.03, recentDisputes: 0 }, marketData: { volatility: 0.1, priceAnomaly: false } });
  check('Event emitted', eventFired);

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed > 0 ? 1 : 0);
}
runTests().catch(err => { console.error(err); process.exit(1); });
