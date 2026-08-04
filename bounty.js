// bounty.js – Gestione bounty pagati in $MYZ
// Ogni bounty ha un ID, un importo in MYZ, un assegnatario e uno stato.

const bounties = new Map();

// Crea un nuovo bounty
function createBounty(issueId, rewardMYZ, assignedTo = null) {
  if (bounties.has(issueId)) {
    throw new Error(`Bounty for issue ${issueId} already exists.`);
  }
  bounties.set(issueId, {
    rewardMYZ,
    assignedTo,
    status: 'open',
    claimedAt: null,
    completedAt: null
  });
  return { issueId, rewardMYZ, assignedTo, status: 'open' };
}

// Assegna il bounty a un utente (se è ancora aperto)
function assignBounty(issueId, username) {
  const bounty = bounties.get(issueId);
  if (!bounty) throw new Error(`Bounty ${issueId} not found.`);
  if (bounty.status !== 'open') throw new Error(`Bounty ${issueId} is already ${bounty.status}.`);
  bounty.assignedTo = username;
  return { issueId, assignedTo: username, status: bounty.status };
}

// Segna come completato (e paga)
function completeBounty(issueId, walletAddress) {
  const bounty = bounties.get(issueId);
  if (!bounty) throw new Error(`Bounty ${issueId} not found.`);
  if (bounty.status !== 'open') throw new Error(`Bounty ${issueId} is already ${bounty.status}.`);
  if (!bounty.assignedTo) throw new Error(`Bounty ${issueId} has no assignee.`);

  bounty.status = 'completed';
  bounty.completedAt = new Date().toISOString();
  bounty.payoutWallet = walletAddress;

  // Qui potresti chiamare la funzione di mint su Tari
  console.log(`✅ Bounty ${issueId} completed. ${bounty.rewardMYZ} MYZ sent to ${walletAddress}`);

  return { issueId, status: 'completed', rewardMYZ: bounty.rewardMYZ, wallet: walletAddress };
}

// Ottieni lo stato di un bounty
function getBounty(issueId) {
  return bounties.get(issueId);
}

// Lista di tutti i bounty aperti
function listOpenBounties() {
  const result = [];
  for (const [id, data] of bounties) {
    if (data.status === 'open') {
      result.push({ issueId: id, ...data });
    }
  }
  return result;
}

module.exports = {
  createBounty,
  assignBounty,
  completeBounty,
  getBounty,
  listOpenBounties
};
