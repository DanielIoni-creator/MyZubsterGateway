const Escrow = require('../models/Escrow');
const OrderBook = require('../models/OrderBook');
const deepseekService = require('./deepseekService');

async function resolveDisputeWithAI(escrowId) {
  try {
    const escrow = await Escrow.findById(escrowId)
      .populate('buyerId', 'username reputationScore')
      .populate('sellerId', 'username reputationScore');

    if (!escrow) throw new Error('Escrow non trovato');

    const order = await OrderBook.findById(escrow.orderId);
    if (!order) throw new Error('Ordine non trovato');

    const prompt = `
Sei un mediatore imparziale per il marketplace MyZubster.

Dettagli della disputa:
- Ordine ID: ${order._id}
- Importo: ${escrow.amount} XMR
- Acquirente: ${escrow.buyerId.username} (reputazione: ${escrow.buyerId.reputationScore})
- Venditore: ${escrow.sellerId.username} (reputazione: ${escrow.sellerId.reputationScore})
- Stato attuale: ${escrow.status}

Analizza e fornisci una decisione in formato JSON:
{
  "decision": "release|refund|escalate",
  "reason": "Spiegazione breve",
  "confidence": 0-100
}
`;

    console.log(`🤖 Invio disputa ${escrowId} a DeepSeek...`);
    const response = await deepseekService.askDeepSeek(prompt);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Risposta AI non valida');

    const decision = JSON.parse(jsonMatch[0]);

    escrow.aiDecision = decision;
    escrow.resolvedAt = new Date();

    switch (decision.decision) {
      case 'release':
        escrow.status = 'released';
        await OrderBook.findByIdAndUpdate(escrow.orderId, { status: 'filled' });
        break;
      case 'refund':
        escrow.status = 'refunded';
        break;
      default:
        escrow.status = 'escalated';
    }

    await escrow.save();
    console.log(`✅ Disputa ${escrowId} risolta: ${decision.decision}`);
    return decision;
  } catch (error) {
    console.error('❌ Errore AI dispute:', error.message);
    await Escrow.findByIdAndUpdate(escrowId, { status: 'escalated' });
    return { decision: 'escalate', reason: 'AI error, manual review needed' };
  }
}

module.exports = { resolveDisputeWithAI };
