import api from '../utils/axiosConfig';
import { seedBounties, findSeedBounty } from '../data/bounties';

// Bounty API with local-data fallback so the Bounty Board works standalone
// even when the backend endpoint is not mounted yet.

const normalize = (b) => ({
  _id: b._id || b.id,
  issueId: b.issueId,
  title: b.title || b.issueId,
  description: b.description || '',
  reward: b.rewardMYZ ?? b.reward ?? 0,
  status: b.status || 'open',
  level: b.level || 'intermediate',
  labels: b.labels || [],
  deadline: b.deadline,
  acceptanceCriteria: b.acceptanceCriteria || [],
  ...b,
});

export const getBounties = async (params = {}) => {
  try {
    const response = await api.get('/bounty/list');
    const data = response.data?.data || response.data;
    if (Array.isArray(data) && data.length > 0) {
      return { data: data.map(normalize) };
    }
    // Backend mounted but empty -> fall back to seed data
    return { data: seedBounties.map(normalize) };
  } catch (err) {
    // Backend unavailable -> fall back to seed data
    return { data: seedBounties.map(normalize) };
  }
};

export const getBounty = async (id) => {
  try {
    const response = await api.get(`/bounty/list`);
    const data = response.data?.data || response.data;
    if (Array.isArray(data) && data.length > 0) {
      const found = data
        .map(normalize)
        .find((b) => b._id === id || b.issueId === Number(id));
      if (found) return { data: found };
    }
  } catch (err) {
    // fall through to seed
  }
  const seed = findSeedBounty(id);
  if (seed) return { data: normalize(seed) };
  throw new Error('Bounty non trovato');
};

export const claimBounty = async (id) => {
  try {
    const response = await api.post('/bounty/assign', { issueId: id });
    return { data: normalize(response.data?.data || response.data) };
  } catch (err) {
    // Local claim simulation on seed data
    const seed = findSeedBounty(id);
    if (!seed) throw err;
    const claimed = { ...seed, status: 'claimed' };
    return { data: normalize(claimed) };
  }
};

export const getBountyAnalytics = async () => {
  try {
    const response = await api.get('/bounty/list');
    const data = response.data?.data || response.data;
    if (Array.isArray(data) && data.length > 0) {
      return { data: computeAnalytics(data.map(normalize)) };
    }
  } catch (err) {
    // fall through
  }
  return { data: computeAnalytics(seedBounties.map(normalize)) };
};

const computeAnalytics = (bounties) => ({
  total: bounties.length,
  open: bounties.filter((b) => b.status === 'open').length,
  claimed: bounties.filter((b) => b.status === 'claimed').length,
  completed: bounties.filter((b) => b.status === 'completed').length,
  closed: bounties.filter((b) => b.status === 'closed').length,
  totalReward: bounties.reduce((acc, b) => acc + (b.reward || 0), 0),
});