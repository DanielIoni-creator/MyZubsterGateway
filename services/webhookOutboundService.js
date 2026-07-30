const axios = require('axios');
const crypto = require('crypto');
const WebhookSubscription = require('../models/WebhookSubscription');
const WebhookDelivery = require('../models/WebhookDelivery');

class WebhookOutboundError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'WebhookOutboundError';
    this.statusCode = statusCode;
  }
}

/**
 * Deterministic stable JSON serialisation for consistent HMAC signing.
 * Object keys are sorted alphabetically so re-ordered payloads produce
 * the same signature.
 */
function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  const pairs = keys.map(k => `${JSON.stringify(k)}:${stableStringify(value[k])}`);
  return `{${pairs.join(',')}}`;
}

class WebhookOutboundService {
  generateSecret() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Sign a payload with HMAC-SHA256 using stable stringify.
   * Returns "sha256=<hexdigest>".
   */
  signPayload(payload, secret) {
    if (!secret) {
      throw new WebhookOutboundError('Webhook secret is required for signing', 500);
    }
    const digest = crypto
      .createHmac('sha256', secret)
      .update(stableStringify(payload))
      .digest('hex');
    return `sha256=${digest}`;
  }

  /**
   * Verify an HMAC-SHA256 signature using timing-safe comparison.
   */
  verifySignature(payload, signatureHeader, secret) {
    if (!secret) {
      return { valid: true, required: false, reason: 'Signature verification disabled' };
    }
    if (!signatureHeader) {
      return { valid: false, required: true, reason: 'Missing X-Webhook-Signature header' };
    }

    const expected = this.signPayload(payload, secret);
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(signatureHeader);

    if (expectedBuffer.length !== actualBuffer.length) {
      return { valid: false, required: true, reason: 'Signature length mismatch' };
    }

    return {
      valid: crypto.timingSafeEqual(expectedBuffer, actualBuffer),
      required: true,
      reason: 'HMAC-SHA256 verification complete',
    };
  }

  /**
   * Compute exponential backoff delay with jitter.
   * delay = min(initialDelayMs * 2^attempt, maxDelayMs) + random jitter
   */
  exponentialBackoff(attempt, config = {}) {
    const { initialDelayMs = 5000, maxDelayMs = 60000 } = config;
    const capped = Math.min(initialDelayMs * Math.pow(2, attempt), maxDelayMs);
    const jitter = Math.floor(Math.random() * Math.max(1, Math.floor(initialDelayMs * 0.3)));
    return capped + jitter;
  }

