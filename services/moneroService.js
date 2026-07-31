const axios = require('axios');
const MoneroTransaction = require('../models/MoneroTransaction');

const ATOMIC_UNITS_PER_XMR = 1e12;
const DEFAULT_REQUIRED_CONFIRMATIONS = 10;
const DEFAULT_FCMP_REQUIRED_CONFIRMATIONS = 10;

const normalizeRpcUrl = (url) => {
  if (!url) {
    return `http://localhost:${process.env.MONERO_RPC_PORT || 18081}/json_rpc`;
  }
  return url.endsWith('/json_rpc') ? url : `${url.replace(/\/$/, '')}/json_rpc`;
};

const MONERO_RPC_URL = normalizeRpcUrl(
  process.env.MONERO_WALLET_RPC_URL || process.env.MONERO_RPC_URL
);
const MONERO_DAEMON_ADDRESS = process.env.MONERO_DAEMON_ADDRESS || 'node.moneroworld.com:18081';
const MONERO_NETWORK = process.env.MONERO_NETWORK || 'mainnet';

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const toXmr = (atomicAmount) => Number(atomicAmount || 0) / ATOMIC_UNITS_PER_XMR;

const includesFcmpMarker = (value) => (
  typeof value === 'string' && /fcmp/i.test(value)
);

const isFcmpPlusPlusTransfer = (transfer = {}) => {
  const markerValues = [
    transfer.protocol,
    transfer.proof_type,
    transfer.proofType,
    transfer.tx_type,
    transfer.txType,
    transfer.transaction_type,
    transfer.transactionType,
    transfer.ringct_type,
    transfer.ringctType,
  ];

  return transfer.fcmp === true ||
    transfer.fcmp_plus_plus === true ||
    transfer.fcmpPlusPlus === true ||
    markerValues.some(includesFcmpMarker);
};

const getConfirmationPolicy = (transfer = {}) => {
  const isFcmpPlusPlus = isFcmpPlusPlusTransfer(transfer);
  const requiredConfirmations = isFcmpPlusPlus
    ? parsePositiveInt(
      process.env.MONERO_FCMP_REQUIRED_CONFIRMATIONS,
      DEFAULT_FCMP_REQUIRED_CONFIRMATIONS
    )
    : parsePositiveInt(
      process.env.MONERO_REQUIRED_CONFIRMATIONS,
      DEFAULT_REQUIRED_CONFIRMATIONS
    );

  return {
    protocol: isFcmpPlusPlus ? 'fcmp++' : 'ringct',
    isFcmpPlusPlus,
    requiredConfirmations,
  };
};

const transferTxid = (transfer = {}, fallbackTxid = null) => (
  transfer.txid || transfer.tx_hash || transfer.hash || fallbackTxid
);

