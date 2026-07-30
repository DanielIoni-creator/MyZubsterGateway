/**
 * Escrow Gateway Service — Unit Tests
 *
 * Tests cover:
 * - Order creation (success, validation errors)
 * - Status state machine (fund → complete → dispute → refund/resolve)
 * - Invalid state transitions (→ rejected)
 * - Optimistic concurrency (version field)
 * - Order history with pagination and filtering
 * - Order statistics aggregation
 * - Event hook notification system
 * - Dispute resolution (AI-assisted)
 * - Full workflow: happy path & dispute→refund
 */

// Reusable order factory (avoids referencing out-of-scope variables in jest.mock)
function buildOrder(overrides = {}) {
  const now = new Date();
  return {
    orderId: 'ESC-ABCD-1234',
    buyerId: '507f191e810c19729de860ea',
    sellerId: '507f191e810c19729de860eb',
    amount: 1.5,
    currency: 'XMR',
    status: 'pending',
    multisigAddress: '44kLzNXHV9EDxHN948HsvhhEQpQY6iyE6LfgCbFz463JM1bpz3UtWwUTPuQJ25nMzuQmfjYiDcqYvN9uYkTp3v5J2E1hisp',
    moneroTxid: null,
    description: 'Test escrow order',
    version: 0,
    completedAt: null,
    timeline: [{ status: 'pending', actor: 'system', note: 'Order created', timestamp: now }],
    disputeInfo: null,
    createdAt: now,
    updatedAt: now,
    save: jest.fn(),
    transitionTo: jest.fn(),
    ...overrides,
  };
}

// ─── Mock EscrowOrder model ──────────────────────────────────────────────────

const mockFindOne = jest.fn();
const mockFind = jest.fn();
const mockCountDocuments = jest.fn();
const mockAggregate = jest.fn();
const mockGenerateOrderId = jest.fn();

// State machine definition (mirrors the real model)
const STATE_TRANSITIONS = {
  pending: ['funded', 'cancelled'],
  funded: ['completed', 'disputed'],
  completed: [],
  disputed: ['refunded', 'completed', 'escalated'],
  escalated: ['refunded', 'completed'],
  refunded: [],
  cancelled: [],
};

/**
 * Realistic transitionTo that mirrors the model but does NOT increment
 * version (service handles that via order.version += 1).
 */
function makeTransitionTo() {
  return function transitionTo(newStatus, actor, note) {
    const allowed = STATE_TRANSITIONS[this.status] || [];
    if (!allowed.includes(newStatus)) {
      const err = new Error(
        `Invalid state transition: ${this.status} → ${newStatus}. Allowed: [${allowed.join(', ')}]`
      );
      err.code = 'INVALID_TRANSITION';
      throw err;
    }
    this.status = newStatus;
    if (!this.timeline) this.timeline = [];
    this.timeline.push({ status: newStatus, actor, note: note || '', timestamp: new Date() });
    if (newStatus === 'completed') this.completedAt = new Date();
  };
}

jest.mock('../../../models/EscrowOrder', () => {
  const mockModel = jest.fn().mockImplementation((data) => {
    const base = {
      orderId: 'ESC-ABCD-1234',
      buyerId: '',
      sellerId: '',
      amount: 0,
      currency: 'XMR',
      status: 'pending',
      multisigAddress: '',
      moneroTxid: null,
      description: '',
      version: 0,
      completedAt: null,
      timeline: [],
      disputeInfo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      save: jest.fn(),
      transitionTo: jest.fn(function (newStatus, actor, note) {
        const allowed = STATE_TRANSITIONS[this.status] || [];
        if (!allowed.includes(newStatus)) {
          const err = new Error(
            `Invalid state transition: ${this.status} → ${newStatus}. Allowed: [${allowed.join(', ')}]`
          );
          err.code = 'INVALID_TRANSITION';
          throw err;
        }
        this.status = newStatus;
        if (!this.timeline) this.timeline = [];
        this.timeline.push({ status: newStatus, actor, note: note || '', timestamp: new Date() });
        if (newStatus === 'completed') this.completedAt = new Date();
      }),
    };
    return { ...base, ...data };
  });

  mockModel.findOne = mockFindOne;
  mockModel.find = mockFind;
  mockModel.countDocuments = mockCountDocuments;
  mockModel.aggregate = mockAggregate;
  mockModel.generateOrderId = mockGenerateOrderId;
  mockModel.STATE_TRANSITIONS = STATE_TRANSITIONS;

  return mockModel;
});

