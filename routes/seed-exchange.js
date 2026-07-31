const express = require('express');
const router = express.Router();

// Mock model since it might not be merged yet based on issue #104/#109
// If it exists, this should require('../models/SeedExchange')
let SeedExchange;
try {
  SeedExchange = require('../models/SeedExchange');
} catch (e) {
  // Placeholder mock for the bounty logic
  SeedExchange = {
    find: (filter) => ({
      populate: () => [
        {
          _id: '1',
          plant: 'Tomato',
          variety: 'San Marzano',
          type: 'seed',
          quantity: 50,
          location: { coordinates: [12.4924, 41.8902], type: 'Point' }, // Rome
          exchangeType: 'swap',
          owner: { username: 'farmer_joe' }
        }
      ]
    })
  };
}

/**
 * GET /api/seed-exchange/export/csv
 * Export listings as CSV
 */
router.get('/export/csv', async (req, res) => {
  try {
    const { plant, type, location } = req.query;
    const filter = {};
    if (plant) filter.plant = new RegExp(plant, 'i');
    if (type) filter.type = type;
    
    // Fetch data
    const listings = await SeedExchange.find(filter).populate('owner', 'username');

    // Generate CSV
    const headers = ['ID', 'Plant', 'Variety', 'Type', 'Quantity', 'ExchangeType', 'Longitude', 'Latitude', 'Owner'];
    const rows = listings.map(l => [
      l._id,
      `"${l.plant || ''}"`,
      `"${l.variety || ''}"`,
      l.type,
      l.quantity,
      l.exchangeType,
      l.location?.coordinates?.[0] || '',
      l.location?.coordinates?.[1] || '',
      l.owner?.username || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.header('Content-Type', 'text/csv');
    res.attachment('seed-exchange-listings.csv');
    return res.send(csvContent);

  } catch (error) {
    console.error('CSV Export Error:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

/**
 * GET /api/seed-exchange/export/geojson
 * Export listings as GeoJSON
 */
router.get('/export/geojson', async (req, res) => {
  try {
    const { plant, type, location } = req.query;
    const filter = {};
    if (plant) filter.plant = new RegExp(plant, 'i');
    if (type) filter.type = type;

    // Fetch data
    const listings = await SeedExchange.find(filter).populate('owner', 'username');

    // Generate GeoJSON
    const geojson = {
      type: 'FeatureCollection',
      features: listings
        .filter(l => l.location && l.location.coordinates)
        .map(l => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: l.location.coordinates
          },
          properties: {
            id: l._id,
            plant: l.plant,
            variety: l.variety,
            type: l.type,
            quantity: l.quantity,
            exchangeType: l.exchangeType,
            owner: l.owner?.username
          }
        }))
    };

    res.header('Content-Type', 'application/json');
    res.attachment('seed-exchange-listings.geojson');
    return res.json(geojson);

  } catch (error) {
    console.error('GeoJSON Export Error:', error);
    res.status(500).json({ error: 'Failed to export GeoJSON' });
  }
});

module.exports = router;
