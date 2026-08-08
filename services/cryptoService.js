const crypto = require('crypto');
const axios = require('axios');

class CryptoService {
  constructor() {
    this.supportedCoins = ['BTC', 'ETH', 'ADA'];
    this.networks = {
      BTC: { name: 'bitcoin', testnet: 'testnet', blockExplorer: 'https://blockstream.info/testnet/api' },
      ETH: { name: 'ethereum', testnet: 'goerli', blockExplorer: 'https://api-goerli.etherscan.io/api' },
      ADA: { name: 'cardano', testnet: 'preprod', blockExplorer: 'https://cardano-preprod.blockfrost.io/api/v0' }
    };
  }

  generateAddress(coin) {
    const prefix = coin === 'BTC' ? 'tb1' : coin === 'ETH' ? '0x' : 'addr_test1';
    const hash = crypto.randomBytes(20).toString('hex');
    return `${prefix}${hash}`;
  }

  async getBalance(coin, address) {
    try {
      const network = this.networks[coin];
      if (!network) throw new Error(`Coin ${coin} not supported`);
      
      let balance = '0';
      if (coin === 'BTC') {
        const resp = await axios.get(`${network.blockExplorer}/address/${address}`);
        balance = String(resp.data.chain_stats?.funded_txo_sum - resp.data.chain_stats?.spent_txo_sum || 0);
      } else if (coin === 'ETH') {
        balance = '0.5'; // Simulated
      } else if (coin === 'ADA') {
        balance = '100'; // Simulated
      }
      return { coin, address, balance, unit: coin.toLowerCase(), timestamp: new Date().toISOString() };
    } catch (e) {
      return { coin, address, balance: '0', unit: coin.toLowerCase(), error: e.message, timestamp: new Date().toISOString() };
    }
  }

  async createTransaction(coin, from, to, amount) {
    const txId = crypto.randomBytes(32).toString('hex');
    return {
      id: txId,
      coin,
      from,
      to,
      amount,
      fee: this.calculateFee(coin),
      status: 'pending',
      timestamp: new Date().toISOString()
    };
  }

  calculateFee(coin) {
    const fees = { BTC: '0.0001', ETH: '0.001', ADA: '0.17' };
    return fees[coin] || '0';
  }

  supported() {
    return Object.entries(this.networks).map(([coin, net]) => ({
      coin,
      network: net.name,
      testnet: net.testnet
    }));
  }
}

module.exports = new CryptoService();
