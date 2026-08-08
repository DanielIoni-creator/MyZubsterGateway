const Dispute = require('../models/disputeModel');
const { v4: uuidv4 } = require('uuid');

exports.createDispute = async (req, res) => {
  try {
    const { initiatorId, respondentId, escrowId, reason } = req.body;
    if (!initiatorId || !respondentId || !escrowId || !reason)
      return res.status(400).json({ error: 'initiatorId, respondentId, escrowId, and reason are required' });
    const d = new Dispute({
      disputeId: uuidv4().substring(0, 12),
      initiatorId, respondentId, escrowId, reason,
      status: 'open',
      mediationDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000)
    });
    await d.save();
    res.status(201).json({ message: 'Dispute opened', disputeId: d.disputeId, status: d.status, mediationDeadline: d.mediationDeadline });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getDispute = async (req, res) => {
  try {
    const d = await Dispute.findOne({ disputeId: req.params.disputeId });
    if (!d) return res.status(404).json({ error: 'Dispute not found' });
    d.checkAutoResolve();
    await d.save();
    res.json({
      disputeId: d.disputeId, initiatorId: d.initiatorId, respondentId: d.respondentId,
      escrowId: d.escrowId, reason: d.reason, status: d.status,
      initiatorEvidence: d.initiatorEvidence, respondentEvidence: d.respondentEvidence,
      voteCount: d.votes.length, resolution: d.resolution, resolvedBy: d.resolvedBy,
      createdAt: d.createdAt, mediationDeadline: d.mediationDeadline,
      votingDeadline: d.votingDeadline, resolvedAt: d.resolvedAt
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.submitEvidence = async (req, res) => {
  try {
    const { userId, evidence } = req.body;
    if (!userId || !evidence) return res.status(400).json({ error: 'userId and evidence are required' });
    const d = await Dispute.findOne({ disputeId: req.params.disputeId });
    if (!d) return res.status(404).json({ error: 'Dispute not found' });
    if (d.status !== 'open' && d.status !== 'mediation')
      return res.status(400).json({ error: `Cannot submit evidence in ${d.status} phase` });
    d.status = 'mediation';
    if (userId === d.initiatorId) d.initiatorEvidence = evidence;
    else if (userId === d.respondentId) d.respondentEvidence = evidence;
    else return res.status(403).json({ error: 'Not a party to this dispute' });
    d.checkAutoResolve();
    await d.save();
    res.json({ message: 'Evidence submitted', status: d.status, bothParties: !!(d.initiatorEvidence && d.respondentEvidence) });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.startVoting = async (req, res) => {
  try {
    const d = await Dispute.findOne({ disputeId: req.params.disputeId });
    if (!d) return res.status(404).json({ error: 'Dispute not found' });
    if (d.status !== 'mediation') return res.status(400).json({ error: 'Must be in mediation phase' });
    if (!d.initiatorEvidence || !d.respondentEvidence) return res.status(400).json({ error: 'Both parties must submit evidence' });
    d.status = 'voting';
    d.votingDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await d.save();
    res.json({ message: 'Voting phase started', votingDeadline: d.votingDeadline });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.castVote = async (req, res) => {
  try {
    const { voterId, vote } = req.body;
    if (!voterId || !['initiator', 'respondent'].includes(vote))
      return res.status(400).json({ error: 'voterId and vote (initiator/respondent) are required' });
    const d = await Dispute.findOne({ disputeId: req.params.disputeId });
    if (!d) return res.status(404).json({ error: 'Dispute not found' });
    if (d.status !== 'voting') return res.status(400).json({ error: 'Not in voting phase' });
    if (d.votes.find(v => v.voterId === voterId)) return res.status(400).json({ error: 'Already voted' });
    d.votes.push({ voterId, vote });
    if (d.votes.length >= 5) {
      const i = d.votes.filter(v => v.vote === 'initiator').length;
      const r = d.votes.filter(v => v.vote === 'respondent').length;
      if (Math.abs(i - r) > d.votes.length / 2) {
        d.status = 'resolved'; d.resolution = i > r ? 'initiator' : 'respondent';
        d.resolvedBy = 'vote'; d.resolvedAt = new Date();
      }
    }
    await d.save();
    res.json({ message: 'Vote cast', voteCount: d.votes.length, status: d.status, resolution: d.resolution });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.resolveDispute = async (req, res) => {
  try {
    const { resolution } = req.body;
    if (!['initiator', 'respondent'].includes(resolution))
      return res.status(400).json({ error: 'resolution (initiator/respondent) is required' });
    const d = await Dispute.findOne({ disputeId: req.params.disputeId });
    if (!d) return res.status(404).json({ error: 'Dispute not found' });
    if (d.status === 'resolved') return res.status(400).json({ error: 'Already resolved' });
    d.status = 'resolved'; d.resolution = resolution; d.resolvedBy = 'admin'; d.resolvedAt = new Date();
    await d.save();
    res.json({ message: 'Dispute resolved', resolution: d.resolution, resolvedBy: d.resolvedBy });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.listDisputes = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const disputes = await Dispute.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json({ count: disputes.length, disputes: disputes.map(d => ({
      disputeId: d.disputeId, status: d.status, reason: d.reason, createdAt: d.createdAt
    })) });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getStats = async (req, res) => {
  try {
    const total = await Dispute.countDocuments();
    const open = await Dispute.countDocuments({ status: 'open' });
    const mediation = await Dispute.countDocuments({ status: 'mediation' });
    const voting = await Dispute.countDocuments({ status: 'voting' });
    const resolved = await Dispute.countDocuments({ status: 'resolved' });
    res.json({ total, open, mediation, voting, resolved });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
