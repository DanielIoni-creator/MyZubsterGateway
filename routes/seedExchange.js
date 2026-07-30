const express = require('express');
const auth = require('../middleware/auth');
const SeedExchange = require('../models/SeedExchange');

const router = express.Router();

const TYPE_ALIASES = new Map([
  ['seed', 'seeds'],
  ['seeds', 'seeds'],
  ['seme', 'seeds'],
  ['semi', 'seeds'],
  ['cutting', 'cuttings'],
  ['cuttings', 'cuttings'],
  ['talea', 'cuttings'],
  ['talee', 'cuttings'],
  ['seedling', 'seedlings'],
  ['seedlings', 'seedlings'],
  ['piantina', 'seedlings'],
  ['piantine', 'seedlings'],
  ['bulb', 'bulbs'],
  ['bulbs', 'bulbs'],
  ['bulbo', 'bulbs'],
  ['bulbi', 'bulbs'],
]);

const AVAILABILITY_ALIASES = new Map([
  ['immediate', 'immediate'],
  ['immediata', 'immediate'],
  ['seasonal', 'seasonal'],
  ['stagionale', 'seasonal'],
]);

const EXCHANGE_TYPE_ALIASES = new Map([
  ['free', 'free'],
  ['gratuito', 'free'],
  ['gratuita', 'free'],
  ['barter', 'barter'],
  ['baratto', 'barter'],
  ['donation', 'donation'],
  ['donazione', 'donation'],
]);

function firstDefined(source, keys) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      return source[key];
    }
  }
  return undefined;
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEnum(value, aliases) {
  const key = normalizeText(value).toLowerCase();
  return aliases.get(key) || null;
}

function parseQuantity(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const normalized = typeof value === 'string' ? value.trim() : value;
  if (
    normalized === '' ||
    (typeof normalized === 'string' && !/^\d+$/.test(normalized))
  ) {
    return null;
  }
  const quantity = Number(normalized);
  return Number.isInteger(quantity) ? quantity : null;
}

function parsePageValue(value, { fallback, max }) {
  if (value === undefined || value === null || value === '') {
    return { value: fallback };
  }
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    return { error: 'pagination values must be positive integers' };
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > max) {
    return { error: `pagination value must be at most ${max}` };
  }
  return { value: parsed };
}

