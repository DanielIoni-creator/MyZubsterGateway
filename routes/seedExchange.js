const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/seedExchangeController');

// Listings
router.get('/listings', getListings);
router.get('/listings/:id', getListing);
router.post('/listings', createListing);
router.put('/listings/:id', updateListing);
router.delete('/listings/:id', deleteListing);

// Requests
router.post('/requests', createRequest);
router.get('/requests', getRequests);
router.put('/requests/:id', updateRequestStatus);

// Reviews
router.post('/reviews', createReview);
router.get('/reviews/:userId', getReviews);

module.exports = router;
