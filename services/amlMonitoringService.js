const crypto = require('node:crypto');
const { EventEmitter } = require('node:events');
const axios = require('axios');

const TEN_MINUTES = 10 * 60 * 1000;

function createScreeningClient({ url, token }) {
  if (!url) return { async screen() { return { sanctioned: false, pep: false, matches: [] }; } };
  return {
    async screen(parties) {
      const response = await axios.post(url, { parties }, {
        timeout: 15000,
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      return response.data;
    },
  };
}

function createAuthorityReporter({ url, token }) {
  return {
    async submit(report) {
      if (!url) return { mode: 'draft', reference: report.id };
      const response = await axios.post(url, report, {
        timeout: 15000,
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      return { mode: 'submitted', reference: response.data.reference };
    },
  };
}

class AmlMonitoringService extends EventEmitter {
  constructor({ screening, reporter, clock = () => new Date(), reportThreshold = 70, largeTransfer = 10000 } = {}) {
    super();
    this.screening = screening || createScreeningClient({});
    this.reporter = reporter || createAuthorityReporter({});
    this.clock = clock;
    this.reportThreshold = reportThreshold;
    this.largeTransfer = largeTransfer;
    this.transactions = [];
    this.alerts = [];
    this.reports = [];
  }

  async monitor(transaction) {
    this.validate(transaction);
    const now = this.clock();
    const normalized = {
      id: transaction.id || crypto.randomUUID(),
      from: String(transaction.from).toLowerCase(),
      to: String(transaction.to).toLowerCase(),
      amount: Number(transaction.amount),
      asset: String(transaction.asset).toUpperCase(),
      originator: transaction.originator || null,
      beneficiary: transaction.beneficiary || null,
      timestamp: transaction.timestamp || now.toISOString(),
    };
    const screening = await this.screening.screen([
      { role: 'originator', address: normalized.from, identity: normalized.originator },
      { role: 'beneficiary', address: normalized.to, identity: normalized.beneficiary },
    ]);
    const rules = this.evaluate(normalized, screening, now);
    const score = Math.min(100, rules.reduce((total, rule) => total + rule.weight, 0));
    const result = { ...normalized, riskScore: score, rules: rules.map(({ code, message }) => ({ code, message })) };
    this.transactions.push(result);

    if (rules.length) {
      const alert = {
        id: crypto.randomUUID(),
        transactionId: normalized.id,
        severity: score >= 70 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW',
        score,
        rules: result.rules,
        status: 'OPEN',
        createdAt: now.toISOString(),
      };
      this.alerts.push(alert);
      this.emit('alert', alert);
      result.alertId = alert.id;
      if (score >= this.reportThreshold) result.report = await this.createReport(result, alert, screening);
    }
    this.emit('transaction', result);
    return result;
  }

  evaluate(transaction, screening, now) {
    const rules = [];
    const recent = this.transactions.filter((entry) => entry.from === transaction.from && now - new Date(entry.timestamp) <= TEN_MINUTES);
    const recentIncludingCurrent = [...recent, transaction];
    if (transaction.amount >= this.largeTransfer) rules.push({ code: 'LARGE_TRANSFER', message: 'Transfer meets the large-value threshold', weight: 35 });
    if (recentIncludingCurrent.length >= 3) rules.push({ code: 'HIGH_VELOCITY', message: 'Three or more outgoing transfers within ten minutes', weight: 30 });
    const structured = recentIncludingCurrent.filter((entry) => entry.amount < this.largeTransfer);
    if (structured.length >= 3 && structured.reduce((sum, entry) => sum + entry.amount, 0) >= this.largeTransfer) {
      rules.push({ code: 'STRUCTURING', message: 'Related transfers appear structured below the reporting threshold', weight: 45 });
    }
    if (screening.sanctioned) rules.push({ code: 'SANCTIONS_MATCH', message: 'A party matched a sanctions list', weight: 100 });
    if (screening.pep) rules.push({ code: 'PEP_MATCH', message: 'A party matched a politically exposed person record', weight: 55 });
    if (transaction.amount >= this.largeTransfer && (!transaction.originator || !transaction.beneficiary)) {
      rules.push({ code: 'TRAVEL_RULE_DATA_MISSING', message: 'Required originator or beneficiary data is missing', weight: 45 });
    }
    return rules;
  }

  async createReport(transaction, alert, screening) {
    const reportTransaction = { ...transaction };
    delete reportTransaction.report;
    const report = {
      id: crypto.randomUUID(),
      type: 'SUSPICIOUS_TRANSACTION_REPORT',
      jurisdiction: 'SG',
      generatedAt: this.clock().toISOString(),
      transaction: reportTransaction,
      alert,
      screeningMatches: screening.matches || [],
    };
    report.submission = await this.reporter.submit(report);
    this.reports.push(report);
    this.emit('report', report);
    return report;
  }

  resolveAlert(id, resolution) {
    const alert = this.alerts.find((entry) => entry.id === id);
    if (!alert) throw new Error('Alert not found');
    alert.status = 'RESOLVED';
    alert.resolution = resolution;
    alert.resolvedAt = this.clock().toISOString();
    return alert;
  }

  validate(transaction) {
    if (!transaction?.from || !transaction?.to || !transaction?.asset) throw new Error('from, to and asset are required');
    if (!Number.isFinite(Number(transaction.amount)) || Number(transaction.amount) <= 0) throw new Error('amount must be positive');
  }
}

module.exports = { AmlMonitoringService, createAuthorityReporter, createScreeningClient };
