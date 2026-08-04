const { createOrder, onPaymentReceived } = require('./buy_myz');

async function test() {
  const order = await createOrder('tari_test_wallet_123', 50);
  console.log('Ordine creato:', order);
  // Simula il pagamento con 10 conferme
  onPaymentReceived(order.id, 'tx_hash_test', 10);
}
test();
