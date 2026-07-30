const express = require('express');
const SeedExchange = require('../models/SeedExchange');
const auth = require('../middleware/auth');

const router = express.Router();

// ──────────────────────────────────────────────
//  Helper – build a MongoDB filter from query
// ──────────────────────────────────────────────
function buildFilter(query) {
  const filter = {};

  if (query.plant) {
    filter.plant = { $regex: query.plant, $options: 'i' };
  }
  if (query.type) {
    filter.type = { $regex: query.type, $options: 'i' };
  }
  if (query.location) {
    filter.location = { $regex: query.location, $options: 'i' };
  }
  if (query.exchangeType) {
    filter.exchangeType = query.exchangeType;
  }

  // Date range filtering
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) {
      const from = new Date(query.from);
      if (!isNaN(from.getTime())) filter.createdAt.$gte = from;
    }
    if (query.to) {
      const to = new Date(query.to);
      if (!isNaN(to.getTime())) filter.createdAt.$lte = to;
    }
    if (Object.keys(filter.createdAt).length === 0) delete filter.createdAt;
  }

  return filter;
}

// ──────────────────────────────────────────────
//  Shared fields used in CSV & GeoJSON output
// ──────────────────────────────────────────────
const EXPORT_FIELDS = [
  '_id',
  'plant',
  'variety',
  'type',
  'quantity',
  'location',
  'exchangeType',
  'description',
  'createdAt',
  'updatedAt',
];

function toExportDoc(listing) {
  return {
    _id: listing._id.toString(),
    plant: listing.plant,
    variety: listing.variety || '',
    type: listing.type,
    quantity: listing.quantity,
    location: listing.location || '',
    exchangeType: listing.exchangeType,
    description: listing.description || '',
    createdAt: listing.createdAt ? listing.createdAt.toISOString() : '',
    updatedAt: listing.updatedAt ? listing.updatedAt.toISOString() : '',
  };
}

// ──────────────────────────────────────────────
//  CRUD – list all seed-exchange listings
// ──────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const filter = buildFilter(req.query);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const skip = Math.max(parseInt(req.query.skip, 10) || 0, 0);

    const [listings, total] = await Promise.all([
      SeedExchange.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      SeedExchange.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: listings,
      pagination: { total, limit, skip },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ──────────────────────────────────────────────
//  CRUD – get one listing by id
// ──────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const listing = await SeedExchange.findById(req.params.id).lean();
    if (!listing) {
      return res.status(404).json({ success: false, error: 'Listing not found' });
    }
    return res.json({ success: true, data: listing });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ──────────────────────────────────────────────
//  CRUD – create a new listing (authenticated)
// ──────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { plant, variety, type, quantity, location, exchangeType, description } = req.body;

    if (!plant || !plant.trim()) {
      return res.status(400).json({ success: false, error: 'plant is required' });
    }
    if (quantity === undefined || quantity === null || quantity < 0) {
      return res.status(400).json({ success: false, error: 'quantity must be a non-negative number' });
    }

    const listing = await SeedExchange.create({
      owner: req.user._id,
      plant: plant.trim(),
      variety: (variety || '').trim(),
      type: type || 'other',
      quantity: Number(quantity),
      location: (location || '').trim(),
      exchangeType: exchangeType || 'give',
      description: (description || '').trim(),
    });

    return res.status(201).json({ success: true, data: listing });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ──────────────────────────────────────────────
//  CRUD – delete a listing (authenticated owner)
// ──────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const listing = await SeedExchange.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id,
    });
    if (!listing) {
      return res.status(404).json({ success: false, error: 'Listing not found or not owned by you' });
    }
    return res.json({ success: true, message: 'Listing deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ──────────────────────────────────────────────
//  EXPORT – CSV
// ──────────────────────────────────────────────
router.get('/export/csv', async (req, res) => {
  try {
    const filter = buildFilter(req.query);
    const listings = await SeedExchange.find(filter).sort({ createdAt: -1 }).lean();

    if (!listings.length) {
      return res.status(404).json({ success: false, error: 'No listings found matching filters' });
    }

    const rows = listings.map(toExportDoc);

    // Build CSV manually to avoid adding a new dependency
    const header = EXPORT_FIELDS.join(',');
    const csvRows = rows.map((row) =>
      EXPORT_FIELDS.map((field) => {
        const val = row[field] != null ? String(row[field]) : '';
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return '"' + val.replace(/"/g, '""') + '"';
        }
        return val;
      }).join(',')
    );
    const csv = [header, ...csvRows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="seed_exchange_export.csv"');
    return res.status(200).send(csv);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ──────────────────────────────────────────────
//  EXPORT – GeoJSON
// ──────────────────────────────────────────────
router.get('/export/geojson', async (req, res) => {
  try {
    const filter = buildFilter(req.query);
    const listings = await SeedExchange.find(filter).sort({ createdAt: -1 }).lean();

    const features = listings.map((listing) => ({
      type: 'Feature',
      geometry: null,
      properties: toExportDoc(listing),
    }));

    const featureCollection = {
      type: 'FeatureCollection',
      features,
    };

    return res.json(featureCollection);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
