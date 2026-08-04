// routes/webhook.js – GitHub Webhook per reward automatici (BOUNTY B3)
const crypto = require('crypto');
const { completeBounty, assignBounty, createBounty } = require('../bounty');

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'myzubster-dev-secret';

function verifySignature(payload, signature) {
  if (!signature) return false;
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

function handlePullRequest(payload) {
  const action = payload.action;
  const pr = payload.pull_request;
  if (!pr) return null;

  const isMerged = action === 'closed' && pr.merged === true;
  if (!isMerged) return null;

  const issueRef = pr.body || '';
  const issueMatch = issueRef.match(/#(\d+)/);
  const issueNum = issueMatch ? parseInt(issueMatch[1]) : null;
  const user = pr.user ? pr.user.login : 'unknown';
  const repoName = payload.repository ? payload.repository.full_name : 'unknown';

  return {
    issueNum,
    contributor: user,
    repo: repoName,
    prNumber: pr.number,
    prTitle: pr.title,
    mergedAt: pr.merged_at
  };
}

function webhookHandler(req, res) {
  const signature = req.headers['x-hub-signature-256'];
  const event = req.headers['x-github-event'];
  const deliveryId = req.headers['x-github-delivery'];

  let payload = '';
  if (typeof req.body === 'string') {
    payload = req.body;
  } else {
    payload = JSON.stringify(req.body);
    req.body = JSON.parse(payload);
  }

  if (!verifySignature(payload, signature)) {
    console.warn(`❌ Webhook: invalid signature (delivery: ${deliveryId})`);
    return res.status(401).json({ error: 'Invalid signature' });
  }

  console.log(`📥 Webhook received: event=${event}, delivery=${deliveryId}`);

  if (event === 'pull_request') {
    const rewardInfo = handlePullRequest(req.body);
    if (rewardInfo && rewardInfo.issueNum) {
      try {
        createBounty(`gh-${rewardInfo.issueNum}`, 10, rewardInfo.contributor);
        assignBounty(`gh-${rewardInfo.issueNum}`, rewardInfo.contributor);
        const result = completeBounty(`gh-${rewardInfo.issueNum}`, rewardInfo.contributor);
        console.log(`✅ Bounty auto-rewarded: ${rewardInfo.contributor} for PR #${rewardInfo.prNumber} (issue #${rewardInfo.issueNum})`);
        return res.json({
          success: true,
          message: `Bounty rewarded to ${rewardInfo.contributor}`,
          bounty: result
        });
      } catch (err) {
        console.log(`⚠️ Bounty reward note: ${err.message}`);
        return res.json({ success: true, message: `PR merged. ${err.message}` });
      }
    }
    return res.json({ success: true, message: 'PR event processed (no bounty issue referenced)' });
  }

  if (event === 'ping') {
    return res.json({ success: true, message: 'Webhook configured correctly' });
  }

  return res.json({ success: true, message: `Event ${event} received` });
}

module.exports = { webhookHandler, handlePullRequest, verifySignature };
