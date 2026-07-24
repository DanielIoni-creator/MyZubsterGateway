const axios = require('axios');
const MoneroTransaction = require('../models/MoneroTransaction');
const crypto = require('crypto');

// Configurazione Monero (mainnet)
const MONERO_RPC_URL = `http://localhost:${process.env.MONERO_RPC_PORT || 18081}/json_rpc`;
const MONERO_DAEMON_ADDRESS = process.env.MONERO_DAEMON_ADDRESS || 'node.moneroworld.com:18081';
const MONERO_NETWORK = process.env.MONERO_NETWORK || 'mainnet';

class MoneroService {
  constructor() {
    console.log(`🔐 MoneroService avviato su ${MONERO_NETWORK}`);
    console.log(`📡 Daemon: ${MONERO_DAEMON_ADDRESS}`);
  }

  /**
   * Genera un subaddress per un ordine
   */
  async generateSubaddress(orderId) {
    try {
      const response = await axios.post(MONERO_RPC_URL, {
        jsonrpc: '2.0',
        id: '0',
        method: 'create_address',
        params: {
          account_index: 0,
          label: `Order-${orderId}`
        }
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      const subaddress = response.data.result.address;
      console.log(`✅ Subaddress generato per ordine ${orderId}: ${subaddress}`);

      // Salva nel database
      await MoneroTransaction.create({
        orderId,
        subaddress,
        amount: 0, // sarà aggiornato quando l'utente imposta l'importo
        status: 'pending',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 ore
      });

      return subaddress;
    } catch (error) {
      console.error('❌ Errore generazione subaddress:', error.message);
      throw error;
    }
  }

  /**
   * Verifica lo stato di un pagamento
   */
  async checkPayment(transactionId) {
    try {
      const tx = await MoneroTransaction.findById(transactionId);
      if (!tx) {
        throw new Error('Transazione non trovata');
      }

      // Query per verificare il pagamento sul mainnet
      const response = await axios.post(MONERO_RPC_URL, {
        jsonrpc: '2.0',
        id: '0',
        method: 'get_transfers',
        params: {
          subaddress: true,
          account_index: 0
        }
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      // Cerca la transazione per il subaddress specifico
      const transfers = response.data.result.incoming || [];
      const found = transfers.find(t => t.address === tx.subaddress);

      if (found) {
        await MoneroTransaction.findByIdAndUpdate(transactionId, {
          status: 'confirmed',
          txHash: found.txid,
          amount: found.amount,
          confirmedAt: new Date()
        });
        console.log(`💰 Pagamento confermato per transazione ${transactionId}`);
        return { status: 'confirmed', txHash: found.txid };
      }

      return { status: 'pending' };
    } catch (error) {
      console.error('❌ Errore verifica pagamento:', error.message);
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Crea un wallet RPC per mainnet
   */
  async createWallet(walletName, password) {
    try {
      const response = await axios.post(MONERO_RPC_URL, {
        jsonrpc: '2.0',
        id: '0',
        method: 'create_wallet',
        params: {
          filename: walletName,
          password: password,
          language: 'English'
        }
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      console.log(`✅ Wallet ${walletName} creato su ${MONERO_NETWORK}`);
      return response.data.result;
    } catch (error) {
      console.error('❌ Errore creazione wallet:', error.message);
      throw error;
    }
  }

  /**
   * Ottiene il saldo del wallet
   */
  async getBalance() {
    try {
      const response = await axios.post(MONERO_RPC_URL, {
        jsonrpc: '2.0',
        id: '0',
        method: 'get_balance',
        params: {
          account_index: 0
        }
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      return {
        balance: response.data.result.balance / 1e12, // XMR
        unlockedBalance: response.data.result.unlocked_balance / 1e12
      };
    } catch (error) {
      console.error('❌ Errore recupero saldo:', error.message);
      throw error;
    }
  }

  /**
   * Invia una transazione su mainnet
   */
  async sendTransaction(destinationAddress, amount, paymentId = null) {
    try {
      const params = {
        destinations: [{
          address: destinationAddress,
          amount: Math.round(amount * 1e12) // converti in atomic units
        }],
        account_index: 0,
        subaddr_indices: [0],
        priority: 1,
        do_not_relay: false
      };

      if (paymentId) {
        params.payment_id = paymentId;
      }

      const response = await axios.post(MONERO_RPC_URL, {
        jsonrpc: '2.0',
        id: '0',
        method: 'transfer',
        params: params
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      console.log(`✅ Transazione inviata: ${response.data.result.tx_hash}`);
      return response.data.result;
    } catch (error) {
      console.error('❌ Errore invio transazione:', error.message);
      throw error;
    }
  }

  /**
   * Verifica che il wallet sia connesso a mainnet
   */
  async checkConnection() {
    try {
      const response = await axios.post(MONERO_RPC_URL, {
        jsonrpc: '2.0',
        id: '0',
        method: 'get_info'
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      const info = response.data.result;
      console.log(`✅ Connesso a Monero ${MONERO_NETWORK}`);
      console.log(`   Altura: ${info.height}`);
      console.log(`   Versione: ${info.version}`);

      return info;
    } catch (error) {
      console.error('❌ Errore connessione a Monero:', error.message);
      throw error;
    }
  }
}

module.exports = new MoneroService();
