<<<<<<< HEAD
/**
 * Robot Reputation Service - Bounty BOT-6 (#343)
 *
 * Calcola la reputazione di un robot a partire da tre segnali:
 *   - i job completati (esperienza)
 *   - le valutazioni ricevute (qualità percepita)
 *   - le dispute aperte (affidabilità)
 *
 * Il punteggio è sempre **derivato**: non esiste un campo "reputation" che
 * qualcuno possa scrivere direttamente. Ricalcolarlo dai feedback rende il
 * sistema verificabile e impossibile da falsare senza lasciare traccia.
 *
 * Come per l'audit, senza MongoDB i feedback finiscono in un archivio in
 * memoria: il servizio resta usabile in sviluppo e nei test.
 */

const mongoose = require('mongoose');
const RobotFeedback = require('../models/RobotFeedback');
const robotBrain = require('../robot_brain');

// ------------------------------------------------------------------ badge

/**
 * Soglie dei badge. `minScore` è il punteggio 0-100, `minJobs` evita che un
 * robot con un solo job perfetto scavalchi uno con cento job ottimi.
 */
const BADGES = [
  { name: 'Platinum', minScore: 90, minJobs: 50 },
  { name: 'Gold', minScore: 75, minJobs: 20 },
  { name: 'Silver', minScore: 60, minJobs: 5 },
  { name: 'Bronze', minScore: 0, minJobs: 0 }
];

function badgeFor(score, jobsCompleted) {
  return BADGES.find(b => score >= b.minScore && jobsCompleted >= b.minJobs) || BADGES[BADGES.length - 1];
}

/** Cosa manca per il badge successivo: serve alla dashboard. */
function nextBadge(score, jobsCompleted) {
  const current = badgeFor(score, jobsCompleted);
  const currentIndex = BADGES.findIndex(b => b.name === current.name);
  if (currentIndex === 0) return null; // già Platinum
  const next = BADGES[currentIndex - 1];
  return {
    name: next.name,
    scoreNeeded: Math.max(0, round(next.minScore - score)),
    jobsNeeded: Math.max(0, next.minJobs - jobsCompleted)
  };
}

// ------------------------------------------------------------- punteggio

const WEIGHTS = { rating: 0.6, experience: 0.25, reliability: 0.15 };
const EXPERIENCE_PLATEAU = 50; // job oltre i quali l'esperienza non cresce più

function round(value, decimals = 2) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Punteggio 0-100 da valutazioni, esperienza e dispute.
 *
 * Un robot senza feedback parte da 50 (neutro) invece che da 0: uno appena
 * creato non è inaffidabile, è semplicemente sconosciuto.
 *
 * @param {{averageRating: number|null, totalFeedback: number, jobsCompleted: number, disputes: number}} input
 */
function computeScore({ averageRating = null, totalFeedback = 0, jobsCompleted = 0, disputes = 0 }) {
  // Qualità: media voti 1-5 riportata su 0-100; 50 se non ci sono voti.
  const quality = totalFeedback > 0 && averageRating !== null
    ? ((averageRating - 1) / 4) * 100
    : 50;

  // Esperienza: cresce con i job completati e si appiattisce a EXPERIENCE_PLATEAU.
  const experience = clamp((jobsCompleted / EXPERIENCE_PLATEAU) * 100, 0, 100);

  // Affidabilità: percentuale di job senza disputa.
  const denominator = Math.max(jobsCompleted, disputes);
  const reliability = denominator > 0
    ? clamp(((denominator - disputes) / denominator) * 100, 0, 100)
    : 100;

  const score = quality * WEIGHTS.rating + experience * WEIGHTS.experience + reliability * WEIGHTS.reliability;
  return {
    score: round(clamp(score, 0, 100)),
    components: { quality: round(quality), experience: round(experience), reliability: round(reliability) }
  };
}

// ------------------------------------------------- archivio di fallback

const memoryFeedback = []; // usato quando MongoDB non è connesso

function isMongoConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

function getMemoryFeedback() {
  return memoryFeedback.slice();
}

function clearMemoryFeedback() {
  memoryFeedback.length = 0;
}

// ------------------------------------------------------------ scrittura

class ValidationError extends Error {}
class ConflictError extends Error {}