const normalizeTransferStatus = (transfer = {}, fallbackTxid = null, expectedAmount = 0) => {
  const { protocol, isFcmpPlusPlus, requiredConfirmations } = getConfirmationPolicy(transfer);
  const confirmations = Number(transfer.confirmations || 0);
  const amount = toXmr(transfer.amount);
  const txHash = transferTxid(transfer, fallbackTxid);
  const transferType = String(transfer.type || '').toLowerCase();
  const isPool = transferType === 'pool' || transferType === 'pending' || transfer.in_pool === true;
  const failed = transferType === 'failed' ||
    transfer.failed === true ||
    transfer.double_spend_seen === true;
  const expected = Number(expectedAmount);
  const isUnderpaid = Number.isFinite(expected) && expected > 0 && amount + 1e-12 < expected;

  if (failed) {
    return {
      status: 'failed',
      txHash,
      confirmations,
      amount,
      protocol,
      isFcmpPlusPlus,
      requiredConfirmations,
      reason: transfer.double_spend_seen ? 'double_spend_seen' : 'failed',
      inPool: Boolean(transfer.in_pool),
      unlockTime: transfer.unlock_time || 0,
    };
  }

  if (isPool) {
    return {
      status: 'pending',
      txHash,
      confirmations,
      amount,
      protocol,
      isFcmpPlusPlus,
      requiredConfirmations,
      reason: 'in_pool',
      inPool: true,
      unlockTime: transfer.unlock_time || 0,
    };
  }

  if (isUnderpaid) {
    return {
      status: 'pending',
      txHash,
      confirmations,
      amount,
      protocol,
      isFcmpPlusPlus,
      requiredConfirmations,
      reason: 'underpaid',
      inPool: Boolean(transfer.in_pool),
      unlockTime: transfer.unlock_time || 0,
    };
  }

  if (confirmations < requiredConfirmations) {
    return {
      status: 'pending',
      txHash,
      confirmations,
      amount,
      protocol,
      isFcmpPlusPlus,
      requiredConfirmations,
      reason: 'insufficient_confirmations',
      inPool: Boolean(transfer.in_pool),
      unlockTime: transfer.unlock_time || 0,
    };
  }

  return {
    status: 'confirmed',
    txHash,
    confirmations,
    amount,
    protocol,
    isFcmpPlusPlus,
    requiredConfirmations,
    inPool: Boolean(transfer.in_pool),
    unlockTime: transfer.unlock_time || 0,
  };
};

const collectTransfers = (result = {}) => [
  ...(result.incoming || []),
  ...(result.in || []),
  ...(result.pool || []),
  ...(result.pending || []),
  ...(result.failed || []),
];

class MoneroService {
  constructor() {
    console.log(`MoneroService avviato su ${MONERO_NETWORK}`);
    console.log(`Daemon: ${MONERO_DAEMON_ADDRESS}`);
  }

  getConfiguration() {
    return {
      network: MONERO_NETWORK,
      daemonAddress: MONERO_DAEMON_ADDRESS,
      fcmpPlusPlusEnabled: parseBoolean(process.env.MONERO_FCMP_PLUS_PLUS_ENABLED, false),
      requiredConfirmations: parsePositiveInt(
        process.env.MONERO_REQUIRED_CONFIRMATIONS,
        DEFAULT_REQUIRED_CONFIRMATIONS
      ),
      fcmpRequiredConfirmations: parsePositiveInt(
        process.env.MONERO_FCMP_REQUIRED_CONFIRMATIONS,
        DEFAULT_FCMP_REQUIRED_CONFIRMATIONS
      ),
    };
  }

  async callRpc(method, params = {}) {
    const response = await axios.post(MONERO_RPC_URL, {
      jsonrpc: '2.0',
      id: '0',
      method,
      ...(Object.keys(params).length ? { params } : {}),
    });

    if (response.data.error) {
      throw new Error(response.data.error.message);
    }

    return response.data.result || {};
  }

