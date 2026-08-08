const TokenBalance = require('../models/TokenBalance');

// Tassi di cambio aggiornati con tutti i token
const EXCHANGE_RATES = {
  MYZ: { USD: 0.50, SGD: 0.67 },
  MBFT: { USD: 740.74, SGD: 1000 },
  SRET: { USD: 740.74, SGD: 1000 },
  GGT: { USD: 740.74, SGD: 1000 },
  WRMV: { USD: 740.74, SGD: 1000 },
  NYP: { USD: 1000, SGD: 1350 },
  MIL: { USD: 1075.27, SGD: 1451.61 }
};

// Ottieni il tasso di cambio
const getSwapRate = async (req, res) => {
  try {
    const { from, to } = req.query;
    
    if (!from || !to) {
      return res.status(400).json({
        success: false,
        error: 'from and to parameters are required'
      });
    }

    const fromRate = EXCHANGE_RATES[from.toUpperCase()];
    const toRate = EXCHANGE_RATES[to.toUpperCase()];

    if (!fromRate || !toRate) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token symbol. Available: ' + Object.keys(EXCHANGE_RATES).join(', ')
      });
    }

    // Calcola il tasso di cambio (1 from = X to)
    const rate = (fromRate.USD / toRate.USD);

    res.json({
      success: true,
      data: {
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        rate: rate,
        prices: {
          from: {
            usd: fromRate.USD,
            sgd: fromRate.SGD
          },
          to: {
            usd: toRate.USD,
            sgd: toRate.SGD
          }
        }
      }
    });

  } catch (error) {
    console.error('Error getting swap rate:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Esegui lo swap
const executeSwap = async (req, res) => {
  try {
    const { fromToken, toToken, amount, userId } = req.body;

    if (!fromToken || !toToken || !amount || !userId) {
      return res.status(400).json({
        success: false,
        error: 'fromToken, toToken, amount and userId are required'
      });
    }

    // Verifica i tassi
    const fromRate = EXCHANGE_RATES[fromToken.toUpperCase()];
    const toRate = EXCHANGE_RATES[toToken.toUpperCase()];

    if (!fromRate || !toRate) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token symbol. Available: ' + Object.keys(EXCHANGE_RATES).join(', ')
      });
    }

    // Calcola l'importo ricevuto
    const rate = (fromRate.USD / toRate.USD);
    const received = amount * rate;
    const fee = received * 0.01; // 1% fee

    // Crea una transazione
    const transaction = {
      id: 'tx-' + Date.now(),
      fromToken: fromToken.toUpperCase(),
      toToken: toToken.toUpperCase(),
      amount: amount,
      received: received - fee,
      fee: fee,
      rate: rate,
      userId: userId,
      timestamp: new Date().toISOString(),
      status: 'completed'
    };

    res.json({
      success: true,
      data: transaction
    });

  } catch (error) {
    console.error('Error executing swap:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getSwapRate,
  executeSwap
};
