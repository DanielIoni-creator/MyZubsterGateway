const fs = require('fs');
const path = require('path');

class PaymentStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.payments = new Map();
    this.load();
  }

  load() {
    if (!fs.existsSync(this.filePath)) return;
    const raw = fs.readFileSync(this.filePath, 'utf8');
    const data = JSON.parse(raw || '[]');
    for (const payment of data) this.payments.set(payment.id, payment);
  }

  save() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify([...this.payments.values()], null, 2));
  }

  put(payment) {
    this.payments.set(payment.id, payment);
    this.save();
    return payment;
  }

  get(id) {
    return this.payments.get(id) || null;
  }

  update(id, patch) {
    const current = this.get(id);
    if (!current) return null;
    const updated = { ...current, ...patch, updatedAt: new Date().toISOString() };
    this.put(updated);
    return updated;
  }

  findByAddress(address) {
    return [...this.payments.values()].find((payment) => payment.address === address) || null;
  }

  findByExternalId(externalId) {
    return [...this.payments.values()].find((payment) => payment.externalId === externalId) || null;
  }
}

module.exports = { PaymentStore };
