const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const reviewService = require('../services/reviewService');

// POST /api/reviews - Crea una recensione
router.post('/', auth, async (req, res) => {
  try {
    const { orderId, rating, comment } = req.body;
    const review = await reviewService.createReview(req.user._id, orderId, rating, comment);
    res.status(201).json({ success: true, review });
  } catch (error) {
    console.error('Errore creazione recensione:', error);
    res.status(500).json({ error: error.message || 'Errore nella creazione della recensione' });
  }
});

// GET /api/reviews/user/:userId - Recensioni di un utente
router.get('/user/:userId', async (req, res) => {
  try {
    const reviews = await reviewService.getUserReviews(req.params.userId);
    res.json(reviews);
  } catch (error) {
    console.error('Errore recupero recensioni:', error);
    res.status(500).json({ error: 'Errore nel recupero delle recensioni' });
  }
});

// GET /api/reviews/rating/:userId - Media recensioni di un utente
router.get('/rating/:userId', async (req, res) => {
  try {
    const rating = await reviewService.getAverageRating(req.params.userId);
    res.json(rating);
  } catch (error) {
    console.error('Errore recupero media:', error);
    res.status(500).json({ error: 'Errore nel recupero della media' });
  }
});

module.exports = router;
