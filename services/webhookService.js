const crypto = require('crypto');
const WebhookLog = require('../models/WebhookLog');
const bounty = require('../bounty.js');

const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || process.env.GITHUB_TOKEN;

function verifySignature(payload, signature) {
  if (!GITHUB_WEBHOOK_SECRET) {
    console.warn('GITHUB_WEBHOOK_SECRET not set - webhook verification disabled');
    return true;
  }
  if (!signature) return false;
  
  const computed = 'sha256=' + crypto
    .createHmac('sha256', GITHUB_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  } catch {
    return false;
  }
}

async function handlePullRequestEvent(event, payload) {
  const action = payload.action;
  const pr = payload.pull_request;
  
  if (!pr) return null;
  
  const logEntry = {
    event,
    action,
    prNumber: pr.number,
    contributor: pr.user ? pr.user.login : null,
    repo: payload.repository ? payload.repository.full_name : null,
    merged: pr.merged || false,
    payload: {
      title: pr.title,
      body: (pr.body || '').substring(0, 500),
      html_url: pr.html_url
    }
  };

  // Only create bounty on merged PR
  if (action === 'closed' && pr.merged && pr.user) {
    const issueId = 'pr-' + pr.number;
    const rewardMYZ = 50; // Default reward
    
    try {
      bounty.createBounty(issueId, rewardMYZ, pr.user.login);
      bounty.completeBounty(issueId, pr.user.login);
      logEntry.bountyCreated = true;
      console.log('Bounty created for merged PR #' + pr.number + ' by ' + pr.user.login);
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('Bounty already exists for PR #' + pr.number);
      } else {
        console.error('Bounty creation error:', err.message);
      }
    }
  }

  // Save to database
  try {
    const log = new WebhookLog(logEntry);
    await log.save();
  } catch (err) {
    console.error('Failed to save webhook log:', err.message);
  }

  return logEntry;
}

module.exports = { verifySignature, handlePullRequestEvent };
