/**
 * Wallet Service — Gestione Portafoglio MYZ/XMR
 * Ledger-based double-entry wallet for MyZubster Gateway
 * Bounty #722 — 800 MYZ
 */

const axios = require('axios');
const crypto = require('crypto');

class WalletService {
  constructor(config = {}) {
    this.apiUrl = config.apiUrl || process.env.WALLET_API_URL || 'https://api.myzubster.com/wallet';
    this.apiKey = config.apiKey || process.env.WALLET_API_KEY;
    this.timeout = config.timeout || 30000;
    this.ledger = new Map(); // In-memory ledger (replace with DB in production)
  }

  _getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  _generateId() {
    return crypto.randomUUID();
  }

  _getTimestamp() {
    return new Date().toISOString();
  }

  // Ensure user ledger exists
  _ensureLedger(userId) {
    if (!this.ledger.has(userId)) {
      this.ledger.set(userId, {
        userId,
        balances: { MYZ: 0, XMR: 0 },
        transactions: []
      });
    }
    return this.ledger.get(userId);
  }

  // Get balance for a user
  async getBalance(userId) {
    try {
      const ledger = this._ensureLedger(userId);
      return {
        success: true,
        userId,
        balances: ledger.balances,
        lastUpdated: this._getTimestamp()
      };
    } catch (error) {
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  // Get all balances (admin)
  async getAllBalances() {
    try {
      const balances = [];
      for (const [userId, entry] of this.ledger) {
        balances.push({
          userId,
          balances: entry.balances,
          lastUpdated: entry.transactions.length > 0
            ? entry.transactions[entry.transactions.length - 1].timestamp
            : null
        });
      }
      return { success: true, balances, count: balances.length };
    } catch (error) {
      throw new Error(`Failed to get all balances: ${error.message}`);
    }
  }

  // Deposit funds
  async deposit(userId, amount, currency = 'MYZ') {
    if (amount <= 0) throw new Error('Amount must be positive');
    if (!['MYZ', 'XMR'].includes(currency)) throw new Error('Unsupported currency');

    const ledger = this._ensureLedger(userId);
    const txId = this._generateId();
    const timestamp = this._getTimestamp();

    ledger.balances[currency] += amount;
    const tx = {
      id: txId,
      type: 'deposit',
      userId,
      amount,
      currency,
      timestamp,
      balanceAfter: { ...ledger.balances }
    };
    ledger.transactions.push(tx);

    return {
      success: true,
      transactionId: txId,
      userId,
      amount,
      currency,
      newBalance: ledger.balances[currency],
      timestamp
    };
  }

  // Withdraw funds
  async withdraw(userId, amount, currency = 'MYZ', destination) {
    if (amount <= 0) throw new Error('Amount must be positive');

    const ledger = this._ensureLedger(userId);
    if (ledger.balances[currency] < amount) {
      throw new Error(`Insufficient ${currency} balance. Available: ${ledger.balances[currency]}, Requested: ${amount}`);
    }

    const txId = this._generateId();
    const timestamp = this._getTimestamp();

    ledger.balances[currency] -= amount;
    const tx = {
      id: txId,
      type: 'withdraw',
      userId,
      amount,
      currency,
      destination: destination || null,
      timestamp,
      balanceAfter: { ...ledger.balances }
    };
    ledger.transactions.push(tx);

    return {
      success: true,
      transactionId: txId,
      userId,
      amount,
      currency,
      destination,
      newBalance: ledger.balances[currency],
      timestamp
    };
  }

  // Transfer between users
  async transfer(fromUserId, toUserId, amount, currency = 'MYZ') {
    if (amount <= 0) throw new Error('Amount must be positive');
    if (fromUserId === toUserId) throw new Error('Cannot transfer to same user');

    const fromLedger = this._ensureLedger(fromUserId);
    if (fromLedger.balances[currency] < amount) {
      throw new Error(`Insufficient ${currency} balance for ${fromUserId}`);
    }

    const toLedger = this._ensureLedger(toUserId);
    const txId = this._generateId();
    const timestamp = this._getTimestamp();

    // Debit source
    fromLedger.balances[currency] -= amount;
    fromLedger.transactions.push({
      id: txId,
      type: 'transfer_out',
      userId: fromUserId,
      toUserId,
      amount,
      currency,
      timestamp,
      balanceAfter: { ...fromLedger.balances }
    });

    // Credit destination
    toLedger.balances[currency] += amount;
    toLedger.transactions.push({
      id: `${txId}_credit`,
      type: 'transfer_in',
      userId: toUserId,
      fromUserId,
      amount,
      currency,
      timestamp,
      balanceAfter: { ...toLedger.balances }
    });

    return {
      success: true,
      transactionId: txId,
      fromUserId,
      toUserId,
      amount,
      currency,
      fromNewBalance: fromLedger.balances[currency],
      toNewBalance: toLedger.balances[currency],
      timestamp
    };
  }

  // Get transactions for a user
  async getTransactions(userId, limit = 50, offset = 0, currency = null) {
    const ledger = this._ensureLedger(userId);
    let txs = [...ledger.transactions].reverse();

    if (currency) {
      txs = txs.filter(tx => tx.currency === currency);
    }

    const total = txs.length;
    txs = txs.slice(offset, offset + limit);

    return {
      success: true,
      userId,
      transactions: txs,
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    };
  }

  // Get transaction history with time-bucketed aggregation
  async getHistory(userId, period = 'daily', startDate = null, endDate = null) {
    const ledger = this._ensureLedger(userId);
    const txs = ledger.transactions;

    const start = startDate ? new Date(startDate) : new Date(txs.length > 0 ? txs[0].timestamp : Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const filtered = txs.filter(tx => {
      const d = new Date(tx.timestamp);
      return d >= start && d <= end;
    });

    // Bucket by period
    const buckets = {};
    for (const tx of filtered) {
      let key;
      const d = new Date(tx.timestamp);
      if (period === 'daily') {
        key = d.toISOString().split('T')[0];
      } else if (period === 'weekly') {
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else if (period === 'monthly') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      } else {
        key = 'all';
      }

      if (!buckets[key]) {
        buckets[key] = {
          period: key,
          deposits: 0,
          withdrawals: 0,
          transfersIn: 0,
          transfersOut: 0,
          txCount: 0
        };
      }

      const b = buckets[key];
      if (tx.type === 'deposit') b.deposits += tx.amount;
      else if (tx.type === 'withdraw') b.withdrawals += tx.amount;
      else if (tx.type === 'transfer_in') b.transfersIn += tx.amount;
      else if (tx.type === 'transfer_out') b.transfersOut += tx.amount;
      b.txCount++;
    }

    // CSV-ready export
    const csvHeader = 'Period,Deposits,Withdrawals,TransfersIn,TransfersOut,TxCount';
    const csvRows = Object.entries(buckets).map(([k, v]) =>
      `${k},${v.deposits},${v.withdrawals},${v.transfersIn},${v.transfersOut},${v.txCount}`
    );
    const csv = [csvHeader, ...csvRows].join('\n');

    return {
      success: true,
      userId,
      period,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      history: buckets,
      totalTx: filtered.length,
      csv
    };
  }

  // Get wallet summary (balance + recent tx + stats)
  async getSummary(userId) {
    const ledger = this._ensureLedger(userId);
    const recentTxs = [...ledger.transactions].reverse().slice(0, 10);
    
    const stats = {
      totalDeposits: 0,
      totalWithdrawals: 0,
      totalTransfersIn: 0,
      totalTransfersOut: 0
    };

    for (const tx of ledger.transactions) {
      if (tx.type === 'deposit') stats.totalDeposits += tx.amount;
      else if (tx.type === 'withdraw') stats.totalWithdrawals += tx.amount;
      else if (tx.type === 'transfer_in') stats.totalTransfersIn += tx.amount;
      else if (tx.type === 'transfer_out') stats.totalTransfersOut += tx.amount;
    }

    return {
      success: true,
      userId,
      balances: ledger.balances,
      stats,
      recentTransactions: recentTxs,
      totalTransactions: ledger.transactions.length,
      lastActivity: recentTxs.length > 0 ? recentTxs[0].timestamp : null
    };
  }
}

module.exports = WalletService;
