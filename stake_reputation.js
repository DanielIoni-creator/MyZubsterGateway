// stake_reputation.js – Staking di $MYZ per reputazione
const stakes = new Map();

function calculateLevel(amount) {
  if (amount >= 1000) return 5;
  if (amount >= 500)  return 4;
  if (amount >= 200)  return 3;
  if (amount >= 50)   return 2;
  if (amount >= 10)   return 1;
  return 0;
}

function stakeTokens(userId, amount, blocks = 1000) {
  if (amount <= 0) throw new Error('Amount must be > 0');
  if (stakes.has(userId)) throw new Error(`User ${userId} already has an active stake.`);
  const level = calculateLevel(amount);
  const stake = { userId, amount, blocks, level, status: 'active', startBlock: 0, endBlock: blocks, createdAt: new Date().toISOString() };
  stakes.set(userId, stake);
  console.log(`✅ ${amount} MYZ staked by ${userId} → Level ${level}`);
  return stake;
}

function getReputationLevel(userId) {
  const stake = stakes.get(userId);
  if (!stake || stake.status !== 'active') return 0;
  return stake.level;
}

function listActiveStakes() {
  return Array.from(stakes.values()).filter(s => s.status === 'active');
}

module.exports = { stakeTokens, getReputationLevel, listActiveStakes };
