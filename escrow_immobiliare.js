// escrow_immobiliare.js – Escrow per acquisti immobiliari con $MYZ
// 2‑di‑3: buyer, seller, arbitro (scelto in base alla reputazione)

const escrows = new Map();

// Crea un nuovo escrow immobiliare
function createEscrow(id, buyer, seller, amountMYZ, propertyId, arbitrator = null) {
  if (escrows.has(id)) {
    throw new Error(`Escrow ${id} already exists.`);
  }
  escrows.set(id, {
    id,
    buyer,
    seller,
    arbitrator,
    amountMYZ,
    propertyId,
    state: 'pending', // pending, locked, disputed, released, refunded
    proof: null,
    createdAt: new Date().toISOString()
  });
  console.log(`🏠 Escrow ${id} created for property ${propertyId}`);
  return escrows.get(id);
}

// Blocca i fondi (solo buyer)
function lockFunds(id, caller) {
  const escrow = escrows.get(id);
  if (!escrow) throw new Error(`Escrow ${id} not found.`);
  if (escrow.state !== 'pending') throw new Error(`Escrow ${id} is already ${escrow.state}.`);
  if (caller !== escrow.buyer) throw new Error('Only buyer can lock funds.');
  escrow.state = 'locked';
  console.log(`🔒 Funds locked for escrow ${id}`);
  return escrow;
}

// Invia la prova di proprietà (solo seller)
function submitProof(id, caller, proofHash) {
  const escrow = escrows.get(id);
  if (!escrow) throw new Error(`Escrow ${id} not found.`);
  if (escrow.state !== 'locked') throw new Error(`Escrow ${id} is not in locked state.`);
  if (caller !== escrow.seller) throw new Error('Only seller can submit proof.');
  escrow.proof = proofHash;
  console.log(`📄 Proof submitted for escrow ${id}`);
  return escrow;
}

// Rilascia i fondi al seller (solo buyer o arbitro)
function release(id, caller) {
  const escrow = escrows.get(id);
  if (!escrow) throw new Error(`Escrow ${id} not found.`);
  if (escrow.state !== 'locked') throw new Error(`Escrow ${id} is not in locked state.`);
  if (caller !== escrow.buyer && caller !== escrow.arbitrator) {
    throw new Error('Only buyer or arbitrator can release funds.');
  }
  escrow.state = 'released';
  console.log(`💰 Funds released to seller for escrow ${id}`);
  return escrow;
}

// Disputa (solo buyer o seller)
function dispute(id, caller) {
  const escrow = escrows.get(id);
  if (!escrow) throw new Error(`Escrow ${id} not found.`);
  if (escrow.state !== 'locked') throw new Error(`Escrow ${id} is not in locked state.`);
  if (caller !== escrow.buyer && caller !== escrow.seller) {
    throw new Error('Only buyer or seller can raise a dispute.');
  }
  escrow.state = 'disputed';
  console.log(`⚖️ Dispute raised for escrow ${id}`);
  return escrow;
}

// Arbitra la disputa (solo arbitro)
function arbitrate(id, caller, decision) {
  const escrow = escrows.get(id);
  if (!escrow) throw new Error(`Escrow ${id} not found.`);
  if (escrow.state !== 'disputed') throw new Error(`Escrow ${id} is not in disputed state.`);
  if (caller !== escrow.arbitrator) throw new Error('Only the arbitrator can arbitrate.');
  if (decision === 'release') {
    escrow.state = 'released';
    console.log(`⚖️ Arbitrator decided to release funds for escrow ${id}`);
  } else if (decision === 'refund') {
    escrow.state = 'refunded';
    console.log(`⚖️ Arbitrator decided to refund buyer for escrow ${id}`);
  } else {
    throw new Error('Invalid decision. Use "release" or "refund".');
  }
  return escrow;
}

function getEscrow(id) {
  return escrows.get(id);
}

module.exports = {
  createEscrow,
  lockFunds,
  submitProof,
  release,
  dispute,
  arbitrate,
  getEscrow
};
