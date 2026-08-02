const express = require('express');
const router = express.Router();
const Joi = require('joi');
const auth = require('../middleware/auth');
const SeedExchange = require('../models/SeedExchange');

// ─── Joi Schemas ─────────────────────────────────────────────────────────────

const createSchema = Joi.object({
  species: Joi.string().trim().min(1).max(100).required()
    .messages({ 'string.empty': 'Species is required', 'string.max': 'Species must be at most 100 characters' }),
  variety: Joi.string().trim().min(1).max(100).required()
    .messages({ 'string.empty': 'Variety is required', 'string.max': 'Variety must be at most 100 characters' }),
  quantity: Joi.number().integer().min(1).required()
    .messages({ 'number.min': 'Quantity must be at least 1', 'number.base': 'Quantity must be a number' }),
  price: Joi.number().min(0).required()
    .messages({ 'number.min': 'Price must be 0 or greater', 'number.base': 'Price must be a number' }),
  currency: Joi.string().valid('EUR', 'USD', 'GBP').default('EUR'),
  category: Joi.string().valid('seed', 'talee', 'plant', 'other').required()
    .messages({ 'any.only': 'Category must be one of: seed, talee, plant, other' }),
  description: Joi.string().max(2000).allow('').default('')
    .messages({ 'string.max': 'Description must be at most 2000 characters' }),
  location: Joi.object({
    city: Joi.string().trim().allow('').default(''),
    region: Joi.string().trim().allow('').default(''),
    country: Joi.string().trim().allow('').default('')
  }).default({ city: '', region: '', country: '' }),
  images: Joi.array().items(Joi.string().uri()).default([]),
  isActive: Joi.boolean().default(true),
  expiresAt: Joi.date().iso().allow(null).default(null)
});

const updateSchema = Joi.object({
  species: Joi.string().trim().min(1).max(100)
    .messages({ 'string.empty': 'Species cannot be empty', 'string.max': 'Species must be at most 100 characters' }),
  variety: Joi.string().trim().min(1).max(100)
    .messages({ 'string.empty': 'Variety cannot be empty', 'string.max': 'Variety must be at most 100 characters' }),
  quantity: Joi.number().integer().min(1)
    .messages({ 'number.min': 'Quantity must be at least 1', 'number.base': 'Quantity must be a number' }),
  price: Joi.number().min(0)
    .messages({ 'number.min': 'Price must be 0 or greater', 'number.base': 'Price must be a number' }),
  currency: Joi.string().valid('EUR', 'USD', 'GBP'),
  category: Joi.string().valid('seed', 'talee', 'plant', 'other')
    .messages({ 'any.only': 'Category must be one of: seed, talee, plant, other' }),
  description: Joi.string().max(2000).allow('')
    .messages({ 'string.max': 'Description must be at most 2000 characters' }),
  location: Joi.object({
    city: Joi.string().trim().allow(''),
    region: Joi.string().trim().allow(''),
    country: Joi.string().trim().allow('')
  }),
  images: Joi.array().items(Joi.string().uri()),
  isActive: Joi.boolean(),
  expiresAt: Joi.date().iso().allow(null)
}).min(1).messages({ 'object.min': 'At least one field must be provided for update' });

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

// ─── Helper: validate with Joi ───────────────────────────────────────────────

function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const messages = error.details.map(d => d.message);
      return res.status(400).json({
        success: false,
        error: { message: messages.join('; '), code: 'VALIDATION_ERROR' }
      });
    }
    req.body = value;
    next();
  };
}

// ─── POST /api/seed-exchange ─────────────────────────────────────────────────

