// tests/adminStats.test.js — verifies getStats logic with mocked models (no MongoDB needed)
const fakeStats = {
  totalUsers: 1234,
  totalOrders: 567,
  pendingOrders: 5,
  activeUsers: 89,
  recentOrders: [{ orderNumber: 'ORD-1' }],
  revenueAgg: [{ total: 12.34 }],
};

jest.mock('../models/User', () => ({
  countDocuments: (q) => Promise.resolve(q && q.lastLogin ? fakeStats.activeUsers : fakeStats.totalUsers),
}), { virtual: true });
jest.mock('../models/Order', () => ({
  countDocuments: (q) => Promise.resolve(q && q.status === 'pending' ? fakeStats.pendingOrders : fakeStats.totalOrders),
  find: () => ({ sort: () => ({ limit: () => ({ lean: () => Promise.resolve(fakeStats.recentOrders) }) }) }),
}), { virtual: true });
jest.mock('../models/Transaction', () => ({
  aggregate: () => Promise.resolve(fakeStats.revenueAgg),
}), { virtual: true });

const { getStats } = require('../controllers/adminController');

describe('getStats', () => {
  test('returns the required aggregate shape', async () => {
    const res = {};
    res.json = (payload) => { res._payload = payload; return res; };
    res.status = () => res;
    await getStats({}, res);
    expect(res._payload.totalUsers).toBe(1234);
    expect(res._payload.totalOrders).toBe(567);
    expect(res._payload.totalRevenue).toBe(12.34);
    expect(res._payload.pendingOrders).toBe(5);
    expect(res._payload.activeUsersLast24h).toBe(89);
    expect(Array.isArray(res._payload.recentOrders)).toBe(true);
  });

  test('returns 0 revenue when no confirmed transactions', async () => {
    fakeStats.revenueAgg = [];
    const res = {};
    res.json = (p) => { res._payload = p; return res; };
    res.status = () => res;
    await getStats({}, res);
    expect(res._payload.totalRevenue).toBe(0);
  });
});
