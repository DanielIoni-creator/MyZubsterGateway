const express = require('express');
const router = express.Router();
const RobotFeedback = require('../models/RobotFeedback');
const crypto = require('crypto');

// POST /api/robot/feedback — Submit feedback for a robot
router.post('/feedback', async (req, res) => {
  try {
    const { robotId, userId, jobId, rating, comment } = req.body;
    if (!robotId || !userId || !jobId || !rating) {
      return res.status(400).json({ error: 'robotId, userId, jobId, and rating are required' });
    }
    if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });

    // Check for duplicate feedback on same job
    const existing = await RobotFeedback.findOne({ userId, jobId });
    if (existing) return res.status(409).json({ error: 'Feedback already submitted for this job' });

    const feedback = new RobotFeedback({
      feedbackId: crypto.randomUUID(), robotId, userId, jobId, rating, comment: comment || ''
    });
    await feedback.save();
    const reputation = await RobotFeedback.getReputation(robotId);
    res.status(201).json({ success: true, feedback, reputation });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/robot/feedback/:robotId — Get feedback history + reputation
router.get('/feedback/:robotId', async (req, res) => {
  try {
    const feedbacks = await RobotFeedback.find({ robotId: req.params.robotId }).sort({ createdAt: -1 }).limit(50);
    const reputation = await RobotFeedback.getReputation(req.params.robotId);
    res.json({ robotId: req.params.robotId, feedbacks, count: feedbacks.length, reputation });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/robot/feedback/:robotId/reputation — Get reputation score only
router.get('/feedback/:robotId/reputation', async (req, res) => {
  try {
    const reputation = await RobotFeedback.getReputation(req.params.robotId);
    res.json({ robotId: req.params.robotId, reputation });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/robot/leaderboard — Top robots by reputation
router.get('/leaderboard', async (req, res) => {
  try {
    const robots = await RobotFeedback.distinct('robotId');
    const rankings = [];
    for (const robotId of robots) {
      const rep = await RobotFeedback.getReputation(robotId);
      rankings.push({ robotId, ...rep });
    }
    rankings.sort((a, b) => b.score - a.score);
    res.json({ leaderboard: rankings.slice(0, 20) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
