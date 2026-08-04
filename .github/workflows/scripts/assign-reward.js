const axios = require('axios');

async function main() {
  const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3002';
  const MYZ_REWARD_PER_PR = parseInt(process.env.MYZ_REWARD_PER_PR || '10');
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

  const prData = JSON.parse(process.env.GITHUB_EVENT_PATH);
  const userId = prData.pull_request.user.login;
  const prUrl = prData.pull_request.html_url;

  console.log(`🔄 Assigning reward of ${MYZ_REWARD_PER_PR} MYZ to ${userId} for PR ${prUrl}`);

  try {
    const response = await axios.post(`${GATEWAY_URL}/api/reward`, {
      userId: userId,
      amount: MYZ_REWARD_PER_PR,
      reason: `PR merged: ${prUrl}`,
      source: 'github_bot'
    });
    console.log('✅ Reward assigned:', response.data);
  } catch (error) {
    console.error('❌ Failed to assign reward:', error.message);
    process.exit(1);
  }
}

main();
