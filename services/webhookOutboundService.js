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

class WebhookOutboundService {
  generateSecret() {
    return crypto.randomBytes(32).toString('hex');
  }

  signPayload(payload, secret) {
    if (!secret) {
      throw new WebhookOutboundError('Webhook secret is required for signing', 500);
    }
    const digest = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    return `sha256=${digest}`;
  }

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

  exponentialBackoff(attempt, config) {
    const { initialDelayMs, maxDelayMs } = config;
    const exponentialDelay = Math.min(initialDelayMs * Math.pow(2, attempt), maxDelayMs);
    const jitter = Math.floor(Math.random() * (initialDelayMs * 0.5));
    return exponentialDelay + jitter;
  }

  async dispatchWebhook(subscription, event, payload) {
    const delivery = await WebhookDelivery.create({
      subscriptionId: subscription._id,
      event,
      payload,
      status: 'pending',
      attempts: [],
    });

    const maxAttempts = subscription.retryConfig?.maxAttempts || 5;
    let attempt = 0;

    while (attempt < maxAttempts) {
      const start = Date.now();
      try {
        const signature = this.signPayload(payload, subscription.secret);
        const response = await axios.post(subscription.url, payload, {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': event,
            'X-Webhook-Delivery': delivery._id.toString(),
          },
        });

        const durationMs = Date.now() - start;
        delivery.attempts.push({
          timestamp: new Date(),
          statusCode: response.status,
          responseBody: typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
          durationMs,
        });

        if (response.status >= 200 && response.status < 300) {
          delivery.status = 'delivered';
          delivery.completedAt = new Date();
          await delivery.save();

          await WebhookSubscription.findByIdAndUpdate(subscription._id, {
            lastTriggeredAt: new Date(),
            $inc: { failureCount: 0 },
          });

          return { success: true, delivery, statusCode: response.status };
        }

        throw new Error(`HTTP ${response.status}`);
      } catch (error) {
        const durationMs = Date.now() - start;
        delivery.attempts.push({
          timestamp: new Date(),
          statusCode: error.response?.status || null,
          responseBody: error.response?.data ? JSON.stringify(error.response.data) : null,
          error: error.message,
          durationMs,
        });

        attempt += 1;

        if (attempt >= maxAttempts) {
          delivery.status = 'dead';
          delivery.completedAt = new Date();
          await delivery.save();

          await WebhookSubscription.findByIdAndUpdate(subscription._id, {
            lastTriggeredAt: new Date(),
            $inc: { failureCount: 1 },
          });

          return { success: false, delivery, error: error.message };
        }

        const delay = this.exponentialBackoff(attempt - 1, subscription.retryConfig || { initialDelayMs: 5000, maxDelayMs: 60000 });
        delivery.status = 'pending_retry';
        delivery.nextRetryAt = new Date(Date.now() + delay);
        await delivery.save();

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return { success: false, delivery, error: 'Max attempts exceeded' };
  }

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

  async getStats() {
    const totalSubscriptions = await WebhookSubscription.countDocuments();
    const activeSubscriptions = await WebhookSubscription.countDocuments({ active: true });

    const deliveryStats = await WebhookDelivery.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgAttempts: { $avg: { $size: '$attempts' } },
        },
      },
    ]);

    const totalDeliveries = await WebhookDelivery.countDocuments();
    const deliveredCount = await WebhookDelivery.countDocuments({ status: 'delivered' });
    const deadCount = await WebhookDelivery.countDocuments({ status: 'dead' });
    const failedCount = await WebhookDelivery.countDocuments({ status: 'failed' });

    const recentDeliveries = await WebhookDelivery.find()
      .sort({ createdAt: -1 })
      .limit(10)
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
        failed: failedCount,
        dead: deadCount,
        successRate: totalDeliveries > 0 ? (deliveredCount / totalDeliveries) * 100 : 0,
        statusBreakdown: deliveryStats,
      },
      recentDeliveries,
    };
  }
}

module.exports = new WebhookOutboundService();
