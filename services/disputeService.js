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

const crypto = require('node:crypto');

const HOUR_MS = 3600 * 1000;
const OUTCOMES = new Set(['RELEASE', 'REFUND', 'SPLIT']);
const OPEN_STATES = new Set(['EVIDENCE', 'VOTING']);
const round = (n) => Number(Number(n).toFixed(12));

class MemoryDisputeStore {
  constructor() { this.items = new Map(); }
  async save(dispute) { this.items.set(dispute.disputeId, structuredClone(dispute)); return structuredClone(dispute); }
  async get(disputeId) { const item = this.items.get(disputeId); return item ? structuredClone(item) : null; }
  async list() { return [...this.items.values()].map((item) => structuredClone(item)); }
}

class MongoDisputeStore {
  constructor(model) { this.model = model; }
  async save(dispute) {
    const saved = await this.model.findOneAndUpdate({ disputeId: dispute.disputeId }, dispute, { upsert: true, new: true, lean: true });
    return this.strip(saved);
  }
  async get(disputeId) { return this.strip(await this.model.findOne({ disputeId }).lean()); }
  async list() { return (await this.model.find().lean()).map((doc) => this.strip(doc)); }
  strip(doc) { if (!doc) return null; const { _id, __v, ...rest } = doc; return rest; }
}

/**
 * Dispute resolution for escrowed jobs.
 *
 * A dispute moves through evidence -> mediator vote -> outcome. Every stage has
 * a deadline, and `tick()` resolves anything that has run out of time, so a
 * dispute can never sit open forever with the funds frozen — which is the
 * failure mode that matters most to the party who is in the right.
 */
class DisputeService {
  constructor({
    store = new MemoryDisputeStore(),
    onResolved = null,
    evidenceWindowHours = 72,
    votingWindowHours = 72,
    quorum = 2,
    clock = () => new Date(),
    idGenerator = () => crypto.randomUUID(),
  } = {}) {
    this.store = store;
    this.onResolved = onResolved;
    this.evidenceWindowHours = evidenceWindowHours;
    this.votingWindowHours = votingWindowHours;
    this.quorum = quorum;
    this.clock = clock;
    this.idGenerator = idGenerator;
  }

  log(dispute, event, detail = {}) {
    dispute.events.push({ event, at: this.clock().toISOString(), ...detail });
    dispute.updatedAt = this.clock().toISOString();
    return dispute;
  }

