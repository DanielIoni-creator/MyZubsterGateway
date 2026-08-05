const Bull = require('bull');
const { ExpressAdapter } = require('@bull-board/express');
const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');

// Redis connection configuration
const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = process.env.REDIS_PORT || 6379;
const redisConfig = { host: redisHost, port: redisPort };

// Default job options with automatic retries and exponential backoff
const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: true,
};

// Queue instances
const aiGenerateQueue = new Bull('ai-generate', { redis: redisConfig, defaultJobOptions });
const sendNotificationQueue = new Bull('send-notification', { redis: redisConfig, defaultJobOptions });
const processWebhookQueue = new Bull('process-webhook', { redis: redisConfig, defaultJobOptions });

// Simple processors with console logging
aiGenerateQueue.process(async (job) => {
  console.log('🔧 Processing ai-generate job', job.id);
  return { success: true };
});

sendNotificationQueue.process(async (job) => {
  console.log('🔧 Processing send-notification job', job.id);
  return { success: true };
});

processWebhookQueue.process(async (job) => {
  console.log('🔧 Processing process-webhook job', job.id);
  return { success: true };
});

// Bull Board Dashboard setup
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullAdapter(aiGenerateQueue),
    new BullAdapter(sendNotificationQueue),
    new BullAdapter(processWebhookQueue),
  ],
  serverAdapter,
});

module.exports = {
  aiGenerateQueue,
  sendNotificationQueue,
  processWebhookQueue,
  bullBoardRouter: serverAdapter.getRouter(),
};