  /**
   * Dispatch a webhook to a subscription.
   *
   * @param {object} subscription - WebhookSubscription document.
   * @param {string} event         - Event type name.
   * @param {object} payload       - Event payload.
   * @returns {Promise<{success: boolean, delivery: object, statusCode?: number, error?: string}>}
   */
  async dispatchWebhook(subscription, event, payload) {
    const delivery = await WebhookDelivery.create({
      subscriptionId: subscription._id,
      event,
      payload,
      status: 'pending',
      attempts: [],
    });

    const maxAttempts = subscription.retryConfig?.maxAttempts || 5;
    const retryCfg = subscription.retryConfig || { initialDelayMs: 5000, maxDelayMs: 60000 };
    let attempt = 0;

    while (attempt < maxAttempts) {
      const start = Date.now();
      try {
        const signature = this.signPayload(payload, subscription.secret);
        const response = await axios.post(subscription.url, payload, {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': event,
            'X-Webhook-Delivery': delivery._id.toString(),
            'X-Webhook-Attempt': String(attempt + 1),
          },
        });

        const durationMs = Date.now() - start;
        delivery.attempts.push({
          timestamp: new Date(),
          statusCode: response.status,
          responseBody: typeof response.data === 'string'
            ? response.data.slice(0, 2000)
            : JSON.stringify(response.data).slice(0, 2000),
          durationMs,
        });

        if (response.status >= 200 && response.status < 300) {
          delivery.status = 'delivered';
          delivery.completedAt = new Date();
          delivery.nextRetryAt = null;
          await delivery.save();

          await WebhookSubscription.findByIdAndUpdate(subscription._id, {
            lastTriggeredAt: new Date(),
            lastSuccessAt: new Date(),
            failureCount: 0,
          });

          return { success: true, delivery, statusCode: response.status };
        }

        // Non-2xx — will be caught by the catch below via throw
        throw new Error(`HTTP ${response.status}`);
      } catch (error) {
        const durationMs = Date.now() - start;
        delivery.attempts.push({
          timestamp: new Date(),
          statusCode: error.response?.status || null,
          responseBody: error.response?.data
            ? (typeof error.response.data === 'string'
                ? error.response.data.slice(0, 2000)
                : JSON.stringify(error.response.data).slice(0, 2000))
            : null,
          error: error.message,
          durationMs,
        });

        attempt += 1;

        if (attempt >= maxAttempts) {
          delivery.status = 'dead';
          delivery.completedAt = new Date();
          delivery.nextRetryAt = null;
          await delivery.save();

          await WebhookSubscription.findByIdAndUpdate(subscription._id, {
            lastTriggeredAt: new Date(),
            $inc: { failureCount: 1 },
          });

          return { success: false, delivery, error: error.message };
        }

        const delay = this.exponentialBackoff(attempt - 1, retryCfg);
        delivery.status = 'pending_retry';
        delivery.nextRetryAt = new Date(Date.now() + delay);
        await delivery.save();

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return { success: false, delivery, error: 'Max attempts exceeded' };
  }

  /**
   * Trigger an event to all active matching subscriptions (fan-out).
   */
  async triggerEvent(event, payload, options = {}) {
    const { eventTypes = [] } = options;
    const targetEvents = eventTypes.length > 0 ? eventTypes : [event];

    const subscriptions = await WebhookSubscription.find({
      events: { $in: targetEvents },
      active: true,
      url: { $exists: true, $ne: '' },
    });

    const results = [];
    for (const subscription of subscriptions) {
      try {
        const result = await this.dispatchWebhook(subscription, event, payload);
        results.push({ subscriptionId: subscription._id, ...result });
      } catch (error) {
        results.push({
          subscriptionId: subscription._id,
          success: false,
          error: error.message,
        });
      }
    }
    return results;
  }

  /**
   * Retry a previously failed delivery.
   */
  async retryDelivery(deliveryId) {
    const delivery = await WebhookDelivery.findById(deliveryId);
    if (!delivery) {
      throw new WebhookOutboundError('Delivery not found', 404);
    }
    if (delivery.status === 'delivered') {
      throw new WebhookOutboundError('Delivery already delivered', 400);
    }

    const subscription = await WebhookSubscription.findById(delivery.subscriptionId);
    if (!subscription) {
      throw new WebhookOutboundError('Subscription not found', 404);
    }
    if (!subscription.active) {
      throw new WebhookOutboundError('Subscription is inactive', 400);
    }

    // Reset for retry
    delivery.status = 'pending';
    delivery.nextRetryAt = null;
    delivery.completedAt = null;
    await delivery.save();

    // Re-dispatch using fresh delivery state — keep existing attempts as history
    const maxAttempts = subscription.retryConfig?.maxAttempts || 5;
    const retryCfg = subscription.retryConfig || { initialDelayMs: 5000, maxDelayMs: 60000 };
    let attempt = delivery.attempts.length;

    while (attempt < maxAttempts) {
      const start = Date.now();
      try {
        const signature = this.signPayload(delivery.payload, subscription.secret);
        const response = await axios.post(subscription.url, delivery.payload, {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': delivery.event,
            'X-Webhook-Delivery': delivery._id.toString(),
            'X-Webhook-Attempt': String(attempt + 1),
          },
        });

        const durationMs = Date.now() - start;
        delivery.attempts.push({
          timestamp: new Date(),
          statusCode: response.status,
          responseBody: typeof response.data === 'string'
            ? response.data.slice(0, 2000)
            : JSON.stringify(response.data).slice(0, 2000),
          durationMs,
        });

        if (response.status >= 200 && response.status < 300) {
          delivery.status = 'delivered';
          delivery.completedAt = new Date();
          delivery.nextRetryAt = null;
          await delivery.save();
          return { success: true, delivery, statusCode: response.status };
        }
        throw new Error(`HTTP ${response.status}`);
      } catch (error) {
        const durationMs = Date.now() - start;
        delivery.attempts.push({
          timestamp: new Date(),
          statusCode: error.response?.status || null,
          responseBody: error.response?.data
            ? (typeof error.response.data === 'string'
                ? error.response.data.slice(0, 2000)
                : JSON.stringify(error.response.data).slice(0, 2000))
            : null,
          error: error.message,
          durationMs,
        });

        attempt += 1;

        if (attempt >= maxAttempts) {
          delivery.status = 'dead';
          delivery.completedAt = new Date();
          await delivery.save();
          return { success: false, delivery, error: error.message };
        }

        const delay = this.exponentialBackoff(attempt - delivery.attempts.length, retryCfg);
        delivery.status = 'pending_retry';
        delivery.nextRetryAt = new Date(Date.now() + delay);
        await delivery.save();
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return { success: false, delivery, error: 'Max attempts exceeded' };
  }

  /**
   * Get delivery / subscription statistics.
   */
  async getStats() {
    const totalSubscriptions = await WebhookSubscription.countDocuments();
    const activeSubscriptions = await WebhookSubscription.countDocuments({ active: true });

    const byStatus = await WebhookDelivery.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, avgAttempts: { $avg: { $size: '$attempts' } } } },
    ]);

    const statusMap = {};
    for (const row of byStatus) statusMap[row._id] = row;

    const totalDeliveries = await WebhookDelivery.countDocuments();
    const deliveredCount = statusMap.delivered?.count || 0;
    const deadCount = statusMap.dead?.count || 0;

    const recentDeliveries = await WebhookDelivery.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('subscriptionId', 'url description')
      .lean();

    return {
      subscriptions: {
        total: totalSubscriptions,
        active: activeSubscriptions,
        inactive: totalSubscriptions - activeSubscriptions,
      },
      deliveries: {
        total: totalDeliveries,
        delivered: deliveredCount,
        failed: statusMap.failed?.count || 0,
        pending: statusMap.pending?.count || 0,
        pendingRetry: statusMap.pending_retry?.count || 0,
        dead: deadCount,
        successRate: totalDeliveries > 0 ? Math.round((deliveredCount / totalDeliveries) * 10000) / 100 : 0,
        avgAttempts: statusMap.delivered?.avgAttempts
          ? Math.round(statusMap.delivered.avgAttempts * 100) / 100
          : 0,
      },
      recentDeliveries,
    };
  }

  /**
   * Get a single delivery by ID.
   */
  async getDelivery(id) {
    const delivery = await WebhookDelivery.findById(id)
      .populate('subscriptionId', 'url description events secret');
    if (!delivery) {
      throw new WebhookOutboundError('Delivery not found', 404);
    }
    return delivery;
  }

  /**
   * List deliveries with filters.
   */
  async listDeliveries(filters = {}, page = 1, limit = 20) {
    const docs = await WebhookDelivery.find(filters)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Math.min(Number(limit), 200))
      .populate('subscriptionId', 'url description')
      .lean();

    const total = await WebhookDelivery.countDocuments(filters);
    return { data: docs, total, page: Number(page), pages: Math.ceil(total / limit) };
  }
}

module.exports = new WebhookOutboundService();
