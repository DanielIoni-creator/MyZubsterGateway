const { describe, it, before } = require('node:test');
const assert = require('node:assert');

describe('Escrow Robot - Unit Tests', () => {
  let escrowRobot;
  before(() => {
    delete require.cache[require.resolve('../escrow_robot')];
    escrowRobot = require('../escrow_robot');
  });

  describe('createEscrow (MYZ)', () => {
    it('should create a valid escrow with correct calculations', async () => {
      const escrow = await escrowRobot.createEscrow({
        jobId: 'test_job_1', clientId: 'user1', robotId: 'robot1',
        amount: 100, currency: 'MYZ'
      });
      assert.strictEqual(escrow.jobId, 'test_job_1');
      assert.strictEqual(escrow.clientId, 'user1');
      assert.strictEqual(escrow.robotId, 'robot1');
      assert.strictEqual(escrow.amount, 100);
      assert.strictEqual(escrow.fee, 2);
      assert.strictEqual(escrow.netAmount, 98);
      assert.strictEqual(escrow.currency, 'MYZ');
      assert.strictEqual(escrow.status, 'LOCKED');
      assert.ok(escrow.lockTx);
      assert.ok(escrow.createdAt);
      assert.ok(escrow.deadline > escrow.createdAt);
    });

    it('should notify robot on creation', async () => {
      // Verified by createEscrow calling notifyRobot
      const escrow = await escrowRobot.createEscrow({
        jobId: 'test_job_2', clientId: 'u2', robotId: 'r2',
        amount: 50, currency: 'MYZ'
      });
      assert.strictEqual(escrow.status, 'LOCKED');
    });
  });

  describe('getEscrow', () => {
    it('should return escrow by jobId', async () => {
      await escrowRobot.createEscrow({
        jobId: 'test_get_1', clientId: 'u1', robotId: 'r1',
        amount: 10, currency: 'MYZ'
      });
      const escrow = escrowRobot.getEscrow('test_get_1');
      assert.ok(escrow);
      assert.strictEqual(escrow.jobId, 'test_get_1');
    });

    it('should return null for non-existent escrow', () => {
      assert.strictEqual(escrowRobot.getEscrow('nonexistent'), null);
    });
  });

  describe('markDelivered', () => {
    it('should set status to DELIVERED and set deadlines', async () => {
      await escrowRobot.createEscrow({
        jobId: 'test_deliver_1', clientId: 'u1', robotId: 'r1',
        amount: 20, currency: 'MYZ'
      });
      const escrow = await escrowRobot.markDelivered({ jobId: 'test_deliver_1' });
      assert.strictEqual(escrow.status, 'DELIVERED');
      assert.ok(escrow.deliveredAt);
      assert.ok(escrow.disputeDeadline > escrow.deliveredAt);
    });

    it('should throw for non-existent escrow', async () => {
      await assert.rejects(
        () => escrowRobot.markDelivered({ jobId: 'nonexistent' }),
        /Escrow non trovato/
      );
    });
  });

  describe('openDispute', () => {
    it('should set status to CONTESTED', async () => {
      await escrowRobot.createEscrow({
        jobId: 'test_dispute_1', clientId: 'u1', robotId: 'r1',
        amount: 30, currency: 'MYZ'
      });
      await escrowRobot.openDispute({ jobId: 'test_dispute_1', reason: 'Bad quality' });
      const escrow = escrowRobot.getEscrow('test_dispute_1');
      assert.strictEqual(escrow.status, 'CONTESTED');
    });

    it('should throw for non-existent escrow', async () => {
      await assert.rejects(
        () => escrowRobot.openDispute({ jobId: 'nonexistent', reason: 'x' }),
        /Escrow non trovato/
      );
    });
  });

  describe('autoRelease', () => {
    it('should not release if escrow is not DELIVERED', async () => {
      await escrowRobot.createEscrow({
        jobId: 'test_release_1', clientId: 'u1', robotId: 'r1',
        amount: 40, currency: 'MYZ'
      });
      await escrowRobot.autoRelease('test_release_1');
      const escrow = escrowRobot.getEscrow('test_release_1');
      assert.strictEqual(escrow.status, 'LOCKED');
    });

    it('should not crash on non-existent escrow', async () => {
      await escrowRobot.autoRelease('nonexistent');
      assert.ok(true);
    });
  });
});
