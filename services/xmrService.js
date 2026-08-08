// services/xmrService.js - Gestione pagamenti XMR
const axios = require('axios');

class XMRService {
  constructor() {
    this.walletAddress = process.env.MYZUBSTER_XMR_WALLET_ADDRESS;
    this.rpcUrl = process.env.MONERO_RPC_URL || 'http://localhost:18081';
  }

  // Verifica un pagamento XMR
  async verifyPayment(txId, expectedAmount) {
    try {
      const response = await axios.post(`${this.rpcUrl}/json_rpc`, {
        jsonrpc: '2.0',
        id: '0',
        method: 'get_transaction',
        params: { txid: txId }
      });
      
      const tx = response.data.result;
      const amount = tx.amount / 1e12;
      
      return {
        verified: amount >= expectedAmount,
        amount: amount,
        txId: txId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error verifying XMR payment:', error);
      return { verified: false, error: error.message };
    }
  }

  // Genera indirizzo di pagamento
  async generatePaymentAddress() {
    return this.walletAddress;
  }

  // Ottieni il tasso di cambio XMR/MYZ
  async getExchangeRate() {
    return {
      rate: 12000,
      myzPerXmr: 12000,
      xmrPerMyz: 1 / 12000
    };
  }
}

module.exports = new XMRService();
