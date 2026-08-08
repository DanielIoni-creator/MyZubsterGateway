// services/sensorService.js - Gestione sensori Arduino per orti urbani
const SensorData = require('../models/SensorData');

class SensorService {
  // Ricevi dati dai sensori
  async receiveSensorData(data) {
    try {
      const { gardenId, ph, ec, temperature, humidity, timestamp } = data;
      
      if (!gardenId || ph === undefined) {
        throw new Error('Missing required fields: gardenId, ph');
      }

      const sensorData = new SensorData({
        gardenId,
        ph,
        ec,
        temperature,
        humidity,
        timestamp: timestamp || new Date()
      });

      await sensorData.save();
      
      // Trigger event per EVA brain
      this.triggerEVABrain(sensorData);
      
      return sensorData;
    } catch (error) {
      console.error('Error saving sensor data:', error);
      throw error;
    }
  }

  // Ottieni dati storici per un orto
  async getGardenData(gardenId, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return await SensorData.find({
      gardenId,
      timestamp: { $gte: startDate }
    }).sort({ timestamp: -1 });
  }

  // Ottieni ultimo dato per un orto
  async getLatestData(gardenId) {
    return await SensorData.findOne({ gardenId })
      .sort({ timestamp: -1 });
  }

  // Ottieni statistiche per un orto
  async getGardenStats(gardenId) {
    const data = await SensorData.find({ gardenId })
      .sort({ timestamp: -1 })
      .limit(100);
    
    if (data.length === 0) return null;
    
    const phValues = data.map(d => d.ph);
    const ecValues = data.map(d => d.ec);
    const tempValues = data.map(d => d.temperature);
    
    return {
      ph: {
        avg: phValues.reduce((a, b) => a + b, 0) / phValues.length,
        min: Math.min(...phValues),
        max: Math.max(...phValues)
      },
      ec: {
        avg: ecValues.reduce((a, b) => a + b, 0) / ecValues.length,
        min: Math.min(...ecValues),
        max: Math.max(...ecValues)
      },
      temperature: {
        avg: tempValues.reduce((a, b) => a + b, 0) / tempValues.length,
        min: Math.min(...tempValues),
        max: Math.max(...tempValues)
      },
      readings: data.length
    };
  }

  // Trigger per EVA brain
  async triggerEVABrain(sensorData) {
    // Invia dati a EVA brain per analisi
    // Implementazione futura
    console.log(`📡 EVA brain received data from garden ${sensorData.gardenId}`);
  }
}

module.exports = new SensorService();
