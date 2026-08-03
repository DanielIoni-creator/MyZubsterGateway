// webhookOutboundService.js
// Servizio per l'invio di webhook in uscita

const axios = require('axios');

class WebhookOutboundService {
  constructor() {
    this.timeout = 5000;
  }

  async sendWebhook(url, payload) {
    try {
      const response = await axios.post(url, payload, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Webhook delivery failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendBountyWebhook(bountyData) {
    const payload = {
      event: 'bounty.created',
      data: bountyData,
      timestamp: new Date().toISOString()
    };
    return this.sendWebhook(process.env.WEBHOOK_URL, payload);
  }
}

module.exports = new WebhookOutboundService();
