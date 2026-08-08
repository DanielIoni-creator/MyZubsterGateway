// src/wallet/multi-wallet.js
// Supporto wallet multipli MYZ/XMR - Bounty #712 - 600 MYZ

const crypto = require('crypto');

class MultiWalletManager {
  constructor(config = {}) {
    this.wallets = new Map();
    this.activeWalletId = config.defaultWallet || null;
    this.transactions = [];
    this.supportedCurrencies = ['MYZ', 'XMR'];
  }

  addWallet(data) {
    const id = crypto.randomBytes(6).toString('hex');
    const wallet = {
      id,
      name: data.name || ('Wallet ' + id.substring(0, 4)),
      type: data.type || 'tari',
      currency: data.currency || 'MYZ',
      address: data.address,
      balance: data.balance || 0,
      isDefault: this.wallets.size === 0,
      isActive: false,
      stats: {
        totalReceived: 0,
        totalSent: 0,
        transactionCount: 0,
        lastActivity: null
      },
      createdAt: new Date().toISOString()
    };

    // Validate address
    if (!this._validateAddress(wallet)) return { error: 'Invalid address format' };

    // Check duplicate
    for (const [, existing] of this.wallets) {
      if (existing.address === wallet.address) return { error: 'Address already registered' };
    }

    this.wallets.set(id, wallet);
    if (this.wallets.size === 1) this.setActiveWallet(id);

    return { success: true, wallet };
  }

  setActiveWallet(walletId) {
    const wallet = this.wallets.get(walletId);
    if (!wallet) return { error: 'Wallet not found' };

    if (this.activeWalletId && this.wallets.has(this.activeWalletId)) {
      this.wallets.get(this.activeWalletId).isActive = false;
    }
    wallet.isActive = true;
    this.activeWalletId = walletId;
    return { success: true };
  }

  getActiveWallet() {
    return this.activeWalletId ? this.wallets.get(this.activeWalletId) : null;
  }

  getAggregatedBalance(currency = null) {
    const balances = {};
    let total = 0;
    for (const [, wallet] of this.wallets) {
      const curr = wallet.currency;
      if (currency && curr !== currency) continue;
      if (!balances[curr]) balances[curr] = 0;
      balances[curr] += wallet.balance;
      total += wallet.balance;
    }
    return {
      total: +total.toFixed(2),
      byCurrency: balances,
      walletCount: this.wallets.size,
      activeWallet: this.activeWalletId
    };
  }

  recordTransaction(walletId, tx) {
    const wallet = this.wallets.get(walletId);
    if (!wallet) return { error: 'Wallet not found' };

    const transaction = {
      id: crypto.randomBytes(4).toString('hex'),
      walletId,
      walletName: wallet.name,
      type: tx.type,
      amount: parseFloat(tx.amount),
      currency: tx.currency || wallet.currency,
      status: tx.status || 'pending',
      counterparty: tx.counterparty || '',
      reference: tx.reference || '',
      txHash: tx.txHash || null,
      createdAt: new Date().toISOString()
    };

    if (isNaN(transaction.amount)) return { error: 'Invalid amount' };

    if (transaction.type === 'receive') {
      wallet.balance += transaction.amount;
      wallet.stats.totalReceived += transaction.amount;
    } else if (transaction.type === 'send') {
      if (wallet.balance < transaction.amount) return { error: 'Insufficient balance' };
      wallet.balance -= transaction.amount;
      wallet.stats.totalSent += transaction.amount;
    }

    wallet.stats.transactionCount++;
    wallet.stats.lastActivity = transaction.createdAt;
    this.transactions.push(transaction);

    return { success: true, transaction, newBalance: wallet.balance };
  }

  getTransactions(filters = {}) {
    let results = [...this.transactions];

    if (filters.walletId) results = results.filter(t => t.walletId === filters.walletId);
    if (filters.type) results = results.filter(t => t.type === filters.type);
    if (filters.limit) results = results.slice(-filters.limit);

    return {
      total: results.length,
      transactions: results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    };
  }

  setDefaultWallet(walletId) {
    const wallet = this.wallets.get(walletId);
    if (!wallet) return { error: 'Wallet not found' };
    for (const [, w] of this.wallets) w.isDefault = false;
    wallet.isDefault = true;
    return { success: true, wallet };
  }

  listWallets() {
    return {
      total: this.wallets.size,
      wallets: [...this.wallets.values()].map(w => ({
        id: w.id, name: w.name, type: w.type, currency: w.currency,
        address: w.address ? w.address.substring(0, 8) + '...' + w.address.slice(-4) : null,
        balance: w.balance, isDefault: w.isDefault, isActive: w.isActive,
        stats: w.stats
      })),
      activeWalletId: this.activeWalletId,
      aggregateBalance: this.getAggregatedBalance()
    };
  }

  removeWallet(walletId) {
    const wallet = this.wallets.get(walletId);
    if (!wallet) return { error: 'Wallet not found' };
    if (wallet.balance > 0) return { error: 'Cannot remove wallet with balance' };
    if (this.wallets.size <= 1) return { error: 'Cannot remove last wallet' };
    this.wallets.delete(walletId);
    if (this.activeWalletId === walletId) {
      const next = [...this.wallets.keys()][0];
      if (next) this.setActiveWallet(next);
    }
    return { success: true };
  }

  _validateAddress(wallet) {
    const addr = wallet.address || '';
    if (wallet.type === 'tari') return addr.length >= 90;
    if (wallet.type === 'monero') return (addr.startsWith('4') || addr.startsWith('8')) && addr.length >= 90;
    return addr.length > 0;
  }

  getStatus() {
    return {
      totalWallets: this.wallets.size,
      activeWallet: this.activeWalletId,
      totalTransactions: this.transactions.length,
      aggregateBalance: this.getAggregatedBalance()
    };
  }
}

module.exports = { MultiWalletManager };
