// scripts/create-wallet.js - Crea wallet MyZubster
const fs = require('fs');
const crypto = require('crypto');

// Funzione per generare un wallet MYZ (Tari) simulato
function generateMyzWallet() {
  // In produzione, usa la libreria Tari
  return {
    address: `myz_${crypto.randomBytes(16).toString('hex')}`,
    privateKey: crypto.randomBytes(32).toString('hex'),
    publicKey: crypto.randomBytes(32).toString('hex')
  };
}

// Funzione per generare un wallet XMR (Monero) simulato
function generateXmrWallet() {
  // In produzione, usa la libreria Monero
  return {
    address: `xmr_${crypto.randomBytes(16).toString('hex')}`,
    privateKey: crypto.randomBytes(32).toString('hex'),
    publicKey: crypto.randomBytes(32).toString('hex')
  };
}

async function createMyZubsterWallet() {
  console.log("💰 Creazione wallet MyZubster...");
  
  // Crea wallet MYZ (Tari)
  const myzWallet = generateMyzWallet();
  console.log("✅ Wallet MYZ creato:");
  console.log(`   Address: ${myzWallet.address}`);
  console.log(`   Private Key: ${myzWallet.privateKey.substring(0, 20)}...`);
  
  // Crea wallet XMR (Monero) per ricevere pagamenti
  const xmrWallet = generateXmrWallet();
  console.log("✅ Wallet XMR creato:");
  console.log(`   Address: ${xmrWallet.address}`);
  console.log(`   Private Key: ${xmrWallet.privateKey.substring(0, 20)}...`);
  
  // Salva le credenziali
  const walletData = {
    myz: myzWallet,
    xmr: xmrWallet,
    createdAt: new Date().toISOString(),
    platformFee: 2 // Fee 2% per la piattaforma
  };
  
  fs.writeFileSync(
    '/root/myzubster/myzubster-gateway/wallet-credentials.json',
    JSON.stringify(walletData, null, 2)
  );
  
  console.log("📁 Credenziali salvate in wallet-credentials.json");
  console.log("");
  console.log("📋 RIEPILOGO:");
  console.log(`   MYZ Wallet: ${myzWallet.address}`);
  console.log(`   XMR Wallet: ${xmrWallet.address}`);
  console.log(`   Platform Fee: 2%`);
  console.log("");
  console.log("⚠️  IMPORTANTE: Conserva queste credenziali in un luogo sicuro!");
  console.log("🔗  Aggiorna il file .env con questi indirizzi.");
}

createMyZubsterWallet();