function validateListing(body, { partial = false } = {}) {
  const source = body && typeof body === 'object' ? body : {};
  const raw = {
    plantName: firstDefined(source, ['plantName', 'plant', 'pianta']),
    variety: firstDefined(source, ['variety', 'varieta', 'varietà']),
    type: firstDefined(source, ['type', 'tipo']),
    quantity: firstDefined(source, ['quantity', 'quantita', 'quantità']),
    availability: firstDefined(source, ['availability', 'disponibilita', 'disponibilità']),
    exchangeType: firstDefined(source, ['exchangeType', 'tipoScambio']),
    location: firstDefined(source, ['location', 'posizione']),
    description: firstDefined(source, ['description', 'descrizione']),
  };
  const supplied = Object.entries(raw)
    .filter(([, value]) => value !== undefined)
    .map(([key]) => key);
  const values = {};
  const errors = [];

  if (!partial || supplied.includes('plantName')) {
    values.plantName = normalizeText(raw.plantName);
    if (!values.plantName) errors.push('plantName is required');
    if (values.plantName.length > 120) {
      errors.push('plantName must be 120 characters or less');
    }
  }

  if (!partial || supplied.includes('variety')) {
    values.variety = normalizeText(raw.variety);
    if (values.variety.length > 120) {
      errors.push('variety must be 120 characters or less');
    }
  }

  if (!partial || supplied.includes('type')) {
    values.type = normalizeEnum(raw.type, TYPE_ALIASES);
    if (!values.type) {
      errors.push('type must be seeds, cuttings, seedlings, or bulbs');
    }
  }

  if (!partial || supplied.includes('quantity')) {
    values.quantity = parseQuantity(raw.quantity);
    if (values.quantity === null || values.quantity < 1 || values.quantity > 1000000) {
      errors.push('quantity must be an integer between 1 and 1000000');
    }
  }

  if (supplied.includes('location')) {
    values.location = normalizeText(raw.location);
    if (values.location.length > 200) errors.push('location must be 200 characters or less');
  }

  if (!partial || supplied.includes('availability')) {
    const availability = raw.availability === undefined ? 'immediate' : raw.availability;
    values.availability = normalizeEnum(availability, AVAILABILITY_ALIASES);
    if (!values.availability) errors.push('availability must be immediate or seasonal');
  }

  if (!partial || supplied.includes('exchangeType')) {
    const exchangeType = raw.exchangeType === undefined ? 'free' : raw.exchangeType;
    values.exchangeType = normalizeEnum(exchangeType, EXCHANGE_TYPE_ALIASES);
    if (!values.exchangeType) {
      errors.push('exchangeType must be free, barter, or donation');
    }
  }

  if (!partial || supplied.includes('description')) {
    values.description = normalizeText(raw.description);
    if (values.description.length > 2000) {
      errors.push('description must be 2000 characters or less');
    }
  }

  if (partial && !supplied.length) {
    errors.push('at least one editable field is required');
  }

  return { values, errors };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function queryText(query, keys) {
  return normalizeText(firstDefined(query, keys));
}

function buildFilters(query) {
  const filter = {};
  const plant = queryText(query, ['plantName', 'plant', 'pianta']);
  const location = queryText(query, ['location', 'posizione']);
  const rawType = queryText(query, ['type', 'tipo']);

  if (plant) filter.plantName = { $regex: escapeRegex(plant), $options: 'i' };
  if (location) filter.location = { $regex: escapeRegex(location), $options: 'i' };

  if (rawType) {
    const type = normalizeEnum(rawType, TYPE_ALIASES);
    if (!type) {
      return { error: 'type must be seeds, cuttings, seedlings, or bulbs' };
    }
    filter.type = type;
  }

  return { filter };
}

function toPublicListing(listing) {
  const value =
    listing && typeof listing.toObject === 'function'
      ? listing.toObject()
      : listing;

  return {
    id: value._id,
    userId: value.userId,
    plantName: value.plantName,
    variety: value.variety || '',
    type: value.type,
    quantity: value.quantity,
    availability: value.availability,
    exchangeType: value.exchangeType,
    location: value.location,
    description: value.description || '',
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function ownsListing(listing, user) {
  return String(listing.userId) === String(user._id);
}

function databaseError(res, error) {
  if (error && (error.name === 'CastError' || error.name === 'ValidationError')) {
    return res.status(400).json({ success: false, error: 'invalid seed exchange data' });
  }
  console.error('Seed exchange database error:', error);
  return res.status(500).json({ success: false, error: 'unable to process seed exchange request' });
}

router.post('/', auth, async (req, res) => {
  try {
    const { values, errors } = validateListing(req.body);
    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    const listing = await SeedExchange.create({
      userId: req.user._id,
      ...values,
    });

    return res.status(201).json({
      success: true,
      data: toPublicListing(listing),
    });
  } catch (error) {
    return databaseError(res, error);
  }
});

router.get('/', async (req, res) => {
  try {
    const { filter, error } = buildFilters(req.query || {});
    if (error) {
      return res.status(400).json({ success: false, error });
    }

    const pageResult = parsePageValue(req.query.page, { fallback: 1, max: 1000000 });
    const limitResult = parsePageValue(req.query.limit, { fallback: 20, max: 1000000 });
    if (pageResult.error || limitResult.error) {
      return res.status(400).json({
        success: false,
        error: pageResult.error || limitResult.error,
      });
    }

    const page = pageResult.value;
    const limit = Math.min(limitResult.value, 100);
    const listings = await SeedExchange.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      data: listings.map(toPublicListing),
      pagination: { page, limit },
    });
  } catch (error) {
    return databaseError(res, error);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const listing = await SeedExchange.findById(req.params.id).lean();
    if (!listing) {
      return res.status(404).json({ success: false, error: 'seed exchange listing not found' });
    }

    return res.json({ success: true, data: toPublicListing(listing) });
  } catch (error) {
    return databaseError(res, error);
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { values, errors } = validateListing(req.body, { partial: true });
    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    const listing = await SeedExchange.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, error: 'seed exchange listing not found' });
    }
    if (!ownsListing(listing, req.user)) {
      return res.status(403).json({ success: false, error: 'only the owner can update this listing' });
    }

    Object.assign(listing, values);
    await listing.save();

    return res.json({ success: true, data: toPublicListing(listing) });
  } catch (error) {
    return databaseError(res, error);
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const listing = await SeedExchange.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, error: 'seed exchange listing not found' });
    }
    if (!ownsListing(listing, req.user)) {
      return res.status(403).json({ success: false, error: 'only the owner can delete this listing' });
    }

    await listing.deleteOne();
    return res.status(204).send();
  } catch (error) {
    return databaseError(res, error);
  }
});

module.exports = router;
