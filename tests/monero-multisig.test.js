/**
 * Monero Multisig — unit tests
 *
 * Completely mocks monero-javascript, MoneroWallet and MultisigOrder
 * so no real crypto or database calls are made.
 */

/* ──────────── Mocks ──────────── */

const mockEncrypt = jest.fn((text) => `enc:${text}`);
const mockDecrypt = jest.fn((text) => text.replace(/^enc:/, ''));

jest.mock('../models/MoneroWallet', () => {
  const actual = jest.requireActual('../models/MoneroWallet');
  // We only need the schema statics; the model constructor is mocked below
  return {
    __esModule: true,
    default: {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      encrypt: mockEncrypt,
      decrypt: mockDecrypt,
    },
    encrypt: mockEncrypt,
    decrypt: mockDecrypt,
  };
});

const mockAddStatus = jest.fn();
const mockSave = jest.fn();
const mockHasParticipant = jest.fn();
const mockSignedCount = jest.fn();

const mockOrderInstance = (overrides = {}) => ({
  orderId: 'ms_test_order',
  participants: [
    { userId: 'alice', signedTx: null },
    { userId: 'bob', signedTx: null },
    { userId: 'carol', signedTx: null },
  ],
  requiredSignatures: 2,
  totalParticipants: 3,
  amount: '50',
  destinationAddress: 'dest_addr',
  networkType: 'testnet',
  currentStatus: 'pending',
  txHash: null,
  errorMessage: null,
  statusHistory: [],
  addStatus: mockAddStatus,
  save: mockSave,
  hasParticipant: mockHasParticipant,
  signedCount: mockSignedCount,
  ...overrides,
});

const MockMultisigOrder = {
  create: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
};

jest.mock('../models/MultisigOrder', () => {
  const actual = jest.requireActual('../models/MultisigOrder');
  return {
    __esModule: true,
    default: MockMultisigOrder,
  };
});

/* Mock monero-javascript */
const mockWalletKeys = {
  getMnemonic: jest.fn().mockResolvedValue('mock mnemonic phrase for test'),
  getAddress: jest.fn().mockResolvedValue({ toString: () => '4AK1o1yMTVL5XqW1x7MZ7PWCbKM8KPLWMyq1VLBdNCHXxAbx7MYXJkQW9b2JjF1M3qZ6QhYMLKrQMQVrPGHJC3KzXQKJK4t' }),
  getSpendKey: jest.fn().mockResolvedValue('mock_spend_key'),
  getViewKey: jest.fn().mockResolvedValue('mock_view_key'),
};

const mockMsWallet = {
  getAddress: jest.fn().mockResolvedValue({ toString: () => '9yRq8LjL9xFJLZXL7KQm5KrxnL7jZ1zX1bC1d5e9f7a3b2c4d6e8f0a1b2c3d4e5f6a7b8c9d0e' }),
  getViewKey: jest.fn().mockResolvedValue('ms_view_key'),
};

jest.mock('monero-javascript', () => ({
  createWalletKeys: jest.fn().mockResolvedValue(mockWalletKeys),
  createMultisigWallet: jest.fn().mockResolvedValue(mockMsWallet),
}));

/* Module under test — must be required AFTER mocks are set up */
const moneroMultisigService = require('../services/moneroMultisigService');
const { MoneroMultisigError } = require('../services/moneroMultisigService');
const MoneroWallet = require('../models/MoneroWallet');
const MultisigOrder = require('../models/MultisigOrder');

