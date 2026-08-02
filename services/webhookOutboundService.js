const crypto = require('crypto');
const axios = require('axios');

class WebhookOutboundService {
  constructor() {
    // Costruttore
  }

  generateSecret() {
    return crypto.randomBytes(32).toString('hex');
  }

  signPayload(payload, secret) {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return `sha256=${hmac.digest('hex')}`;
  }

  verifySignature(payload, signature, secret) {
    if (!signature) {
      return { valid: false, error: 'Signature missing' };
    }
    const expected = this.signPayload(payload, secret);
    // Assicurati che i buffer abbiano la stessa lunghezza
    const sigBuffer = Buffer.from(signature);
    const expBuffer = Buffer.from(expected);
    if (sigBuffer.length !== expBuffer.length) {
      return { valid: false, error: 'Signature length mismatch' };
    }
    const valid = crypto.timingSafeEqual(sigBuffer, expBuffer);
    return { valid };
  }

  exponentialBackoff(attempt, config = {}) {
    const { initialDelayMs = 1000, maxDelayMs = 30000, jitter = true } = config;
    let delay = initialDelayMs * Math.pow(2, attempt);
    delay = Math.min(delay, maxDelayMs);
    if (jitter) {
      delay = delay * (0.8 + 0.4 * Math.random());
    }
    // Re-apply the cap after jitter so delay never exceeds maxDelayMs.
    return Math.floor(Math.min(delay, maxDelayMs));
  }

  async dispatchWebhook(subscription, payload) {
    return { success: true, status: 200 };
  }

  async createDeliveryRecord(data) {
    return { _id: 'mock-id', ...data };
  }

  async updateDeliveryRecord(id, data) {
    return { _id: id, ...data };
  }

  async triggerEvent(event, payload) {
    return { success: true, deliveries: [] };
  }

  async getStats() {
    return {
      totalDeliveries: 0,
      successful: 0,
      failed: 0,
      pending: 0
    };
  }
}

module.exports = WebhookOutboundService;
