const Seed = require('../models/Seed');
const User = require('../models/User');

// Crea un nuovo annuncio di semi/talee
const createListing = async (req, res) => {
  try {
    const { userId, plantType, quantity, price, description } = req.body;
    
    const listing = new Seed({
      userId,
      plantType,
      quantity,
      price,
      description,
      status: 'available'
    });
    
    await listing.save();
    res.status(201).json({ success: true, data: listing });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Ottieni tutti gli annunci disponibili
const getListings = async (req, res) => {
  try {
    const listings = await Seed.find({ status: 'available' })
      .populate('userId', 'username email')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: listings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { createListing, getListings };
