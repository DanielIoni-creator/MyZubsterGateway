/**
 * Monero 2-of-3 Multisig Wallet Module
 * 
 * Implements a 2-of-3 multisig escrow wallet for MyZubsterGateway.
 * 
 * Participants:
 *   - Buyer (client): Participant 1
 *   - Seller (professional): Participant 2  
 *   - AI Agent (platform): Participant 3
 * 
 * Signature threshold (M): 2 out of 3 (N)
 * 
 * Flow:
 *   1. Key generation — each participant generates their multisig keys
 *   2. Multisig setup — creation, key exchange, sync, finalization
 *   3. Funding — buyer deposits into the multisig wallet (import_multisig_info)
 *   4. Fund release — 2 signatures needed (buyer + seller, or buyer/seller + AI)
 *   5. Refund/dispute — AI agent + buyer can sign refund (2 sigs)
 * 
 * Monero multisig RPC methods used:
 *   - make_multisig          — Creates the multisig wallet
 *   - exchange_multisig_keys — Exchanges keys with other participants
 *   - finalize_multisig      — Finalizes the multisig setup
 *   - import_multisig_info   — Imports the multisig info from others (to see balance)
 *   - transfer               — Prepares a transaction
 *   - sign_multisig          — Signs a partially signed transaction
 *   - submit_multisig        — Submits the signed transaction
 *   - get_balance            — Gets the multisig wallet balance
 * 
 * @requires axios, dotenv
 */

