// backend/routes/reviews.js
const express = require('express');
const router = express.Router();

// ─── GET /api/reviews ───
router.get('/', async (req, res) => {
    try {
        res.json({
            success: true,
            data: [
                {
                    id: 'rev_1',
                    targetId: 'user_1',
                    targetType: 'professional',
                    reviewerId: 'user_2',
                    reviewerName: 'Laura Bianchi',
                    rating: 5,
                    comment: 'Ottimo professionista, molto competente!',
                    createdAt: new Date().toISOString()
                }
            ]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ─── GET /api/reviews/target/:targetId ───
router.get('/target/:targetId', async (req, res) => {
    try {
        const { targetId } = req.params;
        
        const reviews = [
            {
                id: 'rev_1',
                targetId: targetId,
                targetType: 'professional',
                reviewerId: 'user_456',
                reviewerName: 'Mario Rossi',
                rating: 5,
                comment: 'Ottimo lavoro! Professionista molto competente.',
                createdAt: new Date().toISOString()
            },
            {
                id: 'rev_2',
                targetId: targetId,
                reviewerId: 'user_789',
                reviewerName: 'Laura Bianchi',
                rating: 4,
                comment: 'Buon servizio, consigliato!',
                createdAt: new Date(Date.now() - 86400000).toISOString()
            },
            {
                id: 'rev_3',
                targetId: targetId,
                reviewerId: 'user_101',
                reviewerName: 'Marco Verdi',
                rating: 5,
                comment: 'Eccellente, super consigliato!',
                createdAt: new Date(Date.now() - 172800000).toISOString()
            }
        ];
        
        const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        
        res.json({
            success: true,
            data: {
                targetId,
                targetType: 'professional',
                averageRating: averageRating || 0,
                totalReviews: reviews.length,
                reviews: reviews
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ─── POST /api/reviews ───
router.post('/', async (req, res) => {
    try {
        const { targetId, targetType, reviewerId, rating, comment } = req.body;
        
        if (!targetId || !reviewerId || !rating) {
            return res.status(400).json({
                success: false,
                error: 'Campi obbligatori: targetId, reviewerId, rating'
            });
        }
        
        const newReview = {
            id: 'rev_' + Date.now(),
            targetId,
            targetType: targetType || 'professional',
            reviewerId,
            reviewerName: 'Utente ' + reviewerId,
            rating: parseInt(rating),
            comment: comment || '',
            createdAt: new Date().toISOString()
        };
        
        res.json({
            success: true,
            data: newReview
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ─── PUT /api/reviews/:id ───
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;
        
        res.json({
            success: true,
            message: 'Recensione aggiornata',
            data: { id, rating, comment }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ─── DELETE /api/reviews/:id ───
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        res.json({
            success: true,
            message: 'Recensione cancellata',
            data: { id }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ─── GET /api/reviews/stats/:targetId ───
router.get('/stats/:targetId', async (req, res) => {
    try {
        const { targetId } = req.params;
        
        res.json({
            success: true,
            data: {
                targetId,
                averageRating: 4.5,
                totalReviews: 12,
                ratingDistribution: {
                    5: 6,
                    4: 4,
                    3: 1,
                    2: 1,
                    1: 0
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;