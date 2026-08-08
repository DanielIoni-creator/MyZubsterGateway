const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { Gl1BridgeService } = require('../services/gl1BridgeService');
const { Gl1Simulator, MyzLedgerSimulator } = require('../services/gl1Simulator');

const clock = () => new Date('2026-08-06T12:00:00.000Z');
function fixture(options = {}) {
  const gl1 = new Gl1Simulator({ clock, ...options.gl1 });
  const myzLedger = new MyzLedgerSimulator(options.myz);
  return { service: new Gl1BridgeService({ gl1, myzLedger, clock }), gl1, myzLedger };
}

async function quote(service, direction = 'MYZ_TO_GL1') {
  return service.quote({ direction, amount: '100', gl1Asset: 'GL1-SGD' });
}

describe('GL1 bridge integration', () => {
  it('returns an expiring MYZ/GL1 conversion quote', async () => {
    const { service } = fixture();
    const result = await quote(service);
    assert.equal(result.sourceAsset, 'MYZ');
    assert.equal(result.targetAmount, '125');
  });

  it('locks MYZ and issues the GL1 destination asset atomically', async () => {
    const { service, myzLedger } = fixture();
    const result = await service.createTransfer({ quote: await quote(service), sender: 'myz-a', beneficiary: 'gl1-b', idempotencyKey: 'order-1' });
    assert.equal(result.state, 'COMPLETED');
    assert.equal(myzLedger.locks.size, 1);
    assert.deepEqual(result.audit.map((event) => event.state), ['CREATED', 'SOURCE_LOCKED', 'DESTINATION_ISSUED', 'COMPLETED']);
  });

  it('supports GL1 to MYZ transfers', async () => {
    const { service, gl1 } = fixture();
    const result = await service.createTransfer({ quote: await quote(service, 'GL1_TO_MYZ'), sender: 'gl1-a', beneficiary: 'myz-b', idempotencyKey: 'order-2' });
    assert.equal(result.state, 'COMPLETED');
    assert.equal(gl1.locks.size, 1);
  });

  it('unlocks source funds when destination issuance fails', async () => {
    const { service, myzLedger } = fixture({ gl1: { failMint: true } });
    await assert.rejects(service.createTransfer({ quote: await quote(service), sender: 'myz-a', beneficiary: 'gl1-b', idempotencyKey: 'order-3' }), /mint failure/);
    assert.equal(myzLedger.locks.size, 0);
    assert.equal((await service.store.list())[0].state, 'REFUNDED');
  });

  it('uses idempotency keys to prevent duplicate cross-border transfers', async () => {
    const { service } = fixture();
    const request = { quote: await quote(service), sender: 'myz-a', beneficiary: 'gl1-b', idempotencyKey: 'same-order' };
    const first = await service.createTransfer(request);
    const second = await service.createTransfer(request);
    assert.equal(first.id, second.id);
    assert.equal((await service.store.list()).length, 1);
  });
});
