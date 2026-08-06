const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { ComplianceOracle, stableHash } = require('../services/complianceOracleService');

const APPROVED = '0x1111111111111111111111111111111111111111';
const BLOCKED = '0x2222222222222222222222222222222222222222';

function buildOracle(overrides = {}) {
  const publications = [];
  const oracle = new ComplianceOracle({
    clock: () => new Date('2026-08-06T00:00:00.000Z'),
    sources: [{
      name: 'integration-fixture',
      async fetch() {
        return {
          sanctions: [BLOCKED],
          wallets: [
            { address: APPROVED, kycApproved: true, validUntil: '2027-01-01T00:00:00.000Z' },
            { address: BLOCKED, kycApproved: true, validUntil: '2027-01-01T00:00:00.000Z' },
          ],
          transactionLimit: '5000',
        };
      },
    }],
    publisher: { async publish(snapshot) { publications.push(snapshot); return { transactionHash: '0xtest' }; } },
    ...overrides,
  });
  return { oracle, publications };
}

describe('ComplianceOracle integration', () => {
  it('aggregates external data and publishes a deterministic root', async () => {
    const { oracle, publications } = buildOracle();
    const snapshot = await oracle.refresh();
    assert.equal(publications.length, 1);
    assert.equal(snapshot.root, publications[0].root);
    assert.equal(snapshot.publication.transactionHash, '0xtest');
    assert.match(snapshot.root, /^0x[a-f0-9]{64}$/);
  });

  it('approves a KYC wallet within its transaction limit', async () => {
    const { oracle } = buildOracle();
    await oracle.refresh();
    assert.deepEqual(oracle.verify({ address: APPROVED, amount: '2500' }).reasons, []);
  });

  it('rejects sanctioned, unknown and over-limit wallets with explicit reasons', async () => {
    const { oracle } = buildOracle();
    await oracle.refresh();
    assert.deepEqual(oracle.verify({ address: BLOCKED }).reasons, ['SANCTIONED']);
    assert.deepEqual(oracle.verify({ address: '0x3333333333333333333333333333333333333333' }).reasons, ['KYC_REQUIRED']);
    assert.deepEqual(oracle.verify({ address: APPROVED, amount: '5001' }).reasons, ['TRANSACTION_LIMIT_EXCEEDED']);
  });

  it('does not publish partial data when a source fails', async () => {
    const { oracle, publications } = buildOracle({
      sources: [{ name: 'broken', async fetch() { throw new Error('upstream unavailable'); } }],
    });
    await assert.rejects(oracle.refresh(), /upstream unavailable/);
    assert.equal(publications.length, 0);
    assert.equal(oracle.status().ready, false);
  });

  it('hashes equivalent objects consistently', () => {
    assert.equal(stableHash({ b: 2, a: 1 }), stableHash({ a: 1, b: 2 }));
  });
});
