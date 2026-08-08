const Token = require('../models/Token');
const TokenBalance = require('../models/TokenBalance');

// Ottieni tutti i token
const getTokens = async (req, res) => {
  try {
    const { country, status } = req.query;
    const filter = {};
    
    if (country) filter.country = country;
    if (status) filter.status = status;
    
    const tokens = await Token.find(filter).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: tokens
    });
    
  } catch (error) {
    console.error('Error getting tokens:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Ottieni un token specifico
const getToken = async (req, res) => {
  try {
    const { symbol } = req.params;
    const token = await Token.findOne({ symbol: symbol.toUpperCase() });
    
    if (!token) {
      return res.status(404).json({
        success: false,
        error: 'Token not found'
      });
    }
    
    res.json({
      success: true,
      data: token
    });
    
  } catch (error) {
    console.error('Error getting token:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Ottieni i rendimenti stimati
const getTokenYield = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Trova tutti i balance per l'utente
    const tokenBalances = await TokenBalance.find({ userId })
      .populate('tokenId', 'symbol name expectedYield currency tokenPrice');
    
    if (!tokenBalances || tokenBalances.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'No tokens found for this user'
      });
    }
    
    // Calcola i rendimenti
    const yields = tokenBalances.map(b => {
      const token = b.tokenId;
      const balance = b.balance || 0;
      const price = token.tokenPrice || 1000;
      const yieldPercent = token.expectedYield || 5;
      const annualYield = (balance * price * (yieldPercent / 100));
      
      return {
        symbol: token.symbol,
        name: token.name,
        balance: balance,
        price: price,
        expectedYield: yieldPercent,
        annualYield: annualYield.toFixed(2),
        monthlyYield: (annualYield / 12).toFixed(2),
        currency: token.currency || 'SGD'
      };
    });
    
    // Calcola il totale
    const totalAnnualYield = yields.reduce((sum, y) => sum + parseFloat(y.annualYield), 0);
    
    res.json({
      success: true,
      data: {
        yields: yields,
        totalAnnualYield: totalAnnualYield.toFixed(2),
        totalMonthlyYield: (totalAnnualYield / 12).toFixed(2),
        currency: yields[0]?.currency || 'SGD'
      }
    });
    
  } catch (error) {
    console.error('Error getting token yield:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getTokens,
  getToken,
  getTokenYield
};
