// services/webhookService.js
const crypto = require('crypto');
const http = require('http');
const https = require('https');
const Webhook = require('../models/Webhook');

/**
 * Sign payload using HMAC-SHA256
 */
function generateSignature(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
    .digest('hex');
}

/**
 * Send webhook notification with exponential backoff retry logic
 */
async function sendWebhookWithRetry(webhook, eventType, payload, maxAttempts = 5) {
  const body = JSON.stringify({
    event: eventType,
    timestamp: new Date().toISOString(),
    data: payload
  });

  const signature = generateSignature(body, webhook.secret);

  let attempt = 0;
  let delay = 1000; // Initial delay 1000ms

  while (attempt < maxAttempts) {
    attempt++;
    try {
      await deliverHttpRequest(webhook.url, body, signature);
      return { success: true, attempts: attempt };
    } catch (err) {
      if (attempt >= maxAttempts) {
        return { success: false, attempts: attempt, error: err.message };
      }
      await new Promise(res => setTimeout(res, Math.min(delay, 60000)));
      delay *= 2; // Exponential backoff
    }
  }
}

/**
 * Deliver HTTP/HTTPS POST request
 */
function deliverHttpRequest(targetUrl, body, signature) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(targetUrl);
    const transport = urlObj.protocol === 'https:' ? https : http;

    const req = transport.request(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'X-Webhook-Signature': signature
      },
      timeout: 5000
    }, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        resolve(res.statusCode);
      } else {
        reject(new Error(`HTTP status ${res.statusCode}`));
      }
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(body);
    req.end();
  });
}

/**
 * Dispatch event to all active webhooks subscribed to eventType
 */
async function triggerWebhooks(eventType, payload) {
  const webhooks = await Webhook.find({ active: true, events: eventType });
  const results = [];

  for (const webhook of webhooks) {
    const res = await sendWebhookWithRetry(webhook, eventType, payload);
    results.push({ webhookId: webhook._id, url: webhook.url, ...res });
  }

  return results;
}

module.exports = {
  generateSignature,
  sendWebhookWithRetry,
  triggerWebhooks
};
