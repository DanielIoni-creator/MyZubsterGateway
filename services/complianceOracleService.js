const crypto = require('node:crypto');
const axios = require('axios');

const DEFAULT_LIMIT = '10000';

function stableHash(value) {
  const normalize = (input) => {
    if (Array.isArray(input)) return input.map(normalize);
    if (input && typeof input === 'object') {
      return Object.keys(input).sort().reduce((out, key) => {
        out[key] = normalize(input[key]);
        return out;
      }, {});
    }
    return input;
  };
  return `0x${crypto.createHash('sha256').update(JSON.stringify(normalize(value))).digest('hex')}`;
}

function normalizeAddress(address) {
  if (typeof address !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error(`Invalid wallet address: ${address}`);
  }
  return address.toLowerCase();
}

function createHttpSource({ name, url, mapResponse, headers = {} }) {
  if (!name || !url || typeof mapResponse !== 'function') {
    throw new Error('HTTP sources require name, url and mapResponse');
  }
  return {
    name,
    async fetch() {
      const response = await axios.get(url, { headers, timeout: 15000 });
      return mapResponse(response.data);
    },
  };
}

class ComplianceOracle {
  constructor({ sources = [], publisher, clock = () => new Date(), defaultLimit = DEFAULT_LIMIT } = {}) {
    if (!publisher || typeof publisher.publish !== 'function') {
      throw new Error('A publisher with a publish(snapshot) method is required');
    }
    this.sources = sources;
    this.publisher = publisher;
    this.clock = clock;
    this.defaultLimit = String(defaultLimit);
    this.snapshot = null;
    this.lastError = null;
  }

  async refresh() {
    const results = await Promise.allSettled(this.sources.map(async (source) => ({
      name: source.name,
      data: await source.fetch(),
    })));
    const failures = results.filter((result) => result.status === 'rejected');
    if (failures.length) {
      const message = failures.map((failure) => failure.reason.message).join('; ');
      this.lastError = message;
      throw new Error(`Compliance source refresh failed: ${message}`);
    }

    const sanctions = new Set();
    const wallets = new Map();
    let transactionLimit = this.defaultLimit;
    for (const result of results) {
      const data = result.value.data || {};
      for (const address of data.sanctions || []) sanctions.add(normalizeAddress(address));
      for (const wallet of data.wallets || []) {
        const address = normalizeAddress(wallet.address);
        wallets.set(address, {
          address,
          kycApproved: Boolean(wallet.kycApproved),
          validUntil: wallet.validUntil || null,
        });
      }
      if (data.transactionLimit != null) transactionLimit = String(data.transactionLimit);
    }

    const generatedAt = this.clock().toISOString();
    const snapshot = {
      generatedAt,
      sanctions: [...sanctions].sort(),
      wallets: [...wallets.values()].sort((a, b) => a.address.localeCompare(b.address)),
      transactionLimit,
      sources: results.map((result) => result.value.name),
    };
    snapshot.root = stableHash(snapshot);
    const publication = await this.publisher.publish(snapshot);
    this.snapshot = { ...snapshot, publication };
    this.lastError = null;
    return this.snapshot;
  }

  verify({ address, amount = '0', at = this.clock() }) {
    if (!this.snapshot) throw new Error('Oracle data is not available yet');
    const normalized = normalizeAddress(address);
    const wallet = this.snapshot.wallets.find((entry) => entry.address === normalized);
    const sanctioned = this.snapshot.sanctions.includes(normalized);
    const kycValid = Boolean(wallet && wallet.kycApproved && (!wallet.validUntil || new Date(wallet.validUntil) > at));
    const withinLimit = Number(amount) <= Number(this.snapshot.transactionLimit);
    const reasons = [];
    if (sanctioned) reasons.push('SANCTIONED');
    if (!kycValid) reasons.push('KYC_REQUIRED');
    if (!withinLimit) reasons.push('TRANSACTION_LIMIT_EXCEEDED');
    return {
      address: normalized,
      compliant: reasons.length === 0,
      sanctioned,
      kycValid,
      withinLimit,
      transactionLimit: this.snapshot.transactionLimit,
      reasons,
      oracleRoot: this.snapshot.root,
      oracleUpdatedAt: this.snapshot.generatedAt,
    };
  }

  status() {
    return {
      ready: Boolean(this.snapshot),
      lastUpdatedAt: this.snapshot?.generatedAt || null,
      root: this.snapshot?.root || null,
      publication: this.snapshot?.publication || null,
      lastError: this.lastError,
    };
  }
}

function startComplianceOracleScheduler(oracle, intervalMs = 15 * 60 * 1000) {
  if (!Number.isFinite(intervalMs) || intervalMs < 1000) throw new Error('intervalMs must be at least 1000');
  const run = () => oracle.refresh().catch((error) => console.error('Compliance oracle refresh failed:', error.message));
  run();
  const timer = setInterval(run, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}

module.exports = {
  ComplianceOracle,
  createHttpSource,
  normalizeAddress,
  stableHash,
  startComplianceOracleScheduler,
};
