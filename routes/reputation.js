const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const reputationService = require('../services/reputationService');

router.get('/nfts', auth, async (req, res) => {
  try {
    const nfts = await reputationService.getUserReputationNFTs(req.user._id);
    res.json(nfts);
  } catch (error) {
    console.error('Errore recupero NFT reputazione:', error);
    res.status(500).json({ error: 'Errore nel recupero degli NFT' });
  }
});

router.get('/tier/:tokenId', auth, async (req, res) => {
  try {
    const tier = await reputationService.getUserTier(req.user._id, req.params.tokenId);
    res.json({ tier });
  } catch (error) {
    console.error('Errore recupero tier:', error);
    res.status(500).json({ error: 'Errore nel recupero del tier' });
  }
});

router.post('/check', async (req, res) => {
  try {
    const count = await reputationService.checkAndMintReputationNFTs();
    res.json({ success: true, minted: count });
  } catch (error) {
    console.error('Errore controllo NFT:', error);
    res.status(500).json({ error: 'Errore nel controllo NFT' });
  }
});

module.exports = router;
