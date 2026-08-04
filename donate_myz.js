// donate_myz.js – Donazione di $MYZ a contributori
// Utilizza token_simulator per mintare e inviare token a uno o più wallet.

const { mint } = require('./token_simulator');

// Lista dei contributori da premiare (puoi modificare con i loro wallet Tari)
const CONTRIBUTORS = [
  { name: 'foxxx009', wallet: 'wallet_foxxx009', amount: 50 },
  { name: 'louiss72', wallet: 'wallet_louiss72', amount: 30 },
  { name: 'SourceProofLabs', wallet: 'wallet_spl', amount: 40 },
  { name: 'Aming9303', wallet: 'wallet_aming', amount: 20 },
];

// Funzione che esegue le donazioni
function donateAll() {
  console.log('🚀 Avvio donazioni MYZ...');
  CONTRIBUTORS.forEach(({ name, wallet, amount }) => {
    mint(wallet, amount);
    console.log(`✅ Donati ${amount} MYZ a ${name} (${wallet})`);
  });
  console.log('🎉 Donazioni completate!');
}

// Se lo script viene eseguito direttamente, avvia le donazioni
if (require.main === module) {
  donateAll();
}

module.exports = { donateAll };