/* ──────────── Tests ──────────── */

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MoneroMultisigService', () => {
  /* ───── generateWallet ───── */

  describe('generateWallet', () => {
    it('creates a wallet and returns a summary', async () => {
      MoneroWallet.create.mockResolvedValue({
        _id: 'wallet123',
        address: '4AK1o1yMTVL5XqW1x7MZ7PWCbKM8KPLWMyq1VLBdNCHXxAbx7MYXJkQW9b2JjF1M3qZ6QhYMLKrQMQVrPGHJC3KzXQKJK4t',
      });

      const result = await moneroMultisigService.generateWallet('testnet', 'my-wallet');

      expect(MoneroWallet.encrypt).toHaveBeenCalledTimes(3); // mnemonic, spend, view
      expect(MoneroWallet.create).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({
        walletId: 'wallet123',
        address: expect.stringContaining('4AK'),
        networkType: 'testnet',
        label: 'my-wallet',
      });
    });
  });

  /* ───── createOrder ───── */

  describe('createOrder', () => {
    it('creates an order with the given participants', async () => {
      MultisigOrder.create.mockResolvedValue(
        mockOrderInstance({ orderId: 'ms_new_order' }),
      );

      const result = await moneroMultisigService.createOrder({
        participants: ['alice', 'bob', 'carol'],
        requiredSignatures: 2,
        amount: '100',
        destinationAddress: 'dest',
        networkType: 'testnet',
      });

      expect(result).toMatchObject({
        orderId: expect.stringMatching(/^ms_/),
        participants: 3,
        requiredSignatures: 2,
        status: 'pending',
      });
    });

    it('throws when participant count is less than required signatures', async () => {
      await expect(
        moneroMultisigService.createOrder({
          participants: ['alice'],
          requiredSignatures: 2,
        }),
      ).rejects.toThrow(MoneroMultisigError);

      await expect(
        moneroMultisigService.createOrder({
          participants: ['alice'],
          requiredSignatures: 2,
        }),
      ).rejects.toMatchObject({ code: 'INVALID_PARAMETERS' });
    });

    it('throws when participants array is empty', async () => {
      await expect(
        moneroMultisigService.createOrder({
          participants: [],
          requiredSignatures: 1,
        }),
      ).rejects.toMatchObject({ code: 'INVALID_PARAMETERS' });
    });
  });

  /* ───── setupMultisig ───── */

  describe('setupMultisig', () => {
    it('sets up a 2/3 multisig wallet and persists it', async () => {
      const order = mockOrderInstance({ currentStatus: 'funding' });
      MultisigOrder.findOne.mockResolvedValue(order);
      MoneroWallet.create.mockResolvedValue({});

      const result = await moneroMultisigService.setupMultisig('ms_test_order');

      expect(order.addStatus).toHaveBeenCalledWith(
        'multisig_setup_initiated',
        expect.any(String),
      );
      expect(order.addStatus).toHaveBeenCalledWith(
        'multisig_ready',
        expect.stringContaining('9yRq'),
      );
      expect(order.save).toHaveBeenCalled();
      expect(MoneroWallet.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isMultisig: true,
          multisigParticipants: 3,
          multisigThreshold: 2,
        }),
      );
      expect(result).toMatchObject({
        multisigAddress: expect.stringContaining('9yRq'),
        participants: 3,
        threshold: 2,
      });
    });

    it('throws MoneroMultisigError when order is not found', async () => {
      MultisigOrder.findOne.mockResolvedValue(null);

      await expect(
        moneroMultisigService.setupMultisig('nonexistent'),
      ).rejects.toMatchObject({ code: 'ORDER_NOT_FOUND' });
    });

    it('wraps library errors with MoneroMultisigError', async () => {
      MultisigOrder.findOne.mockResolvedValue(mockOrderInstance());
      const monerojs = require('monero-javascript');
      monerojs.createMultisigWallet.mockRejectedValue(new Error('RPC timeout'));

      await expect(
        moneroMultisigService.setupMultisig('ms_test_order'),
      ).rejects.toMatchObject({ code: 'MULTISIG_SETUP_FAILED' });
    });
  });

  /* ───── signTx ───── */

  describe('signTx', () => {
    it('signs a transaction for a participant', async () => {
      const order = mockOrderInstance({
        currentStatus: 'funded',
        signedCount: mockSignedCount.mockReturnValue(1),
      });
      MultisigOrder.findOne.mockResolvedValue(order);

      const result = await moneroMultisigService.signTx('ms_test_order', 'alice');

      expect(order.participants[0].signedTx).toBeTruthy();
      expect(order.addStatus).toHaveBeenCalled();
      expect(result).toMatchObject({
        orderId: 'ms_test_order',
        participantId: 'alice',
        signedCount: 1,
        enoughSignatures: false,
      });
    });

    it('throws when signatures reach quorum (2/3)', async () => {
      const order = mockOrderInstance({
        currentStatus: 'funded',
        participants: [
          { userId: 'alice', signedTx: 'tx1' },
          { userId: 'bob', signedTx: null },
          { userId: 'carol', signedTx: null },
        ],
        signedCount: mockSignedCount.mockReturnValue(2),
      });
      MultisigOrder.findOne.mockResolvedValue(order);

      const result = await moneroMultisigService.signTx('ms_test_order', 'bob');

      expect(result.enoughSignatures).toBe(true);
    });

    it('throws when order is not in "funded" state', async () => {
      MultisigOrder.findOne.mockResolvedValue(
        mockOrderInstance({ currentStatus: 'pending' }),
      );

      await expect(
        moneroMultisigService.signTx('ms_test_order', 'alice'),
      ).rejects.toMatchObject({ code: 'INVALID_STATE' });
    });

    it('throws when participant is not part of the order', async () => {
      MultisigOrder.findOne.mockResolvedValue(
        mockOrderInstance({ currentStatus: 'funded' }),
      );

      await expect(
        moneroMultisigService.signTx('ms_test_order', 'mallory'),
      ).rejects.toMatchObject({ code: 'PARTICIPANT_NOT_FOUND' });
    });

    it('throws when participant already signed', async () => {
      MultisigOrder.findOne.mockResolvedValue(
        mockOrderInstance({
          currentStatus: 'funded',
          participants: [
            { userId: 'alice', signedTx: 'already_signed' },
            { userId: 'bob', signedTx: null },
          ],
        }),
      );

      await expect(
        moneroMultisigService.signTx('ms_test_order', 'alice'),
      ).rejects.toMatchObject({ code: 'ALREADY_SIGNED' });
    });
  });

  /* ───── submitTx ───── */

  describe('submitTx', () => {
    it('submits a transaction with enough signatures', async () => {
      MultisigOrder.findOne.mockResolvedValue(
        mockOrderInstance({
          currentStatus: 'signed',
          signedCount: mockSignedCount.mockReturnValue(2),
        }),
      );

      const result = await moneroMultisigService.submitTx('ms_test_order');

      expect(result).toMatchObject({
        txHash: expect.stringMatching(/^tx_/),
        status: 'submitted',
      });
    });

    it('throws when order is not in "signed" state', async () => {
      MultisigOrder.findOne.mockResolvedValue(
        mockOrderInstance({ currentStatus: 'funded' }),
      );

      await expect(
        moneroMultisigService.submitTx('ms_test_order'),
      ).rejects.toMatchObject({ code: 'INVALID_STATE' });
    });

    it('throws when not enough signatures', async () => {
      MultisigOrder.findOne.mockResolvedValue(
        mockOrderInstance({
          currentStatus: 'signed',
          signedCount: mockSignedCount.mockReturnValue(1),
        }),
      );

      await expect(
        moneroMultisigService.submitTx('ms_test_order'),
      ).rejects.toMatchObject({ code: 'INSUFFICIENT_SIGNATURES' });
    });

    it('throws when order is not found', async () => {
      MultisigOrder.findOne.mockResolvedValue(null);

      await expect(
        moneroMultisigService.submitTx('nonexistent'),
      ).rejects.toMatchObject({ code: 'ORDER_NOT_FOUND' });
    });
  });

  /* ───── releaseFunds ───── */

  describe('releaseFunds', () => {
    it('releases funds when order is submitted', async () => {
      MultisigOrder.findOne.mockResolvedValue(
        mockOrderInstance({
          currentStatus: 'submitted',
          txHash: 'tx_hash_123',
          destinationAddress: 'dest_addr',
        }),
      );

      const result = await moneroMultisigService.releaseFunds('ms_test_order');

      expect(result.status).toBe('released');
      expect(result.destinationAddress).toBe('dest_addr');
    });

    it('throws when order is not in "submitted" state', async () => {
      MultisigOrder.findOne.mockResolvedValue(
        mockOrderInstance({ currentStatus: 'pending' }),
      );

      await expect(
        moneroMultisigService.releaseFunds('ms_test_order'),
      ).rejects.toMatchObject({ code: 'INVALID_STATE' });
    });
  });

  /* ───── refund ───── */

  describe('refund', () => {
    it('refunds an order in "funded" state', async () => {
      MultisigOrder.findOne.mockResolvedValue(
        mockOrderInstance({ currentStatus: 'funded' }),
      );

      const result = await moneroMultisigService.refund('ms_test_order');
      expect(result.status).toBe('refunded');
    });

    it('refunds a failed order', async () => {
      MultisigOrder.findOne.mockResolvedValue(
        mockOrderInstance({ currentStatus: 'failed' }),
      );

      const result = await moneroMultisigService.refund('ms_test_order');
      expect(result.status).toBe('refunded');
    });

    it('throws when order is in "released" state', async () => {
      MultisigOrder.findOne.mockResolvedValue(
        mockOrderInstance({ currentStatus: 'released' }),
      );

      await expect(
        moneroMultisigService.refund('ms_test_order'),
      ).rejects.toMatchObject({ code: 'INVALID_STATE' });
    });
  });

  /* ───── getOrder ───── */

  describe('getOrder', () => {
    it('returns an order when found', async () => {
      const order = mockOrderInstance();
      MultisigOrder.findOne.mockResolvedValue(order);

      const result = await moneroMultisigService.getOrder('ms_test_order');
      expect(result.orderId).toBe('ms_test_order');
    });

    it('throws when order is not found', async () => {
      MultisigOrder.findOne.mockResolvedValue(null);

      await expect(
        moneroMultisigService.getOrder('nonexistent'),
      ).rejects.toMatchObject({ code: 'ORDER_NOT_FOUND' });
    });
  });

  /* ───── listOrders / getWallets ───── */

  describe('listOrders', () => {
    it('returns an array of orders', async () => {
      const sortFn = jest.fn().mockResolvedValue([mockOrderInstance()]);
      MultisigOrder.find.mockReturnValue({ sort: sortFn });

      const result = await moneroMultisigService.listOrders();
      expect(result).toHaveLength(1);
      expect(sortFn).toHaveBeenCalledWith({ createdAt: -1 });
    });
  });

  describe('getWallets', () => {
    it('returns an array of wallets', async () => {
      const sortFn = jest.fn().mockResolvedValue([{ address: 'addr1' }]);
      MoneroWallet.find.mockReturnValue({ sort: sortFn });

      const result = await moneroMultisigService.getWallets();
      expect(result).toHaveLength(1);
      expect(sortFn).toHaveBeenCalledWith({ createdAt: -1 });
    });
  });

  /* ───── MoneroMultisigError ───── */

  describe('MoneroMultisigError', () => {
    it('is an Error subclass with code', () => {
      const err = new MoneroMultisigError('test msg', 'TEST_CODE');
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe('MoneroMultisigError');
      expect(err.code).toBe('TEST_CODE');
      expect(err.message).toBe('test msg');
    });
  });
});
