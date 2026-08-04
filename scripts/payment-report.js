#!/usr/bin/env node

// scripts/payment-report.js – Genera report delle transazioni di pagamento
// Uso: node scripts/payment-report.js [--markdown] [--csv] [--json]

const mongoose = require('mongoose');
const Reward = require('../models/Reward');
require('dotenv').config();

const args = process.argv.slice(2);
const format = args.includes('--markdown') ? 'markdown' :
               args.includes('--csv') ? 'csv' :
               args.includes('--json') ? 'json' : 'markdown';

async function generateReport() {
  try {
    // Connetti a MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myzubster');
    console.error('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }

  try {
    // Recupera tutte le transazioni (escludi i test se vuoi)
    const transactions = await Reward.find({})
      .sort({ createdAt: -1 })
      .lean();

    if (transactions.length === 0) {
      console.log('📭 Nessuna transazione trovata.');
      process.exit(0);
    }

    // Raggruppa per utente
    const byUser = {};
    let totalMYZ = 0;
    let totalTxs = transactions.length;

    transactions.forEach(tx => {
      const userId = tx.userId || 'unknown';
      if (!byUser[userId]) {
        byUser[userId] = { total: 0, count: 0, txs: [] };
      }
      byUser[userId].total += tx.amount;
      byUser[userId].count += 1;
      byUser[userId].txs.push(tx);
      totalMYZ += tx.amount;
    });

    // --- Output ---
    if (format === 'json') {
      console.log(JSON.stringify({ total: totalTxs, totalMYZ, byUser, transactions }, null, 2));
      process.exit(0);
    }

    if (format === 'csv') {
      console.log('userId,amount,reason,source,txId,status,createdAt');
      transactions.forEach(tx => {
        console.log(`${tx.userId},${tx.amount},${tx.reason},${tx.source},${tx.txId},${tx.status},${tx.createdAt}`);
      });
      process.exit(0);
    }

    // Default: Markdown
    console.log(`# 📊 Report Pagamenti - ${new Date().toISOString().split('T')[0]}`);
    console.log('');
    console.log(`**Totale transazioni:** ${totalTxs}`);
    console.log(`**Totale MYZ pagati:** ${totalMYZ} MYZ`);
    console.log('');
    console.log('## 📋 Dettaglio per utente');
    console.log('');
    console.log('| Utente | Transazioni | Totale MYZ |');
    console.log('|--------|-------------|------------|');

    const sortedUsers = Object.entries(byUser).sort((a, b) => b[1].total - a[1].total);
    for (const [userId, data] of sortedUsers) {
      console.log(`| @${userId} | ${data.count} | ${data.total} MYZ |`);
    }

    console.log('');
    console.log('## 🧾 Elenco transazioni');
    console.log('');
    console.log('| Data | Utente | Importo | Motivo | TX ID |');
    console.log('|------|--------|---------|--------|-------|');

    // Mostra le ultime 20
    const recent = transactions.slice(0, 20);
    for (const tx of recent) {
      const date = new Date(tx.createdAt).toISOString().split('T')[0];
      console.log(`| ${date} | @${tx.userId} | ${tx.amount} MYZ | ${tx.reason || '-'} | \`${tx.txId}\` |`);
    }
    if (transactions.length > 20) {
      console.log(`| ... | ... | ... | ... | ... |`);
    }

    console.log('');
    console.log('---');
    console.log('*Report generato automaticamente.*');

    process.exit(0);
  } catch (err) {
    console.error('❌ Errore durante la generazione del report:', err);
    process.exit(1);
  }
}

generateReport();
