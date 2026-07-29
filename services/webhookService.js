// services/webhookService.js
// Webhook service: HMAC-SHA256 signing, event fan-out, retry with capped
// exponential backoff, delivery-status persistence.
//
// Design choices:
// - Pure Node + crypto + http (global agent, no extra dependency) so the
//   service works regardless of which HTTP client the rest of the app uses.
// - Injectable request sender via `_postJson` so unit tests can simulate
//   success, failure, and timeouts without monkey-patching globals.
// - Backoff: delay(n) = min(initialDelayMs * 2^(n-1), maxDelayMs). Cap avoids
//   unbounded growth while exponential keeps pressure on flaky receivers low.
//
// Created for issue #42: Implement Webhook System for Order Events.

'use strict';

const crypto = require('crypto');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const Webhook = require('../models/Webhook');
const WebhookDelivery = require('../models/WebhookDelivery');

const SIGNATURE_HEADER = 'X-MyZubster-Signature';
const EVENT_HEADER = 'X-MyZubster-Event';
const DELIVERY_ID_HEADER = 'X-MyZubster-Delivery';
const TIMEOUT_MS = 10000;

function computeSignature(secret, body) {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
}

function buildBackoff(attemptIndex, cfg) {
  const { initialDelayMs, maxDelayMs } = cfg;
  // attemptIndex is 1-based on first call (1 -> use initialDelayMs).
  const exp = Math.max(0, attemptIndex - 1);
  const delay = Math.min(initialDelayMs * Math.pow(2, exp), maxDelayMs);
  return delay;
}

/**
 * Send a JSON body to an http(s) URL. Returns a normalized result object.
 * This is the integration seam — overridden in tests.
 *
 * @param {string} url
 * @param {object} payload
 * @param {object} options
 * @returns {Promise<{ok: boolean, status: number|null, body: string|null, error: string|null}>}
 */
async function _postJson(url, payload, options = {}) {
  const body = Buffer.from(JSON.stringify(payload), 'utf8');
  const parsed = new URL(url);
  const lib = parsed.protocol === 'https:' ? https : http;

  const headers = Object.assign(
    {
      'Content-Type': 'application/json',
      'Content-Length': body.length,
      'User-Agent': 'MyZubster-Webhook/1.0',
    },
    options.headers || {}
  );

  return new Promise((resolve) => {
    const req = lib.request(
      {
        method: 'POST',
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: `${parsed.pathname || '/'}${parsed.search || ''}`,
        headers,
        timeout: options.timeoutMs || TIMEOUT_MS,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8').slice(0, 4096);
          const ok = res.statusCode >= 200 && res.statusCode < 300;
          resolve({ ok, status: res.statusCode, body: text, error: null });
        });
      }
    );
    req.on('timeout', () => {
      req.destroy(new Error('request timeout'));
    });
    req.on('error', (err) => {
      resolve({ ok: false, status: null, body: null, error: err.message });
    });
    req.write(body);
    req.end();
  });
}

class WebhookService {
  constructor({ transport = _postJson, now = () => Date.now() } = {}) {
    this._transport = transport;
    this._now = now;
  }

  /**
   * Trigger `event` to all active webhook subscriptions. Each subscriber
   * gets its own delivery record and independent retry budget. Errors for
   * one subscriber don't affect another.
   *
   * @param {string} event
   * @param {object} payload
   * @returns {Promise<{event:string,total:number,delivered:number,failed:number,dead:number}>}
   */
  async triggerEvent(event, payload) {
    if (!event || typeof event !== 'string') {
      throw new TypeError('triggerEvent requires a non-empty event name');
    }
    const subs = await Webhook.find({ active: true, events: event.toLowerCase() });
    let delivered = 0;
    let failed = 0;
    let dead = 0;
    await Promise.all(
      subs.map(async (wh) => {
        const result = await this._deliverWithRetry(wh, event, payload);
        if (result.finalStatus === 'delivered') delivered += 1;
        else if (result.finalStatus === 'dead') dead += 1;
        else failed += 1;
      })
    );
    return { event, total: subs.length, delivered, failed, dead };
  }

