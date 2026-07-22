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
  if (!token) throw new Error('Token non trovato');

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
    const nft = await mintReputationNFT(h._id.user, h._id.token, h.totalAmount);
    if (nft) mintedCount++;
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
};
