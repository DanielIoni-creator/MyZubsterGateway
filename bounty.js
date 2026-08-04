// bounty.js – Gestione bounty pagati in $MYZ
const bounties = new Map();

function createBounty(issueId, rewardMYZ, assignedTo = null) {
  if (bounties.has(issueId)) throw new Error(`Bounty ${issueId} already exists.`);
  const bounty = { issueId, rewardMYZ, assignedTo, status: 'open', claimedAt: null, completedAt: null };
  bounties.set(issueId, bounty);
  return bounty;
}

function assignBounty(issueId, username) {
  const bounty = bounties.get(issueId);
  if (!bounty) throw new Error(`Bounty ${issueId} not found.`);
  if (bounty.status !== 'open') throw new Error(`Bounty ${issueId} is ${bounty.status}.`);
  bounty.assignedTo = username;
  return bounty;
}

function completeBounty(issueId, walletAddress) {
  const bounty = bounties.get(issueId);
  if (!bounty) throw new Error(`Bounty ${issueId} not found.`);
  if (bounty.status !== 'open') throw new Error(`Bounty ${issueId} is not open.`);
  bounty.status = 'completed';
  bounty.completedAt = new Date().toISOString();
  // Qui chiameresti il mint reale, ma restituiamo i dati
  return { issueId, rewardMYZ: bounty.rewardMYZ, wallet: walletAddress };
}

function listBounties() {
  return Array.from(bounties.entries()).map(([id, data]) => ({ id, ...data }));
}

module.exports = { createBounty, assignBounty, completeBounty, listBounties };