/** Valida e normalizza il payload di un feedback. Lancia ValidationError. */
function validateFeedback({ robotId, clientId, jobId, rating, comment, disputed }) {
  if (!robotId) throw new ValidationError('robotId è obbligatorio');
  if (!clientId) throw new ValidationError('clientId è obbligatorio');
  if (!jobId) throw new ValidationError('jobId è obbligatorio');

  const parsed = Number(rating);
  if (!Number.isFinite(parsed)) throw new ValidationError('rating è obbligatorio e deve essere un numero');
  if (!Number.isInteger(parsed)) throw new ValidationError('rating deve essere un numero intero');
  if (parsed < 1 || parsed > 5) throw new ValidationError('rating deve essere compreso fra 1 e 5');

  if (comment !== undefined && comment !== null && typeof comment !== 'string') {
    throw new ValidationError('comment deve essere una stringa');
  }
  if (typeof comment === 'string' && comment.length > 1000) {
    throw new ValidationError('comment non può superare i 1000 caratteri');
  }

  return {
    robotId: String(robotId),
    clientId: String(clientId),
    jobId: String(jobId),
    rating: parsed,
    comment: comment ? String(comment) : null,
    disputed: disputed === true || disputed === 'true',
    createdAt: new Date()
  };
}

/**
 * Registra un feedback. Rifiuta i duplicati (stesso robot, job e cliente).
 * @throws {ValidationError|ConflictError}
 */
async function submitFeedback(payload) {
  const feedback = validateFeedback(payload);

  if (!isMongoConnected()) {
    const duplicate = memoryFeedback.some(f =>
      f.robotId === feedback.robotId && f.jobId === feedback.jobId && f.clientId === feedback.clientId);
    if (duplicate) throw new ConflictError('Feedback già presente per questo job e cliente');
    memoryFeedback.push(feedback);
    return feedback;
  }

  try {
    return await RobotFeedback.create(feedback);
  } catch (err) {
    // 11000 = violazione dell'indice unico su (robotId, jobId, clientId).
    if (err.code === 11000) throw new ConflictError('Feedback già presente per questo job e cliente');
    throw err;
  }
}

// ------------------------------------------------------------- lettura

async function findFeedback(filter = {}, { limit = 50, skip = 0 } = {}) {
  if (!isMongoConnected()) {
    const all = memoryFeedback
      .filter(f => Object.entries(filter).every(([k, v]) => f[k] === v))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return { items: all.slice(skip, skip + limit), total: all.length };
  }
  const [items, total] = await Promise.all([
    RobotFeedback.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    RobotFeedback.countDocuments(filter)
  ]);
  return { items, total };
}

/** Aggregati di un robot a partire da tutti i suoi feedback. */
function summarize(feedbacks) {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  let disputes = 0;

  for (const f of feedbacks) {
    distribution[f.rating] = (distribution[f.rating] || 0) + 1;
    sum += f.rating;
    if (f.disputed) disputes += 1;
  }

  return {
    totalFeedback: feedbacks.length,
    averageRating: feedbacks.length ? round(sum / feedbacks.length) : null,
    ratingDistribution: distribution,
    disputedFeedback: disputes
  };
}

/** Job completati e dispute noti al robot_brain (stato in memoria). */
function robotStats(robotId) {
  const robot = robotBrain.getAllRobots().find(r => r.robotId === robotId);
  if (!robot) return { known: false, jobsCompleted: 0, disputes: 0, name: null, status: null };
  const disputes = (robot.history || []).filter(h => h.event === 'dispute_opened').length;
  return {
    known: true,
    jobsCompleted: Number(robot.jobsCompleted) || 0,
    disputes,
    name: robot.name || null,
    status: robot.status || 'idle'
  };
}

/**
 * Reputazione completa di un robot: punteggio, badge, aggregati e progresso.
 */
async function getReputation(robotId) {
  if (!robotId) throw new ValidationError('robotId è obbligatorio');

  const { items } = await findFeedback({ robotId }, { limit: 10000 });
  const summary = summarize(items);
  const stats = robotStats(robotId);

  // Le dispute contano una sola volta anche se emergono da entrambe le fonti.
  const disputes = Math.max(stats.disputes, summary.disputedFeedback);

  const { score, components } = computeScore({
    averageRating: summary.averageRating,
    totalFeedback: summary.totalFeedback,
    jobsCompleted: stats.jobsCompleted,
    disputes
  });

  const badge = badgeFor(score, stats.jobsCompleted);

  return {
    robotId,
    name: stats.name,
    status: stats.status,
    knownToGateway: stats.known,
    score,
    badge: badge.name,
    components,
    jobsCompleted: stats.jobsCompleted,
    disputes,
    ...summary,
    nextBadge: nextBadge(score, stats.jobsCompleted)
  };
}

