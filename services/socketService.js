const { Server } = require('socket.io');

let io;

module.exports = {
  init: (server) => {
    io = new Server(server, {
      cors: {
        origin: "*", // Adjust for production
        methods: ["GET", "POST"]
      }
    });

    io.on('connection', (socket) => {
      console.log('✅ Client connected via WebSocket:', socket.id);
      
      socket.on('disconnect', () => {
        console.log('❌ Client disconnected:', socket.id);
      });
    });

    return io;
  },
  
  getIO: () => {
    if (!io) {
      throw new Error('Socket.io not initialized!');
    }
    return io;
  },

  emitRobotStatus: (robotId, status) => {
    if (io) {
      io.emit('robot:status', { robotId, status, timestamp: new Date().toISOString() });
    }
  },

  emitJobProgress: (jobId, progress) => {
    if (io) {
      io.emit('job:progress', { jobId, progress, timestamp: new Date().toISOString() });
    }
  },

  emitEscrowUpdate: (escrowId, status, amount) => {
    if (io) {
      io.emit('escrow:update', { escrowId, status, amount, timestamp: new Date().toISOString() });
    }
  }
};
