// src/components/Reviews/Reviews.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Reviews.css';

const Reviews = ({ targetId, targetType, currentUserId }) => {
    const [reviews, setReviews] = useState([]);
    const [averageRating, setAverageRating] = useState(0);
    const [totalReviews, setTotalReviews] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
    const [submitting, setSubmitting] = useState(false);
    const [userHasReviewed, setUserHasReviewed] = useState(false);

    // ─── CARICA RECENSIONI ───
    useEffect(() => {
        if (targetId) {
            fetchReviews();
        }
    }, [targetId]);

    const fetchReviews = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/reviews/target/${targetId}`);
            if (response.data.success) {
                setReviews(response.data.data.reviews);
                setAverageRating(response.data.data.averageRating);
                setTotalReviews(response.data.data.totalReviews);
                
                // Verifica se l'utente ha già recensito
                if (currentUserId) {
                    const hasReviewed = response.data.data.reviews.some(
                        r => r.reviewerId === currentUserId
                    );
                    setUserHasReviewed(hasReviewed);
                }
            }
        } catch (err) {
            setError('Errore nel caricamento delle recensioni');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // ─── INVIA RECENSIONE ───
    const handleSubmitReview = async (e) => {
        e.preventDefault();
        
        if (!currentUserId) {
            alert('Devi essere loggato per recensire');
            return;
        }

        if (userHasReviewed) {
            alert('Hai già recensito questo profilo');
            return;
        }

        try {
            setSubmitting(true);
            const response = await axios.post('/api/reviews', {
                targetId,
                targetType,
                reviewerId: currentUserId,
                rating: newReview.rating,
                comment: newReview.comment
            });
            
            if (response.data.success) {
                // Ricarica le recensioni
                await fetchReviews();
                // Resetta il form
                setNewReview({ rating: 5, comment: '' });
                setUserHasReviewed(true);
                alert('✅ Recensione inviata con successo!');
            }
        } catch (err) {
            alert('❌ Errore nell\'invio della recensione: ' + (err.response?.data?.error || err.message));
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    // ─── RENDER STELLE ───
    const renderStars = (rating) => {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        return (
            <span className="stars">
                {'⭐'.repeat(fullStars)}
                {hasHalfStar && '🌟'}
                {'☆'.repeat(emptyStars)}
                <span className="rating-number"> ({rating.toFixed(1)})</span>
            </span>
        );
    };

    // ─── RENDER STELLE PER IL FORM ───
    const renderStarOptions = () => {
        return [5, 4, 3, 2, 1].map((num) => (
            <option key={num} value={num}>
                {'⭐'.repeat(num)} {num}
            </option>
        ));
    };

    // ─── FORMATTA DATA ───
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // ─── LOADING ───
    if (loading) {
        return <div className="reviews-loading">⏳ Caricamento recensioni...</div>;
    }

    // ─── ERROR ───
    if (error) {
        return <div className="reviews-error">❌ {error}</div>;
    }

    return (
        <div className="reviews-container">
            {/* HEADER */}
            <div className="reviews-header">
                <h2>📝 Recensioni</h2>
                <div className="reviews-stats">
                    <span className="average-rating">
                        {renderStars(averageRating)}
                    </span>
                    <span className="total-reviews">
                        ({totalReviews} recensione{totalReviews !== 1 ? 'i' : ''})
                    </span>
                </div>
            </div>

            {/* LISTA RECENSIONI */}
            <div className="reviews-list">
                {reviews.length === 0 ? (
                    <p className="no-reviews">📭 Nessuna recensione ancora. Sii il primo!</p>
                ) : (
                    reviews.map((review) => (
                        <div key={review.id} className="review-item">
                            <div className="review-header">
                                <span className="reviewer-name">
                                    {review.reviewerName || 'Anonimo'}
                                </span>
                                <span className="review-rating">
                                    {renderStars(review.rating)}
                                </span>
                            </div>
                            {review.comment && (
                                <div className="review-comment">
                                    "{review.comment}"
                                </div>
                            )}
                            <div className="review-date">
                                {formatDate(review.createdAt)}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* FORM NUOVA RECENSIONE */}
            {currentUserId && !userHasReviewed && (
                <div className="new-review-form">
                    <h3>✍️ Scrivi una recensione</h3>
                    <form onSubmit={handleSubmitReview}>
                        <div className="form-group">
                            <label>Valutazione:</label>
                            <select
                                value={newReview.rating}
                                onChange={(e) => setNewReview({ ...newReview, rating: parseInt(e.target.value) })}
                                disabled={submitting}
                            >
                                {renderStarOptions()}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Commento:</label>
                            <textarea
                                value={newReview.comment}
                                onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                                placeholder="Condividi la tua esperienza..."
                                rows="3"
                                disabled={submitting}
                                required
                            />
                        </div>

                        <button 
                            type="submit" 
                            className="btn-submit"
                            disabled={submitting}
                        >
                            {submitting ? '⏳ Invio...' : '📨 Invia recensione'}
                        </button>
                    </form>
                </div>
            )}

            {currentUserId && userHasReviewed && (
                <div className="already-reviewed">
                    ✅ Hai già recensito questo profilo
                </div>
            )}

            {!currentUserId && (
                <div className="login-prompt">
                    🔐 <a href="/login">Accedi</a> per lasciare una recensione
                </div>
            )}
        </div>
    );
};

export default Reviews;