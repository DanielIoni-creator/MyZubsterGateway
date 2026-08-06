const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { SettlementSimulator } = require('../services/settlementSimulator');

describe('interbank settlement simulator', () => {
  let simulator;

  beforeEach(() => {
    simulator = new SettlementSimulator();
    simulator.registerBank({ bankId: 'MAS', name: 'Monetary Authority of Singapore' });
    simulator.registerBank({ bankId: 'DBS', name: 'DBS Bank' });
    simulator.registerBank({ bankId: 'OCBC', name: 'OCBC Bank' });
  });

  it('issues and redeems CBDC through the central-bank ledger', async () => {
    const issue = await simulator.issue({ bankId: 'DBS', amount: 1000 });
    const redeem = await simulator.redeem({ bankId: 'DBS', amount: 250 });

    assert.equal(issue.type, 'ISSUE');
    assert.equal(redeem.type, 'REDEEM');
    assert.equal(simulator.report().balances.find(bank => bank.bankId === 'DBS').balance, 750);
    assert.match(issue.txHash, /^0x[0-9a-f]{64}$/);
  });

  it('settles a bank transfer atomically and records the contract call', async () => {
    await simulator.issue({ bankId: 'DBS', amount: 500 });
    const transfer = simulator.createTransfer({
      fromBankId: 'DBS', toBankId: 'OCBC', amount: 125, assetId: 'bond-sg-1'
    });
    const settled = await simulator.settle(transfer.transferId);
    const report = simulator.report();

    assert.equal(settled.status, 'SETTLED');
    assert.equal(report.balances.find(bank => bank.bankId === 'DBS').balance, 375);
    assert.equal(report.balances.find(bank => bank.bankId === 'OCBC').balance, 125);
    assert.equal(report.totals.settled, 125);
    assert.equal(report.totals.settledCount, 1);
    assert.equal(report.contractCalls.at(-1).action, 'settle');
  });

  it('does not move funds when settlement fails', async () => {
    const transfer = simulator.createTransfer({ fromBankId: 'DBS', toBankId: 'OCBC', amount: 1 });
    await assert.rejects(() => simulator.settle(transfer.transferId), /insufficient/);
    const report = simulator.report();

    assert.equal(report.balances.find(bank => bank.bankId === 'DBS').balance, 0);
    assert.equal(report.balances.find(bank => bank.bankId === 'OCBC').balance, 0);
    assert.equal(report.totals.failedCount, 1);
  });

  it('rejects duplicate settlement and invalid redemption', async () => {
    await simulator.issue({ bankId: 'DBS', amount: 10 });
    const transfer = simulator.createTransfer({ fromBankId: 'DBS', toBankId: 'OCBC', amount: 5 });
    await simulator.settle(transfer.transferId);

    await assert.rejects(() => simulator.settle(transfer.transferId), /not pending/);
    await assert.rejects(() => simulator.redeem({ bankId: 'DBS', amount: 6 }), /insufficient/);
  });

  it('produces a complete settlement report', async () => {
    await simulator.issue({ bankId: 'DBS', amount: 200 });
    await simulator.redeem({ bankId: 'DBS', amount: 20 });
    const transfer = simulator.createTransfer({ fromBankId: 'DBS', toBankId: 'OCBC', amount: 50 });
    await simulator.settle(transfer.transferId);
    const report = simulator.report();

    assert.deepEqual(report.totals, {
      banks: 3,
      issued: 200,
      redeemed: 20,
      settled: 50,
      settledCount: 1,
      pendingCount: 0,
      failedCount: 0
    });
    assert.equal(report.currency, 'SGD-CBDC');
  });
});
