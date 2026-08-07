const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const SeedExchange = require('../models/SeedExchange');

router.post('/', auth, async (req, res) => {
  try {
    const { title, description, seedType, quantity, imageUrl, location } = req.body;

    if (!title || !description || !seedType || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'title, description, seedType, and quantity are required'
      });
    }

    const listing = await SeedExchange.create({
      title,
      description,
      seedType,
      quantity,
      imageUrl: imageUrl || '',
      location: location || '',
      owner: req.user._id
    });

    return res.status(201).json({
      success: true,
      data: listing
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const { seedType, status, location, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (seedType) {
      filter.seedType = seedType;
    }
    if (status) {
      filter.status = status;
    }
    if (location) {
      filter.location = { $regex: location, $options: 'i' };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const limitNum = Math.min(Math.max(Number(limit), 1), 100);

    const [total, listings] = await Promise.all([
      SeedExchange.countDocuments(filter),
      SeedExchange.find(filter)
        .populate('owner', 'username name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    return res.json({
      success: true,
      data: listings,
      pagination: {
        total,
        page: Number(page),
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, seedType, quantity, imageUrl, location, status } = req.body;

    const listing = await SeedExchange.findById(id);
    if (!listing) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found'
      });
    }

    if (listing.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this listing'
      });
    }

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (seedType !== undefined) updates.seedType = seedType;
    if (quantity !== undefined) updates.quantity = quantity;
    if (imageUrl !== undefined) updates.imageUrl = imageUrl;
    if (location !== undefined) updates.location = location;
    if (status !== undefined) updates.status = status;

    const updated = await SeedExchange.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    });

    return res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const listing = await SeedExchange.findById(id);
    if (!listing) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found'
      });
    }

    if (listing.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this listing'
      });
    }

    await SeedExchange.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: 'Listing deleted'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;