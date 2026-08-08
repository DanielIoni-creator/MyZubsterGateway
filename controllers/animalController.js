const Animal = require('../models/Animal');
const Reward = require('../models/Reward');
const { mint } = require('../token_simulator');

exports.registerAnimal = async (req, res) => {
  try {
    const { species, place, userId, description } = req.body;
    
    if (!species || !place || !userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: species, place, userId' 
      });
    }

    const newAnimal = new Animal({ 
      species, 
      place,
      description, 
      registeredBy: userId 
    });
    await newAnimal.save();

    const rewardAmount = parseInt(process.env.REWARD_ANIMAL_REGISTRATION) || 10;
    const txId = await mint(userId, rewardAmount);

    const reward = new Reward({
      userId,
      amount: rewardAmount,
      reason: `Registrazione nuova specie animale: ${species}`,
      source: 'animal_registry',
      txId,
      status: 'completed'
    });
    await reward.save();

    res.json({
      success: true,
      animalId: newAnimal._id,
      species,
      place,
      reward: {
        amount: rewardAmount,
        currency: 'MYZ',
        txId
      }
    });
  } catch (err) {
    console.error('❌ Errore registrazione animale:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
};

exports.getAnimals = async (req, res) => {
  try {
    const animals = await Animal.find().sort({ registeredAt: -1 }).limit(100);
    res.json({ success: true, data: animals });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getAnimalById = async (req, res) => {
  try {
    const animal = await Animal.findById(req.params.id);
    if (!animal) {
      return res.status(404).json({ success: false, error: 'Animale non trovato' });
    }
    res.json({ success: true, data: animal });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateAnimal = async (req, res) => {
  try {
    const animal = await Animal.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!animal) {
      return res.status(404).json({ success: false, error: 'Animale non trovato' });
    }
    res.json({ success: true, data: animal });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteAnimal = async (req, res) => {
  try {
    const animal = await Animal.findByIdAndDelete(req.params.id);
    if (!animal) {
      return res.status(404).json({ success: false, error: 'Animale non trovato' });
    }
    res.json({ success: true, message: 'Animale eliminato' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
