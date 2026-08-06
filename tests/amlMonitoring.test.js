const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { AmlMonitoringService } = require('../services/amlMonitoringService');

function fixture(screeningResult = { sanctioned: false, pep: false, matches: [] }) {
  const submitted = [];
  const clock = () => new Date('2026-08-06T00:05:00.000Z');
  const service = new AmlMonitoringService({
    clock,
    screening: { async screen() { return screeningResult; } },
    reporter: { async submit(report) { submitted.push(report); return { mode: 'submitted', reference: 'MAS-1' }; } },
  });
  return { service, submitted };
}

const base = { from: 'wallet-a', to: 'wallet-b', amount: 100, asset: 'MYZ', originator: { name: 'A' }, beneficiary: { name: 'B' } };

describe('AML/CFT monitoring', () => {
  it('passes a low-risk transaction without an alert', async () => {
    const { service } = fixture();
    const result = await service.monitor(base);
    assert.equal(result.riskScore, 0);
    assert.equal(service.alerts.length, 0);
  });

  it('flags a large transfer with missing travel-rule data', async () => {
    const { service, submitted } = fixture();
    const result = await service.monitor({ ...base, amount: 15000, originator: null });
    assert.deepEqual(result.rules.map((rule) => rule.code), ['LARGE_TRANSFER', 'TRAVEL_RULE_DATA_MISSING']);
    assert.equal(result.report.submission.reference, 'MAS-1');
    assert.equal(submitted.length, 1);
    assert.doesNotThrow(() => JSON.stringify(result));
  });

  it('detects velocity and structuring in real time', async () => {
    const { service } = fixture();
    await service.monitor({ ...base, amount: 4000 });
    await service.monitor({ ...base, amount: 3500 });
    const result = await service.monitor({ ...base, amount: 3000 });
    assert.deepEqual(result.rules.map((rule) => rule.code), ['HIGH_VELOCITY', 'STRUCTURING']);
  });

  it('creates an automatic report for a sanctions match', async () => {
    const { service } = fixture({ sanctioned: true, pep: false, matches: [{ list: 'UN', name: 'match' }] });
    const result = await service.monitor(base);
    assert.equal(result.riskScore, 100);
    assert.equal(service.reports[0].screeningMatches[0].list, 'UN');
  });

  it('supports compliance-officer alert resolution', async () => {
    const { service } = fixture({ sanctioned: false, pep: true, matches: [] });
    const result = await service.monitor(base);
    const alert = service.resolveAlert(result.alertId, 'false positive');
    assert.equal(alert.status, 'RESOLVED');
    assert.equal(alert.resolution, 'false positive');
  });
});
