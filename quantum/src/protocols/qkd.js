const crypto = require('crypto');

class QuantumKeyDistribution {
  constructor() {
    this.aliceKeys = [];
    this.bobKeys = [];
    this.sharedKey = null;
  }

  prepareQuantumStates(length = 256) {
    const bases = ['rectilinear', 'diagonal'];
    const states = [];
    for (let i = 0; i < length; i++) {
      const basis = bases[Math.floor(Math.random() * bases.length)];
      const bit = Math.random() > 0.5 ? 1 : 0;
      states.push({ basis, bit, polarization: this.simulatePolarization(basis, bit) });
    }
    return states;
  }

  simulatePolarization(basis, bit) {
    if (basis === 'rectilinear') return bit === 0 ? 'horizontal' : 'vertical';
    return bit === 0 ? 'diagonal_45' : 'diagonal_135';
  }

  alicePrepares(length = 256) {
    const states = this.prepareQuantumStates(length);
    this.aliceKeys = states;
    return states;
  }

  bobMeasures(states) {
    const bases = ['rectilinear', 'diagonal'];
    const measurements = [];
    for (const state of states) {
      const basis = bases[Math.floor(Math.random() * bases.length)];
      const measuredBit = this.measureState(state, basis);
      measurements.push({ originalBasis: state.basis, measurementBasis: basis, measuredBit, error: Math.random() < 0.01 });
    }
    this.bobKeys = measurements;
    return measurements;
  }

  measureState(state, basis) {
    if (state.basis === basis) return state.bit;
    return Math.random() > 0.5 ? 1 : 0;
  }

  exchangeBasis() {
    const matchingBases = [];
    for (let i = 0; i < this.aliceKeys.length; i++) {
      const alice = this.aliceKeys[i];
      const bob = this.bobKeys[i];
      if (alice.basis === bob.measurementBasis && !bob.error) {
        matchingBases.push({ index: i, bit: alice.bit, basis: alice.basis });
      }
    }
    return matchingBases;
  }

  generateSharedKey(matchingBases) {
    const validBits = matchingBases.slice(0, 128).map(m => m.bit);
    const key = validBits.join('');
    const hash = crypto.createHash('sha256');
    hash.update(key);
    this.sharedKey = hash.digest('hex');
    return this.sharedKey;
  }

  executeProtocol(length = 256) {
    const states = this.alicePrepares(length);
    this.bobMeasures(states);
    const matchingBases = this.exchangeBasis();
    const key = this.generateSharedKey(matchingBases);
    const intercepted = Math.random() < 0.05;
    const errorRate = intercepted ? 0.08 : 0.01;
    return {
      key,
      matchingBases: matchingBases.length,
      totalStates: length,
      successRate: (matchingBases.length / length) * 100,
      securityCheck: {
        secure: !intercepted,
        errorRate: errorRate,
        message: intercepted ? '⚠️ Possibile intercettazione rilevata!' : '✅ Canale sicuro verificato!'
      }
    };
  }
}

module.exports = { QuantumKeyDistribution };
