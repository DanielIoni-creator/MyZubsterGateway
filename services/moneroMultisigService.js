const MoneroWallet = require('../models/MoneroWallet');
const MultisigOrder = require('../models/MultisigOrder');
const crypto = require('crypto');

/**
 * Custom error class for multisig-related failures.
 * Carries a machine-readable code for API error responses.
 */
class MoneroMultisigError extends Error {
  /**
   * @param {string} message  Human-readable description
   * @param {string} code     Machine-readable error code, e.g. ORDER_NOT_FOUND
   */
  constructor(message, code = 'UNKNOWN_ERROR') {
    super(message);
    this.name = 'MoneroMultisigError';
    this.code = code;
  }
}

/* ──────────── Helpers ──────────── */

/**
 * Generate a unique order ID with format: ms_<timestamp>_<random-hex>
 */
function generateOrderId() {
  return `ms_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

/* ──────────── Service ──────────── */

class MoneroMultisigService {
  /**
   * Attempt to initialise the monero-javascript bindings.
   * Throws MoneroMultisigError if the dependency is missing.
   */
  async _ensureMoneroJS() {
    if (this._monerojs) return;
    try {
      this._monerojs = require('monero-javascript');
    } catch (err) {
      if (err.code === 'MODULE_NOT_FOUND') {
        throw new MoneroMultisigError(
          'monero-javascript is not installed. Run: npm install monero-javascript',
          'DEPENDENCY_MISSING',
        );
      }
      throw new MoneroMultisigError(
        `Failed to load monero-javascript: ${err.message}`,
        'DEPENDENCY_LOAD_FAILED',
      );
    }
  }

  // ────────────── WALLET OPERATIONS ──────────────

  /**
   * Generate a new Monero wallet (key-only, no daemon connection required).
   *
   * @param {string}  [networkType='testnet']  - mainnet | testnet | stagenet
   * @param {string}  [label='']               - Optional human label
   * @returns {Promise<{walletId: string, address: string, networkType: string, label: string}>}
   */
  async generateWallet(networkType = 'testnet', label = '') {
    await this._ensureMoneroJS();
    try {
      const walletKeys = await this._monerojs.createWalletKeys();
      const [mnemonic, addressObj, spendKey, viewKey] = await Promise.all([
        walletKeys.getMnemonic(),
        walletKeys.getAddress(0, 0),
        walletKeys.getSpendKey(),
        walletKeys.getViewKey(),
      ]);

      const address = addressObj.toString();

      const walletDoc = await MoneroWallet.create({
        address,
        encryptedViewKey: MoneroWallet.encrypt(viewKey),
        encryptedSpendKey: MoneroWallet.encrypt(spendKey),
        networkType,
        encryptedMnemonic: MoneroWallet.encrypt(mnemonic),
        isMultisig: false,
        label,
      });

      return {
        walletId: walletDoc._id.toString(),
        address,
        networkType,
        label,
      };
    } catch (err) {
      if (err instanceof MoneroMultisigError) throw err;
      throw new MoneroMultisigError(
        `Wallet generation failed: ${err.message}`,
        'WALLET_GENERATION_FAILED',
      );
    }
  }

  // ────────────── ORDER LIFECYCLE ──────────────

  /**
   * Create a new multisig order in pending state.
   *
   * @param {object}  params
   * @param {string[]} params.participants        - User IDs of participants
   * @param {number}  [params.requiredSignatures=2]
   * @param {string}  [params.amount='0']
   * @param {string}  [params.destinationAddress=null]
   * @param {string}  [params.networkType='testnet']
   * @returns {Promise<object>} Order summary
   */
  async createOrder({
    participants,
    requiredSignatures = 2,
    amount = '0',
    destinationAddress = null,
    networkType = 'testnet',
  }) {
    if (!participants || participants.length < requiredSignatures) {
      throw new MoneroMultisigError(
        `Participants count (${participants ? participants.length : 0}) must be >= required signatures (${requiredSignatures})`,
        'INVALID_PARAMETERS',
      );
    }

    const orderId = generateOrderId();

    const order = await MultisigOrder.create({
      orderId,
      participants: participants.map((userId) => ({ userId })),
      requiredSignatures,
      totalParticipants: participants.length,
      amount,
      destinationAddress,
      networkType,
      currentStatus: 'pending',
      statusHistory: [
        { status: 'pending', timestamp: new Date(), note: 'Order created' },
      ],
    });

    return {
      orderId: order.orderId,
      participants: order.totalParticipants,
      requiredSignatures: order.requiredSignatures,
      amount: order.amount,
      status: 'pending',
      networkType: order.networkType,
    };
  }

  /**
   * Set up the 2/3 multisig wallet for an existing order.
   * Transitions state: pending/funding → multisig_setup_initiated → multisig_ready
   *
   * @param {string} orderId
   * @returns {Promise<{multisigAddress: string, orderId: string, participants: number, threshold: number}>}
   */
  async setupMultisig(orderId) {
    const order = await MultisigOrder.findOne({ orderId });
    if (!order) {
      throw new MoneroMultisigError(`Order "${orderId}" not found`, 'ORDER_NOT_FOUND');
    }

    await this._ensureMoneroJS();

    try {
      order.addStatus('multisig_setup_initiated', 'Creating multisig wallet via monero-javascript');
      await order.save();

      const msWallet = await this._monerojs.createMultisigWallet({
        participants: order.totalParticipants,
        requiredSignatures: order.requiredSignatures,
        network: order.networkType || 'testnet',
      });

      const msAddress = await msWallet.getAddress(0, 0);
      const addressStr = msAddress.toString();
      const viewKey = await msWallet.getViewKey();

      order.multisigAddress = addressStr;
      order.addStatus('multisig_ready', `Multisig wallet ready at ${addressStr}`);
      await order.save();

      // Persist the multisig wallet record
      await MoneroWallet.create({
        address: addressStr,
        encryptedViewKey: MoneroWallet.encrypt(viewKey),
        encryptedSpendKey: '',
        networkType: order.networkType,
        encryptedMnemonic: '',
        isMultisig: true,
        multisigParticipants: order.totalParticipants,
        multisigThreshold: order.requiredSignatures,
        label: `Multisig-${order.orderId}`,
      });

      return {
        multisigAddress: addressStr,
        orderId: order.orderId,
        participants: order.totalParticipants,
        threshold: order.requiredSignatures,
      };
    } catch (err) {
      if (err instanceof MoneroMultisigError) throw err;
      order.addStatus('failed', `Multisig setup failed: ${err.message}`);
      await order.save().catch(() => {});
      throw new MoneroMultisigError(
        `Multisig setup failed: ${err.message}`,
        'MULTISIG_SETUP_FAILED',
      );
    }
  }

  /**
   * Sign the transaction for a multisig order.
   * Each participant calls this independently.
   *
   * @param {string} orderId
   * @param {string} participantId
   * @returns {Promise<object>} Signature result
   */
  async signTx(orderId, participantId) {
    const order = await MultisigOrder.findOne({ orderId });
    if (!order) {
      throw new MoneroMultisigError(`Order "${orderId}" not found`, 'ORDER_NOT_FOUND');
    }

    if (order.currentStatus !== 'funded') {
      throw new MoneroMultisigError(
        `Order is in "${order.currentStatus}" state; expected "funded"`,
        'INVALID_STATE',
      );
    }

    const participant = order.participants.find((p) => p.userId === participantId);
    if (!participant) {
      throw new MoneroMultisigError(
        `Participant "${participantId}" not in order`,
        'PARTICIPANT_NOT_FOUND',
      );
    }

    if (participant.signedTx) {
      throw new MoneroMultisigError(
        `Participant "${participantId}" has already signed`,
        'ALREADY_SIGNED',
      );
    }

    // In production this would invoke monero-javascript to sign
    participant.signedTx = `signed_${orderId}_${participantId}_${Date.now()}`;

    const signedCount = order.signedCount();
    const enough = signedCount >= order.requiredSignatures;
    order.addStatus(
      'signed',
      enough
        ? `Quorum reached: ${signedCount}/${order.requiredSignatures} signed`
        : `Participant ${participantId} signed (${signedCount}/${order.requiredSignatures})`,
    );
    await order.save();

    return {
      orderId: order.orderId,
      participantId,
      signedCount,
      requiredSignatures: order.requiredSignatures,
      enoughSignatures: enough,
    };
  }

  /**
   * Submit a fully-signed transaction to the network.
   *
   * @param {string} orderId
   * @returns {Promise<{txHash: string, orderId: string, status: string}>}
   */
  async submitTx(orderId) {
    const order = await MultisigOrder.findOne({ orderId });
    if (!order) {
      throw new MoneroMultisigError(`Order "${orderId}" not found`, 'ORDER_NOT_FOUND');
    }

    if (order.currentStatus !== 'signed') {
      throw new MoneroMultisigError(
        `Order is in "${order.currentStatus}" state; expected "signed"`,
        'INVALID_STATE',
      );
    }

    const signedCount = order.signedCount();
    if (signedCount < order.requiredSignatures) {
      throw new MoneroMultisigError(
        `Insufficient signatures: ${signedCount}/${order.requiredSignatures}`,
        'INSUFFICIENT_SIGNATURES',
      );
    }

    await this._ensureMoneroJS();

    try {
      // In production this would use monero-javascript to relay the tx
      const txHash = `tx_${orderId}_${Date.now()}`;
      order.txHash = txHash;
      order.addStatus('submitted', `Transaction submitted: ${txHash}`);
      await order.save();

      return {
        txHash,
        orderId: order.orderId,
        status: 'submitted',
      };
    } catch (err) {
      order.addStatus('failed', `Submit failed: ${err.message}`);
      await order.save().catch(() => {});
      throw new MoneroMultisigError(
        `Transaction submission failed: ${err.message}`,
        'TX_SUBMIT_FAILED',
      );
    }
  }

  /**
   * Release funds to the destination address after confirmation.
   *
   * @param {string} orderId
   * @returns {Promise<{orderId: string, destinationAddress: string|null, txHash: string|null, status: string}>}
   */
  async releaseFunds(orderId) {
    const order = await MultisigOrder.findOne({ orderId });
    if (!order) {
      throw new MoneroMultisigError(`Order "${orderId}" not found`, 'ORDER_NOT_FOUND');
    }

    if (order.currentStatus !== 'submitted') {
      throw new MoneroMultisigError(
        `Order is in "${order.currentStatus}" state; expected "submitted"`,
        'INVALID_STATE',
      );
    }

    order.addStatus('released', `Funds released to ${order.destinationAddress || 'N/A'}`);
    await order.save();

    return {
      orderId: order.orderId,
      destinationAddress: order.destinationAddress,
      txHash: order.txHash,
      status: 'released',
    };
  }

  /**
   * Refund an order. Allowed from: pending, funding, funded, signed, failed.
   *
   * @param {string} orderId
   * @returns {Promise<{orderId: string, status: string}>}
   */
  async refund(orderId) {
    const order = await MultisigOrder.findOne({ orderId });
    if (!order) {
      throw new MoneroMultisigError(`Order "${orderId}" not found`, 'ORDER_NOT_FOUND');
    }

    const refundable = new Set(['pending', 'funding', 'funded', 'signed', 'failed']);
    if (!refundable.has(order.currentStatus)) {
      throw new MoneroMultisigError(
        `Order is in "${order.currentStatus}" state and cannot be refunded`,
        'INVALID_STATE',
      );
    }

    order.addStatus('refunded', 'Funds returned to participants');
    await order.save();

    return {
      orderId: order.orderId,
      status: 'refunded',
    };
  }

  // ────────────── QUERIES ──────────────

  /**
   * Get a single order by orderId.
   */
  async getOrder(orderId) {
    const order = await MultisigOrder.findOne({ orderId });
    if (!order) {
      throw new MoneroMultisigError(`Order "${orderId}" not found`, 'ORDER_NOT_FOUND');
    }
    return order;
  }

  /**
   * List orders, optionally filtered.
   * @param {object} [filter={}]
   * @returns {Promise<MultisigOrder[]>}
   */
  async listOrders(filter = {}) {
    return MultisigOrder.find(filter).sort({ createdAt: -1 });
  }

  /**
   * List wallets, optionally filtered.
   * @param {object} [filter={}]
   * @returns {Promise<MoneroWallet[]>}
   */
  async getWallets(filter = {}) {
    return MoneroWallet.find(filter).sort({ createdAt: -1 });
  }
}

// Export a singleton instance
module.exports = new MoneroMultisigService();
module.exports.MoneroMultisigError = MoneroMultisigError;
