const emailService = require('../services/emailService');

// Utente fittizio per i test
const TEST_USER = {
  id: 'test-user-123',
  username: 'testuser',
  email: 'test@example.com'
};

const sendWelcomeEmail = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Usa l'utente fittizio per i test
    const user = {
      id: userId || TEST_USER.id,
      username: TEST_USER.username,
      email: TEST_USER.email
    };

    console.log(`📧 Sending welcome email to: ${user.email}`);
    
    const result = await emailService.sendWelcomeEmail(user);
    
    res.json({
      success: result.success,
      message: result.success ? 'Welcome email sent' : 'Failed to send email',
      details: result
    });

  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const sendTokenPurchaseEmail = async (req, res) => {
  try {
    const { userId, tokenId, amount } = req.body;
    
    const user = {
      id: userId || TEST_USER.id,
      username: TEST_USER.username,
      email: TEST_USER.email
    };

    const token = {
      id: tokenId || '6a773552bed8cdb5cb9df8a3',
      symbol: 'MBFT',
      name: 'Marina Bay Tower',
      tokenPrice: 1000
    };

    console.log(`📧 Sending token purchase email to: ${user.email}`);
    console.log(`📧 Token: ${token.symbol}, Amount: ${amount}`);

    const result = await emailService.sendTokenPurchaseEmail(user, token, amount || 10);
    
    res.json({
      success: result.success,
      message: result.success ? 'Token purchase email sent' : 'Failed to send email',
      details: result
    });

  } catch (error) {
    console.error('❌ Error sending token purchase email:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const sendBountyCompletedEmail = async (req, res) => {
  try {
    const { userId, bountyId } = req.body;
    
    const user = {
      id: userId || TEST_USER.id,
      username: TEST_USER.username,
      email: TEST_USER.email
    };

    const bounty = {
      id: bountyId || '1',
      title: 'Token Balance Endpoint',
      reward: '0.05 XMR',
      description: 'Implementato con successo il Token Balance Endpoint'
    };

    console.log(`📧 Sending bounty completed email to: ${user.email}`);
    console.log(`📧 Bounty: ${bounty.title}, Reward: ${bounty.reward}`);

    const result = await emailService.sendBountyCompletedEmail(user, bounty);
    
    res.json({
      success: result.success,
      message: result.success ? 'Bounty completed email sent' : 'Failed to send email',
      details: result
    });

  } catch (error) {
    console.error('❌ Error sending bounty completed email:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  sendWelcomeEmail,
  sendTokenPurchaseEmail,
  sendBountyCompletedEmail
};
