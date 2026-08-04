// stake_reputation.js – Staking di $MYZ per ottenere reputazione
// Ogni utente può bloccare una quantità di MYZ per un periodo.
// Il livello di reputazione è calcolato in base al totale bloccato.

const stakes = new Map(); // userId -> { amount, startBlock, endBlock, level }

// Calcola il livello in base all'importo bloccato
function calculateLevel(amount) {
  if (amount >= 1000) return 5;   // 🔥 Top level
  if (amount >= 500)  return 4;
  if (amount >= 200)  return 3;
  if (amount >= 50)   return 2;
  if (amount >= 10)   return 1;
  return 0; // Nessuna reputazione
}

// Blocca una quantità di MYZ per un dato numero di blocchi
function stakeTokens(userId, amount, blocks = 1000) {
  if (amount <= 0) throw new Error('Amount must be greater than 0');
  const previous = stakes.get(userId);
  if (previous && previous.status === 'active') {
    throw new Error(`User ${userId} already has an active stake.`);
  }

  const level = calculateLevel(amount);
  const stake = {
    userId,
    amount,
    blocks,
    level,
    status: 'active',
    startBlock: 0, // in un contesto reale, sarebbe il blocco corrente
    endBlock: blocks,
    createdAt: new Date().toISOString()
  };

  stakes.set(userId, stake);
  console.log(`✅ ${amount} MYZ staked by ${userId} → Level ${level}`);
  return stake;
}

// Rilascia lo staking (dopo la scadenza o volontariamente)
function unstakeTokens(userId) {
  const stake = stakes.get(userId);
  if (!stake || stake.status !== 'active') {
    throw new Error(`User ${userId} has no active stake.`);
  }
  stake.status = 'inactive';
  stake.endBlock = 0;
  console.log(`🔄 Stake released for ${userId}`);
  return { userId, status: 'inactive', releasedAt: new Date().toISOString() };
}

// Ottieni il livello di reputazione attuale
function getReputationLevel(userId) {
  const stake = stakes.get(userId);
  if (!stake || stake.status !== 'active') return 0;
  return stake.level;
}

// Ottieni i dettagli dello staking
function getStakeInfo(userId) {
  return stakes.get(userId);
}

// Lista di tutti gli utenti con staking attivo
function listActiveStakes() {
  const result = [];
  for (const [userId, data] of stakes) {
    if (data.status === 'active') {
      result.push({ userId, ...data });
    }
  }
  return result;
}

module.exports = {
  stakeTokens,
  unstakeTokens,
  getReputationLevel,
  getStakeInfo,
  listActiveStakes
};
