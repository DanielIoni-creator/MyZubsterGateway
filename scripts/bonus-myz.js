#!/usr/bin/env node
// scripts/bonus-myz.js – Bonus per chi usa MYZ
const axios = require('axios');

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:10000';

async function applyBonus(userId, reason) {
  try {
    const response = await axios.post(`${GATEWAY_URL}/api/rewards/trigger`, {
      userId,
      amount: 10,
      reason: `🎉 Bonus MYZ: ${reason}`,
      source: 'manual'
    });
    console.log(`✅ Bonus 10 MYZ assegnato a ${userId}`);
    return response.data;
  } catch (err) {
    console.error('❌ Errore bonus:', err.message);
  }
}

// Esempio: bonus per chi fa il primo swap
if (require.main === module) {
  const userId = process.argv[2];
  if (!userId) {
    console.log('❌ Usa: node scripts/bonus-myz.js <userId>');
    process.exit(1);
  }
  applyBonus(userId, 'Primo swap XMR→MYZ');
}

module.exports = { applyBonus };
