const TokenBalance = require('../models/TokenBalance');
const Token = require('../models/Token');

const getTokenBalances = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`🔍 Fetching balances for user: ${userId}`);
    
    // Ottieni i balances senza populate prima
    const balances = await TokenBalance.find({ userId }).lean();
    
    console.log(`📊 Found ${balances.length} balances`);

    if (!balances || balances.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No token balances found for this user'
      });
    }

    // Ottieni i dettagli dei token separatamente
    const tokenIds = balances.map(b => b.tokenId);
    const tokens = await Token.find({ _id: { $in: tokenIds } }).lean();
    const tokenMap = {};
    tokens.forEach(t => { tokenMap[t._id.toString()] = t; });

    // Formatta i balances con i dati dei token
    const formattedBalances = balances.map(b => {
      const token = tokenMap[b.tokenId.toString()];
      if (!token) {
        console.warn(`⚠️ Token not found for balance: ${b._id}`);
        return null;
      }
      
      return {
        tokenId: token._id,
        symbol: token.symbol,
        name: token.name,
        balance: b.balance,
        lockedBalance: b.lockedBalance || 0,
        availableBalance: b.balance - (b.lockedBalance || 0),
        value: {
          usd: (b.balance * (token.tokenPrice || 0)).toFixed(2),
          sgd: ((b.balance * (token.tokenPrice || 0)) * 1.35).toFixed(2)
        },
        lastUpdated: b.lastUpdated
      };
    }).filter(b => b !== null);

    if (formattedBalances.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No valid token balances found for this user'
      });
    }

    const totals = {
      totalTokens: formattedBalances.length,
      totalValue: {
        usd: formattedBalances.reduce((sum, b) => sum + parseFloat(b.value.usd), 0).toFixed(2),
        sgd: formattedBalances.reduce((sum, b) => sum + parseFloat(b.value.sgd), 0).toFixed(2)
      }
    };

    res.json({
      success: true,
      data: {
        userId,
        balances: formattedBalances,
        totals
      }
    });

  } catch (error) {
    console.error('❌ Error fetching token balances:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
};

module.exports = { getTokenBalances };
