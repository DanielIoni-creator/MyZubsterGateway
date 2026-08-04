// bounty.js – gestione dei bounty pagati in $MYZ
const bounties = new Map();

function createBounty(issueId, rewardMYZ, assignedTo) {
  bounties.set(issueId, { rewardMYZ, assignedTo, status: 'open' });
}

function claimBounty(issueId, walletAddress) {
  const bounty = bounties.get(issueId);
  if (!bounty || bounty.status !== 'open') return false;
  bounty.status = 'claimed';
  bounty.wallet = walletAddress;
  return true;
}

module.exports = { createBounty, claimBounty };
