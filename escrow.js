// escrow.js – gestione escrow 2-di-3
const escrows = new Map();

function createEscrow(id, buyer, seller, amount) {
  escrows.set(id, { buyer, seller, amount, state: 'Locked', proof: null });
  return id;
}

function lockFunds(id, payer) {
  const escrow = escrows.get(id);
  if (!escrow || escrow.state !== 'Locked') return false;
  if (payer !== escrow.buyer) return false;
  escrow.state = 'Locked'; // già lockato
  return true;
}

function submitProof(id, proofHash) {
  const escrow = escrows.get(id);
  if (!escrow || escrow.state !== 'Locked') return false;
  escrow.proof = proofHash;
  return true;
}

function release(id, caller) {
  const escrow = escrows.get(id);
  if (!escrow || escrow.state !== 'Locked') return false;
  if (caller !== escrow.buyer && caller !== escrow.seller) return false;
  escrow.state = 'Released';
  return true;
}

module.exports = { createEscrow, lockFunds, submitProof, release };
