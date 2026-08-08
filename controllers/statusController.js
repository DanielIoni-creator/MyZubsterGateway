const mongoose = require('mongoose');
const os = require('os');

const getSystemStatus = async (req, res) => {
  try {
    // 1. Gateway status
    const gatewayStatus = {
      status: 'online',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: require('../package.json').version,
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem()
      },
      cpu: os.cpus().length
    };

    // 2. MongoDB status
    const mongodbStatus = {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      readyState: mongoose.connection.readyState
    };

    // 3. Servizi status
    const services = {
      gateway: { status: 'online', uptime: gatewayStatus.uptime },
      mongodb: mongodbStatus,
      backend: { status: 'online' },
      ai: { status: 'online' }
    };

    // 4. Robot attivi (simulato)
    const robots = {
      active: 4,
      total: 20,
      online: 4,
      offline: 0,
      maintenance: 1
    };

    // 5. Log recenti (simulati)
    const recentLogs = [
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Gateway started successfully'
      },
      {
        timestamp: new Date(Date.now() - 60000).toISOString(),
        level: 'info',
        message: 'MongoDB connection established'
      },
      {
        timestamp: new Date(Date.now() - 120000).toISOString(),
        level: 'warn',
        message: 'High memory usage detected'
      }
    ];

    res.json({
      success: true,
      data: {
        gateway: gatewayStatus,
        mongodb: mongodbStatus,
        services: services,
        robots: robots,
        logs: recentLogs
      }
    });

  } catch (error) {
    console.error('Error getting system status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getSystemStatus
};
