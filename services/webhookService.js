// services/webhookService.js
const axios = require('axios');
const crypto = require('crypto');
const WebhookLog = require('../models/WebhookLog');

class WebhookValidationError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'WebhookValidationError';
    this.statusCode = statusCode;
  }
}

class WebhookService {
  constructor() {
    this.queue = [];
    this.retryDelays = [5, 30, 120, 600];
    this.maxRetries = this.retryDelays.length;
    this.isProcessing = false;
  }

  stableStringify(value) {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
    }

    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${this.stableStringify(value[key])}`)
      .join(',')}}`;
  }

  signPayload(payload, secret = process.env.WEBHOOK_SECRET) {
    if (!secret) {
      throw new WebhookValidationError('WEBHOOK_SECRET is required to sign payloads', 500);
    }

    const digest = crypto
      .createHmac('sha256', secret)
      .update(this.stableStringify(payload))
      .digest('hex');

    return `sha256=${digest}`;
  }

  verifySignature(payload, signatureHeader, secret = process.env.WEBHOOK_SECRET) {
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

  normalizeDeliveryPayload(payload = {}) {
    const eventType = payload.eventType || payload.type || 'delivery.updated';
    const orderId = payload.orderId || payload.order_id || null;
    const escrowId = payload.escrowId || payload.escrow_id || null;
    const sellerId = payload.sellerId || payload.seller_id || null;
    const deliveryStatus = String(payload.status || payload.deliveryStatus || '').toLowerCase();

    if (!orderId && !escrowId) {
      throw new WebhookValidationError('orderId or escrowId is required');
    }

    return {
      eventType,
      orderId,
      escrowId,
      sellerId,
      deliveryStatus,
      proof: payload.proof || payload.deliveryProof || null,
      expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
    };
  }

  evaluateDelivery(payload, now = new Date()) {
    const normalized = this.normalizeDeliveryPayload(payload);
    const signals = [];

    if (normalized.expiresAt && normalized.expiresAt.getTime() < now.getTime()) {
      return {
        status: 'timeout',
        confidence: 100,
        reason: 'Delivery webhook arrived after its expiration time',
        signals: ['expired'],
        evaluatedAt: now,
      };
    }

    if (['rejected', 'failed', 'cancelled', 'canceled'].includes(normalized.deliveryStatus)) {
      return {
        status: 'rejected',
        confidence: 95,
        reason: 'Seller reported a failed or rejected delivery state',
        signals: ['negative_delivery_status'],
        evaluatedAt: now,
      };
    }

    if (['delivered', 'completed', 'complete', 'fulfilled'].includes(normalized.deliveryStatus)) {
      signals.push('positive_delivery_status');
    }

    if (normalized.proof) {
      signals.push('delivery_proof_present');
    }

    if (normalized.sellerId) {
      signals.push('seller_identified');
    }

    if (signals.includes('positive_delivery_status') && signals.includes('delivery_proof_present')) {
      return {
        status: 'auto_approved',
        confidence: 85,
        reason: 'Delivery status and proof are both present',
        signals,
        evaluatedAt: now,
      };
    }

    return {
      status: 'needs_review',
      confidence: signals.length ? 45 : 15,
      reason: 'Webhook accepted, but automatic verification needs more evidence',
      signals,
      evaluatedAt: now,
    };
  }

  async recordDeliveryWebhook({ payload, signatureHeader, source = 'seller', receivedAt = new Date() }) {
    const normalized = this.normalizeDeliveryPayload(payload);
    const signature = this.verifySignature(payload, signatureHeader);
    const verification = this.evaluateDelivery(payload, receivedAt);

    if (!signature.valid) {
      const rejectedLog = await WebhookLog.create({
        source,
        eventType: normalized.eventType,
        orderId: normalized.orderId,
        escrowId: normalized.escrowId,
        sellerId: normalized.sellerId,
        payload,
        status: 'rejected',
        signature: {
          header: signatureHeader || null,
          valid: false,
          required: signature.required,
        },
        verification: {
          status: 'rejected',
          confidence: 100,
          reason: signature.reason,
          signals: ['invalid_signature'],
          evaluatedAt: receivedAt,
        },
        error: signature.reason,
        receivedAt,
        completedAt: receivedAt,
        expiresAt: normalized.expiresAt,
      });

      throw new WebhookValidationError(`Invalid webhook signature: ${signature.reason}`, 401, rejectedLog);
    }

    const statusByVerification = {
      auto_approved: 'verified',
      timeout: 'timeout',
      rejected: 'rejected',
      needs_review: 'received',
      pending: 'received',
    };

    return WebhookLog.create({
      source,
      eventType: normalized.eventType,
      orderId: normalized.orderId,
      escrowId: normalized.escrowId,
      sellerId: normalized.sellerId,
      payload,
      status: statusByVerification[verification.status] || 'received',
      signature: {
        header: signatureHeader || null,
        valid: signature.valid,
        required: signature.required,
      },
      verification,
      receivedAt,
      completedAt: ['auto_approved', 'timeout', 'rejected'].includes(verification.status)
        ? receivedAt
        : null,
      expiresAt: normalized.expiresAt,
    });
  }

  async listLogs(filter = {}, limit = 50) {
    return WebhookLog.find(filter)
      .sort({ receivedAt: -1 })
      .limit(Math.min(Number(limit) || 50, 200));
  }

  async sendWebhook(url, payload, retryCount = 0) {
    try {
      const response = await axios.post(url, payload, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Retry': retryCount,
          'X-Webhook-Id': payload.orderId || 'unknown',
        },
      });

      if (response.status >= 200 && response.status < 300) {
        console.log(`Webhook sent successfully to ${url} (attempt ${retryCount + 1})`);
        return { success: true, status: response.status };
      }

      console.warn(`Webhook failed: ${url} returned status ${response.status}`);
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      return this.scheduleRetry(url, payload, retryCount, error);
    }
  }

  scheduleRetry(url, payload, retryCount, error) {
    const nextRetry = retryCount + 1;

    if (nextRetry >= this.maxRetries) {
      console.error(`Webhook permanently failed after ${this.maxRetries} attempts: ${url}`);
      console.error(`Error: ${error.message}`);

      return {
        success: false,
        error: `Max retries exceeded: ${error.message}`,
        permanentlyFailed: true,
      };
    }

    const delay = this.retryDelays[retryCount] * 1000;
    console.log(`Retry #${nextRetry} for ${url} in ${delay / 1000}s`);

    return new Promise((resolve) => {
      setTimeout(async () => {
        const result = await this.sendWebhook(url, payload, nextRetry);
        resolve(result);
      }, delay);
    });
  }

  async sendWebhookAsync(url, payload) {
    console.log(`Sending webhook to ${url} (${JSON.stringify(payload).length} bytes)`);
    return this.sendWebhook(url, payload, 0);
  }
}

const service = new WebhookService();
service.WebhookValidationError = WebhookValidationError;

module.exports = service;
