const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Referral = require('../models/Referral');

// Genera o ottieni codice referral per un negozio (utente)
router.post('/generate', async (req, res) => {
  const { ownerId } = req.body;
  if (!ownerId) return res.status(400).json({ error: 'ownerId is required' });
  
  try {
    let ref = await Referral.findOne({ ownerId });
    if (!ref) {
      const code = crypto.randomBytes(4).toString('hex');
      ref = new Referral({ ownerId, referralCode: code });
      await ref.save();
    }
    res.json({ success: true, referralCode: ref.referralCode, rewards: ref.rewardsEarned });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Usa un codice referral (es. alla registrazione di un nuovo negozio)
router.post('/redeem', async (req, res) => {
  const { referralCode, newUserId } = req.body;
  try {
    const ref = await Referral.findOne({ referralCode });
    if (!ref) return res.status(404).json({ error: 'Codice non valido' });
    if (ref.ownerId === newUserId) return res.status(400).json({ error: 'Non puoi usare il tuo codice' });
    
    // Aggiungi 5 MYZ di ricompensa (mockato nel wallet o DB)
    ref.uses += 1;
    ref.rewardsEarned += 5;
    await ref.save();
    
    res.json({ success: true, message: 'Referral applicato! 5 MYZ di ricompensa assegnati al creatore.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
