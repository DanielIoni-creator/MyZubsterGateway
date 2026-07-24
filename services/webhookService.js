// services/webhookService.js
const axios = require('axios');

class WebhookService {
  constructor() {
    this.queue = [];
    this.retryDelays = [5, 30, 120, 600];
    this.maxRetries = this.retryDelays.length;
    this.isProcessing = false;
  }

  async sendWebhook(url, payload, retryCount = 0) {
    try {
      const response = await axios.post(url, payload, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Retry': retryCount,
          'X-Webhook-Id': payload.orderId || 'unknown'
        }
      });

      if (response.status >= 200 && response.status < 300) {
        console.log(`✅ Webhook inviato con successo a ${url} (tentativo ${retryCount + 1})`);
        return { success: true, status: response.status };
      }

      console.warn(`⚠️ Webhook fallito: ${url} ha risposto con status ${response.status}`);
      throw new Error(`HTTP ${response.status}`);

    } catch (error) {
      return this.scheduleRetry(url, payload, retryCount, error);
    }
  }

  scheduleRetry(url, payload, retryCount, error) {
    const nextRetry = retryCount + 1;

    if (nextRetry >= this.maxRetries) {
      console.error(`❌ Webhook fallito permanentemente dopo ${this.maxRetries} tentativi: ${url}`);
      console.error(`   Errore: ${error.message}`);
      
      return {
        success: false,
        error: `Max retries exceeded: ${error.message}`,
        permanentlyFailed: true
      };
    }

    const delay = this.retryDelays[retryCount] * 1000;
    console.log(`🔄 Retry #${nextRetry} per ${url} tra ${delay/1000}s`);

    return new Promise((resolve) => {
      setTimeout(async () => {
        const result = await this.sendWebhook(url, payload, nextRetry);
        resolve(result);
      }, delay);
    });
  }

  async sendWebhookAsync(url, payload) {
    console.log(`📤 Invio webhook a ${url} (${JSON.stringify(payload).length} byte)`);
    return this.sendWebhook(url, payload, 0);
  }
}

module.exports = new WebhookService();
