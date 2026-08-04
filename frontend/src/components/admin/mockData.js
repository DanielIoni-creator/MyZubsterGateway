// Mock data for the MyZubsterGateway Admin Dashboard prototype.
// Real endpoints (e.g. /api/users, /api/orders) can replace these later.

export const stats = [
  { id: 'users', label: 'Total Users', value: '12,480', delta: '+8.2%', trend: 'up', accent: 'violet' },
  { id: 'orders', label: 'Orders (30d)', value: '3,217', delta: '+12.5%', trend: 'up', accent: 'emerald' },
  { id: 'bounties', label: 'Open Bounties', value: '184', delta: '-3.1%', trend: 'down', accent: 'amber' },
  { id: 'volume', label: 'XMR Volume', value: '1,204.6', delta: '+21.0%', trend: 'up', accent: 'sky' },
];

export const users = [
  { id: 1, name: 'Aria Bellini', email: 'aria@zubster.io', role: 'Admin', status: 'active', joined: '2026-02-14', garden: 'Orto Sul' },
  { id: 2, name: 'Kenji Sato', email: 'kenji@zubster.io', role: 'Moderator', status: 'active', joined: '2026-03-02', garden: 'Kyoto Greens' },
  { id: 3, name: 'Luca Romano', email: 'luca@zubster.io', role: 'User', status: 'active', joined: '2026-04-21', garden: 'Lago Verde' },
  { id: 4, name: 'Mara Kovac', email: 'mara@zubster.io', role: 'User', status: 'pending', joined: '2026-05-09', garden: '—' },
  { id: 5, name: 'Diego Ferri', email: 'diego@zubster.io', role: 'User', status: 'suspended', joined: '2026-01-30', garden: 'Collina' },
  { id: 6, name: 'Sofia Marchetti', email: 'sofia@zubster.io', role: 'User', status: 'active', joined: '2026-06-11', garden: 'Rosa Garden' },
  { id: 7, name: 'Tomas Novak', email: 'tomas@zubster.io', role: 'Moderator', status: 'active', joined: '2026-02-28', garden: 'Praha Plot' },
  { id: 8, name: 'Yuki Tanaka', email: 'yuki@zubster.io', role: 'User', status: 'active', joined: '2026-07-04', garden: 'Sakura' },
];

export const orders = [
  { id: 'ORD-9041', customer: 'Aria Bellini', amount: '42.50', status: 'paid', date: '2026-08-03', items: 3 },
  { id: 'ORD-9040', customer: 'Luca Romano', amount: '18.00', status: 'pending', date: '2026-08-03', items: 1 },
  { id: 'ORD-9039', customer: 'Sofia Marchetti', amount: '76.20', status: 'paid', date: '2026-08-02', items: 5 },
  { id: 'ORD-9038', customer: 'Tomas Novak', amount: '9.90', status: 'refunded', date: '2026-08-02', items: 1 },
  { id: 'ORD-9037', customer: 'Kenji Sato', amount: '130.00', status: 'paid', date: '2026-08-01', items: 8 },
  { id: 'ORD-9036', customer: 'Yuki Tanaka', amount: '24.75', status: 'paid', date: '2026-08-01', items: 2 },
  { id: 'ORD-9035', customer: 'Diego Ferri', amount: '55.40', status: 'failed', date: '2026-07-31', items: 4 },
  { id: 'ORD-9034', customer: 'Mara Kovac', amount: '12.00', status: 'pending', date: '2026-07-31', items: 1 },
];

export const bounties = [
  { id: 'B-201', title: 'Garden Activity Feed', reward: 'FREE', status: 'open', type: 'feature', claimed: false },
  { id: 'B-199', title: 'Admin Dashboard UI', reward: 'FREE', status: 'in-review', type: 'ui/ux', claimed: true },
  { id: 'B-187', title: 'Monero payout retries', reward: '$120', status: 'open', type: 'backend', claimed: false },
  { id: 'B-176', title: 'Mobile onboarding polish', reward: '$80', status: 'claimed', type: 'mobile', claimed: true },
  { id: 'B-165', title: 'i18n: IT + JA locales', reward: '$60', status: 'open', type: 'i18n', claimed: false },
  { id: 'B-150', title: 'Docs: deploy guide', reward: 'FREE', status: 'done', type: 'docs', claimed: true },
];

export const logs = [
  { id: 1, time: '2026-08-04 09:14:02', level: 'info', source: 'auth', message: 'User aria@zubster.io logged in from 84.22.x.x' },
  { id: 2, time: '2026-08-04 09:11:47', level: 'warn', source: 'payments', message: 'Monero payout to wallet ...3fA2 delayed (mempool congestion)' },
  { id: 3, time: '2026-08-04 09:08:19', level: 'error', source: 'orders', message: 'Order ORD-9035 payment failed: insufficient confirmations' },
  { id: 4, time: '2026-08-04 08:55:10', level: 'info', source: 'plants', message: 'Plant registry sync completed: 1,204 records' },
  { id: 5, time: '2026-08-04 08:40:33', level: 'debug', source: 'gateway', message: 'Health check OK (uptime 14h 22m)' },
  { id: 6, time: '2026-08-04 08:31:02', level: 'warn', source: 'auth', message: '3 failed login attempts for mara@zubster.io' },
  { id: 7, time: '2026-08-04 08:12:55', level: 'info', source: 'bounties', message: 'Bounty B-176 marked claimed by contributor' },
  { id: 8, time: '2026-08-04 07:58:41', level: 'error', source: 'webhook', message: 'Outbound webhook to endpoint /v1/notify timed out (5000ms)' },
  { id: 9, time: '2026-08-04 07:44:09', level: 'info', source: 'plants', message: 'New plant "Tomato Roma" registered in Orto Sul' },
  { id: 10, time: '2026-08-04 07:30:00', level: 'debug', source: 'gateway', message: 'Cache warmed: 312 keys' },
];

export const recentActivity = [
  { id: 1, user: 'Luca Romano', action: 'added a plant', target: 'Basilico Genovese', time: '2m ago', type: 'plant' },
  { id: 2, user: 'Sofia Marchetti', action: 'harvested', target: 'Rosa Garden', time: '14m ago', type: 'harvest' },
  { id: 3, user: 'Kenji Sato', action: 'updated', target: 'Kyoto Greens', time: '38m ago', type: 'update' },
  { id: 4, user: 'Yuki Tanaka', action: 'commented on', target: 'Sakura', time: '1h ago', type: 'comment' },
  { id: 5, user: 'Aria Bellini', action: 'added a plant', target: 'Lavanda', time: '2h ago', type: 'plant' },
];

export const navItems = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'orders', label: 'Orders' },
  { id: 'bounties', label: 'Bounties' },
  { id: 'logs', label: 'System Logs' },
  { id: 'settings', label: 'Settings' },
];
