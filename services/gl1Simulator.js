class Gl1Simulator {
  constructor({ rate = 1.25, failMint = false, clock = () => new Date() } = {}) {
    this.rate = rate;
    this.failMint = failMint;
    this.clock = clock;
    this.locks = new Map();
  }
  async quote({ direction, amount, sourceAsset, targetAsset }) {
    const sourceAmount = String(amount);
    const targetAmount = String(direction === 'MYZ_TO_GL1' ? Number(amount) * this.rate : Number(amount) / this.rate);
    return { id: `quote-${this.locks.size + 1}`, direction, sourceAsset, targetAsset, sourceAmount, targetAmount, rate: String(this.rate), expiresAt: new Date(this.clock().getTime() + 60000).toISOString() };
  }
  async lock(request) { const lockId = `gl1-lock-${this.locks.size + 1}`; this.locks.set(lockId, request); return { lockId }; }
  async mint(request) { if (this.failMint) throw new Error('GL1 simulator mint failure'); return { transactionId: `gl1-tx-${request.reference}` }; }
  async unlock({ lockId }) { this.locks.delete(lockId); return { unlocked: true }; }
}

class MyzLedgerSimulator {
  constructor({ failMint = false } = {}) { this.failMint = failMint; this.locks = new Map(); }
  async lock(request) { const lockId = `myz-lock-${this.locks.size + 1}`; this.locks.set(lockId, request); return { lockId }; }
  async mint(request) { if (this.failMint) throw new Error('MYZ simulator mint failure'); return { transactionId: `myz-tx-${request.reference}` }; }
  async unlock({ lockId }) { this.locks.delete(lockId); return { unlocked: true }; }
}

module.exports = { Gl1Simulator, MyzLedgerSimulator };
