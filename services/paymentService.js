const axios = require('axios');
const crypto = require('crypto');

class PaymentService {
  constructor(config = {}) {
    this.apiUrl = config.apiUrl || process.env.PAYMENT_API_URL || 'https://api.myzubster.com/payment';
    this.apiKey = config.apiKey || process.env.PAYMENT_API_KEY;
    this.timeout = config.timeout || 30000;
  }

  // Create a new payment
  async createPayment(data) {
    try {
      const response = await axios.post(`${this.apiUrl}/create`, data, {
        headers: this._getHeaders(),
        timeout: this.timeout
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create payment: ${error.message}`);
    }
  }

  // Get payment status
  async getPaymentStatus(paymentId) {
    try {
      const response = await axios.get(`${this.apiUrl}/status/${paymentId}`, {
        headers: this._getHeaders(),
        timeout: this.timeout
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get payment status: ${error.message}`);
    }
  }

  // Process a payment
  async processPayment(paymentId, data) {
    try {
      const response = await axios.post(`${this.apiUrl}/process/${paymentId}`, data, {
        headers: this._getHeaders(),
        timeout: this.timeout
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to process payment: ${error.message}`);
    }
  }

  // Refund a payment
  async refundPayment(paymentId, data) {
    try {
      const response = await axios.post(`${this.apiUrl}/refund/${paymentId}`, data, {
        headers: this._getHeaders(),
        timeout: this.timeout
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to refund payment: ${error.message}`);
    }
  }

  // Get payment history
  async getPaymentHistory(userId, limit = 50, offset = 0) {
    try {
      const response = await axios.get(`${this.apiUrl}/history/${userId}`, {
        params: { limit, offset },
        headers: this._getHeaders(),
        timeout: this.timeout
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get payment history: ${error.message}`);
    }
  }

  // Get headers for API requests
  _getHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
      'User-Agent': 'MyZubster-Payment/1.0.0'
    };
  }

  // Validate payment data
  validatePayment(data) {
    const required = ['amount', 'currency', 'userId'];
    for (const field of required) {
      if (!data[field]) {
        return { valid: false, error: `${field} is required` };
      }
    }
    if (data.amount <= 0) {
      return { valid: false, error: 'Amount must be positive' };
    }
    return { valid: true };
  }

  // Calculate fee
  calculateFee(amount, rate = 0.02) {
    return amount * rate;
  }

  // Get supported currencies
  getSupportedCurrencies() {
    return ['MYZ', 'XMR', 'USDC', 'USDT'];
  }
}

module.exports = PaymentService;
