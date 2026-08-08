// GitHub Webhook - Bounty B3
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const bounty = require('../bounty.js');

// Verify HMAC-SHA256 signature
function verifySignature(req) {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[Webhook] WEBHOOK_SECRET not set - skipping signature verification');
    return true;
  }
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    console.warn('[Webhook] Missing X-Hub-Signature-256 header');
    return false;
  }
  const payload = JSON.stringify(req.body);
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

router.post('/', (req, res) => {
  const event = req.headers['x-github-event'];
  const deliveryId = req.headers['x-github-delivery'];

  console.log('[Webhook] Event:', event, 'Delivery:', deliveryId);

  // Verify signature
  if (!verifySignature(req)) {
    console.error('[Webhook] Invalid signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { action, pull_request } = req.body;

  // Handle PR merged event
  if (event === 'pull_request' && action === 'closed' && pull_request && pull_request.merged) {
    const prNumber = pull_request.number;
    const contributor = pull_request.user ? pull_request.user.login : 'unknown';
    const repoName = pull_request.base && pull_request.base.repo ? pull_request.base.repo.full_name : 'unknown';

    console.log('[Webhook] PR #' + prNumber + ' merged by ' + contributor + ' in ' + repoName);

    try {
      // Create and assign bounty
      const bountyData = bounty.createBounty('pr-' + prNumber, 50, contributor);
      bounty.assignBounty('pr-' + prNumber, contributor);

      console.log('[Webhook] Bounty created: pr-' + prNumber + ' -> ' + contributor + ' (50 MYZ)');

      return res.json({
        success: true,
        message: 'Bounty auto-assigned',
        bounty: bountyData,
        contributor: contributor,
        prNumber: prNumber
      });
    } catch (err) {
      console.error('[Webhook] Error creating bounty:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // Log other events
  console.log('[Webhook] Event logged:', event, action || 'no action');
  res.json({ success: true, message: 'Event received', event: event, action: action });
});

// Health check for webhook
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    configured: !!process.env.WEBHOOK_SECRET,
    endpoint: '/api/webhooks/github'
  });
});

module.exports = router;
