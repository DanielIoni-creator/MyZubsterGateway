const axios = require('axios');

class MoneroWalletService {
  constructor() {
    this.rpcUrl = process.env.MONERO_RPC_URL || 'http://localhost:18081';
    this.walletUrl = process.env.MONERO_WALLET_RPC_URL || 'http://localhost:18082';
  }

  async generateSubaddress(accountIndex = 0) {
    try {
      const response = await axios.post(`${this.walletUrl}/json_rpc`, {
        jsonrpc: '2.0',
        id: '1',
        method: 'create_address',
        params: {
          account_index: accountIndex
        }
      });
      return response.data.result;
    } catch (error) {
      console.error('Error generating subaddress:', error);
      throw error;
    }
  }

  async getBalance(address) {
    try {
      const response = await axios.post(`${this.rpcUrl}/json_rpc`, {
        jsonrpc: '2.0',
        id: '1',
        method: 'get_balance',
        params: { address }
      });
      return response.data.result;
    } catch (error) {
      console.error('Error getting balance:', error);
      throw error;
    }
  }

  async sendTransaction(toAddress, amount, paymentId) {
    try {
      const response = await axios.post(`${this.walletUrl}/json_rpc`, {
        jsonrpc: '2.0',
        id: '1',
        method: 'transfer',
        params: {
          destinations: [{ address: toAddress, amount: Math.floor(amount * 1e12) }],
          payment_id: paymentId,
          get_tx_key: true
        }
      });
      return response.data.result;
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw error;
    }
  }

  async verifyTransaction(txId) {
    try {
      const response = await axios.post(`${this.rpcUrl}/json_rpc`, {
        jsonrpc: '2.0',
        id: '1',
        method: 'get_transaction',
        params: { txid: txId }
      });
      return response.data.result;
    } catch (error) {
      console.error('Error verifying transaction:', error);
      throw error;
    }
  }
}

module.exports = new MoneroWalletService();
