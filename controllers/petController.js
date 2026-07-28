const Pet = require('../models/Pet');

exports.registerPet = async (req, res) => {
  try {
    const { name, species, breed, age, weight, nfcId, gps, photos, moneroAddress } = req.body;

    if (!name || !species || !moneroAddress) {
      return res.status(400).json({
        success: false,
        message: 'Name, species, and Monero address are required'
      });
    }

    const pet = new Pet({
      name,
      species,
      breed,
      age,
      weight,
      nfcId,
      gps,
      photos: photos || [],
      owner: req.user.id,
      moneroAddress,
      status: 'pending'
    });

    await pet.save();

    res.status(201).json({
      success: true,
      message: 'Pet registered successfully',
      pet
    });
  } catch (error) {
    console.error('Pet registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

exports.getPets = async (req, res) => {
  try {
    const pets = await Pet.find({ owner: req.user.id });
    res.json({ success: true, pets });
  } catch (error) {
    console.error('Get pets error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

exports.getPetById = async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);
    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Pet not found'
      });
    }
    if (pet.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    res.json({ success: true, pet });
  } catch (error) {
    console.error('Get pet error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

exports.updatePet = async (req, res) => {
  try {
    const { name, breed, age, weight, health, photos } = req.body;
    const pet = await Pet.findById(req.params.id);

    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Pet not found'
      });
    }

    if (pet.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (name) pet.name = name;
    if (breed) pet.breed = breed;
    if (age) pet.age = age;
    if (weight) pet.weight = weight;
    if (health) pet.health = health;
    if (photos) pet.photos = photos;
    pet.updatedAt = new Date();

    await pet.save();

    res.json({
      success: true,
      message: 'Pet updated successfully',
      pet
    });
  } catch (error) {
    console.error('Update pet error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

exports.deletePet = async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);

    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Pet not found'
      });
    }

    if (pet.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await pet.deleteOne();

    res.json({
      success: true,
      message: 'Pet deleted successfully'
    });
  } catch (error) {
    console.error('Delete pet error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// PUBBLICO - NFC lookup NON richiede autenticazione
exports.getPetByNfc = async (req, res) => {
  try {
    const { nfcId } = req.params;
    const pet = await Pet.findOne({ nfcId });

    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Pet not found with this NFC ID'
      });
    }

    res.json({ success: true, pet });
  } catch (error) {
    console.error('Get pet by NFC error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
