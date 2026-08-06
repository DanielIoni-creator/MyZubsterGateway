const crypto = require('node:crypto');

const DEFAULT_CURRENCY = 'SGD-CBDC';

function positiveAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('amount must be a positive number');
  }
  return amount;
}

class SimulatedContractAdapter {
  constructor(address = '0x000000000000000000000000000000000000CBDC') {
    this.address = address;
    this.calls = [];
  }

  async record(action, payload) {
    const call = {
      action,
      payload,
      contractAddress: this.address,
      txHash: `0x${crypto.createHash('sha256')
        .update(`${action}:${JSON.stringify(payload)}:${this.calls.length}`)
        .digest('hex')}`,
      recordedAt: new Date().toISOString()
    };
    this.calls.push(call);
    return call;
  }
}

class SettlementSimulator {
  constructor(options = {}) {
    this.currency = options.currency || DEFAULT_CURRENCY;
    this.contract = options.contract || new SimulatedContractAdapter(options.contractAddress);
    this.banks = new Map();
    this.transfers = new Map();
    this.ledger = [];
    this.sequence = 0;
  }

  registerBank({ bankId, name, initialBalance = 0 }) {
    if (!bankId || !name) throw new Error('bankId and name are required');
    if (this.banks.has(bankId)) throw new Error('bank already registered');
    const balance = Number(initialBalance);
    if (!Number.isFinite(balance) || balance < 0) throw new Error('initialBalance must be non-negative');
    const bank = { bankId, name, balance, currency: this.currency };
    this.banks.set(bankId, bank);
    return { ...bank };
  }

  async issue({ bankId, amount, reference }) {
    const bank = this.requireBank(bankId);
    const value = positiveAmount(amount);
    bank.balance += value;
    return this.recordLedger('ISSUE', { bankId, amount: value, reference },
      await this.contract.record('issue', { bankId, amount: value, currency: this.currency }));
  }

  async redeem({ bankId, amount, reference }) {
    const bank = this.requireBank(bankId);
    const value = positiveAmount(amount);
    if (bank.balance < value) throw new Error('insufficient CBDC balance');
    bank.balance -= value;
    return this.recordLedger('REDEEM', { bankId, amount: value, reference },
      await this.contract.record('redeem', { bankId, amount: value, currency: this.currency }));
  }

  createTransfer({ fromBankId, toBankId, amount, assetId, reference }) {
    if (fromBankId === toBankId) throw new Error('banks must be different');
    this.requireBank(fromBankId);
    this.requireBank(toBankId);
    const value = positiveAmount(amount);
    const transferId = `stl-${Date.now()}-${++this.sequence}`;
    const transfer = {
      transferId,
      fromBankId,
      toBankId,
      amount: value,
      currency: this.currency,
      assetId: assetId || null,
      reference: reference || null,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };
    this.transfers.set(transferId, transfer);
    return { ...transfer };
  }

  async settle(transferId) {
    const transfer = this.transfers.get(transferId);
    if (!transfer) throw new Error('transfer not found');
    if (transfer.status !== 'PENDING') throw new Error('transfer is not pending');
    const sender = this.requireBank(transfer.fromBankId);
    const receiver = this.requireBank(transfer.toBankId);
    if (sender.balance < transfer.amount) {
      transfer.status = 'FAILED';
      transfer.failureReason = 'insufficient CBDC balance';
      throw new Error(transfer.failureReason);
    }

    const contractCall = await this.contract.record('settle', {
      transferId,
      fromBankId: transfer.fromBankId,
      toBankId: transfer.toBankId,
      amount: transfer.amount,
      assetId: transfer.assetId,
      currency: this.currency
    });

    sender.balance -= transfer.amount;
    receiver.balance += transfer.amount;
    Object.assign(transfer, {
      status: 'SETTLED',
      settledAt: new Date().toISOString(),
      contractAddress: contractCall.contractAddress,
      txHash: contractCall.txHash
    });
    this.recordLedger('SETTLEMENT', { ...transfer }, contractCall);
    return { ...transfer };
  }

  report() {
    const settled = [...this.transfers.values()].filter(item => item.status === 'SETTLED');
    const pending = [...this.transfers.values()].filter(item => item.status === 'PENDING');
    const failed = [...this.transfers.values()].filter(item => item.status === 'FAILED');
    return {
      currency: this.currency,
      generatedAt: new Date().toISOString(),
      totals: {
        banks: this.banks.size,
        issued: this.totalFor('ISSUE'),
        redeemed: this.totalFor('REDEEM'),
        settled: settled.reduce((sum, item) => sum + item.amount, 0),
        settledCount: settled.length,
        pendingCount: pending.length,
        failedCount: failed.length
      },
      balances: [...this.banks.values()].map(bank => ({ ...bank })),
      transfers: [...this.transfers.values()].map(item => ({ ...item })),
      contractCalls: this.contract.calls.map(call => ({ ...call }))
    };
  }

  requireBank(bankId) {
    const bank = this.banks.get(bankId);
    if (!bank) throw new Error('bank not found');
    return bank;
  }

  totalFor(type) {
    return this.ledger
      .filter(entry => entry.type === type)
      .reduce((sum, entry) => sum + entry.amount, 0);
  }

  recordLedger(type, data, contractCall) {
    const entry = {
      ledgerId: `ledger-${++this.sequence}`,
      type,
      ...data,
      txHash: contractCall.txHash,
      contractAddress: contractCall.contractAddress,
      createdAt: new Date().toISOString()
    };
    this.ledger.push(entry);
    return { ...entry };
  }
}

module.exports = { SettlementSimulator, SimulatedContractAdapter, DEFAULT_CURRENCY };