  /**
   * Send a synthetic delivery to one specific webhook. Public so admins
   * can hit "send sample" without messing with the event bus.
   */
  async testWebhook(webhookId, payload = { test: true }) {
    const wh = await Webhook.findById(webhookId);
    if (!wh) throw new Error('webhook not found');
    return this._deliverWithRetry(wh, 'webhook.test', payload);
  }

  async _deliverWithRetry(webhook, event, payload) {
    const cfg = webhook.retryConfig || {
      maxAttempts: 5,
      initialDelayMs: 1000,
      maxDelayMs: 60 * 60 * 1000,
    };
    const envelope = { event, payload, deliveredAt: new Date().toISOString() };
    const lastResult = { finalStatus: 'dead', attempts: 0 };

    for (let attempt = 1; attempt <= cfg.maxAttempts; attempt += 1) {
      const delivery = await WebhookDelivery.create({
        webhook: webhook._id,
        event,
        attempt,
        status: 'pending',
        finalStatus: 'pending',
        payload: envelope.payload,
      });
      const result = await this._attemptOne(webhook, envelope, delivery._id);
      lastResult.attempts = attempt;
      if (result.ok) {
        delivery.status = 'delivered';
        delivery.finalStatus = 'delivered';
        delivery.responseStatus = result.status;
        delivery.responseBodyExcerpt = result.body;
        delivery.durationMs = result.durationMs;
        delivery.deliveredAt = new Date();
        await delivery.save();
        lastResult.finalStatus = 'delivered';
        lastResult.deliveryId = String(delivery._id);
        return lastResult;
      }

      delivery.status = attempt >= cfg.maxAttempts ? 'dead' : 'failed';
      delivery.finalStatus =
        attempt >= cfg.maxAttempts ? 'dead' : 'pending';
      delivery.responseStatus = result.status;
      delivery.responseBodyExcerpt = result.body;
      delivery.error = result.error;
      delivery.durationMs = result.durationMs;
      await delivery.save();

      if (attempt >= cfg.maxAttempts) {
        lastResult.finalStatus = 'dead';
        lastResult.deliveryId = String(delivery._id);
        lastResult.error = result.error;
        return lastResult;
      }
      const wait = buildBackoff(attempt + 1, cfg);
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
    return lastResult;
  }

  async _attemptOne(webhook, envelope, deliveryId) {
    const bodyJson = JSON.stringify(envelope);
    const signature = computeSignature(webhook.secret, bodyJson);
    const start = this._now();
    const result = await this._transport(webhook.url, envelope, {
      headers: {
        [SIGNATURE_HEADER]: signature,
        [EVENT_HEADER]: envelope.event,
        [DELIVERY_ID_HEADER]: String(deliveryId),
      },
    });
    const durationMs = this._now() - start;
    return { ...result, durationMs };
  }

  /**
   * Verify a signature as receivers would. Exposed for tests and for any
   * inbound route that wants to trust third-party callbacks (not part of
   * #42 but cheap to keep).
   */
  verifySignature(secret, body, signatureHeader) {
    if (!signatureHeader) return false;
    const expected = computeSignature(secret, body);
    // Constant-time comparison so receivers can't be timed.
    if (expected.length !== signatureHeader.length) return false;
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'utf8'),
      Buffer.from(signatureHeader, 'utf8')
    );
  }
}

module.exports = WebhookService;
module.exports.computeSignature = computeSignature;
module.exports.buildBackoff = buildBackoff;
module.exports.SIGNATURE_HEADER = SIGNATURE_HEADER;
module.exports.EVENT_HEADER = EVENT_HEADER;
module.exports.DELIVERY_ID_HEADER = DELIVERY_ID_HEADER;
module.exports._postJson = _postJson;
module.exports._transportIsDefault = (t) => t === _postJson;
// Named export so `const { WebhookService } = require(...)` works in tests.
module.exports.WebhookService = WebhookService;
