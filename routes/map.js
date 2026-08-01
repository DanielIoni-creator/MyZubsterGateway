// routes/map.js - Mapping Data & Escrow Linkage API Routes
const express = require('express');
const router = express.Router();
const MapEntity = require('../models/MapEntity');
const auth = require('../middleware/auth');

// POST /api/map/entities - Create a new map entity
router.post('/entities', auth, async (req, res) => {
  try {
    const { entityType, name, species, description, coordinates, escrowId, metadata, externalSource, externalId } = req.body;

    if (!entityType || !['plant', 'animal', 'person'].includes(entityType)) {
      return res.status(400).json({ error: 'Valid entityType (plant, animal, person) is required' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Entity name is required' });
    }

    if (!coordinates || typeof coordinates.latitude !== 'number' || typeof coordinates.longitude !== 'number') {
      return res.status(400).json({ error: 'Valid coordinates (latitude, longitude) are required' });
    }

    const mapEntity = new MapEntity({
      entityType,
      name,
      species: species || null,
      description: description || '',
      coordinates: {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude
      },
      owner: req.user.id || req.user._id,
      escrowId: escrowId || null,
      externalSource: externalSource || 'manual',
      externalId: externalId || null,
      metadata: metadata || {},
      provenanceHistory: [{
        action: 'CREATED',
        details: `Created entity ${name} (${entityType})`,
        updatedBy: req.user.id || req.user._id
      }]
    });

    await mapEntity.save();
    res.status(201).json({ success: true, data: mapEntity });
  } catch (error) {
    console.error('Error creating map entity:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/map/entities - List map entities with filtering
router.get('/entities', async (req, res) => {
  try {
    const { entityType, minLat, maxLat, minLng, maxLng, limit = 50, page = 1 } = req.query;
    const query = {};

    if (entityType && ['plant', 'animal', 'person'].includes(entityType)) {
      query.entityType = entityType;
    }

    if (minLat && maxLat && minLng && maxLng) {
      query['coordinates.latitude'] = { $gte: parseFloat(minLat), $lte: parseFloat(maxLat) };
      query['coordinates.longitude'] = { $gte: parseFloat(minLng), $lte: parseFloat(maxLng) };
    }

    const limitNum = parseInt(limit, 10);
    const pageNum = parseInt(page, 10);
    const skip = (pageNum - 1) * limitNum;

    const entities = await MapEntity.find(query)
      .populate('owner', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await MapEntity.countDocuments(query);

    res.json({
      success: true,
      data: entities,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error listing map entities:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/map/entities/:id - Get entity details & full provenance history
router.get('/entities/:id', async (req, res) => {
  try {
    const entity = await MapEntity.findById(req.params.id)
      .populate('owner', 'username email')
      .populate('provenanceHistory.updatedBy', 'username');

    if (!entity) {
      return res.status(404).json({ error: 'Map entity not found' });
    }

    res.json({ success: true, data: entity });
  } catch (error) {
    console.error('Error fetching map entity:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/map/entities/:id/provenance - Append a provenance record
router.post('/entities/:id/provenance', auth, async (req, res) => {
  try {
    const { action, details, transactionHash } = req.body;

    if (!action || !details) {
      return res.status(400).json({ error: 'Action and details are required for provenance entry' });
    }

    const entity = await MapEntity.findById(req.params.id);
    if (!entity) {
      return res.status(404).json({ error: 'Map entity not found' });
    }

    entity.provenanceHistory.push({
      action,
      details,
      transactionHash: transactionHash || null,
      updatedBy: req.user.id || req.user._id
    });

    await entity.save();
    res.json({ success: true, data: entity });
  } catch (error) {
    console.error('Error adding provenance entry:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/map/entities/:id/link-escrow - Link map entity to an escrow transaction
router.post('/entities/:id/link-escrow', auth, async (req, res) => {
  try {
    const { escrowId, transactionHash } = req.body;

    if (!escrowId) {
      return res.status(400).json({ error: 'Escrow ID is required' });
    }

    const entity = await MapEntity.findById(req.params.id);
    if (!entity) {
      return res.status(404).json({ error: 'Map entity not found' });
    }

    entity.escrowId = escrowId;
    entity.provenanceHistory.push({
      action: 'ESCROW_LINKED',
      details: `Linked to marketplace escrow ID: ${escrowId}`,
      transactionHash: transactionHash || null,
      updatedBy: req.user.id || req.user._id
    });

    await entity.save();
    res.json({ success: true, data: entity });
  } catch (error) {
    console.error('Error linking escrow:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
