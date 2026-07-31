const express = require('express');
const auth = require('../middleware/auth');
const SeedExchange = require('../models/SeedExchange');
const GardenReading = require('../models/GardenReading');

const router = express.Router();

// ── Helpers (existing CSV/GeoJSON) ──────────────────────────────────

/**
 * Escape a value for safe CSV output.
 */
function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (
    str.includes(',') ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r') ||
    /^\s|\s$/.test(str)
  ) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Convert a GardenReading document to a flat key-value map for CSV rows.
 */
function readingToCSVRow(reading) {
  return {
    id: reading._id.toString(),
    gardenId: reading.gardenId,
    ph: reading.ph,
    ec: reading.ec,
    temperature: reading.temperature,
    humidity: reading.humidity,
    receivedAt: reading.receivedAt ? reading.receivedAt.toISOString() : '',
    createdAt: reading.createdAt ? reading.createdAt.toISOString() : '',
    updatedAt: reading.updatedAt ? reading.updatedAt.toISOString() : '',
  };
}

/**
 * Build a CSV string from a flat object, using the ordered header list.
 */
function buildCSV(headers, row) {
  const headerLine = headers.join(',');
  const valueLine = headers.map((h) => csvEscape(row[h])).join(',');
  return headerLine + '\n' + valueLine + '\n';
}

/**
 * Convert a GardenReading document to a GeoJSON Feature.
 */
function readingToGeoJSONFeature(reading) {
  return {
    type: 'Feature',
    geometry: null,
    properties: {
      id: reading._id.toString(),
      gardenId: reading.gardenId,
      ph: reading.ph,
      ec: reading.ec,
      temperature: reading.temperature,
      humidity: reading.humidity,
      receivedAt: reading.receivedAt ? reading.receivedAt.toISOString() : null,
      createdAt: reading.createdAt ? reading.createdAt.toISOString() : null,
      updatedAt: reading.updatedAt ? reading.updatedAt.toISOString() : null,
    },
  };
}

// ── Seed Exchange CRUD Helpers ─────────────────────────────────────

/**
 * Strip sensitive/internal fields before returning a listing to the client.
 */
function toPublicListing(listing) {
  return {
    id: listing._id,
    owner: listing.owner,
    plant: listing.plant,
    type: listing.type,
    variety: listing.variety,
    location: listing.location,
    description: listing.description,
    price: listing.price,
    quantity: listing.quantity,
    status: listing.status,
    images: listing.images,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
  };
}

/**
 * Validate the request body for creating/updating a seed exchange listing.
 * Returns { value, errors } where `value` is the sanitized payload.
 */
