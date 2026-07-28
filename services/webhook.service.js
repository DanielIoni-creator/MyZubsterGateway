const crypto = require('crypto');
const axios = require('axios');
const Webhook = require('../models/Webhook');
const WebhookDelivery = require('../models/WebhookDelivery');

class WebhookService {
  constructor({ webhookModel = Webhook, deliveryModel = WebhookDelivery, httpClient = axios } = {}) {
    this.Webhook = webhookModel;
    this.WebhookDelivery = deliveryModel;
    this.httpClient = httpClient;
  }

  signPayload(secret, payload) {
    const body = JSON.stringify(payload);
    return crypto.createHmac('sha256', secret).update(body).digest('hex');
  }

  buildHeaders(webhook, event, payload) {
    const signature = this.signPayload(webhook.secret, payload);
    return {
      'Content-Type': 'application/json',
      'X-MyZubster-Event': event,
      'X-MyZubster-Signature': `sha256=${signature}`
    };
  }

  async registerWebhook(data) {
    const webhook = new this.Webhook({
      url: data.url,
      events: data.events,
      secret: data.secret || crypto.randomBytes(32).toString('hex'),
      description: data.description,
      active: data.active !== false,
      maxRetries: data.maxRetries,
      timeoutMs: data.timeoutMs
    });
    await webhook.save();
    return webhook;
  }

  async triggerEvent(event, payload) {
    const webhooks = await this.Webhook.find({ active: true, events: event });
    const deliveries = [];

    for (const webhook of webhooks) {
      const delivery = await this.createDelivery(webhook, event, payload);
      deliveries.push(await this.deliver(webhook, delivery));
    }

    return deliveries;
  }

  async createDelivery(webhook, event, payload) {
    const delivery = new this.WebhookDelivery({
      webhook: webhook._id,
      event,
      payload,
      status: 'pending'
    });
    await delivery.save();
    return delivery;
  }

  async deliver(webhook, delivery) {
    const maxAttempts = (webhook.maxRetries || 0) + 1;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      delivery.attempts = attempt;

      try {
        const response = await this.httpClient.post(webhook.url, delivery.payload, {
          headers: this.buildHeaders(webhook, delivery.event, delivery.payload),
          timeout: webhook.timeoutMs || 10000
        });

        delivery.status = 'success';
        delivery.responseStatus = response.status;
        delivery.responseBody = this.truncateBody(response.data);
        delivery.deliveredAt = new Date();
        delivery.error = null;
        delivery.nextRetryAt = null;
        await delivery.save();
        await this.updateWebhookStatus(webhook, 'success');
        return delivery;
      } catch (error) {
        lastError = error;
        delivery.status = 'failed';
        delivery.responseStatus = error.response?.status || null;
        delivery.responseBody = error.response ? this.truncateBody(error.response.data) : null;
        delivery.error = error.message;

        if (attempt < maxAttempts) {
          delivery.status = 'pending';
          delivery.nextRetryAt = new Date(Date.now() + this.retryDelayMs(attempt));
        }

        await delivery.save();
      }
    }

    await this.updateWebhookStatus(webhook, 'failed');
    if (lastError) {
      delivery.error = lastError.message;
    }
    return delivery;
  }

  async updateWebhookStatus(webhook, status) {
    webhook.lastDeliveryAt = new Date();
    webhook.lastDeliveryStatus = status;
    if (typeof webhook.save === 'function') {
      await webhook.save();
    }
  }

  retryDelayMs(attempt) {
    return 1000 * (2 ** (attempt - 1));
  }

  truncateBody(body) {
    if (body == null) return null;
    const text = typeof body === 'string' ? body : JSON.stringify(body);
    return text.length > 1000 ? text.slice(0, 1000) : text;
  }

  buildOrderPayload(order, event) {
    return {
      event,
      orderId: order._id?.toString?.() || order.id || null,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      total: order.total,
      currency: order.currency,
      items: order.items,
      occurredAt: new Date().toISOString()
    };
  }
}

module.exports = new WebhookService();
module.exports.WebhookService = WebhookService;
