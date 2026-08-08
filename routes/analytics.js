const express = require('express');
const router = express.Router();
const Reward = require('../models/Reward');
const axios = require('axios');

// Endpoint per le statistiche avanzate
router.get('/stats', async (req, res) => {
  try {
    // 1. Raccogli tutti i reward completati
    const rewards = await Reward.find({ status: 'completed' });
    
    // 2. MYZ per categoria
    const categoryMap = new Map();
    rewards.forEach(r => {
      const category = r.source || 'other';
      categoryMap.set(category, (categoryMap.get(category) || 0) + r.amount);
    });
    const byCategory = Array.from(categoryMap.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);

    // 3. Bounty più popolari (da GitHub)
    const githubResponse = await axios.get(
      'https://api.github.com/repos/MyZubster-Ecosystem/MyZubsterGateway/issues',
      {
        params: {
          state: 'all',
          labels: 'bounty',
          per_page: 100
        },
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      }
    );

    const issues = githubResponse.data;
    const popularBounties = issues
      .filter(i => i.comments > 0)
      .sort((a, b) => b.comments - a.comments)
      .slice(0, 5)
      .map(i => ({
        number: i.number,
        title: i.title,
        comments: i.comments,
        state: i.state,
        url: i.html_url
      }));

    // 4. Tempo medio di completamento (dalle PR mergiate)
    const prResponse = await axios.get(
      'https://api.github.com/repos/MyZubster-Ecosystem/MyZubsterGateway/pulls',
      {
        params: {
          state: 'closed',
          per_page: 50,
          sort: 'updated',
          direction: 'desc'
        },
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      }
    );

    const closedPRs = prResponse.data.filter(pr => pr.merged_at);
    let totalTime = 0;
    let completedCount = 0;
    
    closedPRs.forEach(pr => {
      if (pr.created_at && pr.merged_at) {
        const created = new Date(pr.created_at);
        const merged = new Date(pr.merged_at);
        const hours = (merged - created) / (1000 * 60 * 60);
        if (hours > 0) {
          totalTime += hours;
          completedCount++;
        }
      }
    });

    const avgCompletionTime = completedCount > 0 
      ? Math.round((totalTime / completedCount) * 10) / 10 
      : 0;

    // 5. Attività recente
    const recentActivity = rewards
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map(r => ({
        userId: r.userId,
        amount: r.amount,
        reason: r.reason,
        timestamp: r.createdAt
      }));

    res.json({
      success: true,
      data: {
        byCategory,
        popularBounties,
        avgCompletionTime: {
          hours: avgCompletionTime,
          days: Math.round(avgCompletionTime / 24 * 10) / 10
        },
        recentActivity,
        totalRewards: rewards.length,
        totalMYZ: rewards.reduce((sum, r) => sum + r.amount, 0),
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Errore analytics:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
