// tests/escrow-gateway.test.js
// Node built-in test runner (node --test tests/*.test.js)
const test = require('node:test');
const assert = require('node:assert/strict');
const { EscrowGateway, ORDER_STATES } = require('../services/escrowGateway');

function makeGateway() {
  const calls = { lock: 0, release: 0, refund: 0, reviews: 0 };
  const wallet = {
    async lockXMR() { calls.lock++; return 'lockTx'; },
    async releaseXMR() { calls.release++; return 'releaseTx'; },
    async refundXMR() { calls.refund++; return 'refundTx'; },
  };
  const aiAgent = {
    async review() { calls.reviews++; return { approved: true, risk: 'low' }; },
  };
  const gw = new EscrowGateway({ wallet, aiAgent });
  return { gw, calls };
}

test('createOrder returns pending state with required fields', async () => {
  const { gw } = makeGateway();
  const o = await gw.createOrder({ buyer: 'alice', seller: 'bob', amountXMR: 0.5, multisig: { requiredSignatures: 2, addresses: ['a', 'b', 'c'] } });
  assert.equal(o.state, 'pending');
  assert.equal(o.buyer, 'alice');
  assert.equal(o.seller, 'bob');
  assert.equal(o.amountXMR, 0.5);
  assert.equal(o.multisig.requiredSignatures, 2);
  assert.ok(o.orderId);
  assert.equal(o.history.length, 1);
});

test('fund locks XMR and runs AI review -> funded', async () => {
  const { gw, calls } = makeGateway();
  const o = await gw.createOrder({ buyer: 'alice', seller: 'bob', amountXMR: 1 });
  const f = await gw.fund(o.orderId, { by: 'alice' });
  assert.equal(f.state, 'funded');
  assert.equal(f.fundingTx, 'lockTx');
  assert.ok(f.aiReview);
  assert.equal(calls.lock, 1);
  assert.equal(calls.reviews, 1);
});

test('complete without enough multisig signatures throws', async () => {
  const { gw } = makeGateway();
  const o = await gw.createOrder({ buyer: 'alice', seller: 'bob', amountXMR: 1, multisig: { requiredSignatures: 2 } });
  await gw.fund(o.orderId, {});
  await assert.rejects(() => gw.complete(o.orderId, {}), /requires 2 signatures/);
});

test('full happy path: create -> fund -> sign x2 -> complete', async () => {
  const { gw, calls } = makeGateway();
  const o = await gw.createOrder({ buyer: 'alice', seller: 'bob', amountXMR: 1, multisig: { requiredSignatures: 2, addresses: ['k1', 'k2', 'k3'] } });
  await gw.fund(o.orderId, {});
  await gw.sign(o.orderId, { signer: 'k1', signature: 's1' });
  await gw.sign(o.orderId, { signer: 'k2', signature: 's2' });
  const c = await gw.complete(o.orderId, { proof: 'delivered' });
  assert.equal(c.state, 'completed');
  assert.equal(c.releaseTx, 'releaseTx');
  assert.equal(c.completionProof, 'delivered');
  assert.equal(c.signatures.length, 2);
  assert.equal(calls.release, 1);
});

test('dispute then refund path', async () => {
  const { gw, calls } = makeGateway();
  const o = await gw.createOrder({ buyer: 'alice', seller: 'bob', amountXMR: 1 });
  await gw.fund(o.orderId, {});
  const d = await gw.dispute(o.orderId, { reason: 'late delivery' });
  assert.equal(d.state, 'disputed');
  assert.equal(d.dispute.reason, 'late delivery');
  const r = await gw.refund(o.orderId, { reason: 'resolved' });
  assert.equal(r.state, 'refunded');
  assert.equal(r.refundTx, 'refundTx');
  assert.equal(calls.refund, 1);
});

test('invalid transition rejected (pending -> completed)', async () => {
  const { gw } = makeGateway();
  const o = await gw.createOrder({ buyer: 'alice', seller: 'bob', amountXMR: 1 });
  await assert.rejects(() => gw.complete(o.orderId, {}), /invalid transition/);
});

test('listForUser returns both sides of a trade', async () => {
  const { gw } = makeGateway();
  await gw.createOrder({ buyer: 'alice', seller: 'bob', amountXMR: 1 });
  await gw.createOrder({ buyer: 'carol', seller: 'alice', amountXMR: 2 });
  const list = await gw.listForUser('alice');
  assert.equal(list.length, 2);
});

test('missing seller or non-positive amount throws', async () => {
  const { gw } = makeGateway();
  await assert.rejects(() => gw.createOrder({ buyer: 'alice' }), /seller/);
  await assert.rejects(() => gw.createOrder({ buyer: 'alice', seller: 'bob', amountXMR: -1 }), /positive/);
});

test('getOrder on unknown id throws not found', async () => {
  const { gw } = makeGateway();
  await assert.rejects(() => gw.getOrder('nope'), /not found/);
});
