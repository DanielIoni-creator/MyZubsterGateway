const Review = require('../models/Review');
const Order = require('../models/Order');
const TokenHolding = require('../models/TokenHolding');

// Crea una recensione
const createReview = async (reviewerId, orderId, rating, comment) => {
  const order = await Order.findById(orderId).populate('offer');
  if (!order) throw new Error('Ordine non trovato');
  if (order.buyer.toString() !== reviewerId) throw new Error('Non autorizzato a recensire questo ordine');
  if (order.status !== 'completed') throw new Error('Ordine non completato');

  const review = new Review({
    order: orderId,
    reviewer: reviewerId,
    targetUser: order.offer.user,
    rating,
    comment,
    token: order.offer.token || null,
    isVerified: true,
  });
  await review.save();

  // Aggiorna la reputazione (media recensioni)
  await updateReputation(order.offer.user);

  return review;
};

// Ottieni recensioni per un utente
const getUserReviews = async (userId) => {
  const reviews = await Review.find({ targetUser: userId })
    .populate('reviewer', 'username email')
    .populate('order')
    .sort({ createdAt: -1 });
  return reviews;
};

// Calcola media recensioni
const getAverageRating = async (userId) => {
  const result = await Review.aggregate([
    { $match: { targetUser: userId } },
    { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  if (result.length === 0) return { avgRating: 0, count: 0 };
  return { avgRating: result[0].avgRating, count: result[0].count };
};

// Aggiorna reputazione utente (collegato agli NFT)
const updateReputation = async (userId) => {
  const { avgRating, count } = await getAverageRating(userId);
  
  // Qui puoi mintare NFT di reputazione basati sulla media recensioni
  // Esempio: se avgRating >= 4.5 e count >= 10 -> NFT EXPERT
  // Implementiamo dopo
  
  return { avgRating, count };
};

module.exports = {
  createReview,
  getUserReviews,
  getAverageRating,
  updateReputation,
};
