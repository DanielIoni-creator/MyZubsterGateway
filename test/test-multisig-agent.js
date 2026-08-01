// test/test-multisig-agent.js — Tests for MultisigAgent (Issue #65)

const { MultisigAgent } = require('../src/agents/multisig-agent');

async function runTests() {
  let passed = 0, failed = 0;
  function assert(condition, name) {
    if (condition) { passed++; console.log(`  ✅ ${name}`); }
    else { failed++; console.log(`  ❌ ${name}`); }
  }

  console.log('🧪 Multisig Agent Tests\n');

  // Test 1: Agent creation
  console.log('Test 1: Agent creation');
  const agent = new MultisigAgent({ name: 'Test Agent', threshold: 0.5 });
  assert(agent.name === 'Test Agent', 'Agent name set');
  assert(agent.threshold === 0.5, 'Threshold set');
  assert(agent.role === 'multisig-third-signer', 'Role is multisig-third-signer');

  // Test 2: Sign decision (high confidence)
  console.log('\nTest 2: Sign decision (high confidence)');
  const r1 = await agent.process({
    orderId: 'order-001', orderStatus: 'completed',
    workEvidence: { deliveryProof: true, apiConfirmations: [{ source: 'api' }], files: [{ name: 'x.png' }], orderStatus: 'completed', buyerConfirmed: true },
    buyerAddress: 'buyer_1', amount: 100
  });
  const d1 = r1.result;
  assert(r1.success === true, 'Process succeeded');
  assert(d1.action === 'sign', `High-confidence => sign (got: ${d1.action})`);
  assert(d1.confidence >= 0.5, `Confidence >= 0.5: ${d1.confidence}`);

  // Test 3: Reject (no evidence)
  console.log('\nTest 3: Reject decision (no evidence)');
  const r2 = await agent.process({ orderId: 'order-002', orderStatus: 'pending', workEvidence: {}, buyerAddress: 'b2', amount: 50 });
  const d2 = r2.result;
  assert(d2.action === 'reject', `No evidence => reject (got: ${d2.action})`);

  // Test 4: Escalate (partial evidence)
  console.log('\nTest 4: Escalate decision');
  const r3 = await agent.process({ orderId: 'order-003', orderStatus: 'delivered', workEvidence: { deliveryProof: true }, buyerAddress: 'b3', amount: 75 });
  const d3 = r3.result;
  assert(d3.action === 'escalate', `Partial => escalate (got: ${d3.action})`);

  // Test 5: Amount mismatch
  console.log('\nTest 5: Amount mismatch detection');
  const r4 = await agent.process({ orderId: 'order-004', orderStatus: 'completed', workEvidence: { deliveryProof: true, buyerConfirmed: true }, buyerAddress: 'b4', amount: 200, expectedAmount: 100 });
  const d4 = r4.result;
  assert(d4.externalChecks.inconsistencies.length > 0, 'Detected amount mismatch');

  // Test 6: History
  console.log('\nTest 6: Decision history');
  assert(agent.getDecisionHistory().length >= 4, 'History tracks decisions');

  // Test 7: Status
  console.log('\nTest 7: Agent status');
  const status = agent.getStatus();
  assert(status.totalDecisions >= 4, `Status reports decisions: ${status.totalDecisions}`);
  assert(status.stats.tasksProcessed >= 4, `Status reports tasks: ${status.stats.tasksProcessed}`);

  // Test 8: Webhook
  console.log('\nTest 8: Webhook verification');
  const data = { orderId: 'test', amount: 10 };
  const crypto = require('crypto');
  const sig = crypto.createHmac('sha256', agent.webhookSecret).update(JSON.stringify(data)).digest('hex');
  assert(agent._verifyWebhook(data, sig) === true, 'Valid signature verified');

  console.log(`\n${'='.repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => { console.error('Error:', err); process.exit(1); });
