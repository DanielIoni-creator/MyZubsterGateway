const Plant = require('../models/Plant');

exports.verifyPlant = async (req, res) => {
  try {
    const { plantId } = req.params;
    const { status } = req.body;

    const plant = await Plant.findById(plantId);
    if (!plant) {
      return res.status(404).json({ success: false, message: 'Plant not found' });
    }

    plant.status = status;
    plant.updatedAt = new Date();
    await plant.save();

    // TODO: Send reward to owner if verified
    // Reward: 0.002 XMR

    res.json({ success: true, plant });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getPendingPlants = async (req, res) => {
  try {
    const plants = await Plant.find({ status: 'pending' }).limit(50);
    res.json({ success: true, plants });
  } catch (error) {
    console.error('Get pending plants error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
