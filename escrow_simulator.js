const { transfer } = require('./token_simulator');

const escrows = new Map();

function createEscrow(id, buyer, seller, amount) {
    if (escrows.has(id)) throw new Error('Escrow already exists');
    escrows.set(id, { buyer, seller, amount, state: 'Locked', proof_hash: null });
    return id;
}

function lockFunds(id, payer, amount) {
    const escrow = escrows.get(id);
    if (!escrow) throw new Error('Escrow not found');
    if (escrow.state !== 'Locked') throw new Error('Escrow not in Locked state');
    if (payer !== escrow.buyer) throw new Error('Only buyer can lock funds');
    return true;
}

function submitProof(id, proofHash) {
    const escrow = escrows.get(id);
    if (!escrow) throw new Error('Escrow not found');
    if (escrow.state !== 'Locked') throw new Error('Escrow not in Locked state');
    escrow.proof_hash = proofHash;
    return true;
}

function release(id, caller) {
    const escrow = escrows.get(id);
    if (!escrow) throw new Error('Escrow not found');
    if (escrow.state !== 'Locked') throw new Error('Escrow not in Locked state');
    if (caller !== escrow.buyer && caller !== escrow.seller) {
        throw new Error('Only buyer or seller can release');
    }
    console.log(`🔄 Release called for escrow ${id}, transferring ${escrow.amount} from ${escrow.buyer} to ${escrow.seller}`);
    transfer(escrow.buyer, escrow.seller, escrow.amount);
    escrow.state = 'Released';
    return true;
}

function dispute(id, caller) {
    const escrow = escrows.get(id);
    if (!escrow) throw new Error('Escrow not found');
    if (escrow.state !== 'Locked') throw new Error('Escrow not in Locked state');
    if (caller !== escrow.buyer && caller !== escrow.seller) {
        throw new Error('Only buyer or seller can dispute');
    }
    escrow.state = 'Disputed';
    return true;
}

function getEscrow(id) {
    return escrows.get(id);
}

module.exports = { createEscrow, lockFunds, submitProof, release, dispute, getEscrow };