function validateListing(body, partial) {
  const errors = [];
  const value = {};

  // plant — required on create
  if (body.plant !== undefined) {
    if (typeof body.plant !== 'string' || !body.plant.trim()) {
      errors.push('plant must be a non-empty string');
    } else if (body.plant.trim().length > 100) {
      errors.push('plant must be 100 characters or less');
    } else {
      value.plant = body.plant.trim();
    }
  } else if (!partial) {
    errors.push('plant is required');
  }

  // type — required on create
  const VALID_TYPES = ['seed', 'cutting', 'seedling', 'plant', 'bulb', 'tuber', 'other'];
  if (body.type !== undefined) {
    const t = String(body.type).trim().toLowerCase();
    if (!VALID_TYPES.includes(t)) {
      errors.push(`type must be one of: ${VALID_TYPES.join(', ')}`);
    } else {
      value.type = t;
    }
  } else if (!partial) {
    errors.push('type is required');
  }

  // variety — optional
  if (body.variety !== undefined) {
    if (typeof body.variety !== 'string') {
      errors.push('variety must be a string');
    } else if (body.variety.length > 100) {
      errors.push('variety must be 100 characters or less');
    } else {
      value.variety = body.variety.trim();
    }
  }

  // location — optional
  if (body.location !== undefined) {
    if (typeof body.location !== 'string') {
      errors.push('location must be a string');
    } else if (body.location.length > 200) {
      errors.push('location must be 200 characters or less');
    } else {
      value.location = body.location.trim();
    }
  }

  // description — optional
  if (body.description !== undefined) {
    if (typeof body.description !== 'string') {
      errors.push('description must be a string');
    } else if (body.description.length > 2000) {
      errors.push('description must be 2000 characters or less');
    } else {
      value.description = body.description.trim();
    }
  }

  // price — optional, must be numeric >= 0
  if (body.price !== undefined) {
    const p = Number(body.price);
    if (!Number.isFinite(p) || p < 0) {
      errors.push('price must be a non-negative number');
    } else {
      value.price = p;
    }
  }

  // quantity — optional, must be integer >= 1
  if (body.quantity !== undefined) {
    const q = Number(body.quantity);
    if (!Number.isInteger(q) || q < 1) {
      errors.push('quantity must be a positive integer');
    } else {
      value.quantity = q;
    }
  }

  // status — optional on create (default "available"), owner-set on update
  const VALID_STATUSES = ['available', 'reserved', 'sold', 'unavailable'];
  if (body.status !== undefined) {
    const s = String(body.status).trim().toLowerCase();
    if (!VALID_STATUSES.includes(s)) {
      errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}`);
    } else {
      value.status = s;
    }
  }

  // images — optional
  if (body.images !== undefined) {
    if (!Array.isArray(body.images)) {
      errors.push('images must be an array of strings');
    } else if (body.images.some((url) => typeof url !== 'string')) {
      errors.push('each image must be a string');
    } else {
      value.images = body.images;
    }
  }

  return { value, errors };
}

// ── Seed Exchange CRUD Endpoints ────────────────────────────────────

/**
 * POST /api/seed-exchange
 * Create a new seed exchange listing (authenticated).
 */
router.post('/', auth, async (req, res) => {
  try {
    const { value, errors } = validateListing(req.body || {}, false);
    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    const listing = await SeedExchange.create({
      owner: req.user._id,
      ...value,
    });

    return res.status(201).json({
      success: true,
      data: toPublicListing(listing),
    });
  } catch (error) {
    console.error('SeedExchange create error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/seed-exchange
 * List seed exchange listings with optional filters (plant, type, location).
 */
router.get('/', async (req, res) => {
  try {
    const filter = {};

    if (req.query.plant) {
      filter.plant = { $regex: req.query.plant, $options: 'i' };
    }
    if (req.query.type) {
      const t = String(req.query.type).trim().toLowerCase();
      const VALID_TYPES = ['seed', 'cutting', 'seedling', 'plant', 'bulb', 'tuber', 'other'];
      if (VALID_TYPES.includes(t)) {
        filter.type = t;
      }
    }
    if (req.query.location) {
      filter.location = { $regex: req.query.location, $options: 'i' };
    }

    // By default only show available listings; include all if ?status=all
    if (req.query.status === 'all') {
      // no status filter
    } else if (req.query.status) {
      const VALID_STATUSES = ['available', 'reserved', 'sold', 'unavailable'];
      const s = String(req.query.status).trim().toLowerCase();
      if (VALID_STATUSES.includes(s)) {
        filter.status = s;
      }
    } else {
      filter.status = 'available';
    }

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(Math.max(1, Number.parseInt(req.query.limit, 10) || 20), 100);
    const skip = (page - 1) * limit;

    const [listings, total] = await Promise.all([
      SeedExchange.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SeedExchange.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: listings.map(toPublicListing),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('SeedExchange list error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/seed-exchange/:id
 * Get a single seed exchange listing by ID.
 */
router.get('/:id', async (req, res) => {
  try {
    const listing = await SeedExchange.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ success: false, error: 'Seed exchange listing not found' });
    }

    return res.json({
      success: true,
      data: toPublicListing(listing),
    });
  } catch (error) {
    // Handle invalid ObjectId format
    if (error.name === 'CastError' && error.kind === 'ObjectId') {
      return res.status(404).json({ success: false, error: 'Seed exchange listing not found' });
    }
    console.error('SeedExchange get error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/seed-exchange/:id
 * Update a seed exchange listing (owner only).
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const listing = await SeedExchange.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ success: false, error: 'Seed exchange listing not found' });
    }

    // Ownership check
    if (listing.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to update this listing' });
    }

    const { value, errors } = validateListing(req.body || {}, true);
    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    Object.assign(listing, value);
    await listing.save();

    return res.json({
      success: true,
      data: toPublicListing(listing),
    });
  } catch (error) {
    if (error.name === 'CastError' && error.kind === 'ObjectId') {
      return res.status(404).json({ success: false, error: 'Seed exchange listing not found' });
    }
    console.error('SeedExchange update error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/seed-exchange/:id
 * Delete a seed exchange listing (owner only).
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const listing = await SeedExchange.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ success: false, error: 'Seed exchange listing not found' });
    }

    // Ownership check
    if (listing.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this listing' });
    }

    await SeedExchange.findByIdAndDelete(req.params.id);

    return res.status(200).json({ success: true, data: {} });
  } catch (error) {
    if (error.name === 'CastError' && error.kind === 'ObjectId') {
      return res.status(404).json({ success: false, error: 'Seed exchange listing not found' });
    }
    console.error('SeedExchange delete error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ── Existing CSV / GeoJSON Export Endpoints ─────────────────────────

/**
 * GET /api/seed-exchange/garden-readings/:gardenReadingId/csv
 */
router.get('/garden-readings/:gardenReadingId/csv', auth, async (req, res) => {
  try {
    const { gardenReadingId } = req.params;

    const reading = await GardenReading.findOne({
      _id: gardenReadingId,
      owner: req.user._id,
    });

    if (!reading) {
      return res.status(404).json({ success: false, error: 'Garden reading not found' });
    }

    const CSV_HEADERS = ['id', 'gardenId', 'ph', 'ec', 'temperature', 'humidity', 'receivedAt', 'createdAt', 'updatedAt'];
    const row = readingToCSVRow(reading);
    const csv = buildCSV(CSV_HEADERS, row);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="garden-reading-${gardenReadingId}.csv"`);
    return res.send(csv);
  } catch (error) {
    console.error('CSV export error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/seed-exchange/garden-readings/:gardenReadingId/geojson
 */
router.get('/garden-readings/:gardenReadingId/geojson', auth, async (req, res) => {
  try {
    const { gardenReadingId } = req.params;

    const reading = await GardenReading.findOne({
      _id: gardenReadingId,
      owner: req.user._id,
    });

    if (!reading) {
      return res.status(404).json({ success: false, error: 'Garden reading not found' });
    }

    const feature = readingToGeoJSONFeature(reading);
    const featureCollection = {
      type: 'FeatureCollection',
      features: [feature],
    };

    res.setHeader('Content-Type', 'application/geo+json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="garden-reading-${gardenReadingId}.geojson"`);
    return res.json(featureCollection);
  } catch (error) {
    console.error('GeoJSON export error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
