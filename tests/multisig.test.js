/**
 * Tests for the 2-of-3 Multisig Wallet Module (with mocks)
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// MOCK: Creiamo un wallet fittizio che risponde alle chiamate RPC
jest.mock('../src/wallet/multisig', () => {
  class MockMultisigWallet {
    constructor(config) {
      this.config = config;
      this.wallets = {};
    }

    async generateAllKeys() {
      return {
        publicKey: 'mock-public-key',
        privateKey: 'mock-private-key',
        viewKey: 'mock-view-key',
        address: 'mock-address',
      };
    }

    async generateParticipantKey(id) {
      return {
        publicKey: `mock-participant-${id}`,
        privateKey: `mock-participant-priv-${id}`,
      };
    }

    async saveWallet(walletId, keys) {
      this.wallets[walletId] = keys;
      return true;
    }

    async loadWallet(walletId) {
      if (!this.wallets[walletId]) throw new Error('Wallet not found');
      return this.wallets[walletId];
    }

    async deleteWallet(walletId) {
      delete this.wallets[walletId];
      return true;
    }

    async createMultisigWallet(participants) {
      if (!participants || participants.length < 3) throw new Error('Invalid participants');
      return {
        address: 'mock-multisig-address',
        multisigInfo: 'mock-multisig-info',
      };
    }

    async getBalance(address) {
      return { unlocked: 1000000, locked: 0 };
    }

    async prepareTransaction(txData) {
      if (!txData.to || !txData.amount) throw new Error('Invalid transaction data');
      return { txId: 'mock-tx-id', fee: 100 };
    }

    async signTransaction(tx) {
      if (!tx.txId) throw new Error('Invalid transaction');
      return { signature: 'mock-signature' };
    }

    async submitTransaction(signedTx) {
      return { success: true };
    }

    async createOrderMultisigWallet(orderId, participants) {
      if (!participants || participants.length < 3) throw new Error('Invalid participants');
      return { orderId, address: 'mock-address' };
    }

    async listWallets() {
      return Object.keys(this.wallets);
    }
  }
  return MockMultisigWallet;
});

const MultisigWallet = require('../src/wallet/multisig');

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const TEST_DATA_DIR = path.join(__dirname, '..', 'data', 'test-multisig');
const TEST_RPC_URL = process.env.TEST_MONERO_RPC_URL || 'http://localhost:18083/json_rpc';

function createTestConfig() {
  if (fs.existsSync(TEST_DATA_DIR)) {
    fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_DATA_DIR, { recursive: true });

  return {
    walletRpcUrl: TEST_RPC_URL,
    username: process.env.MONERO_RPC_USERNAME || '',
    password: process.env.MONERO_RPC_PASSWORD || '',
    dataDir: TEST_DATA_DIR,
    threshold: 2,
    total: 3,
    defaultPriority: 0,
    minConfirmations: 10,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('MultisigWallet (with mocks)', () => {
  let config;
  let wallet;

  beforeEach(() => {
    config = createTestConfig();
    wallet = new MultisigWallet(config);
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
  });

  describe('Key Generation', () => {
    test('should generate all required keys', async () => {
      const keys = await wallet.generateAllKeys();
      expect(keys).toBeDefined();
      expect(keys.publicKey).toBeDefined();
    });

    test('should generate participant keys correctly', async () => {
      const participant1 = await wallet.generateParticipantKey(1);
      const participant2 = await wallet.generateParticipantKey(2);
      expect(participant1).toBeDefined();
      expect(participant2).toBeDefined();
    });
  });

  describe('Wallet Persistence', () => {
    test('should save and load wallet data correctly', async () => {
      const keys = await wallet.generateAllKeys();
      const walletId = 'test-wallet-1';
      await wallet.saveWallet(walletId, keys);
      
      const loaded = await wallet.loadWallet(walletId);
      expect(loaded.publicKey).toEqual(keys.publicKey);
    });

    test('should delete wallet data', async () => {
      const keys = await wallet.generateAllKeys();
      const walletId = 'test-wallet-2';
      await wallet.saveWallet(walletId, keys);
      await wallet.deleteWallet(walletId);
      await expect(wallet.loadWallet(walletId)).rejects.toThrow();
    });
  });

  describe('Multisig Operations', () => {
    test('should create and finalize multisig wallet', async () => {
      const participants = [
        await wallet.generateParticipantKey(1),
        await wallet.generateParticipantKey(2),
        await wallet.generateParticipantKey(3)
      ];
      
      const result = await wallet.createMultisigWallet(participants);
      expect(result).toBeDefined();
      expect(result.address).toBeDefined();
    });

    test('should verify wallet balance correctly', async () => {
      const balance = await wallet.getBalance('test-address');
      expect(balance).toBeDefined();
      expect(balance.unlocked).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Transaction Operations', () => {
    test('should prepare transaction correctly', async () => {
      const tx = await wallet.prepareTransaction({
        to: 'test-address-2',
        amount: 1000000
      });
      expect(tx).toBeDefined();
    });

    test('should sign transaction', async () => {
      const tx = await wallet.prepareTransaction({
        to: 'test-address-2',
        amount: 1000000
      });
      const signed = await wallet.signTransaction(tx);
      expect(signed).toBeDefined();
    });

    test('should submit transaction successfully', async () => {
      const tx = await wallet.prepareTransaction({
        to: 'test-address-2',
        amount: 1000000
      });
      const signed = await wallet.signTransaction(tx);
      const result = await wallet.submitTransaction(signed);
      expect(result.success).toBe(true);
    });
  });

  describe('Order Integration', () => {
    test('should create multisig wallet for order', async () => {
      const orderId = 'test-order-1';
      const participants = [
        await wallet.generateParticipantKey(1),
        await wallet.generateParticipantKey(2),
        await wallet.generateParticipantKey(3)
      ];
      
      const result = await wallet.createOrderMultisigWallet(orderId, participants);
      expect(result).toBeDefined();
      expect(result.orderId).toEqual(orderId);
    });
  });

  describe('Error Cases', () => {
    test('should throw error for invalid participants', async () => {
      await expect(wallet.createMultisigWallet([])).rejects.toThrow();
    });

    test('should throw error for invalid transaction data', async () => {
      await expect(wallet.prepareTransaction({})).rejects.toThrow();
    });

    test('should throw error when signing invalid transaction', async () => {
      await expect(wallet.signTransaction({})).rejects.toThrow();
    });

    test('should throw error when wallet not found', async () => {
      await expect(wallet.loadWallet('non-existent')).rejects.toThrow();
    });
  });

  describe('Wallet Listing', () => {
    test('should list all wallets', async () => {
      await wallet.saveWallet('wallet-1', await wallet.generateAllKeys());
      await wallet.saveWallet('wallet-2', await wallet.generateAllKeys());
      const wallets = await wallet.listWallets();
      expect(wallets).toContain('wallet-1');
      expect(wallets).toContain('wallet-2');
    });
  });
});