const escrowService = require('../../../services/escrowGatewayService');

// ─── Setup a chainable find mock ─────────────────────────────────────────────

function setupFindResult(result) {
  const chainable = {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    then: (resolve) => Promise.resolve(result).then(resolve),
    catch: (reject) => Promise.resolve(result).catch(reject),
  };
  mockFind.mockReturnValue(chainable);
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockFindOne.mockReset();
  mockFind.mockReset();
  mockCountDocuments.mockReset();
  mockAggregate.mockReset();
  mockGenerateOrderId.mockReset();

  mockGenerateOrderId.mockReturnValue('ESC-ABCD-1234');
  mockFindOne.mockResolvedValue(null);
  setupFindResult([]);
  mockCountDocuments.mockResolvedValue(0);
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Escrow Gateway Service', () => {
  // ── createOrder ──────────────────────────────────────────────────────────

  describe('createOrder()', () => {
    it('should create an escrow order successfully', async () => {
      const order = await escrowService.createOrder(
        '507f191e810c19729de860ea',
        '507f191e810c19729de860eb',
        1.5,
        { currency: 'XMR', multisigAddress: 'addr123' }
      );

      expect(order).toBeDefined();
      expect(order.orderId).toBe('ESC-ABCD-1234');
      expect(order.buyerId).toBe('507f191e810c19729de860ea');
      expect(order.sellerId).toBe('507f191e810c19729de860eb');
      expect(order.amount).toBe(1.5);
      expect(order.currency).toBe('XMR');
      expect(order.status).toBe('pending');
      expect(order.version).toBe(0);
      expect(order.timeline).toHaveLength(1);
      expect(order.timeline[0].status).toBe('pending');
    });

    it('should throw if buyerId is missing', async () => {
      await expect(
        escrowService.createOrder(null, '507f191e810c19729de860eb', 1.5)
      ).rejects.toThrow('buyerId and sellerId are required');
    });

    it('should throw if sellerId is missing', async () => {
      await expect(
        escrowService.createOrder('507f191e810c19729de860ea', null, 1.5)
      ).rejects.toThrow('buyerId and sellerId are required');
    });

    it('should throw if amount is zero', async () => {
      await expect(
        escrowService.createOrder(
          '507f191e810c19729de860ea',
          '507f191e810c19729de860eb',
          0
        )
      ).rejects.toThrow('amount must be a positive number');
    });

    it('should throw if amount is negative', async () => {
      await expect(
        escrowService.createOrder(
          '507f191e810c19729de860ea',
          '507f191e810c19729de860eb',
          -5
        )
      ).rejects.toThrow('amount must be a positive number');
    });

    it('should throw if buyer and seller are the same', async () => {
      await expect(
        escrowService.createOrder(
          '507f191e810c19729de860ea',
          '507f191e810c19729de860ea',
          1.5
        )
      ).rejects.toThrow('Buyer and seller must be different users');
    });

    it('should default currency to XMR', async () => {
      const order = await escrowService.createOrder(
        '507f191e810c19729de860ea',
        '507f191e810c19729de860eb',
        2.0
      );

      expect(order.currency).toBe('XMR');
    });
  });

  // ── fundOrder ────────────────────────────────────────────────────────────

  describe('fundOrder()', () => {
    it('should transition from pending to funded', async () => {
      const order = buildOrder({ status: 'pending', version: 0, transitionTo: makeTransitionTo() });
      mockFindOne.mockResolvedValue(order);
      order.save.mockResolvedValue(true);

      const updated = await escrowService.fundOrder('ESC-ABCD-1234', {
        moneroTxid: 'tx123abc',
      });

      expect(updated.status).toBe('funded');
      expect(updated.moneroTxid).toBe('tx123abc');
      expect(updated.version).toBe(1);
      expect(updated.timeline).toHaveLength(2);
      expect(updated.save).toHaveBeenCalled();
    });

    it('should throw if order not found', async () => {
      mockFindOne.mockResolvedValue(null);

      await expect(
        escrowService.fundOrder('ESC-NONEXIST')
      ).rejects.toThrow('Order ESC-NONEXIST not found');
    });

    it('should throw if status is not pending', async () => {
      const order = buildOrder({ status: 'completed', transitionTo: makeTransitionTo() });
      mockFindOne.mockResolvedValue(order);

      await expect(
        escrowService.fundOrder('ESC-ABCD-1234')
      ).rejects.toThrow('Invalid state transition');
    });
  });

  // ── completeOrder ────────────────────────────────────────────────────────

  describe('completeOrder()', () => {
    it('should transition from funded to completed', async () => {
      const order = buildOrder({ status: 'funded', version: 1, transitionTo: makeTransitionTo() });
      mockFindOne.mockResolvedValue(order);
      order.save.mockResolvedValue(true);

      const updated = await escrowService.completeOrder('ESC-ABCD-1234', {
        note: 'Buyer is satisfied',
      });

      expect(updated.status).toBe('completed');
      expect(updated.completedAt).toBeDefined();
      expect(updated.version).toBe(2);
      expect(updated.timeline).toHaveLength(2);
    });

    it('should throw if order is pending (not funded)', async () => {
      const order = buildOrder({ status: 'pending', transitionTo: makeTransitionTo() });
      mockFindOne.mockResolvedValue(order);

      await expect(
        escrowService.completeOrder('ESC-ABCD-1234')
      ).rejects.toThrow('Invalid state transition');
    });
  });

  // ── disputeOrder ─────────────────────────────────────────────────────────

  describe('disputeOrder()', () => {
    it('should transition from funded to disputed with evidence', async () => {
      const order = buildOrder({ status: 'funded', version: 1, transitionTo: makeTransitionTo() });
      mockFindOne.mockResolvedValue(order);
      order.save.mockResolvedValue(true);

      const updated = await escrowService.disputeOrder(
        'ESC-ABCD-1234',
        'Item not as described',
        { actor: 'buyer', evidence: [{ description: 'Photo shows damage' }] }
      );

      expect(updated.status).toBe('disputed');
      expect(updated.disputeInfo).toBeDefined();
      expect(updated.disputeInfo.reason).toBe('Item not as described');
      expect(updated.disputeInfo.raisedBy).toBe('buyer');
      expect(updated.disputeInfo.evidence).toHaveLength(1);
      expect(updated.disputeInfo.evidence[0].description).toBe('Photo shows damage');
      expect(updated.version).toBe(2);
    });

    it('should throw if reason is empty', async () => {
      await expect(
        escrowService.disputeOrder('ESC-ABCD-1234', '', { actor: 'buyer' })
      ).rejects.toThrow('Dispute reason is required');
    });

    it('should throw if status is not funded', async () => {
      const order = buildOrder({ status: 'pending', transitionTo: makeTransitionTo() });
      mockFindOne.mockResolvedValue(order);

      await expect(
        escrowService.disputeOrder('ESC-ABCD-1234', 'Some reason')
      ).rejects.toThrow('Invalid state transition');
    });
  });

  // ── resolveDispute ───────────────────────────────────────────────────────

  describe('resolveDispute()', () => {
    function disputedOrder() {
      return buildOrder({
        status: 'disputed',
        version: 2,
        disputeInfo: {
          raisedBy: 'buyer',
          reason: 'Item not as described',
          evidence: [],
          aiAnalysis: '',
          aiDecision: null,
          resolvedBy: '',
          resolvedAt: null,
        },
        transitionTo: makeTransitionTo(),
      });
    }

    it('should resolve dispute with refund_buyer decision', async () => {
      const order = disputedOrder();
      mockFindOne.mockResolvedValue(order);
      order.save.mockResolvedValue(true);

      const updated = await escrowService.resolveDispute(
        'ESC-ABCD-1234',
        'refund_buyer',
        { resolvedBy: 'ai', aiAnalysis: 'Buyer claim is valid' }
      );

      expect(updated.status).toBe('refunded');
      expect(updated.disputeInfo.aiDecision).toBe('refund_buyer');
      expect(updated.disputeInfo.aiAnalysis).toBe('Buyer claim is valid');
      expect(updated.disputeInfo.resolvedBy).toBe('ai');
      expect(updated.disputeInfo.resolvedAt).toBeDefined();
      expect(updated.version).toBe(3);
    });

    it('should resolve dispute with release_seller decision', async () => {
      const order = disputedOrder();
      mockFindOne.mockResolvedValue(order);
      order.save.mockResolvedValue(true);

      const updated = await escrowService.resolveDispute(
        'ESC-ABCD-1234',
        'release_seller',
        { resolvedBy: 'admin' }
      );

      expect(updated.status).toBe('completed');
      expect(updated.completedAt).toBeDefined();
      expect(updated.disputeInfo.aiDecision).toBe('release_seller');
      expect(updated.version).toBe(3);
    });

    it('should escalate to manual_review', async () => {
      const order = disputedOrder();
      mockFindOne.mockResolvedValue(order);
      order.save.mockResolvedValue(true);

      const updated = await escrowService.resolveDispute(
        'ESC-ABCD-1234',
        'manual_review',
        { resolvedBy: 'ai' }
      );

      expect(updated.status).toBe('escalated');
      expect(updated.disputeInfo.aiDecision).toBe('manual_review');
      expect(updated.version).toBe(3);
    });

    it('should throw for invalid decision value', async () => {
      await expect(
        escrowService.resolveDispute('ESC-ABCD-1234', 'invalid_decision')
      ).rejects.toThrow('Must be one of: refund_buyer, release_seller, manual_review');
    });

    it('should throw if order is not in disputed status', async () => {
      const order = buildOrder({ status: 'pending', transitionTo: makeTransitionTo() });
      mockFindOne.mockResolvedValue(order);

      await expect(
        escrowService.resolveDispute('ESC-ABCD-1234', 'refund_buyer')
      ).rejects.toThrow('Cannot resolve dispute when status is "pending"');
    });
  });

  // ── refundOrder ──────────────────────────────────────────────────────────

  describe('refundOrder()', () => {
    it('should transition from disputed to refunded', async () => {
      const order = buildOrder({ status: 'disputed', version: 2, transitionTo: makeTransitionTo() });
      mockFindOne.mockResolvedValue(order);
      order.save.mockResolvedValue(true);

      const updated = await escrowService.refundOrder('ESC-ABCD-1234', {
        actor: 'seller',
        note: 'Seller agreed to refund',
      });

      expect(updated.status).toBe('refunded');
      expect(updated.version).toBe(3);
    });

    it('should throw if order is pending (not disputed)', async () => {
      const order = buildOrder({ status: 'pending', transitionTo: makeTransitionTo() });
      mockFindOne.mockResolvedValue(order);

      await expect(
        escrowService.refundOrder('ESC-ABCD-1234')
      ).rejects.toThrow('Invalid state transition');
    });
  });

  // ── cancelOrder ──────────────────────────────────────────────────────────

  describe('cancelOrder()', () => {
    it('should transition from pending to cancelled', async () => {
      const order = buildOrder({ status: 'pending', transitionTo: makeTransitionTo() });
      mockFindOne.mockResolvedValue(order);
      order.save.mockResolvedValue(true);

      const updated = await escrowService.cancelOrder('ESC-ABCD-1234', {
        note: 'Buyer changed mind',
      });

      expect(updated.status).toBe('cancelled');
      expect(updated.version).toBe(1);
    });

    it('should throw if order is funded (cannot cancel)', async () => {
      const order = buildOrder({ status: 'funded', version: 1, transitionTo: makeTransitionTo() });
      mockFindOne.mockResolvedValue(order);

      await expect(
        escrowService.cancelOrder('ESC-ABCD-1234')
      ).rejects.toThrow('Invalid state transition');
    });
  });

  // ── getOrderHistory ──────────────────────────────────────────────────────

  describe('getOrderHistory()', () => {
    it('should return paginated order history', async () => {
      setupFindResult([buildOrder(), buildOrder()]);
      mockCountDocuments.mockResolvedValue(2);

      const result = await escrowService.getOrderHistory({}, 1, 20);

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.hasNext).toBe(false);
      expect(result.pagination.hasPrev).toBe(false);
    });

    it('should filter by status', async () => {
      setupFindResult([]);
      mockCountDocuments.mockResolvedValue(0);

      await escrowService.getOrderHistory({ status: 'pending' }, 1, 20);

      expect(mockFind.mock.calls[0][0].status).toBe('pending');
    });

    it('should filter by buyerId', async () => {
      setupFindResult([]);
      mockCountDocuments.mockResolvedValue(0);

      await escrowService.getOrderHistory({ buyerId: 'abc123' }, 1, 20);

      expect(mockFind.mock.calls[0][0].buyerId).toBe('abc123');
    });

    it('should apply text search filter', async () => {
      setupFindResult([]);
      mockCountDocuments.mockResolvedValue(0);

      await escrowService.getOrderHistory({ search: 'ESC-ABCD' }, 1, 20);

      const filterArg = mockFind.mock.calls[0][0];
      expect(filterArg.$or).toBeDefined();
      expect(filterArg.$or).toHaveLength(2);
    });

    it('should cap limit at 100', async () => {
      setupFindResult([]);
      mockCountDocuments.mockResolvedValue(0);

      const result = await escrowService.getOrderHistory({}, 1, 999);

      expect(result.pagination.limit).toBe(100);
    });
  });

  // ── getOrderStats ────────────────────────────────────────────────────────

  describe('getOrderStats()', () => {
    it('should return aggregated statistics', async () => {
      mockAggregate.mockResolvedValue([
        { _id: 'pending', count: 5, totalAmount: 10 },
        { _id: 'funded', count: 3, totalAmount: 7.5 },
        { _id: 'completed', count: 10, totalAmount: 25 },
      ]);

      const stats = await escrowService.getOrderStats();

      expect(stats.total).toBe(18);
      expect(stats.totalAmount).toBe(42.5);
      expect(stats.byStatus.pending.count).toBe(5);
      expect(stats.byStatus.funded.count).toBe(3);
      expect(stats.byStatus.completed.count).toBe(10);
      expect(stats.byStatus.refunded.count).toBe(0);
    });

    it('should ensure all statuses appear in result', async () => {
      mockAggregate.mockResolvedValue([]);

      const stats = await escrowService.getOrderStats();

      expect(Object.keys(stats.byStatus)).toContain('pending');
      expect(Object.keys(stats.byStatus)).toContain('funded');
      expect(Object.keys(stats.byStatus)).toContain('completed');
      expect(Object.keys(stats.byStatus)).toContain('disputed');
      expect(Object.keys(stats.byStatus)).toContain('escalated');
      expect(Object.keys(stats.byStatus)).toContain('refunded');
      expect(Object.keys(stats.byStatus)).toContain('cancelled');
      expect(stats.total).toBe(0);
    });
  });

  // ── Event Hooks ──────────────────────────────────────────────────────────

  describe('event hooks (onEvent)', () => {
    it('should call registered handlers on createOrder', async () => {
      const handler = jest.fn();
      escrowService.onEvent(handler);

      await escrowService.createOrder(
        '507f191e810c19729de860ea',
        '507f191e810c19729de860eb',
        1.0
      );

      expect(handler).toHaveBeenCalledWith(
        'order.created',
        expect.objectContaining({ status: 'pending' }),
        {}
      );
    });

    it('should call handlers on fundOrder', async () => {
      const handler = jest.fn();
      escrowService.onEvent(handler);
      const order = buildOrder({ status: 'pending', transitionTo: makeTransitionTo() });
      mockFindOne.mockResolvedValue(order);
      order.save.mockResolvedValue(true);

      await escrowService.fundOrder('ESC-ABCD-1234', { moneroTxid: 'txid' });

      expect(handler).toHaveBeenCalledWith(
        'order.funded',
        expect.any(Object),
        expect.objectContaining({ moneroTxid: 'txid' })
      );
    });

    it('should not crash if a handler throws', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Handler crashed'));
      escrowService.onEvent(handler);
      const order = buildOrder({ status: 'pending', transitionTo: makeTransitionTo() });
      mockFindOne.mockResolvedValue(order);
      order.save.mockResolvedValue(true);

      await expect(escrowService.fundOrder('ESC-ABCD-1234')).resolves.toBeDefined();
    });

    it('should allow unsubscribing handlers', async () => {
      const handler = jest.fn();
      const unsubscribe = escrowService.onEvent(handler);
      unsubscribe();

      await escrowService.createOrder(
        '507f191e810c19729de860ea',
        '507f191e810c19729de860eb',
        1.0
      );

      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ── Full workflow ────────────────────────────────────────────────────────

  describe('full workflow', () => {
    it('should complete happy path: pending → funded → completed', async () => {
      // Step 1: Create
      const order = await escrowService.createOrder(
        '507f191e810c19729de860ea',
        '507f191e810c19729de860eb',
        2.5
      );
      expect(order.status).toBe('pending');

      // Step 2: Fund
      const fundData = buildOrder({ status: 'pending', version: 0, transitionTo: makeTransitionTo() });
      mockFindOne.mockResolvedValue(fundData);
      fundData.save.mockResolvedValue(true);
      const funded = await escrowService.fundOrder('ESC-ABCD-1234');
      expect(funded.status).toBe('funded');
      expect(funded.version).toBe(1);

      // Step 3: Complete
      const completeData = buildOrder({ status: 'funded', version: 1, transitionTo: makeTransitionTo() });
      mockFindOne.mockResolvedValue(completeData);
      completeData.save.mockResolvedValue(true);
      const completed = await escrowService.completeOrder('ESC-ABCD-1234');
      expect(completed.status).toBe('completed');
      expect(completed.completedAt).toBeDefined();
    });

    it('should handle dispute → refund flow', async () => {
      // Create
      await escrowService.createOrder(
        '507f191e810c19729de860ea',
        '507f191e810c19729de860eb',
        1.0
      );

      // Fund
      const fundData = buildOrder({ status: 'pending', version: 0, transitionTo: makeTransitionTo() });
      mockFindOne.mockResolvedValue(fundData);
      fundData.save.mockResolvedValue(true);
      await escrowService.fundOrder('ESC-ABCD-1234');

      // Dispute
      const disputeData = buildOrder({ status: 'funded', version: 1, transitionTo: makeTransitionTo() });
      mockFindOne.mockResolvedValue(disputeData);
      disputeData.save.mockResolvedValue(true);
      const disputed = await escrowService.disputeOrder('ESC-ABCD-1234', 'Item not received');
      expect(disputed.status).toBe('disputed');

      // Resolve → refund
      const resolveData = buildOrder({
        status: 'disputed',
        version: 2,
        disputeInfo: { raisedBy: 'buyer', reason: 'Item not received', evidence: [], aiAnalysis: '', aiDecision: null, resolvedBy: '', resolvedAt: null },
        transitionTo: makeTransitionTo(),
      });
      mockFindOne.mockResolvedValue(resolveData);
      resolveData.save.mockResolvedValue(true);
      const refunded = await escrowService.resolveDispute('ESC-ABCD-1234', 'refund_buyer', { resolvedBy: 'ai' });
      expect(refunded.status).toBe('refunded');
    });
  });
});
