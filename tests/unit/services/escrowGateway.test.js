const mongoose = require('mongoose');
const {
  createEscrowOrder,
  fundEscrow,
  completeEscrow,
  disputeEscrow,
  resolveDispute,
  refundEscrow,
  cancelEscrow,
  getEscrowStats,
} = require('../services/escrowGatewayService');

const mockEscrow = () => ({
  _id: new mongoose.Types.ObjectId().toString(),
  orderId: 'ESC-1234',
  buyerId: new mongoose.Types.ObjectId().toString(),
  sellerId: new mongoose.Types.ObjectId().toString(),
  amount: 100,
  currency: 'XMR',
  status: 'pending',
  timeline: [],
  save: jest.fn().mockResolvedValue(true),
});

jest.mock('../models/Escrow', () => jest.fn(() => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
})));

describe('Escrow Gateway Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEscrowOrder', () => {
    it('creates an escrow order', async () => {
      const Escrow = require('../models/Escrow');
      const mockInstance = mockEscrow();
      Escrow.findOne.mockResolvedValue(null);
      Escrow.mockReturnValueOnce(() => mockInstance);

      const result = await createEscrowOrder({
        orderId: 'ESC-1234',
        buyerId: 'buyer123',
        sellerId: 'seller456',
        amount: 100,
      });

      expect(result.orderId).toBe('ESC-1234');
      expect(result.status).toBe('pending');
    });

    it('rejects duplicate orderId', async () => {
      const Escrow = require('../models/Escrow');
      Escrow.findOne.mockResolvedValue({ orderId: 'ESC-1234' });

      await expect(
        createEscrowOrder({ orderId: 'ESC-1234', buyerId: 'b', sellerId: 's', amount: 100 })
      ).rejects.toThrow('Escrow already exists');
    });

    it('rejects missing required fields', async () => {
      await expect(createEscrowOrder({})).rejects.toThrow('Missing required fields');
    });
  });

  describe('state transitions', () => {
    it('allows pending -> funded', async () => {
      const Escrow = require('../models/Escrow');
      const mockInstance = { ...mockEscrow(), status: 'pending', save: jest.fn().mockResolvedValue(true) };
      Escrow.findById.mockResolvedValue(mockInstance);

      const result = await fundEscrow(mockInstance._id);
      expect(result.status).toBe('funded');
    });

    it('rejects invalid transitions', async () => {
      const Escrow = require('../models/Escrow');
      const mockInstance = { ...mockEscrow(), status: 'completed', save: jest.fn().mockResolvedValue(true) };
      Escrow.findById.mockResolvedValue(mockInstance);

      await expect(fundEscrow(mockInstance._id)).rejects.toThrow('Cannot transition');
    });
  });

  describe('dispute flow', () => {
    it('allows funded -> disputed', async () => {
      const Escrow = require('../models/Escrow');
      const mockInstance = { ...mockEscrow(), status: 'funded', save: jest.fn().mockResolvedValue(true) };
      Escrow.findById.mockResolvedValue(mockInstance);

      const result = await disputeEscrow(mockInstance._id, 'buyer', 'Not delivered', []);
      expect(result.status).toBe('disputed');
      expect(result.disputeInfo.reason).toBe('Not delivered');
    });

    it('resolves dispute to refunded', async () => {
      const Escrow = require('../models/Escrow');
      const mockInstance = {
        ...mockEscrow(),
        status: 'disputed',
        disputeInfo: { raisedBy: 'buyer', reason: 'test' },
        save: jest.fn().mockResolvedValue(true),
      };
      Escrow.findById.mockResolvedValue(mockInstance);

      const result = await resolveDispute(mockInstance._id, 'refund_buyer', 'admin', 'AI analysis');
      expect(result.status).toBe('refunded');
      expect(result.disputeInfo.aiDecision).toBe('refund_buyer');
    });
  });

  describe('stats', () => {
    it('returns aggregated stats', async () => {
      const Escrow = require('../models/Escrow');
      Escrow.aggregate.mockResolvedValueOnce([{ _id: 'pending', count: 5, totalAmount: 500 }]);
      Escrow.aggregate.mockResolvedValueOnce([{ _id: null, total: 500 }]);
      Escrow.countDocuments.mockResolvedValue(5);

      const stats = await getEscrowStats();
      expect(stats.total).toBe(5);
      expect(stats.byStatus.pending.count).toBe(5);
    });
  });
});
