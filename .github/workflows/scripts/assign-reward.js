#!/usr/bin/env node

const fs = require('fs');

const eventPath = process.env.GITHUB_EVENT_PATH;
if (!eventPath) {
  console.error('❌ GITHUB_EVENT_PATH not set');
  process.exit(1);
}

let eventData;
try {
  const rawData = fs.readFileSync(eventPath, 'utf8');
  eventData = JSON.parse(rawData);
} catch (err) {
  console.error('❌ Failed to read or parse event.json:', err.message);
  process.exit(1);
}

// ============================================
// Customize this logic for your reward system
// ============================================
// Example: extract user from issue/PR comment
const comment = eventData.comment?.body || '';
const issueNumber = eventData.issue?.number || eventData.pull_request?.number;

console.log(`📝 Processing event for issue #${issueNumber}`);
console.log(`💬 Comment: ${comment}`);

// Add your reward assignment logic here...
// e.g., parse the comment for "I claim this bounty", then assign the user

console.log('✅ assign-reward.js executed successfully');
