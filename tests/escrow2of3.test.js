const MoneroEscrow2of3 = require('../escrow_2of3');

describe('MoneroEscrow2of3 — 2-of-3 Multi-Signature Escrow', () => {
  const BUYER = 'buyer_wallet_abc';
  const SELLER = 'seller_wallet_xyz';
  const ARBITRATOR = 'arbitrator_wallet_def';
  const ESCROW_ID = 'escrow_test_001';
  const AMOUNT = 500;

  beforeEach(() => {
    MoneroEscrow2of3._reset();
  });

  describe('create()', () => {
    test('should create a valid escrow contract', () => {
      const escrow = MoneroEscrow2of3.create({
        id: ESCROW_ID,
        buyer: BUYER,
        seller: SELLER,
        arbitrator: ARBITRATOR,
        amount: AMOUNT,
        description: 'Test transaction'
      });

      expect(escrow.id).toBe(ESCROW_ID);
      expect(escrow.buyer).toBe(BUYER);
      expect(escrow.seller).toBe(SELLER);
      expect(escrow.arbitrator).toBe(ARBITRATOR);
      expect(escrow.amount).toBe(AMOUNT);
      expect(escrow.status).toBe('CREATED');
      expect(escrow.timeoutHours).toBe(72);
    });

    test('should reject duplicate escrow ID', () => {
      MoneroEscrow2of3.create({ id: ESCROW_ID, buyer: BUYER, seller: SELLER, arbitrator: ARBITRATOR, amount: AMOUNT });
      expect(() => {
        MoneroEscrow2of3.create({ id: ESCROW_ID, buyer: BUYER, seller: SELLER, arbitrator: ARBITRATOR, amount: AMOUNT });
      }).toThrow('already exists');
    });

    test('should reject non-distinct parties', () => {
      expect(() => {
        MoneroEscrow2of3.create({ id: ESCROW_ID, buyer: BUYER, seller: BUYER, arbitrator: ARBITRATOR, amount: AMOUNT });
      }).toThrow('distinct');
    });

    test('should reject missing fields', () => {
      expect(() => {
        MoneroEscrow2of3.create({ id: ESCROW_ID, buyer: BUYER });
      }).toThrow('Missing required fields');
    });

    test('should reject zero or negative amount', () => {
      expect(() => {
        MoneroEscrow2of3.create({ id: ESCROW_ID, buyer: BUYER, seller: SELLER, arbitrator: ARBITRATOR, amount: 0 });
      }).toThrow('Missing required fields');
    });
  });

  describe('fund()', () => {
    beforeEach(() => {
      MoneroEscrow2of3.create({ id: ESCROW_ID, buyer: BUYER, seller: SELLER, arbitrator: ARBITRATOR, amount: AMOUNT });
    });

    test('should fund escrow by buyer', () => {
      const escrow = MoneroEscrow2of3.fund(ESCROW_ID, BUYER);
      expect(escrow.status).toBe('FUNDED');
      expect(escrow.fundedAt).toBeTruthy();
      expect(escrow.expiresAt).toBeTruthy();
    });

    test('should reject fund by non-buyer', () => {
      expect(() => {
        MoneroEscrow2of3.fund(ESCROW_ID, SELLER);
      }).toThrow('Only the buyer');
    });

    test('should reject fund on non-existent escrow', () => {
      expect(() => {
        MoneroEscrow2of3.fund('nonexistent', BUYER);
      }).toThrow('not found');
    });
  });

  describe('signRelease() — 2-of-3 multisig', () => {
    beforeEach(() => {
      MoneroEscrow2of3.create({ id: ESCROW_ID, buyer: BUYER, seller: SELLER, arbitrator: ARBITRATOR, amount: AMOUNT });
      MoneroEscrow2of3.fund(ESCROW_ID, BUYER);
    });

    test('should require 2-of-3 signatures to release', () => {
      // 1st signature: not enough
      const r1 = MoneroEscrow2of3.signRelease(ESCROW_ID, BUYER);
      expect(r1.thresholdMet).toBe(false);
      expect(r1.signaturesCollected).toBe(1);

      // 2nd signature: threshold met, funds released
      const r2 = MoneroEscrow2of3.signRelease(ESCROW_ID, SELLER);
      expect(r2.thresholdMet).toBe(true);
      expect(r2.signaturesCollected).toBe(2);
      expect(r2.fundsReleased).toBe(true);
      expect(r2.releasedTo).toBe(SELLER);
    });

    test('should work with arbitrator + buyer combination', () => {
      MoneroEscrow2of3.signRelease(ESCROW_ID, ARBITRATOR);
      const r = MoneroEscrow2of3.signRelease(ESCROW_ID, BUYER);
      expect(r.thresholdMet).toBe(true);
      expect(r.fundsReleased).toBe(true);
    });

    test('should work with arbitrator + seller combination', () => {
      MoneroEscrow2of3.signRelease(ESCROW_ID, ARBITRATOR);
      const r = MoneroEscrow2of3.signRelease(ESCROW_ID, SELLER);
      expect(r.thresholdMet).toBe(true);
      expect(r.fundsReleased).toBe(true);
    });

    test('should reject duplicate signature', () => {
      MoneroEscrow2of3.signRelease(ESCROW_ID, BUYER);
      expect(() => {
        MoneroEscrow2of3.signRelease(ESCROW_ID, BUYER);
      }).toThrow('already signed');
    });

    test('should reject non-party signature', () => {
      expect(() => {
        MoneroEscrow2of3.signRelease(ESCROW_ID, 'random_hacker');
      }).toThrow('not a party');
    });
  });

  describe('dispute resolution', () => {
    beforeEach(() => {
      MoneroEscrow2of3.create({ id: ESCROW_ID, buyer: BUYER, seller: SELLER, arbitrator: ARBITRATOR, amount: AMOUNT });
      MoneroEscrow2of3.fund(ESCROW_ID, BUYER);
    });

    test('should open dispute by buyer or seller', () => {
      const escrow = MoneroEscrow2of3.openDispute(ESCROW_ID, BUYER, 'Item not as described');
      expect(escrow.status).toBe('DISPUTED');
      expect(escrow.disputeReason).toBe('Item not as described');
      expect(escrow.disputeOpenedBy).toBe(BUYER);
    });

    test('should reject dispute by arbitrator', () => {
      expect(() => {
        MoneroEscrow2of3.openDispute(ESCROW_ID, ARBITRATOR, 'reason');
      }).toThrow('Only buyer or seller');
    });

    test('should resolve dispute with 2-of-3 signatures — release to seller', () => {
      MoneroEscrow2of3.openDispute(ESCROW_ID, BUYER, 'Dispute');
      
      MoneroEscrow2of3.resolveDispute(ESCROW_ID, ARBITRATOR, 'release_to_seller');
      const r = MoneroEscrow2of3.resolveDispute(ESCROW_ID, SELLER, 'release_to_seller');
      
      expect(r.resolved).toBe(true);
      expect(r.resolution).toBe('release_to_seller');
    });

    test('should resolve dispute with split ratio', () => {
      MoneroEscrow2of3.openDispute(ESCROW_ID, BUYER, 'Partial delivery');
      
      MoneroEscrow2of3.resolveDispute(ESCROW_ID, ARBITRATOR, 'split', { buyer: 0.6, seller: 0.4 });
      const r = MoneroEscrow2of3.resolveDispute(ESCROW_ID, BUYER, 'split', { buyer: 0.6, seller: 0.4 });
      
      expect(r.resolved).toBe(true);
      expect(r.resolution).toBe('split');
      expect(r.splitRatio).toEqual({ buyer: 0.6, seller: 0.4 });
    });
  });

  describe('autoRefund()', () => {
    test('should refund after timeout expiry', () => {
      MoneroEscrow2of3.create({
        id: ESCROW_ID, buyer: BUYER, seller: SELLER, arbitrator: ARBITRATOR,
        amount: AMOUNT, timeoutHours: 0  // Immediate expiry
      });
      MoneroEscrow2of3.fund(ESCROW_ID, BUYER);
      
      const r = MoneroEscrow2of3.autoRefund(ESCROW_ID);
      expect(r.autoRefunded).toBe(true);
      expect(r.status).toBe('REFUNDED');
      expect(r.refundedTo).toBe(BUYER);
    });
  });

  describe('list() and stats()', () => {
    test('should list escrows with filters', () => {
      MoneroEscrow2of3.create({ id: 'e1', buyer: BUYER, seller: SELLER, arbitrator: ARBITRATOR, amount: 100 });
      MoneroEscrow2of3.create({ id: 'e2', buyer: BUYER, seller: SELLER, arbitrator: ARBITRATOR, amount: 200 });
      MoneroEscrow2of3.fund('e1', BUYER);

      const created = MoneroEscrow2of3.list({ status: 'CREATED' });
      expect(created.length).toBe(1);
      
      const funded = MoneroEscrow2of3.list({ status: 'FUNDED' });
      expect(funded.length).toBe(1);

      const byParty = MoneroEscrow2of3.list({ party: BUYER });
      expect(byParty.length).toBe(2);
    });

    test('should return stats', () => {
      MoneroEscrow2of3.create({ id: 'e1', buyer: BUYER, seller: SELLER, arbitrator: ARBITRATOR, amount: 100 });
      MoneroEscrow2of3.fund('e1', BUYER);
      
      const stats = MoneroEscrow2of3.stats();
      expect(stats.total).toBe(1);
      expect(stats.byStatus.FUNDED).toBe(1);
      expect(stats.totalLockedMYZ).toBe(100);
    });
  });

  describe('get()', () => {
    test('should return escrow by ID', () => {
      MoneroEscrow2of3.create({ id: ESCROW_ID, buyer: BUYER, seller: SELLER, arbitrator: ARBITRATOR, amount: AMOUNT });
      const escrow = MoneroEscrow2of3.get(ESCROW_ID);
      expect(escrow.id).toBe(ESCROW_ID);
      expect(escrow.amount).toBe(AMOUNT);
    });

    test('should throw for non-existent escrow', () => {
      expect(() => {
        MoneroEscrow2of3.get('nonexistent');
      }).toThrow('not found');
    });
  });
});