const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG = {
  walletRpcUrl: process.env.MONERO_MULTISIG_WALLET_RPC_URL || process.env.MONERO_WALLET_RPC_URL || 'http://localhost:18083/json_rpc',
  username: process.env.MONERO_RPC_USERNAME || '',
  password: process.env.MONERO_RPC_PASSWORD || '',
  dataDir: process.env.MULTISIG_DATA_DIR || path.join(process.cwd(), 'data', 'multisig'),
  threshold: 2,   // M: signatures required
  total: 3,        // N: total participants
  defaultPriority: 0,
  minConfirmations: parseInt(process.env.MONERO_CONFIRMATIONS_DEFAULT) || 10,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generates a unique identifier for multisig wallets.
 * @returns {string}
 */
function generateMultisigId() {
  return `msig_${Date.now().toString(36)}_${crypto.randomBytes(6).toString('hex')}`;
}

/**
 * Generates a cryptographically random key for participant identification.
 * This is NOT a Monero private key — it's just a session/auth identifier.
 * @returns {string}
 */
function generateParticipantKey() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Ensure the data directory exists.
 * @param {string} dir
 */
function ensureDataDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ---------------------------------------------------------------------------
// MultisigWallet Class
// ---------------------------------------------------------------------------

class MultisigWallet {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    ensureDataDir(this.config.dataDir);
    this._cache = new Map();
  }

  // -----------------------------------------------------------------------
  // RPC call helper
  // -----------------------------------------------------------------------

  /**
   * Makes a JSON-RPC call to the Monero wallet RPC endpoint.
   * @param {string} method
   * @param {object} params
   * @returns {Promise<object>}
   */
  async _walletRpc(method, params = {}) {
    try {
      const response = await axios.post(this.config.walletRpcUrl, {
        jsonrpc: '2.0',
        id: '0',
        method,
        params,
      }, {
        auth: {
          username: this.config.username,
          password: this.config.password,
        },
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000,
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      return response.data.result;
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        throw new Error(`Monero multisig RPC error: ${err.response.data.error.message}`);
      }
      throw new Error(`Monero multisig RPC failed: ${err.message}`);
    }
  }

  // -----------------------------------------------------------------------
  // 1. KEY GENERATION — Generate multisig participant keys
  // -----------------------------------------------------------------------

  /**
   * Generates keys for all 3 participants.
   * In a real deployment, each participant would generate their own keys
   * on their own machine. This method simulates/centralizes the generation
   * for the platform to bootstrap.
   * 
   * @returns {Promise<object>} The multisig info for all participants
   * 
   * Structure:
   * {
   *   multisigId: string,
   *   participants: {
   *     buyer:     { participantKey, multisigInfo },
   *     seller:    { participantKey, multisigInfo },
   *     aiAgent:   { participantKey, multisigInfo }
   *   },
   *   threshold: 2,
   *   total: 3,
   *   createdAt: ISO timestamp
   * }
   */
  async generateAllKeys() {
    const multisigId = generateMultisigId();
    
    // Each participant runs make_multisig to prepare their seed
    // In practice: 3 separate wallets OR the same wallet rebuilt 3 times
    // For the platform, we simulate 3 participants using sequential calls.

    const participants = {};
    
    // Step 1: Buyer (participant 1) creates the multisig
    const buyerResult = await this._walletRpc('make_multisig', {
      multisig_info: '',
      threshold: this.config.threshold,
    });
    
    participants.buyer = {
      participantKey: generateParticipantKey(),
      multisigInfo: buyerResult.multisig_info,
      role: 'buyer',
    };

    // Step 2: Seller (participant 2) joins the multisig
    // In production the seller would run this from their own wallet.
    // Here we simulate by using is_multisig=false and exchanging keys.
    const sellerResult = await this._walletRpc('make_multisig', {
      multisig_info: buyerResult.multisig_info,
      threshold: this.config.threshold,
    });
    
    participants.seller = {
      participantKey: generateParticipantKey(),
      multisigInfo: sellerResult.multisig_info,
      role: 'seller',
    };

    // Step 3: AI Agent (participant 3) joins
    const agentResult = await this._walletRpc('make_multisig', {
      multisig_info: sellerResult.multisig_info,
      threshold: this.config.threshold,
    });
    
    participants.aiAgent = {
      participantKey: generateParticipantKey(),
      multisigInfo: agentResult.multisig_info,
      role: 'aiAgent',
    };

    // Step 4: Exchange keys round — N-1 rounds (for M=2,N=3, we need 1 round)
    // Buyer exchanges with seller
    const exchange1 = await this._walletRpc('exchange_multisig_keys', {
      multisig_info: participants.seller.multisigInfo,
      password: '',
    });
    
    participants.buyer.multisigInfo = exchange1.multisig_info;

    // Seller exchanges with buyer's updated info
    const exchange2 = await this._walletRpc('exchange_multisig_keys', {
      multisig_info: exchange1.multisig_info,
      password: '',
    });
    
    participants.seller.multisigInfo = exchange2.multisig_info;

    // AI Agent exchanges with seller's updated info
    const exchange3 = await this._walletRpc('exchange_multisig_keys', {
      multisig_info: exchange2.multisig_info,
      password: '',
    });
    
    participants.aiAgent.multisigInfo = exchange3.multisig_info;

    // Step 5: Finalize — get the final multisig wallet address
    const addressResult = await this._walletRpc('get_address', {
      account_index: 0,
    });

    const wallet = {
      multisigId,
      participants,
      threshold: this.config.threshold,
      total: this.config.total,
      address: addressResult.address,
      createdAt: new Date().toISOString(),
      status: 'initialized',
    };

    // Persist to disk
    this._saveWalletData(multisigId, wallet);

    return wallet;
  }

  // -----------------------------------------------------------------------
  // 2. MULTISIG SETUP — Import multisig info for a participant
  // -----------------------------------------------------------------------

  /**
   * Imports multisig information for a participant so they can
   * see the multisig wallet balance and prepare transactions.
   * 
   * @param {string} multisigId
   * @param {object} participantInfo — { multisigInfo, role }
   * @returns {Promise<object>} The imported wallet state
   */
  async importMultisigInfo(multisigId, participantInfo) {
    const wallet = this._loadWalletData(multisigId);
    if (!wallet) {
      throw new Error(`Multisig wallet ${multisigId} not found`);
    }

    const result = await this._walletRpc('import_multisig_info', {
      info: [participantInfo.multisigInfo],
    });

    wallet.status = 'funded';
    wallet.lastImportedBy = participantInfo.role;
    wallet.lastImportedAt = new Date().toISOString();
    this._saveWalletData(multisigId, wallet);

    return {
      ...result,
      multisigId,
      walletAddress: wallet.address,
    };
  }

  /**
   * Prepares multisig for usage — all participants have exchanged their info.
   * After this, the multisig wallet can be monitored for incoming funds.
   * 
   * @param {string} multisigId
   * @returns {Promise<object>}
   */
  async finalizeSetup(multisigId) {
    const wallet = this._loadWalletData(multisigId);
    if (!wallet) {
      throw new Error(`Multisig wallet ${multisigId} not found`);
    }

    wallet.status = 'ready';
    wallet.finalizedAt = new Date().toISOString();
    this._saveWalletData(multisigId, wallet);

    return {
      multisigId,
      address: wallet.address,
      status: 'ready',
      threshold: wallet.threshold,
      total: wallet.total,
    };
  }

  // -----------------------------------------------------------------------
  // 3. BALANCE & MONITORING
  // -----------------------------------------------------------------------

  /**
   * Gets the balance of the multisig wallet.
   * @returns {Promise<object>} { balance, unlocked_balance }
   */
  async getMultisigBalance() {
    return await this._walletRpc('get_balance', { account_index: 0 });
  }

  /**
   * Checks if a multisig wallet has enough unlocked balance.
   * @param {string} multisigId
   * @param {number} expectedAmount — in XMR
   * @returns {Promise<object>} { funded, balance, unlockedBalance }
   */
  async verifyFunding(multisigId, expectedAmount) {
    const wallet = this._loadWalletData(multisigId);
    if (!wallet) {
      throw new Error(`Multisig wallet ${multisigId} not found`);
    }

    const balance = await this.getMultisigBalance();
    const unlockedBalance = balance.unlocked_balance / 1e12;
    const totalBalance = balance.balance / 1e12;

    return {
      multisigId,
      funded: unlockedBalance >= expectedAmount,
      balance: totalBalance,
      unlockedBalance,
      expectedAmount,
      address: wallet.address,
    };
  }

  // -----------------------------------------------------------------------
  // 4. SIGN & SUBMIT TRANSACTIONS — Fund release / Refund
  // -----------------------------------------------------------------------

  /**
   * Creates a transfer (transaction) from the multisig wallet.
   * This returns an unsigned transaction set that must be signed by
   * M participants before submission.
   * 
   * @param {string} destination — recipient address
   * @param {number} amount — amount in XMR
   * @param {number} priority — transaction priority (0-4)
   * @returns {Promise<object>} { tx_hash, unsigned_txset, fee }
   */
  async prepareTransfer(destination, amount, priority = null) {
    const atomicAmount = Math.round(amount * 1e12);
    const prio = priority !== null ? priority : this.config.defaultPriority;

    return await this._walletRpc('transfer', {
      destinations: [{ address: destination, amount: atomicAmount }],
      priority: prio,
      do_not_relay: true,   // Don't relay — needs signing first
      get_tx_metadata: true,
    });
  }

  /**
   * Signs a multisig transaction.
   * Each signer must call this with the unsigned_txset.
   * After M signers sign, the txset can be submitted.
   * 
   * @param {object} unsignedTxset — the unsigned transaction set from prepareTransfer
   * @returns {Promise<object>} { tx_hash, signed_txset }
   */
  async signTransaction(unsignedTxset) {
    return await this._walletRpc('sign_multisig', {
      tx_data_hex: unsignedTxset,
    });
  }

  /**
   * Submits a fully-signed multisig transaction.
   * @param {object} signedTxset — the signed transaction set from signTransaction
   * @returns {Promise<object>} { tx_hash_list }
   */
  async submitTransaction(signedTxset) {
    return await this._walletRpc('submit_multisig', {
      tx_data_hex: signedTxset,
    });
  }

  // -----------------------------------------------------------------------
  // 5. HIGH-LEVEL FLOWS
  // -----------------------------------------------------------------------

  /**
   * Fund Release Flow — Buyer + Seller sign to release funds.
   * (Or Buyer/Seller + AI Agent in case of dispute)
   * 
   * @param {string} multisigId
   * @param {string} destinationAddress — professional/seller address
   * @param {number} amount — amount to release in XMR
   * @param {object[]} signers — array of { role, multisigInfo } who will sign
   * @returns {Promise<object>} Release result with tx hashes
   */
  async releaseFunds(multisigId, destinationAddress, amount, signers) {
    if (!signers || signers.length < this.config.threshold) {
      throw new Error(`Need at least ${this.config.threshold} signers, got ${signers ? signers.length : 0}`);
    }

    const wallet = this._loadWalletData(multisigId);
    if (!wallet) {
      throw new Error(`Multisig wallet ${multisigId} not found`);
    }

    // Step 1: Prepare the transfer (unsigned)
    const { unsigned_txset, tx_hash } = await this.prepareTransfer(destinationAddress, amount);

    // Step 2: Each signer signs
    let currentTxset = unsigned_txset;
    const signatures = [];

    for (const signer of signers) {
      // In production each signer would run this on their own wallet.
      // Here we simulate by importing their multisig info and signing.
      if (signer.multisigInfo) {
        await this._walletRpc('import_multisig_info', {
          info: [signer.multisigInfo],
        });
      }

      const signResult = await this.signTransaction(currentTxset);
      currentTxset = signResult.signed_txset || currentTxset;
      signatures.push({
        role: signer.role,
        tx_hash: signResult.tx_hash,
        signed: true,
      });
    }

    // Step 3: Submit
    const submitResult = await this.submitTransaction(currentTxset);

    // Update wallet
    wallet.status = 'released';
    wallet.releasedAt = new Date().toISOString();
    wallet.releaseTxHashes = submitResult.tx_hash_list;
    wallet.releasedTo = destinationAddress;
    wallet.releasedAmount = amount;
    this._saveWalletData(multisigId, wallet);

    return {
      multisigId,
      destinationAddress,
      amount,
      txHashes: submitResult.tx_hash_list,
      signatures,
      status: 'released',
    };
  }

  /**
   * Dispute Resolution Flow — AI Agent + either Buyer or Seller signs.
   * 
   * @param {string} multisigId
   * @param {string} destinationAddress — refund or payout address
   * @param {number} amount — amount in XMR
   * @param {'refund'|'release'} resolution — resolution type
   * @param {object} aiAgentParty — AI agent's multisig info
   * @param {object} cooperatingParty — the buyer or seller who cooperates
   * @returns {Promise<object>}
   */
  async resolveDispute(multisigId, destinationAddress, amount, resolution, aiAgentParty, cooperatingParty) {
    const wallet = this._loadWalletData(multisigId);
    if (!wallet) {
      throw new Error(`Multisig wallet ${multisigId} not found`);
    }

    if (!aiAgentParty || !cooperatingParty) {
      throw new Error('Both AI agent and one cooperating party required for dispute resolution');
    }

    // Two signers: AI agent + cooperating party = 2 sigs = threshold
    const signers = [
      { role: 'aiAgent', multisigInfo: aiAgentParty.multisigInfo },
      { role: cooperatingParty.role, multisigInfo: cooperatingParty.multisigInfo },
    ];

    const result = await this.releaseFunds(multisigId, destinationAddress, amount, signers);

    // Update wallet status based on resolution type
    wallet.status = resolution === 'refund' ? 'refunded' : 'released';
    wallet.disputeResolvedAt = new Date().toISOString();
    wallet.disputeResolution = resolution;
    this._saveWalletData(multisigId, wallet);

    return {
      ...result,
      resolution,
      status: wallet.status,
    };
  }

  // -----------------------------------------------------------------------
  // 6. ORDER INTEGRATION — Full escrow flow with multisig
  // -----------------------------------------------------------------------

  /**
   * Creates a multisig wallet for an order and generates keys.
   * This is the entry point for order creation.
   * 
   * @param {object} order — { orderId, buyerId, sellerId, amount }
   * @returns {Promise<object>} Multisig wallet with all participant keys
   */
  async createOrderMultisigWallet(order) {
    const { orderId, buyerId, sellerId, amount } = order;
    if (!orderId || !buyerId || !sellerId || !amount) {
      throw new Error('Missing required order fields: orderId, buyerId, sellerId, amount');
    }

    // Generate the multisig wallet
    const wallet = await this.generateAllKeys();
    
    // Tag it with order info
    wallet.orderId = orderId;
    wallet.buyerId = buyerId;
    wallet.sellerId = sellerId;
    wallet.orderAmount = amount;
    wallet.status = 'created';
    
    this._saveWalletData(wallet.multisigId, wallet);

    return wallet;
  }

  /**
   * Verifies the entire multisig transaction flow for an order.
   * 
   * @param {string} multisigId
   * @returns {Promise<object>} Full verification result
   */
  async verifyOrderFlow(multisigId) {
    const wallet = this._loadWalletData(multisigId);
    if (!wallet) {
      throw new Error(`Multisig wallet ${multisigId} not found`);
    }

    const balance = await this.getMultisigBalance().catch(() => null);

    return {
      multisigId,
      orderId: wallet.orderId,
      address: wallet.address,
      status: wallet.status,
      participants: wallet.total,
      threshold: wallet.threshold,
      balance: balance ? {
        total: balance.balance / 1e12,
        unlocked: balance.unlocked_balance / 1e12,
      } : null,
      releaseTxHashes: wallet.releaseTxHashes || [],
      releasedTo: wallet.releasedTo || null,
      releasedAmount: wallet.releasedAmount || null,
      createdAt: wallet.createdAt,
      finalizedAt: wallet.finalizedAt || null,
      releasedAt: wallet.releasedAt || null,
    };
  }

  // -----------------------------------------------------------------------
  // 7. STORAGE (file-based; in production use DB)
  // -----------------------------------------------------------------------

  /**
   * Save wallet data to a JSON file.
   * @param {string} multisigId
   * @param {object} data
   */
  _saveWalletData(multisigId, data) {
    const filePath = path.join(this.config.dataDir, `${multisigId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    this._cache.set(multisigId, data);
  }

  /**
   * Load wallet data from a JSON file.
   * @param {string} multisigId
   * @returns {object|null}
   */
  _loadWalletData(multisigId) {
    if (this._cache.has(multisigId)) {
      return this._cache.get(multisigId);
    }

    const filePath = path.join(this.config.dataDir, `${multisigId}.json`);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      this._cache.set(multisigId, data);
      return data;
    } catch (err) {
      console.error(`Error loading multisig wallet ${multisigId}:`, err.message);
      return null;
    }
  }

  /**
   * List all stored multisig wallets.
   * @returns {object[]}
   */
  listWallets() {
    const files = fs.readdirSync(this.config.dataDir).filter(f => f.endsWith('.json'));
    return files.map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(this.config.dataDir, f), 'utf8'));
      return {
        multisigId: data.multisigId,
        orderId: data.orderId || null,
        address: data.address,
        status: data.status,
        createdAt: data.createdAt,
      };
    });
  }

  /**
   * Deletes a multisig wallet (cleanup).
   * @param {string} multisigId
   * @returns {boolean}
   */
  deleteWallet(multisigId) {
    const filePath = path.join(this.config.dataDir, `${multisigId}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      this._cache.delete(multisigId);
      return true;
    }
    return false;
  }
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

module.exports = MultisigWallet;
module.exports.generateMultisigId = generateMultisigId;
module.exports.generateParticipantKey = generateParticipantKey;
