// Seed Exchange Controller - Versione semplificata
const SeedListing = require('../models/SeedListing');
const SeedRequest = require('../models/SeedRequest');
const SeedReview = require('../models/SeedReview');

// ============ LISTINGS ============

// Ottieni tutti gli annunci
const getListings = async (req, res) => {
  try {
    const listings = await SeedListing.find().populate('userId', 'name wallet');
    res.json({ success: true, count: listings.length, listings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Crea un annuncio
const createListing = async (req, res) => {
  try {
    const listing = new SeedListing({
      ...req.body,
      userId: req.user?._id || 'user_1'
    });
    await listing.save();
    res.status(201).json({ success: true, listing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Aggiorna un annuncio
const updateListing = async (req, res) => {
  try {
    const listing = await SeedListing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Annuncio non trovato' });
    Object.assign(listing, req.body);
    await listing.save();
    res.json({ success: true, listing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Elimina un annuncio
const deleteListing = async (req, res) => {
  try {
    await SeedListing.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Annuncio eliminato' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Ottieni un annuncio
const getListing = async (req, res) => {
  try {
    const listing = await SeedListing.findById(req.params.id).populate('userId', 'name wallet');
    if (!listing) return res.status(404).json({ error: 'Annuncio non trovato' });
    res.json({ success: true, listing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ REQUESTS ============

const createRequest = async (req, res) => {
  try {
    const request = new SeedRequest({
      ...req.body,
      fromUserId: req.user?._id || 'user_1'
    });
    await request.save();
    res.status(201).json({ success: true, request });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getRequests = async (req, res) => {
  try {
    const requests = await SeedRequest.find({
      $or: [{ fromUserId: req.user?._id || 'user_1' }, { toUserId: req.user?._id || 'user_1' }]
    }).populate('listingId', 'name');
    res.json({ success: true, count: requests.length, requests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateRequestStatus = async (req, res) => {
  try {
    const request = await SeedRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Richiesta non trovata' });
    request.status = req.body.status || 'accepted';
    await request.save();
    res.json({ success: true, request });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ REVIEWS ============

const createReview = async (req, res) => {
  try {
    const review = new SeedReview({
      ...req.body,
      fromUserId: req.user?._id || 'user_1'
    });
    await review.save();
    res.status(201).json({ success: true, review });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getReviews = async (req, res) => {
  try {
    const reviews = await SeedReview.find({ toUserId: req.params.userId });
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / (reviews.length || 1);
    res.json({ success: true, count: reviews.length, averageRating: Math.round(avg * 10) / 10, reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============ ESPORTAZIONI ============
module.exports = {
  getListings,
  createListing,
  updateListing,
  deleteListing,
  getListing,
  createRequest,
  getRequests,
  updateRequestStatus,
  createReview,
  getReviews
};
