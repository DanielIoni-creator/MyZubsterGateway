/**
 * MyZubster Gateway JavaScript SDK
 * A JavaScript client library for the MyZubster Gateway API.
 *
 * Installation:
 *   npm install myzubster-sdk
 *
 * Usage:
 *   const { MyZubsterClient } = require('myzubster-sdk');
 *   const client = new MyZubsterClient();
 *   await client.login('username', 'password');
 *   await client.registerAnimal({ name: 'Buddy', type: 'dog' });
 */

class MyZubsterError extends Error {
  constructor(statusCode, message) {
    super(`[${statusCode}] ${message}`);
    this.statusCode = statusCode;
  }
}

class MyZubsterClient {
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl || 'https://myzubsterapp.onrender.com').replace(/\/$/, '');
    this.token = null;
  }

  async _request(method, endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    const response = await fetch(url, { ...options, method, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new MyZubsterError(response.status, data.error || response.statusText);
    }
    return data;
  }

  async login(username, password) {
    const data = await this._request('POST', '/api/auth/login', {
      body: JSON.stringify({ username, password })
    });
    this.token = data.token;
    return data;
  }

  async register(username, password, email) {
    return this._request('POST', '/api/auth/register', {
      body: JSON.stringify({ username, password, email })
    });
  }

  async getProfile() {
    return this._request('GET', '/api/auth/profile');
  }

  async getHealth() {
    return this._request('GET', '/api/health');
  }

  async getInfo() {
    return this._request('GET', '/api/info');
  }

  async registerAnimal({ name, type, ...extra }) {
    return this._request('POST', '/api/animals/register', {
      body: JSON.stringify({ name, type, ...extra })
    });
  }

  async listAnimals() {
    return this._request('GET', '/api/animals');
  }

  async getAnimal(animalId) {
    return this._request('GET', `/api/animals/${animalId}`);
  }

  async registerPlant({ name, type, ...extra }) {
    return this._request('POST', '/api/plants/register', {
      body: JSON.stringify({ name, type, ...extra })
    });
  }

  async createRobot(robotId, name, walletAddress) {
    return this._request('POST', '/api/robot/create', {
      body: JSON.stringify({ robotId, name, walletAddress })
    });
  }

  async assignJob(robotId, jobId, clientId, amount, currency = 'MYZ') {
    return this._request('POST', '/api/robot/assign', {
      body: JSON.stringify({ robotId, jobId, clientId, amount, currency })
    });
  }

  async completeJob(robotId, jobId, result) {
    return this._request('POST', '/api/robot/job/complete', {
      body: JSON.stringify({ robotId, jobId, result })
    });
  }

  async getSwapRate(fromCurrency, toCurrency, amount) {
    const params = new URLSearchParams({ from: fromCurrency, to: toCurrency, amount: String(amount) });
    return this._request('GET', `/api/swap/rate?${params}`);
  }

  async executeSwap(fromCurrency, toCurrency, amount, userId) {
    return this._request('POST', '/api/swap/execute', {
      body: JSON.stringify({ from: fromCurrency, to: toCurrency, amount, userId })
    });
  }

  async getBounties() {
    return this._request('GET', '/api/bounties');
  }

  async getRewards(userId) {
    const params = new URLSearchParams({ userId });
    return this._request('GET', `/api/rewards?${params}`);
  }
}

module.exports = { MyZubsterClient, MyZubsterError };
