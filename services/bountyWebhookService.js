/**
 * Automatic Bounty System Webhook & Event Processor
 * Resolves MyZubsterGateway Issue #215 ([BOUNTY] Test bounty system - 0.05 XMR)
 */

const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  if (!payload || !signature || !secret) return false;
  const expectedSignature = 'sha256=' + crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

function processBountyEvent(event) {
  if (!event || !event.bountyId || !event.amount || !event.payoutAddress) {
    return { success: false, error: 'Invalid bounty event payload' };
  }

  if (!event.payoutAddress.startsWith('4') || event.payoutAddress.length !== 95) {
    return { success: false, error: 'Invalid Monero payout address' };
  }

  return {
    success: true,
    bountyId: event.bountyId,
    amount: event.amount,
    currency: 'XMR',
    payoutAddress: event.payoutAddress,
    status: 'QUEUED_FOR_PAYOUT',
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  verifyWebhookSignature,
  processBountyEvent
};
