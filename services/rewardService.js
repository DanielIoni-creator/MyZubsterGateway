const Reward = require('../models/Reward');

class RewardService {
  // Crea una nuova ricompensa
  async createReward(data) {
    try {
      // Verifica che l'utente esista
      if (!data.userId) {
        return { success: false, error: 'UserId is required' };
      }

      const reward = new Reward({
        userId: data.userId,
        username: data.username || 'unknown',
        amount: data.amount || 0.01,
        currency: data.currency || 'XMR',
        type: data.type || 'bounty',
        source: data.source || 'Bounty System',
        sourceId: data.sourceId,
        description: data.description || 'Bounty reward',
        metadata: data.metadata || {},
        status: 'pending'
      });

      await reward.save();
      console.log('✅ Reward created:', reward._id);
      return { success: true, data: reward };
    } catch (error) {
      console.error('Error creating reward:', error);
      return { success: false, error: error.message };
    }
  }

  // Ottieni le ricompense di un utente
  async getUserRewards(userId, options = {}) {
    try {
      const { status, type, limit = 50, page = 1 } = options;
      
      const query = { userId };
      if (status) query.status = status;
      if (type) query.type = type;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const rewards = await Reward.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Reward.countDocuments(query);

      return {
        success: true,
        data: {
          rewards,
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      };
    } catch (error) {
      console.error('Error getting user rewards:', error);
      return { success: false, error: error.message };
    }
  }

  // Ottieni le statistiche delle ricompense
  async getRewardStats(userId) {
    try {
      const total = await Reward.countDocuments({ userId });
      const pending = await Reward.countDocuments({ userId, status: 'pending' });
      const claimed = await Reward.countDocuments({ userId, status: 'claimed' });

      const totalAmount = await Reward.aggregate([
        { $match: { userId: mongoose.Types.ObjectId(userId) } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      return {
        success: true,
        data: {
          total,
          pending,
          claimed,
          totalXMR: totalAmount.length > 0 ? totalAmount[0].total : 0
        }
      };
    } catch (error) {
      console.error('Error getting reward stats:', error);
      return { success: false, error: error.message };
    }
  }

  // Claim una ricompensa
  async claimReward(rewardId, userId) {
    try {
      const reward = await Reward.findOne({ _id: rewardId, userId });
      if (!reward) {
        return { success: false, error: 'Reward not found' };
      }

      if (reward.status !== 'pending') {
        return { success: false, error: `Reward already ${reward.status}` };
      }

      reward.status = 'claimed';
      reward.claimedAt = new Date();
      await reward.save();

      return { success: true, data: reward };
    } catch (error) {
      console.error('Error claiming reward:', error);
      return { success: false, error: error.message };
    }
  }

  // Crea ricompensa automatica per bounty completato
  async createBountyReward(bounty) {
    try {
      if (!bounty.assignedTo) {
        console.log('⚠️ No user assigned to bounty, skipping reward');
        return { success: false, error: 'No user assigned' };
      }

      const reward = await this.createReward({
        userId: bounty.assignedTo,
        username: bounty.assignedToUsername || 'unknown',
        amount: bounty.amount || 0.01,
        type: 'bounty',
        source: 'Bounty System',
        sourceId: bounty._id,
        description: `Bounty #${bounty.issueNumber}: ${bounty.title}`,
        metadata: {
          issueNumber: bounty.issueNumber,
          prNumber: bounty.prNumber,
          prUrl: bounty.prUrl
        }
      });

      return reward;
    } catch (error) {
      console.error('Error creating bounty reward:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new RewardService();
