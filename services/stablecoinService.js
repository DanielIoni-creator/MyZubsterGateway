const StablecoinPayment = require('../models/StablecoinPayment');

class StablecoinService {
  // Supported networks and contract addresses
  static NETWORKS = {
    USDC: {
      ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      polygon: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    USDT: {
      ethereum: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      polygon: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
    }
  };

  static async createPaymentIntent({ amount, currency, recipient, metadata }) {
    const payment = new StablecoinPayment({
      amount,
      currency: currency.toUpperCase(),
      recipient,
      metadata,
      status: 'pending'
    });
    await payment.save();
    
    // Generate payment intent with network details
    const network = metadata.network || 'ethereum';
    const contractAddress = this.NETWORKS[currency.toUpperCase()]?.[network];

    return {
      paymentId: payment._id,
      amount,
      currency: currency.toUpperCase(),
      network,
      contractAddress,
      recipient,
      status: 'pending',
      createdAt: payment.createdAt
    };
  }

  static async getConversionRates() {
    // Simulated rates — replace with oracle/API integration
    return {
      USDC: { USD: 1.00, EUR: 0.92, XMR: 0.0061 },
      USDT: { USD: 1.00, EUR: 0.92, XMR: 0.0061 },
      updatedAt: new Date().toISOString()
    };
  }

  static async confirmPayment(paymentId, txHash) {
    const payment = await StablecoinPayment.findByIdAndUpdate(
      paymentId,
      {
        status: 'completed',
        txHash,
        completedAt: new Date()
      },
      { new: true }
    );
    return payment;
  }

  static async getUnifiedDashboard() {
    const [totalPayments, byCurrency, byStatus, recentVolume] = await Promise.all([
      StablecoinPayment.countDocuments(),
      StablecoinPayment.aggregate([
        { $group: { _id: '$currency', count: { $sum: 1 }, volume: { $sum: '$amount' } } }
      ]),
      StablecoinPayment.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      StablecoinPayment.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, volume24h: { $sum: '$amount' } } }
      ])
    ]);

    return {
      totalPayments,
      byCurrency,
      byStatus,
      recentVolume: recentVolume[0]?.volume24h || 0,
      updatedAt: new Date().toISOString()
    };
  }
}

module.exports = StablecoinService;
