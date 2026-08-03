const { verifyWebhookSignature, processBountyEvent } = require('../services/bountyWebhookService');

/**
 * Jest Unit Test Suite for Automatic Bounty System (Issue #215)
 */

describe('Automatic Bounty Webhook System Tests', () => {
  const secret = 'super-secret-webhook-key';

  test('Valid bounty event payload should process successfully', () => {
    const validEvent = {
      bountyId: 215,
      amount: '0.05',
      payoutAddress: '4Ap5qdQU5YHbdJEpU6Fr3b9VEr1uYeEr5XvbNDdcksvPfySD7dFEvFsD5Lmo9wWJhjWDrcTVrXgP6CBHxAgjfoBTMF9HK7t'
    };

    const res = processBountyEvent(validEvent);
    expect(res.success).toBe(true);
    expect(res.status).toBe('QUEUED_FOR_PAYOUT');
    expect(res.amount).toBe('0.05');
  });

  test('Invalid payout address should be rejected', () => {
    const invalidEvent = {
      bountyId: 215,
      amount: '0.05',
      payoutAddress: 'invalid-address-string'
    };

    const res = processBountyEvent(invalidEvent);
    expect(res.success).toBe(false);
    expect(res.error).toBe('Invalid Monero payout address');
  });

  test('Webhook HMAC signature verification should validate authentic requests', () => {
    const payload = { bountyId: 215, action: 'claimed' };
    const crypto = require('crypto');
    const validSignature = 'sha256=' + crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');

    const isValid = verifyWebhookSignature(payload, validSignature, secret);
    expect(isValid).toBe(true);
  });
});