  async open({ jobId, claimantId, respondentId, reason, evidence = null, amount = null, currency = null }) {
    if (!jobId) throw new Error('jobId is required');
    if (!claimantId || !respondentId) throw new Error('claimantId and respondentId are required');
    if (claimantId === respondentId) throw new Error('claimant and respondent must differ');
    if (!reason) throw new Error('reason is required');

    const existing = (await this.store.list()).find((item) => item.jobId === jobId && OPEN_STATES.has(item.state));
    if (existing) throw new Error(`Job ${jobId} already has an open dispute`);

    const now = this.clock();
    const dispute = {
      disputeId: this.idGenerator(),
      jobId,
      claimantId,
      respondentId,
      reason,
      amount: amount === null ? null : round(amount),
      currency,
      state: 'EVIDENCE',
      evidence: evidence ? [{ party: claimantId, evidence, at: now.toISOString() }] : [],
      mediators: [],
      votes: [],
      outcome: null,
      resolution: null,
      evidenceDeadline: new Date(now.getTime() + this.evidenceWindowHours * HOUR_MS).toISOString(),
      votingDeadline: null,
      events: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    this.log(dispute, 'OPENED', { claimantId, respondentId, reason });
    return this.store.save(dispute);
  }

  async submitEvidence({ disputeId, party, evidence }) {
    const dispute = await this.require(disputeId);
    if (dispute.state !== 'EVIDENCE') throw new Error(`Evidence is closed for a dispute in state ${dispute.state}`);
    if (![dispute.claimantId, dispute.respondentId].includes(party)) throw new Error('Only the parties can submit evidence');
    if (!evidence) throw new Error('evidence is required');

    dispute.evidence.push({ party, evidence, at: this.clock().toISOString() });
    this.log(dispute, 'EVIDENCE_SUBMITTED', { party });
    return this.store.save(dispute);
  }

  /** Fixes the panel. Voting starts when the evidence window closes, not here. */
  async assignMediators({ disputeId, mediators }) {
    const dispute = await this.require(disputeId);
    if (!OPEN_STATES.has(dispute.state)) throw new Error(`Cannot assign mediators to a ${dispute.state} dispute`);
    if (!Array.isArray(mediators) || mediators.length === 0) throw new Error('mediators must be a non-empty array');

    const unique = [...new Set(mediators)];
    const conflicted = unique.filter((id) => id === dispute.claimantId || id === dispute.respondentId);
    if (conflicted.length) throw new Error(`A party cannot mediate their own dispute: ${conflicted.join(', ')}`);
    if (unique.length < this.quorum) throw new Error(`At least ${this.quorum} mediators are required`);

    dispute.mediators = unique;
    // Deliberately does not open voting: the parties keep their full evidence
    // window, and tick() starts the vote once it closes.
    this.log(dispute, 'MEDIATORS_ASSIGNED', { mediators: unique });
    return this.store.save(dispute);
  }

  openVoting(dispute, reason) {
    dispute.state = 'VOTING';
    dispute.votingDeadline = new Date(this.clock().getTime() + this.votingWindowHours * HOUR_MS).toISOString();
    this.log(dispute, 'VOTING_OPENED', { reason, deadline: dispute.votingDeadline });
    return dispute;
  }

  async vote({ disputeId, mediatorId, outcome, rationale = null }) {
    const dispute = await this.require(disputeId);
    if (dispute.state !== 'VOTING') throw new Error(`Voting is not open on a ${dispute.state} dispute`);
    if (!dispute.mediators.includes(mediatorId)) throw new Error('Only an assigned mediator can vote');
    if (!OUTCOMES.has(outcome)) throw new Error(`outcome must be one of ${[...OUTCOMES].join(', ')}`);
    if (dispute.votes.some((v) => v.mediatorId === mediatorId)) throw new Error('This mediator has already voted');

    dispute.votes.push({ mediatorId, outcome, rationale, at: this.clock().toISOString() });
    this.log(dispute, 'VOTE_CAST', { mediatorId, outcome });

    const decided = this.decide(dispute);
    if (decided) return this.settle(dispute, decided, 'MAJORITY_REACHED');
    return this.store.save(dispute);
  }

  /**
   * `quorum` is the minimum number of votes for a verdict to count.
   * Returns an outcome once one is mathematically certain — that is, once no
   * distribution of the remaining votes could overturn the current leader.
   * Waiting for every mediator when the result is already settled just keeps
   * the funds frozen for no reason.
   */
  decide(dispute) {
    const tally = this.tally(dispute);
    const cast = dispute.votes.length;
    const remaining = dispute.mediators.length - cast;
    if (cast < this.quorum) return null;

    const ranked = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    const [leader, leaderVotes] = ranked[0];
    const runnerUp = ranked[1]?.[1] ?? 0;

    return leaderVotes > runnerUp + remaining ? leader : null;
  }

  tally(dispute) {
    const tally = {};
    for (const vote of dispute.votes) tally[vote.outcome] = (tally[vote.outcome] || 0) + 1;
    return tally;
  }

  /**
   * Time-based resolution. Two rules, both biased towards not leaving funds
   * frozen: a respondent who never answers forfeits, and a panel that never
   * reaches a majority falls back to a refund rather than paying out on a
   * contested job.
   */
  async tick() {
    const now = this.clock().getTime();
    const resolved = [];

    for (const dispute of await this.store.list()) {
      if (!OPEN_STATES.has(dispute.state)) continue;

      try {
        if (dispute.state === 'EVIDENCE' && new Date(dispute.evidenceDeadline).getTime() <= now) {
          const respondentAnswered = dispute.evidence.some((item) => item.party === dispute.respondentId);
          if (!respondentAnswered) {
            resolved.push(await this.settle(dispute, 'REFUND', 'RESPONDENT_SILENT'));
            continue;
          }
          if (dispute.mediators.length >= this.quorum) {
            this.openVoting(dispute, 'EVIDENCE_WINDOW_CLOSED');
            resolved.push(await this.store.save(dispute));
          } else {
            this.log(dispute, 'AWAITING_MEDIATORS', { assigned: dispute.mediators.length, required: this.quorum });
            resolved.push(await this.store.save(dispute));
          }
          continue;
        }

        if (dispute.state === 'VOTING' && new Date(dispute.votingDeadline).getTime() <= now) {
          const tally = this.tally(dispute);
          const ranked = Object.entries(tally).sort((a, b) => b[1] - a[1]);
          const clearWinner = ranked.length === 1 || (ranked[0] && ranked[0][1] > (ranked[1]?.[1] ?? 0));

          if (dispute.votes.length >= this.quorum && clearWinner) {
            resolved.push(await this.settle(dispute, ranked[0][0], 'VOTING_WINDOW_CLOSED'));
          } else {
            resolved.push(await this.settle(dispute, 'REFUND', 'NO_MAJORITY'));
          }
        }
      } catch (error) {
        this.log(dispute, 'TICK_ERROR', { error: error.message });
        resolved.push(await this.store.save(dispute));
      }
    }

    return resolved;
  }

  async settle(dispute, outcome, reason) {
    dispute.state = 'RESOLVED';
    dispute.outcome = outcome;
    dispute.resolution = {
      outcome,
      reason,
      tally: this.tally(dispute),
      votesCast: dispute.votes.length,
      panelSize: dispute.mediators.length,
      at: this.clock().toISOString(),
    };
    this.log(dispute, 'RESOLVED', { outcome, reason });

    if (this.onResolved) {
      try {
        await this.onResolved({ jobId: dispute.jobId, disputeId: dispute.disputeId, outcome, reason });
        this.log(dispute, 'ESCROW_NOTIFIED', { outcome });
      } catch (error) {
        // The verdict stands even if the escrow could not be told about it;
        // losing the decision because a downstream call failed would be worse.
        this.log(dispute, 'ESCROW_NOTIFY_FAILED', { error: error.message });
      }
    }

    return this.store.save(dispute);
  }

  async require(disputeId) {
    const dispute = await this.store.get(disputeId);
    if (!dispute) throw new Error('Dispute not found');
    return dispute;
  }

  async get(disputeId) { return this.require(disputeId); }

  async listByJob(jobId) { return (await this.store.list()).filter((dispute) => dispute.jobId === jobId); }

  async summary() {
    const disputes = await this.store.list();
    const byState = {};
    const byOutcome = {};
    for (const dispute of disputes) {
      byState[dispute.state] = (byState[dispute.state] || 0) + 1;
      if (dispute.outcome) byOutcome[dispute.outcome] = (byOutcome[dispute.outcome] || 0) + 1;
    }
    return { generatedAt: this.clock().toISOString(), total: disputes.length, quorum: this.quorum, byState, byOutcome };
  }
}

module.exports = { DisputeService, MemoryDisputeStore, MongoDisputeStore, OUTCOMES, HOUR_MS, resolveDisputeWithAI };
