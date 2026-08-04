const { mint, balance, transfer } = require('./token_simulator');
const { createOrder, onPaymentReceived } = require('./buy_myz');
const { createEscrow, lockFunds, submitProof, release, getEscrow } = require('./escrow_simulator');

// 1. Test token
console.log('--- Test token ---');
mint('wallet_user1', 1000);
console.log('Saldo user1:', balance('wallet_user1'));

// 2. Test acquisto MYZ con XMR
console.log('\n--- Test acquisto MYZ ---');
const order = createOrder('wallet_user1', 50);
onPaymentReceived(order.id, 10);
console.log('Saldo user1 dopo acquisto:', balance('wallet_user1'));

// 3. Test escrow
console.log('\n--- Test escrow ---');
const escrowId = createEscrow('escrow_001', 'wallet_user1', 'wallet_robot1', 30);
lockFunds(escrowId, 'wallet_user1', 30);
submitProof(escrowId, 'hash_della_foto');
release(escrowId, 'wallet_user1');
console.log('Stato escrow:', getEscrow(escrowId).state);
console.log('Saldo robot1 dopo rilascio:', balance('wallet_robot1')); // not yet transferred in sim, but we can simulate later
