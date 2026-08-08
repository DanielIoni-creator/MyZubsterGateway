const TokenBalance = require('../models/TokenBalance');
const Token = require('../models/Token');

// Ottieni il saldo del wallet per un utente
const getWalletBalance = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verifica che l'utente esista (mock per ora)
    const user = { id: userId || 'test-user-123', username: 'testuser' };
    
    // Ottieni tutti i saldi dei token per l'utente
    const balances = await TokenBalance.find({ userId: user.id })
      .populate('tokenId', 'symbol name tokenPrice');

    // Calcola il valore totale in USD e SGD
    const totalValue = {
      usd: 0,
      sgd: 0
    };

    const formattedBalances = balances.map(b => {
      const token = b.tokenId;
      const valueUSD = b.balance * (token.tokenPrice || 0);
      const valueSGD = valueUSD * 1.35;
      
      totalValue.usd += valueUSD;
      totalValue.sgd += valueSGD;

      return {
        tokenId: token._id,
        symbol: token.symbol,
        name: token.name,
        balance: b.balance,
        valueUSD: valueUSD.toFixed(2),
        valueSGD: valueSGD.toFixed(2)
      };
    });

    res.json({
      success: true,
      data: {
        userId: user.id,
        balances: formattedBalances,
        totalValue: {
          usd: totalValue.usd.toFixed(2),
          sgd: totalValue.sgd.toFixed(2)
        }
      }
    });

  } catch (error) {
    console.error('Error getting wallet balance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getWalletBalance
};
