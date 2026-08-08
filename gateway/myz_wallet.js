const crypto = require('crypto');
const axios = require('axios');

class MyzWallet {
  constructor(config = {}) {
    this.apiUrl = config.apiUrl || process.env.MYZ_WALLET_API_URL || 'https://api.myzubster.com/wallet';
    this.apiKey = config.apiKey || process.env.MYZ_WALLET_API_KEY;
    this.timeout = config.timeout || 30000;
  }

  // Generate a new MYZ wallet address
  async generateWallet(userId) {
    try {
      const response = await axios.post(`${this.apiUrl}/generate`, {
        userId,
        timestamp: Date.now(),
        signature: this._generateSignature({ userId, action: 'generate' })
      }, {
        headers: this._getHeaders(),
        timeout: this.timeout
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to generate wallet: ${error.message}`);
    }
  }

  // Get wallet balance
  async getBalance(address) {
    try {
      const response = await axios.get(`${this.apiUrl}/balance/${address}`, {
        headers: this._getHeaders(),
        timeout: this.timeout
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  // Send MYZ tokens
  async sendTransaction(fromAddress, toAddress, amount, memo = '') {
    try {
      const response = await axios.post(`${this.apiUrl}/send`, {
        from: fromAddress,
        to: toAddress,
        amount,
        memo,
        timestamp: Date.now(),
        signature: this._generateSignature({ from: fromAddress, to: toAddress, amount })
      }, {
        headers: this._getHeaders(),
        timeout: this.timeout
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to send transaction: ${error.message}`);
    }
  }

  // Get transaction history
  async getTransactionHistory(address, limit = 50, offset = 0) {
    try {
      const response = await axios.get(`${this.apiUrl}/history/${address}`, {
        params: { limit, offset },
        headers: this._getHeaders(),
        timeout: this.timeout
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get transaction history: ${error.message}`);
    }
  }

  // Get wallet details
  async getWalletDetails(address) {
    try {
      const response = await axios.get(`${this.apiUrl}/details/${address}`, {
        headers: this._getHeaders(),
        timeout: this.timeout
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get wallet details: ${error.message}`);
    }
  }

  // Generate signature for API requests
  _generateSignature(data) {
    const sorted = Object.keys(data).sort().reduce((acc, key) => {
      acc[key] = data[key];
      return acc;
    }, {});
    const stringified = JSON.stringify(sorted);
    return crypto.createHmac('sha256', this.apiKey || 'default-secret')
      .update(stringified)
      .digest('hex');
  }

  // Get headers for API requests
  _getHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
      'User-Agent': 'MyZubster-Wallet/1.0.0'
    };
  }

  // Validate wallet address format
  isValidAddress(address) {
    // MYZ address format: starts with 'myz_' followed by 42-44 characters
    return /^myz_[a-zA-Z0-9]{42,44}$/.test(address);
  }

  // Convert amount to integer (smallest unit)
  toSmallestUnit(amount) {
    return Math.round(amount * 100000000);
  }

  // Convert from smallest unit to human readable
  fromSmallestUnit(amount) {
    return amount / 100000000;
  }
}

module.exports = MyzWallet;
