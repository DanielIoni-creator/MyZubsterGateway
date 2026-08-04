// escrow_immobiliare.js – Escrow per acquisti immobiliari con $MYZ
const escrows = new Map();

function createEscrow(id, buyer, seller, amountMYZ, propertyId, arbitrator = null) {
  if (escrows.has(id)) throw new Error(`Escrow ${id} already exists.`);
  const escrow = { id, buyer, seller, arbitrator, amountMYZ, propertyId, state: 'pending', proof: null, createdAt: new Date().toISOString() };
  escrows.set(id, escrow);
  console.log(`🏠 Escrow ${id} created for property ${propertyId}`);
  return escrow;
}

function lockFunds(id, caller) {
  const escrow = escrows.get(id);
  if (!escrow) throw new Error(`Escrow ${id} not found.`);
  if (caller !== escrow.buyer) throw new Error('Only buyer can lock funds.');
  if (escrow.state !== 'pending') throw new Error(`Escrow ${id} is ${escrow.state}.`);
  escrow.state = 'locked';
  console.log(`🔒 Funds locked for escrow ${id}`);
  return escrow;
}

function submitProof(id, caller, proof) {
  const escrow = escrows.get(id);
  if (!escrow) throw new Error(`Escrow ${id} not found.`);
  if (caller !== escrow.seller) throw new Error('Only seller can submit proof.');
  if (escrow.state !== 'locked') throw new Error(`Escrow ${id} is not locked.`);
  escrow.proof = proof;
  escrow.state = 'disputed'; // default: va in disputa per verifica
  console.log(`📄 Proof submitted for escrow ${id}`);
  return escrow;
}

function release(id, caller) {
  const escrow = escrows.get(id);
  if (!escrow) throw new Error(`Escrow ${id} not found.`);
  if (caller !== escrow.buyer && caller !== escrow.arbitrator) throw new Error('Only buyer or arbitrator can release.');
  if (escrow.state !== 'disputed' && escrow.state !== 'locked') throw new Error(`Escrow ${id} cannot be released.`);
  escrow.state = 'released';
  console.log(`💰 Funds released to seller for escrow ${id}`);
  return escrow;
}

function refund(id, caller) {
  const escrow = escrows.get(id);
  if (!escrow) throw new Error(`Escrow ${id} not found.`);
  if (caller !== escrow.seller && caller !== escrow.arbitrator) throw new Error('Only seller or arbitrator can refund.');
  escrow.state = 'refunded';
  console.log(`↩️ Funds refunded to buyer for escrow ${id}`);
  return escrow;
}

function getEscrow(id) {
  const escrow = escrows.get(id);
  if (!escrow) throw new Error(`Escrow ${id} not found.`);
  return escrow;
}

module.exports = { createEscrow, lockFunds, submitProof, release, refund, getEscrow };
