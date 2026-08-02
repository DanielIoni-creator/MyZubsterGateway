const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const axios = require('axios');

// Modello Bounty
const bountySchema = new mongoose.Schema({
  issueNumber: { type: Number, required: true, unique: true },
  repo: { type: String, required: true },
  amount: { type: Number, required: true },
  address: { type: String },
  status: { 
    type: String, 
    enum: ['pending', 'paid', 'completed', 'failed'],
    default: 'pending'
  },
  txId: { type: String },
  contributor: { type: String },
  createdAt: { type: Date, default: Date.now },
  paidAt: { type: Date }
}, { collection: 'bounties' });

const Bounty = mongoose.model('Bounty', bountySchema);

// Webhook per nuove issue
router.post('/webhook', async (req, res) => {
  try {
    const event = req.headers['x-github-event'];
    const payload = req.body;

    // Verifica che sia una issue con tag bounty
    if (event === 'issues' && payload.action === 'opened') {
      const issue = payload.issue;
      const repo = payload.repository.full_name;
      
      // Cerca label "bounty" e importo
      const hasBountyLabel = issue.labels.some(label => label.name === 'bounty');
      if (!hasBountyLabel) {
        return res.status(200).send('OK');
      }

      // Estrai importo dal corpo della issue
      const amountMatch = issue.body.match(/Bounty:\s*([\d.]+)\s*XMR/i);
      if (!amountMatch) {
        await addComment(repo, issue.number, '⚠️ Please specify bounty amount: `Bounty: 0.05 XMR`');
        return res.status(200).send('OK');
      }

      const amount = parseFloat(amountMatch[1]);
      
      // Crea il bounty nel database
      const bounty = new Bounty({
        issueNumber: issue.number,
        repo: repo,
        amount: amount,
        contributor: issue.user.login,
        status: 'pending'
      });
      await bounty.save();

      // Crea ordine di pagamento
      const orderId = `bounty_${repo.replace('/', '_')}_${issue.number}`;
      const paymentResponse = await axios.post(
        `http://localhost:${process.env.PORT || 10000}/api/payments/create-order`,
        {
          orderId: orderId,
          amount: amount,
          description: `Bounty for #${issue.number} in ${repo}`
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      // Aggiorna il bounty con l'indirizzo
      bounty.address = paymentResponse.data.address;
      await bounty.save();

      // Aggiungi commento sulla issue
      await addComment(repo, issue.number, `
✅ **Bounty Created!** 

📝 **Amount:** ${amount} XMR  
📫 **Address:** \`${paymentResponse.data.address}\`  
🆔 **Order ID:** \`${orderId}\`

Please send the payment to the address above. Once confirmed, the issue will be updated automatically.

🔗 **Status:** Pending
      `);

      console.log(`✅ Bounty ${issue.number} created for ${amount} XMR`);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).send('Error');
  }
});

// Endpoint per verificare lo stato del bounty
router.get('/status/:issueNumber', async (req, res) => {
  try {
    const bounty = await Bounty.findOne({ issueNumber: req.params.issueNumber });
    if (!bounty) {
      return res.status(404).json({ error: 'Bounty not found' });
    }
    res.json(bounty);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint per aggiornare lo stato del bounty
router.put('/:issueNumber', async (req, res) => {
  try {
    const { status, txId } = req.body;
    const bounty = await Bounty.findOneAndUpdate(
      { issueNumber: req.params.issueNumber },
      { status, txId, paidAt: new Date() },
      { new: true }
    );
    if (!bounty) {
      return res.status(404).json({ error: 'Bounty not found' });
    }

    // Aggiorna la issue su GitHub
    if (status === 'paid') {
      await addComment(bounty.repo, bounty.issueNumber, `
✅ **Bounty Paid!**

💰 **Amount:** ${bounty.amount} XMR  
🔗 **Transaction ID:** \`${txId}\`  
📅 **Paid at:** ${new Date().toISOString()}

The bounty has been successfully paid. Thank you for your contribution! 🚀
      `);
    }

    res.json(bounty);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Funzione helper per aggiungere commenti
async function addComment(repo, issueNumber, body) {
  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      console.warn('⚠️ GITHUB_TOKEN not set, skipping comment');
      return;
    }

    await axios.post(
      `https://api.github.com/repos/${repo}/issues/${issueNumber}/comments`,
      { body },
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json'
        }
      }
    );
  } catch (error) {
    console.error('❌ Error adding comment:', error.message);
  }
}

module.exports = router;
