const escrows = new Map();

function createEscrow(id, buyer, seller, amount) {
  escrows.set(id, { id, buyer, seller, amount, state: 'pending' });
  return id;
}
function lockFunds(id) { /* stub */ }
function submitProof(id, proof) { /* stub */ }
function release(id) { /* stub */ }
function dispute(id) { /* stub */ }
function getEscrow(id) { return escrows.get(id); }

module.exports = { createEscrow, lockFunds, submitProof, release, dispute, getEscrow };
