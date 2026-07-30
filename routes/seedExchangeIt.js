const express = require('express');
const auth = require('../middleware/auth');
const SeedExchange = require('../models/SeedExchange');

const router = express.Router();

// ─── Italian i18n helpers ───────────────────────────────────

const IT_MESSAGES = {
  validation: {
    plantRequired: 'La pianta è obbligatoria',
    typeRequired: 'Il tipo è obbligatorio (seme, talea, bulbo, tubero, piantina)',
    quantityRequired: 'La quantità è obbligatoria',
    exchangeTypeRequired: 'Il tipo di scambio è obbligatorio (scambio, gratuito, pagamento)',
    invalidType: 'Tipo non valido. Valori ammessi: seme, talea, bulbo, tubero, piantina',
    invalidExchangeType: 'Tipo di scambio non valido. Valori ammessi: scambio, gratuito, pagamento',
    invalidQuantity: 'La quantità deve essere un numero positivo',
    invalidPrice: 'Il prezzo deve essere un numero non negativo',
    invalidCoordinates: 'Le coordinate devono essere numeri validi (lat -90 a 90, lng -180 a 180)',
    notFound: 'Annuncio non trovato',
    unauthorized: 'Autenticazione richiesta per creare un annuncio',
  },
  success: {
    created: 'Annuncio creato con successo',
    updated: 'Annuncio aggiornato con successo',
    deleted: 'Annuncio eliminato con successo',
  },
};

const VALID_TYPES = ['seme', 'talea', 'bulbo', 'tubero', 'piantina'];
const VALID_EXCHANGE_TYPES = ['scambio', 'gratuito', 'pagamento'];

// ─── Validation ─────────────────────────────────────────────

function validateListing(body) {
  const errors = [];

  if (!body.plant || !String(body.plant).trim()) {
    errors.push(IT_MESSAGES.validation.plantRequired);
  }

  const type = String(body.type || '').toLowerCase().trim();
  if (!type) {
    errors.push(IT_MESSAGES.validation.typeRequired);
  } else if (!VALID_TYPES.includes(type)) {
    errors.push(IT_MESSAGES.validation.invalidType);
  }

  if (body.quantity === undefined || body.quantity === null || body.quantity === '') {
    errors.push(IT_MESSAGES.validation.quantityRequired);
  } else if (isNaN(Number(body.quantity)) || Number(body.quantity) <= 0) {
    errors.push(IT_MESSAGES.validation.invalidQuantity);
  }

  const exchangeType = String(body.exchangeType || '').toLowerCase().trim();
  if (!exchangeType) {
    errors.push(IT_MESSAGES.validation.exchangeTypeRequired);
  } else if (!VALID_EXCHANGE_TYPES.includes(exchangeType)) {
    errors.push(IT_MESSAGES.validation.invalidExchangeType);
  }

  if (body.price !== undefined && body.price !== null && body.price !== '') {
    if (isNaN(Number(body.price)) || Number(body.price) < 0) {
      errors.push(IT_MESSAGES.validation.invalidPrice);
    }
  }

  if (body.coordinates && (body.coordinates.lat !== undefined || body.coordinates.lng !== undefined)) {
    const lat = Number(body.coordinates.lat);
    const lng = Number(body.coordinates.lng);
    if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
      errors.push(IT_MESSAGES.validation.invalidCoordinates);
    }
  }

  return { errors, type, exchangeType };
}

// ─── Italian filter builder ─────────────────────────────────

function buildFilter(query) {
  const filter = { status: 'disponibile' };

  // Allow override
  if (query.status) {
    filter.status = String(query.status).toLowerCase().trim();
  }

  if (query.pianta) {
    filter.plant = { $regex: query.pianta, $options: 'i' };
  } else if (query.plant) {
    filter.plant = { $regex: query.plant, $options: 'i' };
  }

  if (query.tipo) {
    filter.type = String(query.tipo).toLowerCase().trim();
  } else if (query.type) {
    filter.type = String(query.type).toLowerCase().trim();
  }

  if (query.posizione) {
    filter.location = { $regex: query.posizione, $options: 'i' };
  } else if (query.location) {
    filter.location = { $regex: query.location, $options: 'i' };
  }

  if (query.tipoScambio) {
    filter.exchangeType = String(query.tipoScambio).toLowerCase().trim();
  } else if (query.exchangeType) {
    filter.exchangeType = String(query.exchangeType).toLowerCase().trim();
  }

  return filter;
}