router.post('/', auth, validate(createSchema), async (req, res, next) => {
  try {
    const data = { ...req.body, userId: req.user._id };
    const listing = new SeedExchange(data);
    await listing.save();
    res.status(201).json({ success: true, data: listing });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/seed-exchange ──────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const sortField = ['createdAt', 'price', 'species'].includes(req.query.sort) ? req.query.sort : 'createdAt';
    const sortOrder = req.query.order === 'asc' ? 1 : -1;
    const skip = (page - 1) * limit;

    const filter = buildFilterQuery(req);

    const [data, total] = await Promise.all([
      SeedExchange.find(filter)
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .populate('userId', '_id username'),
      SeedExchange.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/seed-exchange/export/csv ───────────────────────────────────────

router.get('/export/csv', async (req, res, next) => {
  try {
    const filter = buildFilterQuery(req);
    const data = await SeedExchange.find(filter)
      .sort({ createdAt: -1 })
      .populate('userId', 'username');

    let csv = 'ID,User,Species,Variety,Category,Quantity,Price,Currency,City,Region,Country,Created At\n';
    data.forEach(item => {
      const row = [
        item._id,
        item.userId ? item.userId.username : '',
        `"${(item.species || '').replace(/"/g, '""')}"`,
        `"${(item.variety || '').replace(/"/g, '""')}"`,
        item.category,
        item.quantity,
        item.price,
        item.currency,
        `"${(item.location && item.location.city || '').replace(/"/g, '""')}"`,
        `"${(item.location && item.location.region || '').replace(/"/g, '""')}"`,
        `"${(item.location && item.location.country || '').replace(/"/g, '""')}"`,
        item.createdAt ? item.createdAt.toISOString() : ''
      ];
      csv += row.join(',') + '\n';
    });

    res.header('Content-Type', 'text/csv');
    res.attachment('seed-exchange-listings.csv');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/seed-exchange/export/geojson ───────────────────────────────────

router.get('/export/geojson', async (req, res, next) => {
  try {
    const filter = buildFilterQuery(req);
    const data = await SeedExchange.find(filter)
      .sort({ createdAt: -1 })
      .populate('userId', 'username');

    const geojson = {
      type: 'FeatureCollection',
      features: data.map(item => ({
        type: 'Feature',
        geometry: null,
        properties: {
          id: item._id,
          username: item.userId ? item.userId.username : null,
          species: item.species,
          variety: item.variety,
          category: item.category,
          quantity: item.quantity,
          price: item.price,
          currency: item.currency,
          description: item.description,
          city: item.location ? item.location.city : null,
          region: item.location ? item.location.region : null,
          country: item.location ? item.location.country : null,
          createdAt: item.createdAt,
          isActive: item.isActive
        }
      }))
    };

    res.json(geojson);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/seed-exchange/:id ──────────────────────────────────────────────

router.get('/:id', async (req, res, next) => {
  try {
    if (!objectIdRegex.test(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid listing ID format', code: 'INVALID_ID' }
      });
    }

    const listing = await SeedExchange.findById(req.params.id)
      .populate('userId', '_id username');

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: { message: 'Listing not found', code: 'NOT_FOUND' }
      });
    }

    res.json({ success: true, data: listing });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/seed-exchange/:id ──────────────────────────────────────────────

router.put('/:id', auth, validate(updateSchema), async (req, res, next) => {
  try {
    if (!objectIdRegex.test(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid listing ID format', code: 'INVALID_ID' }
      });
    }

    const listing = await SeedExchange.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: { message: 'Listing not found', code: 'NOT_FOUND' }
      });
    }

    if (listing.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: { message: 'You are not the owner of this listing', code: 'FORBIDDEN' }
      });
    }

    Object.assign(listing, req.body);
    await listing.save();

    res.json({ success: true, data: listing });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/seed-exchange/:id ───────────────────────────────────────────

router.delete('/:id', auth, async (req, res, next) => {
  try {
    if (!objectIdRegex.test(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid listing ID format', code: 'INVALID_ID' }
      });
    }

    const listing = await SeedExchange.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: { message: 'Listing not found', code: 'NOT_FOUND' }
      });
    }

    if (listing.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: { message: 'You are not the owner of this listing', code: 'FORBIDDEN' }
      });
    }

    await SeedExchange.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Listing deleted' });
  } catch (err) {
    next(err);
  }
});

// ─── Utility ─────────────────────────────────────────────────────────────────

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildFilterQuery(req) {
  const filter = {};
  if (req.query.category) {
    const validCategories = ['seed', 'talee', 'plant', 'other'];
    if (validCategories.includes(req.query.category)) {
      filter.category = req.query.category;
    }
  }
  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === 'true';
  }
  if (req.query.userId) {
    filter.userId = req.query.userId;
  }
  if (req.query.search && req.query.search.trim()) {
    const searchRegex = new RegExp(escapeRegex(req.query.search.trim()), 'i');
    filter.$or = [
      { species: searchRegex },
      { variety: searchRegex },
      { description: searchRegex }
    ];
  }
  return filter;
}

module.exports = router;
