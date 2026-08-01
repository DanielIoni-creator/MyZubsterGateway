const Escrow = require('../models/Escrow');
const AiAgentDecision = require('../models/AiAgentDecision');
const deepseekService = require('./deepseekService');
const crypto = require('crypto');

const AGENT_KEY = process.env.AI_AGENT_MULTISIG_KEY || 'agent-third-signer';
const AGENT_ADDRESS = process.env.AI_AGENT_ADDRESS || '44kLzNXHV9EDxHN948HsvhhEQpQY6iyE6LfgCbFz463JM1bpz3UtWwUTPuQJ25nMzuQmfjYiDcqYvN9uYkTp3v5J2E1hisp';

function signDecision(escrowId, decision, reason) {
  const payload = `${escrowId}:${decision}:${reason}:${Date.now()}`;
  return crypto.createHmac('sha256', AGENT_KEY).update(payload).digest('hex');
}

async function analyzeEvidence(escrow) {
  const order = await Escrow.findById(escrow._id).populate('buyerId', 'username reputationScore').populate('sellerId', 'username reputationScore');
  if (!order) throw new Error('Escrow not found for AI analysis');

  const prompt = `Sei il terzo firmatario multisig 2/3 per il marketplace MyZubster.

Dettagli ordine:
- Escrow ID: ${order._id}
- Importo: ${order.amount} XMR
- Acquirente: ${order.buyerId?.username || 'unknown'} (reputazione: ${order.buyerId?.reputationScore || 'N/A'})
- Venditore: ${order.sellerId?.username || 'unknown'} (reputazione: ${order.sellerId?.reputationScore || 'N/A'})
- Stato: ${order.status}
- Condizione rilascio: ${order.releaseCondition}

Analizza e fornisci una decisione in formato JSON:
{
  "decision": "approve|reject|pending_review",
  "reason": "Spiegazione breve",
  "confidence": 0-100
}`;

  const response = await deepseekService.askDeepSeek(prompt, 'Sei un verificatore autonomo per transazioni escrow. Rispondi solo con JSON valido.', 0.1);
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Risposta AI non valida');
  return JSON.parse(jsonMatch[0]);
}

async function evaluateEscrow(escrowId) {
  const escrow = await Escrow.findById(escrowId);
  if (!escrow) throw new Error('Escrow non trovata');
  if (escrow.status !== 'funded') throw new Error(`Stato non valido per valutazione AI: ${escrow.status}`);

  const analysis = await analyzeEvidence(escrow);
  const decision = analysis.decision === 'approve' ? 'approve' : analysis.decision === 'reject' ? 'reject' : 'pending_review';
  const signatureHash = signDecision(escrowId, decision, analysis.reason);

  const record = new AiAgentDecision({
    orderId: escrow.orderId,
    escrowId: escrow._id,
    decision,
    reason: analysis.reason,
    confidenceScore: (analysis.confidence || 0) / 100,
    evidence: [{ type: 'ai_model', source: 'deepseek-r1:1.5b', summary: analysis.reason }],
    aiModel: 'deepseek-r1:1.5b',
    signatureHash,
    status: 'signed',
    signedAt: new Date()
  });
  await record.save();

  escrow.aiAgentDecision = decision;
  escrow.aiAgentSignature = signatureHash;
  escrow.aiAgentSignedAt = new Date();
  escrow.aiAgentConfidence = (analysis.confidence || 0) / 100;
  await escrow.save();

  return { decision, reason: analysis.reason, confidence: analysis.confidence, signatureHash, record };
}

async function getAgentStatus() {
  return {
    agent: AGENT_ADDRESS,
    role: 'third_signer',
    model: 'deepseek-r1:1.5b',
    status: 'active'
  };
}

module.exports = {
  evaluateEscrow,
  getAgentStatus,
  signDecision,
  analyzeEvidence
};
