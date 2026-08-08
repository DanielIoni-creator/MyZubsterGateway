const distributionService = require('../services/distributionService');

// Ottieni le distribuzioni per un utente
const getUserDistributions = async (req, res) => {
  try {
    const { userId } = req.params;
    const distributions = distributionService.getUserDistributions(userId);
    
    res.json({
      success: true,
      data: distributions
    });
  } catch (error) {
    console.error('Error getting distributions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Simula una distribuzione trimestrale
const simulateDistribution = async (req, res) => {
  try {
    const { token } = req.params;
    let distribution;
    
    if (token.toUpperCase() === 'MBFT') {
      distribution = await distributionService.distributeMBFT();
    } else if (token.toUpperCase() === 'SRET') {
      distribution = await distributionService.distributeSRET();
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid token symbol'
      });
    }
    
    res.json({
      success: true,
      data: distribution
    });
  } catch (error) {
    console.error('Error simulating distribution:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getUserDistributions,
  simulateDistribution
};
