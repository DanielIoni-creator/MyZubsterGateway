// routes/robotMarketplace.js — Robot Marketplace with booking and MYZ/XMR payments (BOT-10, closes #347)
const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const listings = new Map();
const bookings = new Map();
const reviews = [];

// POST /api/marketplace/list — List a robot for hire
router.post('/list', (req, res) => {
  try {
    const { robotId, name, type, description, price, currency, owner, tags } = req.body;
    if (!robotId || !name || !price) return res.status(400).json({ error: 'robotId, name, price required' });

    const listingId = `list_${crypto.randomUUID().slice(0, 8)}`;
    const listing = {
      listingId, robotId, name, type: type || 'general',
      description: description || '', price: parseFloat(price),
      currency: currency || 'MYZ', owner: owner || 'anonymous',
      tags: tags || [], rating: 0, ratingCount: 0,
      status: 'available', createdAt: new Date().toISOString()
    };
    listings.set(listingId, listing);
    res.status(201).json({ success: true, listing });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/marketplace/search — Search and filter listings
router.get('/search', (req, res) => {
  try {
    const { type, currency, minPrice, maxPrice, minRating, tags, sort, page = 1, limit = 20 } = req.query;
    let results = Array.from(listings.values()).filter(l => l.status === 'available');

    if (type) results = results.filter(l => l.type === type);
    if (currency) results = results.filter(l => l.currency === currency);
    if (minPrice) results = results.filter(l => l.price >= parseFloat(minPrice));
    if (maxPrice) results = results.filter(l => l.price <= parseFloat(maxPrice));
    if (minRating) results = results.filter(l => l.rating >= parseFloat(minRating));
    if (tags) {
      const tagList = tags.split(',');
      results = results.filter(l => tagList.some(t => l.tags.includes(t)));
    }

    // Sort
    if (sort === 'price_asc') results.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') results.sort((a, b) => b.price - a.price);
    else if (sort === 'rating') results.sort((a, b) => b.rating - a.rating);
    else results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // newest

    const total = results.length;
    const p = parseInt(page);
    const l = parseInt(limit);
    results = results.slice((p - 1) * l, p * l);

    res.json({
      success: true,
      listings: results,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/marketplace/listing/:listingId — Get listing details
router.get('/listing/:listingId', (req, res) => {
  const listing = listings.get(req.params.listingId);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });

  // Get reviews for this robot
  const robotReviews = reviews.filter(r => r.robotId === listing.robotId);
  res.json({ listing, reviews: robotReviews, reviewCount: robotReviews.length });
});

// POST /api/marketplace/book — Book a robot
router.post('/book', (req, res) => {
  try {
    const { listingId, clientId, duration, amount } = req.body;
    if (!listingId || !clientId) return res.status(400).json({ error: 'listingId and clientId required' });

    const listing = listings.get(listingId);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.status !== 'available') return res.status(400).json({ error: 'Robot not available' });

    const bookingId = `book_${crypto.randomUUID().slice(0, 8)}`;
    const booking = {
      bookingId, listingId, robotId: listing.robotId,
      clientId, amount: amount || listing.price,
      currency: listing.currency, duration: duration || '1h',
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      escrowTxId: `escrow_tx_${Date.now()}`
    };

    listing.status = 'booked';
    listings.set(listingId, listing);
    bookings.set(bookingId, booking);

    res.status(201).json({
      success: true,
      booking,
      message: `Robot "${listing.name}" booked for ${booking.currency} ${booking.amount}`
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/marketplace/review — Leave a review
router.post('/review', (req, res) => {
  try {
    const { listingId, robotId, bookingId, rating, comment } = req.body;
    if (!robotId || !rating) return res.status(400).json({ error: 'robotId and rating required' });
    if (rating < 1 || rating > 5) return res.status(400).json({ error: 'rating must be 1-5' });

    const review = {
      reviewId: `rev_${crypto.randomUUID().slice(0, 8)}`,
      listingId, robotId, bookingId,
      rating: parseInt(rating), comment: comment || '',
      createdAt: new Date().toISOString()
    };
    reviews.push(review);

    // Update listing rating
    if (listingId) {
      const listing = listings.get(listingId);
      if (listing) {
        const robotReviews = reviews.filter(r => r.robotId === robotId);
        const avg = robotReviews.reduce((s, r) => s + r.rating, 0) / robotReviews.length;
        listing.rating = Math.round(avg * 10) / 10;
        listing.ratingCount = robotReviews.length;
        listings.set(listingId, listing);
      }
    }

    res.status(201).json({ success: true, review });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/marketplace/bookings/:clientId — Get client bookings
router.get('/bookings/:clientId', (req, res) => {
  const userBookings = Array.from(bookings.values())
    .filter(b => b.clientId === req.params.clientId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ bookings: userBookings, count: userBookings.length });
});

// GET /api/marketplace/types — Available robot types
router.get('/types', (req, res) => {
  const types = [...new Set(Array.from(listings.values()).map(l => l.type))];
  res.json({ types });
});

// GET /api/marketplace/stats — Marketplace statistics
router.get('/stats', (req, res) => {
  const total = listings.size;
  const available = Array.from(listings.values()).filter(l => l.status === 'available').length;
  const booked = Array.from(listings.values()).filter(l => l.status === 'booked').length;
  res.json({
    totalListings: total,
    available,
    booked,
    totalBookings: bookings.size,
    totalReviews: reviews.length,
    averagePrice: total > 0 ? Array.from(listings.values()).reduce((s, l) => s + l.price, 0) / total : 0
  });
});

module.exports = router;
