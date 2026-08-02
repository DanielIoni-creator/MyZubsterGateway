const express = require('express');
const router = express.Router();

/**
 * Seed Exchange Export API Routes
 * Resolves MyZubsterGateway Issue #109 ([Bounty] Seed Exchange: add CSV/GeoJSON export endpoints)
 */

const mockSeedListings = [
  { id: 'SEED-1', plant: 'San Marzano Tomato', variety: 'Heirloom', type: 'Seed', quantity: 50, location: 'Rome, Italy', lat: 41.9028, lng: 12.4964, exchangeType: 'Swap' },
  { id: 'SEED-2', plant: 'Genovese Basil', variety: 'Organic', type: 'Cutting', quantity: 20, location: 'Genoa, Italy', lat: 44.4056, lng: 8.9463, exchangeType: 'Gift' },
  { id: 'SEED-3', plant: 'Lavender', variety: 'English', type: 'Seed', quantity: 100, location: 'Provence, France', lat: 43.9493, lng: 4.8055, exchangeType: 'Swap' }
];

// GET /api/seed-exchange/export/csv
router.get('/export/csv', (req, res) => {
  const { plant, type, location } = req.query;
  let filtered = [...mockSeedListings];

  if (plant) filtered = filtered.filter(s => s.plant.toLowerCase().includes(plant.toLowerCase()));
  if (type) filtered = filtered.filter(s => s.type.toLowerCase() === type.toLowerCase());
  if (location) filtered = filtered.filter(s => s.location.toLowerCase().includes(location.toLowerCase()));

  let csvHeaders = 'id,plant,variety,type,quantity,location,lat,lng,exchangeType\n';
  let csvRows = filtered.map(s => `${s.id},"${s.plant}","${s.variety}",${s.type},${s.quantity},"${s.location}",${s.lat},${s.lng},${s.exchangeType}`).join('\n');

  res.header('Content-Type', 'text/csv');
  res.attachment('seed-exchange-export.csv');
  return res.send(csvHeaders + csvRows);
});

// GET /api/seed-exchange/export/geojson
router.get('/export/geojson', (req, res) => {
  const { plant, type, location } = req.query;
  let filtered = [...mockSeedListings];

  if (plant) filtered = filtered.filter(s => s.plant.toLowerCase().includes(plant.toLowerCase()));
  if (type) filtered = filtered.filter(s => s.type.toLowerCase() === type.toLowerCase());
  if (location) filtered = filtered.filter(s => s.location.toLowerCase().includes(location.toLowerCase()));

  const geoJson = {
    type: 'FeatureCollection',
    features: filtered.map(s => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [s.lng, s.lat]
      },
      properties: {
        id: s.id,
        plant: s.plant,
        variety: s.variety,
        type: s.type,
        quantity: s.quantity,
        location: s.location,
        exchangeType: s.exchangeType
      }
    }))
  };

  res.header('Content-Type', 'application/json');
  return res.json(geoJson);
});

module.exports = router;
