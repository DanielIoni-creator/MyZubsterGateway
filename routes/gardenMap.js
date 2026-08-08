const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const Garden = require('../models/Garden');

// List all gardens with search & filters
router.get('/',
  query('lat').optional().isFloat(),
  query('lng').optional().isFloat(),
  query('radius').optional().isFloat(),
  query('crop').optional().isString(),
  query('minArea').optional().isFloat(),
  async (req, res) => {
    try {
      const filter = {};
      
      // Geo-spatial search
      if (req.query.lat && req.query.lng) {
        const radius = parseFloat(req.query.radius) || 5000; // 5km default
        filter.location = {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(req.query.lng), parseFloat(req.query.lat)]
            },
            $maxDistance: radius
          }
        };
      }
      
      if (req.query.crop) {
        filter.crops = { $in: [new RegExp(req.query.crop, 'i')] };
      }
      if (req.query.minArea) {
        filter.area_sqm = { $gte: parseFloat(req.query.minArea) };
      }
      
      const gardens = await Garden.find(filter)
        .select('name location area_sqm crops description photos')
        .limit(100);
      
      res.json({
        type: 'FeatureCollection',
        features: gardens.map(g => ({
          type: 'Feature',
          geometry: g.location,
          properties: {
            id: g._id,
            name: g.name,
            area_sqm: g.area_sqm,
            crops: g.crops,
            description: g.description,
            photos: g.photos
          }
        }))
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Get single garden
router.get('/:id', async (req, res) => {
  try {
    const garden = await Garden.findById(req.params.id);
    if (!garden) return res.status(404).json({ error: 'Garden not found' });
    res.json(garden);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create garden
router.post('/',
  body('name').isString().notEmpty(),
  body('latitude').isFloat({ min: -90, max: 90 }),
  body('longitude').isFloat({ min: -180, max: 180 }),
  body('area_sqm').isFloat({ min: 1 }),
  body('crops').isArray(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    
    try {
      const garden = new Garden({
        name: req.body.name,
        location: {
          type: 'Point',
          coordinates: [req.body.longitude, req.body.latitude]
        },
        area_sqm: req.body.area_sqm,
        crops: req.body.crops,
        description: req.body.description || '',
        photos: req.body.photos || [],
        owner: req.body.owner
      });
      await garden.save();
      res.status(201).json(garden);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Export gardens as CSV/GeoJSON
router.get('/export/:format', async (req, res) => {
  try {
    const gardens = await Garden.find({}).lean();
    
    if (req.params.format === 'csv') {
      const header = 'name,latitude,longitude,area_sqm,crops\n';
      const rows = gardens.map(g => 
        `"${g.name}",${g.location.coordinates[1]},${g.location.coordinates[0]},${g.area_sqm},"${g.crops.join(';')}"`
      ).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.send(header + rows);
    } else {
      res.json({
        type: 'FeatureCollection',
        features: gardens.map(g => ({
          type: 'Feature',
          geometry: g.location,
          properties: { name: g.name, area_sqm: g.area_sqm, crops: g.crops }
        }))
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
