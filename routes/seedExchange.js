// routes/seedExchange.js
const express = require('express');
const router = express.Router();
const SeedExchange = require('../models/SeedExchange');
const { authenticate } = require('../middleware/auth');

// Helper function to build query filter from req.query
function buildFilterQuery(query) {
  const filter = {};
  if (query.plant) {
    filter.plant = new RegExp(query.plant, 'i');
  }
  if (query.type) {
    filter.type = query.type;
  }
  if (query.location) {
    filter.locationName = new RegExp(query.location, 'i');
  }
  if (query.exchangeType) {
    filter.exchangeType = query.exchangeType;
  }
  return filter;
}

// GET /api/seed-exchange - List all seed exchange items
router.get('/', async (req, res) => {
  try {
    const filter = buildFilterQuery(req.query);
    const listings = await SeedExchange.find(filter).sort({ createdAt: -1 });
    res.json({
      success: true,
      count: listings.length,
      data: listings
    });
  } catch (error) {
    console.error('Error fetching seed exchange listings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/seed-exchange - Create a new seed exchange listing
router.post('/', authenticate, async (req, res) => {
  try {
    const { plant, variety, type, quantity, exchangeType, locationName, coordinates, notes } = req.body;

    if (!plant || !type || !locationName) {
      return res.status(400).json({ error: 'Plant, type, and locationName are required.' });
    }

    const listing = new SeedExchange({
      plant,
      variety,
      type,
      quantity: quantity || 1,
      exchangeType: exchangeType || 'swap',
      locationName,
      coordinates: coordinates ? { type: 'Point', coordinates } : undefined,
      notes,
      user: req.user.id
    });

    await listing.save();
    res.status(201).json({ success: true, data: listing });
  } catch (error) {
    console.error('Error creating seed exchange listing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/seed-exchange/export/csv - Export listings as CSV
router.get('/export/csv', async (req, res) => {
  try {
    const filter = buildFilterQuery(req.query);
    const listings = await SeedExchange.find(filter).sort({ createdAt: -1 });

    const headers = ['ID', 'Plant', 'Variety', 'Type', 'Quantity', 'ExchangeType', 'Location', 'Longitude', 'Latitude', 'Notes', 'CreatedAt'];
    const csvRows = [headers.join(',')];

    for (const item of listings) {
      const lng = item.coordinates && item.coordinates.coordinates ? item.coordinates.coordinates[0] : '';
      const lat = item.coordinates && item.coordinates.coordinates ? item.coordinates.coordinates[1] : '';
      const row = [
        `"${item._id}"`,
        `"${(item.plant || '').replace(/"/g, '""')}"`,
        `"${(item.variety || '').replace(/"/g, '""')}"`,
        `"${(item.type || '').replace(/"/g, '""')}"`,
        item.quantity || 1,
        `"${(item.exchangeType || '').replace(/"/g, '""')}"`,
        `"${(item.locationName || '').replace(/"/g, '""')}"`,
        lng,
        lat,
        `"${(item.notes || '').replace(/"/g, '""')}"`,
        `"${item.createdAt ? item.createdAt.toISOString() : ''}"`
      ];
      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="seed_exchange.csv"');
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/seed-exchange/export/geojson - Export listings as GeoJSON FeatureCollection
router.get('/export/geojson', async (req, res) => {
  try {
    const filter = buildFilterQuery(req.query);
    const listings = await SeedExchange.find(filter).sort({ createdAt: -1 });

    const features = listings.map(item => {
      const coords = (item.coordinates && item.coordinates.coordinates) ? item.coordinates.coordinates : [0, 0];
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: coords
        },
        properties: {
          id: item._id,
          plant: item.plant,
          variety: item.variety,
          type: item.type,
          quantity: item.quantity,
          exchangeType: item.exchangeType,
          locationName: item.locationName,
          notes: item.notes,
          createdAt: item.createdAt
        }
      };
    });

    const geoJsonData = {
      type: 'FeatureCollection',
      features
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="seed_exchange.geojson"');
    res.status(200).json(geoJsonData);
  } catch (error) {
    console.error('Error exporting GeoJSON:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
