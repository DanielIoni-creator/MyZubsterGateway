// services/webhookService.js
const crypto = require('crypto');
const axios = require('axios');
const Webhook = require('../models/Webhook');
const WebhookDelivery = require('../models/WebhookDelivery');

/**
 * Sign a payload with the webhook secret using HMAC-SHA256.
 * The signature is sent in the `X-MyZubster-Signature` header as `sha256=<hex>`.
 */
function signPayload(secret, payloadString) {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
}

/**
 * Trigger an order event: for every active webhook subscribed to `event`,
 * enqueue a delivery record and attempt delivery (with retry/backoff).
 */
async function triggerEvent(event, payload) {
  const hooks = await Webhook.find({ active: true, events: event });
  const results = [];
  for (const hook of hooks) {
    const delivery = await WebhookDelivery.create({
      webhook: hook._id,
      event,
      payload,
    });
    results.push(await deliverWithRetry(hook, delivery, payload));
  }
  return results;
}

/**
 * Deliver a webhook with exponential backoff retry.
 * Returns the final delivery status.
 */
async function deliverWithRetry(hook, delivery, payload, attempt = 1) {
  const payloadString = JSON.stringify(payload);
  const signature = signPayload(hook.secret, payloadString);
  try {
    await axios.post(hook.url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-MyZubster-Event': delivery.event,
        'X-MyZubster-Delivery': String(delivery._id),
        'X-MyZubster-Signature': signature,
      },
      timeout: 10000,
    });
    delivery.status = 'delivered';
    delivery.deliveredAt = new Date();
    await delivery.save();
    return delivery;
  } catch (error) {
    delivery.attempts = attempt;
    delivery.lastError = error.message;
    const maxAttempts = hook.retryConfig?.maxAttempts ?? 5;
    if (attempt >= maxAttempts) {
      delivery.status = 'dead';
      await delivery.save();
      return delivery;
    }
    delivery.status = 'failed';
    await delivery.save();
    // exponential backoff with cap
    const base = hook.retryConfig?.initialDelay ?? 1000;
    const cap = hook.retryConfig?.maxDelay ?? 60000;
    const delay = Math.min(cap, base * 2 ** (attempt - 1));
    setTimeout(() => {
      deliverWithRetry(hook, delivery, payload, attempt + 1);
    }, delay);
    return delivery;
  }
}

/**
 * Create a webhook (admin action).
 */
async function createWebhook({ name, url, events, active, retryConfig }) {
  const hook = await Webhook.create({
    name,
    url,
    events,
    active: active ?? true,
    retryConfig: retryConfig ?? {},
  });
  return hook;
}

/**
 * List webhooks (admin action).
 */
function listWebhooks() {
  return Webhook.find().sort({ createdAt: -1 });
}

/**
 * Update a webhook (admin action).
 */
async function updateWebhook(id, patch) {
  return Webhook.findByIdAndUpdate(id, patch, { new: true });
}

/**
 * Delete a webhook (admin action).
 */
async function deleteWebhook(id) {
  return Webhook.findByIdAndDelete(id);
}

/**
 * Get delivery status for a webhook.
 */
function getDeliveries(webhookId) {
  const q = webhookId ? { webhook: webhookId } : {};
  return WebhookDelivery.find(q).sort({ createdAt: -1 });
}

module.exports = {
  signPayload,
  triggerEvent,
  deliverWithRetry,
  createWebhook,
  listWebhooks,
  updateWebhook,
  deleteWebhook,
  getDeliveries,
};
