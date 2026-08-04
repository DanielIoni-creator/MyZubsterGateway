const express = require('express');
const mongoose = require('mongoose');
const Review = require('../models/Review');
const User = require('../models/User');

function createReviewRouter() {
  const router = express.Router();

  router.post('/', async (req, res) => {
    try {
      const { authorId, targetUserId, skillId, rating, comment } = req.body || {};
      const parsedRating = Number(rating);

      if (!authorId || !targetUserId || !skillId) {
        return res.status(400).json({ error: 'authorId, targetUserId and skillId are required' });
      }
      if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
        return res.status(400).json({ error: 'rating must be an integer between 1 and 5' });
      }

      const review = await Review.create({
        authorId: String(authorId),
        targetUserId: String(targetUserId),
        skillId: String(skillId),
        rating: parsedRating,
        comment: comment ? String(comment) : ''
      });

      await updateUserRating(review.targetUserId);

      res.status(201).json(publicReview(review));
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  router.get('/user/:userId', async (req, res) => {
    try {
      const reviews = await Review.find({ targetUserId: String(req.params.userId) })
        .sort({ createdAt: -1 })
        .lean();

      res.json(reviews.map(publicReview));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/skill/:skillId', async (req, res) => {
    try {
      const reviews = await Review.find({ skillId: String(req.params.skillId) })
        .sort({ createdAt: -1 })
        .lean();

      res.json(reviews.map(publicReview));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

async function updateUserRating(targetUserId) {
  const stringTargetUserId = String(targetUserId);
  const [stats] = await Review.aggregate([
    { $match: { targetUserId: stringTargetUserId } },
    {
      $group: {
        _id: '$targetUserId',
        rating: { $avg: '$rating' },
        reviewCount: { $sum: 1 }
      }
    }
  ]);

  const rating = stats ? Number(stats.rating.toFixed(2)) : 0;
  const reviewCount = stats ? stats.reviewCount : 0;
  const now = new Date();

  const selectors = [{ userId: stringTargetUserId }];
  if (mongoose.Types.ObjectId.isValid(stringTargetUserId)) {
    selectors.push({ _id: new mongoose.Types.ObjectId(stringTargetUserId) });
  }

  const existingUser = await User.findOne({ $or: selectors });
  if (existingUser) {
    await User.updateOne(
      { _id: existingUser._id },
      { $set: { rating, reviewCount, updatedAt: now } }
    );
    return { rating, reviewCount };
  }

  await User.updateOne(
    { userId: stringTargetUserId },
    {
      $set: { rating, reviewCount, updatedAt: now },
      $setOnInsert: { userId: stringTargetUserId, createdAt: now }
    },
    { upsert: true }
  );

  return { rating, reviewCount };
}

function publicReview(review) {
  return {
    id: String(review._id || review.id),
    authorId: review.authorId,
    targetUserId: review.targetUserId,
    skillId: review.skillId,
    rating: review.rating,
    comment: review.comment || '',
    createdAt: review.createdAt
  };
}

module.exports = { createReviewRouter, updateUserRating, publicReview };
