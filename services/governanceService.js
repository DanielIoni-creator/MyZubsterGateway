const Proposal = require('../models/Proposal');
const Vote = require('../models/Vote');
const TokenHolding = require('../models/TokenHolding');

const createProposal = async (proposerId, title, description, category, votingDays = 7) => {
  const now = new Date();
  const votingEnd = new Date(now.getTime() + votingDays * 24 * 60 * 60 * 1000);

  const proposal = new Proposal({
    title,
    description,
    proposer: proposerId,
    category: category || 'other',
    votingStart: now,
    votingEnd,
    status: 'active',
  });

  await proposal.save();
  return proposal;
};

const voteOnProposal = async (proposalId, voterId, vote) => {
  const proposal = await Proposal.findById(proposalId);
  if (!proposal) throw new Error('Proposta non trovata');
  if (proposal.status !== 'active') throw new Error('Proposta non attiva');
  if (new Date() > proposal.votingEnd) throw new Error('Votazione terminata');

  const holdings = await TokenHolding.find({ user: voterId });
  const totalTokens = holdings.reduce((sum, h) => sum + h.amount, 0);
  if (totalTokens < 1) throw new Error('Devi possedere almeno 1 token per votare');

  const existingVote = await Vote.findOne({ proposal: proposalId, voter: voterId });
  if (existingVote) throw new Error('Hai già votato');

  const newVote = new Vote({
    proposal: proposalId,
    voter: voterId,
    vote,
    votingPower: totalTokens,
  });
  await newVote.save();

  if (vote === 'for') proposal.forVotes += totalTokens;
  else if (vote === 'against') proposal.againstVotes += totalTokens;
  else if (vote === 'abstain') proposal.abstainVotes += totalTokens;
  proposal.totalVotes += totalTokens;
  await proposal.save();

  return newVote;
};

const getActiveProposals = async () => {
  const proposals = await Proposal.find({
    status: 'active',
    votingEnd: { $gt: new Date() },
  }).populate('proposer', 'username email').sort({ createdAt: -1 });
  return proposals;
};

const getProposalHistory = async (limit = 20) => {
  const proposals = await Proposal.find()
    .populate('proposer', 'username email')
    .sort({ createdAt: -1 })
    .limit(limit);
  return proposals;
};

const getUserVote = async (proposalId, userId) => {
  const vote = await Vote.findOne({ proposal: proposalId, voter: userId });
  return vote;
};

module.exports = {
  createProposal,
  voteOnProposal,
  getActiveProposals,
  getProposalHistory,
  getUserVote,
};
