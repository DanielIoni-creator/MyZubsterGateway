const express = require('express');
const auth = require('../middleware/auth');
const SeedExchange = require('../models/SeedExchange');

const router = express.Router();

// ─── Helpers ────────────────────────────────────────────────

/**
 * Build a Mongoose filter object from query params.
 * Supports: plant, type, location, exchangeType, status
 */
function buildFilter(query) {
  const filter = { status: 'available' };

  if (query.plant) {
    filter.plant = { $regex: query.plant, $options: 'i' };
  }
  if (query.type) {
    filter.type = String(query.type).toLowerCase().trim();
  }
  if (query.location) {
    filter.location = { $regex: query.location, $options: 'i' };
  }
  if (query.exchangeType) {
    filter.exchangeType = String(query.exchangeType).toLowerCase().trim();
  }
  if (query.status) {
    filter.status = String(query.status).toLowerCase().trim();
  }

  return filter;
}

/**
 * Escape a string for safe CSV output.
 */
function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Format a listing row for CSV.
 */
function listingToCsvRow(l) {
  return [
    csvEscape(l.plant),
    csvEscape(l.variety),
    csvEscape(l.type),
    csvEscape(l.quantity),
    csvEscape(l.location),
    csvEscape(l.coordinates && l.coordinates.lat != null ? l.coordinates.lat : ''),
    csvEscape(l.coordinates && l.coordinates.lng != null ? l.coordinates.lng : ''),
    csvEscape(l.exchangeType),
    csvEscape(l.price),
    csvEscape(l.status),
    csvEscape(l.description),
    csvEscape(l.createdAt ? l.createdAt.toISOString() : ''),
  ].join(',');
}

const CSV_HEADERS = [
  'plant',
  'variety',
  'type',
  'quantity',
  'location',
  'latitude',
  'longitude',
  'exchange_type',
  'price',
  'status',
  'description',
  'created_at',
].join(',');

// ─── CRUD endpoints (POST / GET / GET by id / PATCH / DELETE) ────

/**
 * POST /api/seed-exchange
 * Create a new listing (auth required).
 */
router.post('/', auth, async (req, res, next) => {
  try {
    const { plant, variety, type, quantity, location, coordinates, exchangeType, price, description } = req.body;

    if (!plant || !type || !quantity || !exchangeType) {
      return res.status(400).json({
        success: false,
        message: 'plant, type, quantity, and exchangeType are required',
      });
    }

    const listing = new SeedExchange({
      plant,
      variety: variety || '',
      type,
      quantity,
      location: location || '',
      coordinates: coordinates || { lat: null, lng: null },
      exchangeType,
      price: price || 0,
      description: description || '',
      user: req.user.userId,
    });

    await listing.save();
    res.status(201).json({ success: true, data: listing });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/seed-exchange
 * List all available listings, with optional filters.
 */
router.get('/', async (req, res, next) => {
  try {
    const filter = buildFilter(req.query);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const listings = await SeedExchange.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await SeedExchange.countDocuments(filter);

    res.json({
      success: true,
      data: listings,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/seed-exchange/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const listing = await SeedExchange.findById(req.params.id);
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });
    res.json({ success: true, data: listing });
  } catch (err) {
    next(err);
  }
});

// ─── Export endpoints ────────────────────────────────────────

/**
 * GET /api/seed-exchange/export/csv
 * Export listings as CSV download. Supports same filters as listing API.
 */
router.get('/export/csv', async (req, res, next) => {
  try {
    const filter = buildFilter(req.query);
    const listings = await SeedExchange.find(filter).sort({ createdAt: -1 });

    const rows = [CSV_HEADERS, ...listings.map(listingToCsvRow)];
    const csv = rows.join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="seed-exchange-export.csv"');
    res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/seed-exchange/export/geojson
 * Export listings as GeoJSON FeatureCollection. Supports same filters as listing API.
 */
router.get('/export/geojson', async (req, res, next) => {
  try {
    const filter = buildFilter(req.query);
    const listings = await SeedExchange.find(filter).sort({ createdAt: -1 });

    const features = listings
      .filter((l) => l.coordinates && l.coordinates.lat != null && l.coordinates.lng != null)
      .map((l) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [l.coordinates.lng, l.coordinates.lat],
        },
        properties: {
          id: l._id.toString(),
          plant: l.plant,
          variety: l.variety,
          type: l.type,
          quantity: l.quantity,
          location: l.location,
          exchangeType: l.exchangeType,
          price: l.price,
          status: l.status,
          description: l.description,
          createdAt: l.createdAt ? l.createdAt.toISOString() : null,
        },
      }));

    const geojson = {
      type: 'FeatureCollection',
      features,
    };

    res.setHeader('Content-Type', 'application/geo+json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="seed-exchange-export.geojson"');
    res.status(200).json(geojson);
  } catch (err) {
    next(err);
  }
});

module.exports = router;