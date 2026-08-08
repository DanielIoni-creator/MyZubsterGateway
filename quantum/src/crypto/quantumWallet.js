const { QuantumKeyDistribution } = require('../protocols/qkd');
const crypto = require('crypto');

class QuantumWallet {
  constructor(userId) {
    this.userId = userId;
    this.qkd = new QuantumKeyDistribution();
    this.keys = { quantum: null, classical: null, shared: null };
    this.balance = 1000;
    this.transactions = [];
    this.quantumAddress = null;
  }

  generateQuantumAddress() {
    const result = this.qkd.executeProtocol(256);
    this.keys.quantum = result.key;
    const hash = crypto.createHash('sha256');
    hash.update(this.keys.quantum + this.userId);
    this.quantumAddress = 'q' + hash.digest('hex').substring(0, 40);
    return this.quantumAddress;
  }

  encryptQuantum(message) {
    if (!this.keys.quantum) throw new Error('Chiave quantistica non disponibile');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(this.keys.quantum, 'hex'), iv);
    let encrypted = cipher.update(message, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return { encrypted, iv: iv.toString('hex'), authTag: authTag.toString('hex'), quantumProtected: true };
  }

  decryptQuantum(encryptedData) {
    if (!this.keys.quantum) throw new Error('Chiave quantistica non disponibile');
    const decipher = crypto.createDecipheriv('aes-256-gcm',
      Buffer.from(this.keys.quantum, 'hex'), Buffer.from(encryptedData.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  quantumTransaction(to, amount, message = '') {
    if (this.balance < amount) throw new Error('Saldo insufficiente');
    const encryptedMessage = this.encryptQuantum(message || 'Pagamento quantistico');
    const transaction = {
      id: 'qtx_' + crypto.randomBytes(16).toString('hex'),
      from: this.quantumAddress,
      to, amount,
      timestamp: new Date().toISOString(),
      quantumProtected: true,
      message: encryptedMessage,
      status: 'completed',
      verificationHash: this.generateVerificationHash({ from: this.quantumAddress, to, amount })
    };
    this.balance -= amount;
    this.transactions.push(transaction);
    return transaction;
  }

  generateVerificationHash(data) {
    const hash = crypto.createHash('sha512');
    hash.update(JSON.stringify(data) + this.keys.quantum);
    return hash.digest('hex');
  }

  verifyTransaction(transaction) {
    const hash = this.generateVerificationHash({ from: transaction.from, to: transaction.to, amount: transaction.amount });
    return hash === transaction.verificationHash;
  }

  getBalance() {
    return { userId: this.userId, quantumAddress: this.quantumAddress, balance: this.balance, quantumProtected: true, transactions: this.transactions.length };
  }

  getStats() {
    return {
      userId: this.userId,
      quantumAddress: this.quantumAddress,
      totalTransactions: this.transactions.length,
      totalVolume: this.transactions.reduce((sum, t) => sum + t.amount, 0),
      quantumKeyAvailable: !!this.keys.quantum,
      securityLevel: 'quantum-resistant'
    };
  }
}

module.exports = { QuantumWallet };
