const axios = require('axios');
const config = require('./config');

class MoneroClient {
  constructor() {
    this.walletRpcUrl = config.walletRpcUrl;
    this.nodeUrl = config.moneroNodeUrl;
    this.username = config.walletRpcUsername;
    this.password = config.walletRpcPassword;
    this.accountIndex = parseInt(process.env.MONERO_ACCOUNT_INDEX) || 0;
  }

  /**
   * Esegue una chiamata RPC al wallet Monero
   */
  async walletRpc(method, params = {}) {
    try {
      const response = await axios.post(this.walletRpcUrl, {
        jsonrpc: '2.0',
        id: '0',
        method,
        params
      }, {
        auth: {
          username: this.username,
          password: this.password
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      return response.data.result;
    } catch (error) {
      console.error('❌ Monero RPC error:', error.message);
      throw new Error(`Monero RPC failed: ${error.message}`);
    }
  }

  /**
   * Crea un indirizzo per il pagamento
   */
  async createPaymentAddress(bookingId, amount, label = '') {
    const fullLabel = label || `Booking_${bookingId}_${Date.now()}`;
    const result = await this.walletRpc('create_address', {
      account_index: this.accountIndex,
      label: fullLabel
    });

    return {
      address: result.address,
      addressIndex: result.address_index,
      label: fullLabel
    };
  }

  /**
   * Ottiene il saldo del wallet
   */
  async getBalance() {
    return await this.walletRpc('get_balance', {
      account_index: this.accountIndex
    });
  }

  /**
   * Ottiene le transazioni recenti
   */
  async getTransfers(count = 100) {
    return await this.walletRpc('get_transfers', {
      account_index: this.accountIndex,
      count: count
    });
  }

  /**
   * Ottiene una transazione specifica
   */
  async getTransaction(txId) {
    return await this.walletRpc('get_transfer', {
      txid: txId
    });
  }

  /**
   * Invia pagamento
   */
  async sendPayment(address, amount, priority = 0) {
    // Converti in atomic units (1 XMR = 1e12)
    const atomicAmount = Math.round(amount * 1e12);

    return await this.walletRpc('transfer', {
      destinations: [{ address, amount: atomicAmount }],
      priority: priority,
      do_not_relay: false
    });
  }

  /**
   * Ottiene le conferme di una transazione
   */
  async getConfirmations(txId) {
    try {
      const tx = await this.getTransaction(txId);
      if (tx.transfers && tx.transfers.length > 0) {
        return tx.transfers[0].confirmations || 0;
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Verifica se una transazione è confermata
   */
  async isConfirmed(txId, minConfirmations = null) {
    const min = minConfirmations || config.minConfirmations || 10;
    const confirmations = await this.getConfirmations(txId);
    return confirmations >= min;
  }

  /**
   * Verifica pagamenti in ingresso per un indirizzo
   */
  async checkIncomingPayments(address) {
    const transfers = await this.getTransfers();
    
    if (!transfers || !transfers.incoming) {
      return [];
    }

    return transfers.incoming.filter(tx => {
      // Verifica che l'indirizzo corrisponda
      return tx.address === address;
    });
  }

  /**
   * Rilascia pagamento con fee automatica
   */
  async releasePaymentWithFee(paymentData, professionalWallet, feeAmount) {
    const { amount, bookingId } = paymentData;

    // Calcola netto (totale - fee)
    const netAmount = amount - feeAmount;

    // Invia netto al professionista
    const professionalTx = await this.sendPayment(professionalWallet, netAmount);

    // Invia fee al wallet della piattaforma
    const feeTx = await this.sendPayment(
      process.env.PLATFORM_FEE_WALLET_ADDRESS,
      feeAmount
    );

    return {
      professionalTxId: professionalTx.tx_hash,
      feeTxId: feeTx.tx_hash,
      professionalAmount: netAmount,
      feeAmount: feeAmount
    };
  }
}

module.exports = new MoneroClient();