const RobotHistory = require('../models/RobotHistory');

async function logRobotEvent(robotId, event, jobId = null, amount = 0, balanceAfter = 0, metadata = {}) {
  const entry = new RobotHistory({
    robotId,
    event,
    jobId,
    amount,
    balanceAfter,
    metadata
  });
  await entry.save();
  console.log(`📝 Robot ${robotId} event logged: ${event}`);
  return entry;
}

async function getRobotHistory(robotId, limit = 50) {
  return await RobotHistory.find({ robotId })
    .sort({ timestamp: -1 })
    .limit(limit);
}

async function getLatestBalance(robotId) {
  const last = await RobotHistory.findOne({ robotId })
    .sort({ timestamp: -1 });
  return last ? last.balanceAfter : 0;
}

module.exports = { logRobotEvent, getRobotHistory, getLatestBalance };