// ─── CSV helpers (Italian headers) ──────────────────────────

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

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

const CSV_HEADERS_IT = [
  'pianta',
  'varieta',
  'tipo',
  'quantita',
  'posizione',
  'latitudine',
  'longitudine',
  'tipo_scambio',
  'prezzo',
  'stato',
  'descrizione',
  'data_creazione',
].join(',');

// ─── Routes ─────────────────────────────────────────────────

// POST /api/seed-exchange-it - Crea annuncio (auth required)
router.post('/', auth, async (req, res, next) => {
  try {
    const { errors, type, exchangeType } = validateListing(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: 'Validazione fallita', errors });
    }

    const { plant, variety, quantity, location, coordinates, price, description } = req.body;

    const listing = new SeedExchange({
      plant: String(plant).trim(),
      variety: variety ? String(variety).trim() : '',
      type,
      quantity: Number(quantity),
      location: location ? String(location).trim() : '',
      coordinates: coordinates || { lat: null, lng: null },
      exchangeType,
      price: price ? Number(price) : 0,
      description: description ? String(description).trim() : '',
      user: req.user.userId,
      status: 'disponibile',
    });

    await listing.save();
    res.status(201).json({
      success: true,
      message: IT_MESSAGES.success.created,
      data: listing,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/seed-exchange-it - Lista annunci con filtri in italiano
router.get('/', async (req, res, next) => {
  try {
    const filter = buildFilter(req.query);
    const page = Math.max(1, parseInt(req.query.pagina) || parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limite) || parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const listings = await SeedExchange.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await SeedExchange.countDocuments(filter);

    res.json({
      success: true,
      data: listings,
      paginazione: { pagina: page, limite: limit, totale: total, pagine: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/seed-exchange-it/:id - Dettaglio annuncio
router.get('/:id', async (req, res, next) => {
  try {
    const listing = await SeedExchange.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, message: IT_MESSAGES.validation.notFound });
    }
    res.json({ success: true, data: listing });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/seed-exchange-it/:id - Aggiorna annuncio (auth, owner only)
router.patch('/:id', auth, async (req, res, next) => {
  try {
    const listing = await SeedExchange.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, message: IT_MESSAGES.validation.notFound });
    }
    if (listing.user && listing.user.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Non autorizzato a modificare questo annuncio' });
    }

    const updates = {};
    const allowedFields = ['plant', 'variety', 'type', 'quantity', 'location', 'coordinates', 'exchangeType', 'price', 'description', 'status'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const updated = await SeedExchange.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    res.json({ success: true, message: IT_MESSAGES.success.updated, data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/seed-exchange-it/:id - Elimina annuncio (auth, owner only)
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const listing = await SeedExchange.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, message: IT_MESSAGES.validation.notFound });
    }
    if (listing.user && listing.user.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Non autorizzato a eliminare questo annuncio' });
    }

    await SeedExchange.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: IT_MESSAGES.success.deleted });
  } catch (err) {
    next(err);
  }
});

// ─── Export endpoints (Italian) ─────────────────────────────

// GET /api/seed-exchange-it/esporta/csv - Esporta come CSV
router.get('/esporta/csv', async (req, res, next) => {
  try {
    const filter = buildFilter(req.query);
    const listings = await SeedExchange.find(filter).sort({ createdAt: -1 });

    const rows = [CSV_HEADERS_IT, ...listings.map(listingToCsvRow)];
    const csv = rows.join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="scambio-sei-esportazione.csv"');
    res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
});

// GET /api/seed-exchange-it/esporta/geojson - Esporta come GeoJSON
router.get('/esporta/geojson', async (req, res, next) => {
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
          pianta: l.plant,
          varieta: l.variety,
          tipo: l.type,
          quantita: l.quantity,
          posizione: l.location,
          tipoScambio: l.exchangeType,
          prezzo: l.price,
          stato: l.status,
          descrizione: l.description,
          dataCreazione: l.createdAt ? l.createdAt.toISOString() : null,
        },
      }));

    res.setHeader('Content-Type', 'application/geo+json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="scambio-sei-esportazione.geojson"');
    res.status(200).json({ type: 'FeatureCollection', features });
  } catch (err) {
    next(err);
  }
});

module.exports = router;