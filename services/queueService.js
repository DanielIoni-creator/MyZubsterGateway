const {
  aiGenerateQueue,
  sendNotificationQueue,
  processWebhookQueue,
} = require('../queues');

/**
 * Add a job to the AI generate queue.
 * @param {Object} data - Payload for the job.
 * @param {number} [priority=0] - Job priority (higher numbers are higher priority).
 */
function addAiGenerateJob(data, priority = 0) {
  return aiGenerateQueue.add(data, { priority });
}

/**
 * Add a job to the send-notification queue.
 * @param {Object} data - Payload for the job.
 * @param {number} [priority=0] - Job priority.
 */
function addSendNotificationJob(data, priority = 0) {
  return sendNotificationQueue.add(data, { priority });
}

/**
 * Add a job to the process-webhook queue.
 * @param {Object} data - Payload for the job.
 * @param {number} [priority=0] - Job priority.
 */
function addProcessWebhookJob(data, priority = 0) {
  return processWebhookQueue.add(data, { priority });
}

module.exports = {
  addAiGenerateJob,
  addSendNotificationJob,
  addProcessWebhookJob,
};
