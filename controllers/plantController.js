const Plant = require('../models/Plant');

exports.registerPlant = async (req, res) => {
  try {
    const { species, commonName, gps, photos, age, size, moneroAddress } = req.body;

    if (!species || !gps || !moneroAddress) {
      return res.status(400).json({
        success: false,
        message: 'Species, GPS, and Monero address are required'
      });
    }

    const plant = new Plant({
      species,
      commonName,
      gps,
      photos: photos || [],
      age,
      size,
      owner: req.user.id,
      moneroAddress,
      status: 'pending'
    });

    await plant.save();

    res.status(201).json({
      success: true,
      message: 'Plant registered successfully',
      plant
    });
  } catch (error) {
    console.error('Plant registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

exports.getPlants = async (req, res) => {
  try {
    const plants = await Plant.find({ status: 'verified' }).limit(100);
    res.json({ success: true, plants });
  } catch (error) {
    console.error('Get plants error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

exports.getPlantById = async (req, res) => {
  try {
    const plant = await Plant.findById(req.params.id);
    if (!plant) {
      return res.status(404).json({
        success: false,
        message: 'Plant not found'
      });
    }
    res.json({ success: true, plant });
  } catch (error) {
    console.error('Get plant error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
