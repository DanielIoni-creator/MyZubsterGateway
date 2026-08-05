// gateway/tari_payout.js — Tari network payout service for MYZ withdrawals
const axios = require('axios');

const TARI_WALLET_URL = process.env.TARI_WALLET_URL || 'http://localhost:18089';
const TARI_NODE_URL = process.env.TARI_NODE_URL || 'http://localhost:18142';

class TariPayout {
  constructor() {
    this.pendingTransfers = new Map();
    this.minConfirmations = parseInt(process.env.TARI_MIN_CONFIRMATIONS || '3');
  }

  // Transfer MYZ from platform wallet to user's Tari address
  async transferToAddress(userId, address, amount) {
    if (!address || amount <= 0) {
      throw new Error('Invalid address or amount');
    }

    const transferId = `payout_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.pendingTransfers.set(transferId, { userId, address, amount, status: 'pending', createdAt: new Date().toISOString() });

    try {
      // Attempt real Tari transfer if wallet is configured
      if (TARI_WALLET_URL !== 'http://localhost:18089') {
        const response = await axios.post(`${TARI_WALLET_URL}/transfer`, {
          address,
          amount: amount * 1_000_000, // Convert MYZ to microTari
          fee: 100, // 100 microTari fee
          message: `MyZubster payout to ${userId}`
        }, { timeout: 30000 });

        const txId = response.data?.transaction_id || response.data?.txId;
        const transfer = this.pendingTransfers.get(transferId);
        transfer.status = 'sent';
        transfer.txId = txId;
        transfer.networkTxId = txId;
        this.pendingTransfers.set(transferId, transfer);
        return { transferId, txId, status: 'sent' };
      }

      // Simulation mode (dev/test)
      const simTxId = `tari_tx_sim_${Date.now()}`;
      const transfer = this.pendingTransfers.get(transferId);
      transfer.status = 'sent';
      transfer.txId = simTxId;
      transfer.networkTxId = simTxId;
      transfer.note = 'simulated — real Tari wallet not configured';
      this.pendingTransfers.set(transferId, transfer);

      console.log(`💸 [TariPayout] SIMULATED: ${amount} MYZ → ${address.slice(0,12)}... (tx: ${simTxId})`);
      return { transferId, txId: simTxId, status: 'sent', simulated: true };

    } catch (err) {
      const transfer = this.pendingTransfers.get(transferId);
      transfer.status = 'failed';
      transfer.error = err.message;
      this.pendingTransfers.set(transferId, transfer);
      throw new Error(`Tari transfer failed: ${err.message}`);
    }
  }

  // Check transfer status
  getTransferStatus(transferId) {
    const transfer = this.pendingTransfers.get(transferId);
    if (!transfer) return null;
    return {
      transferId,
      status: transfer.status,
      amount: transfer.amount,
      address: transfer.address,
      txId: transfer.txId,
      createdAt: transfer.createdAt
    };
  }

  // Get all pending transfers for a user
  getUserTransfers(userId) {
    const transfers = [];
    this.pendingTransfers.forEach((t, id) => {
      if (t.userId === userId) {
        transfers.push({ transferId: id, ...t });
      }
    });
    return transfers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}

module.exports = new TariPayout();