  /**
   * Genera un subaddress per un ordine
   */
  async generateSubaddress(orderId) {
    try {
      const result = await this.callRpc('create_address', {
        account_index: 0,
        label: `Order-${orderId}`,
      });

      const subaddress = result.address;
      console.log(`Subaddress generato per ordine ${orderId}: ${subaddress}`);

      await MoneroTransaction.create({
        orderId,
        subaddress,
        amount: 0,
        status: 'pending',
        confirmationTarget: this.getConfiguration().requiredConfirmations,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      return subaddress;
    } catch (error) {
      console.error('Errore generazione subaddress:', error.message);
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

      const result = await this.callRpc('get_transfers', {
        subaddress: true,
        account_index: 0,
        in: true,
        pool: true,
        pending: true,
        failed: true,
      });

      const transfers = collectTransfers(result);
      const found = transfers.find((transfer) => (
        transfer.address === tx.subaddress ||
        transfer.subaddr_index?.minor === tx.subaddressIndex
      ));

      if (found) {
        const normalized = normalizeTransferStatus(found, null, tx.amount);
        await MoneroTransaction.findByIdAndUpdate(transactionId, {
          status: normalized.status,
          moneroTxid: normalized.txHash,
          amountPaid: normalized.amount,
          confirmations: normalized.confirmations,
          confirmationTarget: normalized.requiredConfirmations,
          protocol: normalized.protocol,
          isFcmpPlusPlus: normalized.isFcmpPlusPlus,
          lastWalletStatus: normalized.reason || normalized.status,
          seenInPool: normalized.inPool,
          unlockTime: normalized.unlockTime,
          updatedAt: new Date(),
        });

        console.log(`Pagamento ${normalized.status} per transazione ${transactionId}`);
        return normalized;
      }

      return { status: 'pending' };
    } catch (error) {
      console.error('Errore verifica pagamento:', error.message);
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Verifica una transazione marketplace tramite il transaction hash salvato.
   */
  async verifyTransaction(transaction) {
    try {
      const paymentId = typeof transaction.paymentId === 'string'
        ? transaction.paymentId
        : '';
      const txid = transaction.transactionHash ||
        (/^[a-f0-9]{64}$/i.test(paymentId) ? paymentId : null);

      if (!txid || !/^[a-f0-9]{64}$/i.test(txid)) {
        throw new Error('La transazione non contiene un Monero transaction hash valido');
      }

      const result = await this.callRpc('get_transfer_by_txid', {
        txid,
        account_index: 0,
      });

      const transfer = result.transfer;
      if (!transfer) {
        return { status: 'pending', txHash: txid, confirmations: 0 };
      }

      return normalizeTransferStatus(transfer, txid, transaction.amount);
    } catch (error) {
      console.error('Errore verifica transazione Monero:', error.message);
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Returns wallet RPC readiness hints for FCMP++ rollout.
   */
  async getWalletCapabilities() {
    const [version, height] = await Promise.all([
      this.callRpc('get_version'),
      this.callRpc('get_height'),
    ]);

    return {
      network: MONERO_NETWORK,
      version: version.version || version.release || null,
      height: height.height || 0,
      fcmpPlusPlusConfigured: this.getConfiguration().fcmpPlusPlusEnabled,
      supportedTransactionProtocols: this.getConfiguration().fcmpPlusPlusEnabled
        ? ['ringct', 'fcmp++']
        : ['ringct'],
    };
  }

  /**
   * Crea un wallet RPC per mainnet
   */
  async createWallet(walletName, password) {
    try {
      const result = await this.callRpc('create_wallet', {
        filename: walletName,
        password: password,
        language: 'English',
      });

      console.log(`Wallet ${walletName} creato su ${MONERO_NETWORK}`);
      return result;
    } catch (error) {
      console.error('Errore creazione wallet:', error.message);
      throw error;
    }
  }

  /**
   * Ottiene il saldo del wallet
   */
  async getBalance() {
    try {
      const result = await this.callRpc('get_balance', {
        account_index: 0,
      });

      return {
        balance: toXmr(result.balance),
        unlockedBalance: toXmr(result.unlocked_balance),
      };
    } catch (error) {
      console.error('Errore recupero saldo:', error.message);
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
          amount: Math.round(amount * ATOMIC_UNITS_PER_XMR),
        }],
        account_index: 0,
        subaddr_indices: [0],
        priority: 1,
        do_not_relay: false,
      };

      if (paymentId) {
        params.payment_id = paymentId;
      }

      const result = await this.callRpc('transfer', params);

      console.log(`Transazione inviata: ${result.tx_hash}`);
      return result;
    } catch (error) {
      console.error('Errore invio transazione:', error.message);
      throw error;
    }
  }

  /**
   * Verifica che il wallet sia connesso a mainnet
   */
  async checkConnection() {
    try {
      const info = await this.callRpc('get_info');
      console.log(`Connesso a Monero ${MONERO_NETWORK}`);
      console.log(`   Altura: ${info.height}`);
      console.log(`   Versione: ${info.version}`);

      return info;
    } catch (error) {
      console.error('Errore connessione a Monero:', error.message);
      throw error;
    }
  }
}

module.exports = new MoneroService();
