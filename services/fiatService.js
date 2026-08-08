class FiatService {
  constructor() {
    this.supportedCurrencies = ['USD', 'EUR', 'GBP'];
    this.exchangeRates = {
      USD: { EUR: 0.85, GBP: 0.73, MYZ: 100 },
      EUR: { USD: 1.18, GBP: 0.86, MYZ: 118 },
      GBP: { USD: 1.37, EUR: 1.16, MYZ: 137 }
    };
    this.paymentMethods = ['bank_transfer', 'credit_card', 'sepa', 'wire'];
  }

  getRate(from, to) {
    const rates = this.exchangeRates[from];
    if (!rates) throw new Error(`Currency ${from} not supported`);
    if (!rates[to]) throw new Error(`Conversion ${from}->${to} not available`);
    return rates[to];
  }

  convert(amount, from, to) {
    const rate = this.getRate(from, to);
    const converted = amount * rate;
    const fee = this.calculateFee(amount, from);
    return {
      from, to, amount, rate, converted,
      fee, total: converted + fee,
      timestamp: new Date().toISOString()
    };
  }

  calculateFee(amount, currency) {
    const feeRates = { USD: 0.025, EUR: 0.020, GBP: 0.020 };
    const minFee = { USD: 1.00, EUR: 0.85, GBP: 0.73 };
    const fee = Math.max(amount * (feeRates[currency] || 0.03), minFee[currency] || 1);
    return Math.round(fee * 100) / 100;
  }

  createPayment(method, amount, currency, recipient) {
    if (!this.paymentMethods.includes(method)) {
      throw new Error(`Payment method ${method} not supported. Use: ${this.paymentMethods.join(', ')}`);
    }
    if (!this.supportedCurrencies.includes(currency)) {
      throw new Error(`Currency ${currency} not supported. Use: ${this.supportedCurrencies.join(', ')}`);
    }
    
    const fee = this.calculateFee(amount, currency);
    return {
      id: `FIAT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      method, amount, currency, fee, total: amount + fee,
      recipient, status: 'pending',
      created: new Date().toISOString()
    };
  }

  getSupported() {
    return {
      currencies: this.supportedCurrencies,
      methods: this.paymentMethods,
      rates: this.exchangeRates
    };
  }
}

module.exports = new FiatService();