/** Classifica dei robot per punteggio. */
async function getLeaderboard({ limit = 20, badge = null } = {}) {
  const ids = new Set(robotBrain.getAllRobots().map(r => r.robotId));
  const { items } = await findFeedback({}, { limit: 10000 });
  for (const f of items) ids.add(f.robotId);

  const reputations = await Promise.all(Array.from(ids).map(id => getReputation(id)));
  const filtered = badge ? reputations.filter(r => r.badge === badge) : reputations;

  return filtered
    .sort((a, b) => b.score - a.score || b.jobsCompleted - a.jobsCompleted)
    .slice(0, Math.min(Math.max(1, limit), 100));
}

module.exports = {
  BADGES,
  ValidationError,
  ConflictError,
  badgeFor,
  nextBadge,
  computeScore,
  validateFeedback,
  submitFeedback,
  findFeedback,
  summarize,
  getReputation,
  getLeaderboard,
  getMemoryFeedback,
  clearMemoryFeedback
=======
const TokenHolding = require('../models/TokenHolding');
const ReputationNFT = require('../models/ReputationNFT');
const Token = require('../models/Token');

const THRESHOLDS = {
  BRONZE: 10,
  SILVER: 50,
  GOLD: 100,
  PLATINUM: 500,
  DIAMOND: 1000,
};

const getTierName = (amount) => {
  if (amount >= THRESHOLDS.DIAMOND) return 'DIAMOND';
  if (amount >= THRESHOLDS.PLATINUM) return 'PLATINUM';
  if (amount >= THRESHOLDS.GOLD) return 'GOLD';
  if (amount >= THRESHOLDS.SILVER) return 'SILVER';
  if (amount >= THRESHOLDS.BRONZE) return 'BRONZE';
  return null;
};

const getTierDescription = (tier, tokenName) => {
  const descriptions = {
    BRONZE: `Investitore principiante di ${tokenName}`,
    SILVER: `Investitore intermedio di ${tokenName}`,
    GOLD: `Investitore esperto di ${tokenName}`,
    PLATINUM: `Investitore elite di ${tokenName}`,
    DIAMOND: `Investitore leggendario di ${tokenName}`,
  };
  return descriptions[tier] || '';
};

const mintReputationNFT = async (userId, tokenId, amount) => {
  const tier = getTierName(amount);
  if (!tier) return null;

  const token = await Token.findById(tokenId);
  if (!token) return null; // Se il token non esiste, salta

  const existing = await ReputationNFT.findOne({
    user: userId,
    token: tokenId,
    name: tier,
  });
  if (existing) return existing;

  const contractAddress = `0x${Math.random().toString(16).substring(2, 42)}`;
  const tokenIdOnChain = `0x${Math.random().toString(16).substring(2, 42)}`;

  const nft = new ReputationNFT({
    user: userId,
    token: tokenId,
    tokenId: tokenIdOnChain,
    contractAddress,
    blockchain: 'tari',
    name: tier,
    description: getTierDescription(tier, token.name),
    image: `/images/tiers/${tier.toLowerCase()}.png`,
    metadata: {
      tier,
      threshold: THRESHOLDS[tier],
      tokenName: token.name,
      tokenSymbol: token.symbol,
      amount: amount,
    },
    threshold: THRESHOLDS[tier],
  });

  await nft.save();
  return nft;
};

const checkAndMintReputationNFTs = async () => {
  console.log('[ReputationService] 🔍 Controllo NFT di reputazione...');

  const holdings = await TokenHolding.aggregate([
    {
      $group: {
        _id: { user: '$user', token: '$token' },
        totalAmount: { $sum: '$amount' },
      },
    },
    { $match: { totalAmount: { $gte: THRESHOLDS.BRONZE } } },
  ]);

  let mintedCount = 0;
  for (const h of holdings) {
    try {
      const nft = await mintReputationNFT(h._id.user, h._id.token, h.totalAmount);
      if (nft) mintedCount++;
    } catch (err) {
      // Ignora errori (es. token non trovato)
    }
  }

  console.log(`[ReputationService] ✅ Mintati ${mintedCount} NFT di reputazione`);
  return mintedCount;
};

const getUserReputationNFTs = async (userId) => {
  const nfts = await ReputationNFT.find({ user: userId, isActive: true })
    .populate('token', 'name symbol');
  return nfts;
};

const getUserTier = async (userId, tokenId) => {
  const holdings = await TokenHolding.find({ user: userId, token: tokenId });
  const totalAmount = holdings.reduce((sum, h) => sum + h.amount, 0);
  return getTierName(totalAmount);
};

module.exports = {
  mintReputationNFT,
  checkAndMintReputationNFTs,
  getUserReputationNFTs,
  getUserTier,
  THRESHOLDS,
>>>>>>> e7f3bf96a (feat(docker): add Docker Compose dev environment and Dockerfile (B9))
};
