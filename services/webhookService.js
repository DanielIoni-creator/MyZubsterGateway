const axios = require('axios');
const Webhook = require('../models/Webhook');

async function sendWebhookWithRetry(url, payload, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await axios.post(url, payload, { timeout: 5000 });
      if (global.logEvent) global.logEvent(`Webhook delivered to ${url}`);
      return true; // Success
    } catch (err) {
      if (attempt === maxRetries) {
        if (global.logEvent) global.logEvent(`Webhook failed for ${url} after ${maxRetries} attempts`);
        return false;
      }
      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

async function triggerWebhooks(event, data) {
  try {
    const hooks = await Webhook.find({ events: event, active: true });
    const payload = { event, data, timestamp: new Date() };
    
    // Process async without blocking
    hooks.forEach(hook => {
      sendWebhookWithRetry(hook.url, payload);
    });
  } catch (e) {
    console.error('Error triggering webhooks:', e);
  }
}

module.exports = { triggerWebhooks, sendWebhookWithRetry };
