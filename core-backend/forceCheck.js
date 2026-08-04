const { checkPendingOrders } = require('./services/paymentMonitor');
checkPendingOrders().then(() => {
  console.log('✅ Controllo manuale completato');
  process.exit(0);
}).catch(err => {
  console.error('❌ Errore:', err);
  process.exit(1);
});