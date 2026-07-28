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
      return { success: true, data: response.data };
    } catch (error) {
      if (retryCount < this.maxRetries) {
        const delay = this.retryDelays[retryCount] * 1000;
        console.log(`⏳ Retry ${retryCount + 1}/${this.maxRetries} after ${delay}ms`);
        await this.sleep(delay);
        return this.sendWebhook(url, payload, retryCount + 1);
      }
      throw new Error(`Webhook failed after ${this.maxRetries} attempts`);
    }
  }

  async sendWebhookAsync(url, payload) {
    return this.sendWebhook(url, payload, 0);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new WebhookService();
