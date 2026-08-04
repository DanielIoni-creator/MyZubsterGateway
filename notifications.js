// notifications.js – Stub per notifiche
async function notifyUser(userId, message) {
  console.log(`📧 Notify user ${userId}: ${message}`);
}
async function notifyRobot(robotId, message) {
  console.log(`🤖 Notify robot ${robotId}: ${message}`);
}
module.exports = { notifyUser, notifyRobot };
