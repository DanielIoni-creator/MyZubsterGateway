const config = require('./config');

class FeeService {
  constructor() {
    this.platformFeePercent = config.platformFeePercent || 2;
    this.platformWallet = config.platformFeeWallet;
    this.minFee = parseFloat(process.env.MIN_FEE) || 0.01;
    this.maxFee = parseFloat(process.env.MAX_FEE) || 1000;
  }

  /**
   * Calcola la fee del 2% su un importo
   */
  calculateFee(amount) {
    if (amount < 0) {
      throw new Error('Amount must be positive');
    }

    let feeAmount = (amount * this.platformFeePercent) / 100;
    
    // Applica min/max fee
    if (feeAmount < this.minFee) feeAmount = this.minFee;
    if (feeAmount > this.maxFee) feeAmount = this.maxFee;

    const netAmount = amount - feeAmount;

    return {
      originalAmount: amount,
      feeAmount: Math.round(feeAmount * 100) / 100,
      netAmount: Math.round(netAmount * 100) / 100,
      feePercent: this.platformFeePercent,
      feeWallet: this.platformWallet,
      minFee: this.minFee,
      maxFee: this.maxFee
    };
  }

  /**
   * Verifica se la fee è corretta
   */
  validateFee(amount, feeAmount) {
    const calculated = this.calculateFee(amount);
    return Math.abs(calculated.feeAmount - feeAmount) < 0.01;
  }

  /**
   * Ottieni il wallet della piattaforma
   */
  getPlatformWallet() {
    return this.platformWallet;
  }

  /**
   * Ottieni la percentuale di fee
   */
  getFeePercent() {
    return this.platformFeePercent;
  }
}

module.exports = new FeeService();