// Real API endpoints for MyZubsterGateway, extracted from the backend route
// modules in /routes and /core-backend. Mount prefixes follow the
// `/api/<module>` convention (confirmed against routes/auth.js, users.js,
// orders.js, bounties.js, garden.js, payments.js, admin.js).
//
// This file is the single source of truth for the API Documentation UI.
// Add/edit endpoints here and the docs page updates automatically.

export const API_BASE = 'https://gateway.myzubster.example';

// Group ordering / display labels for the sidebar nav.
export const groups = [
  { key: 'Authentication', label: 'Authentication' },
  { key: 'Users', label: 'Users' },
  { key: 'Orders', label: 'Orders' },
  { key: 'Bounties', label: 'Bounties' },
  { key: 'Garden', label: 'Garden' },
  { key: 'Payments', label: 'Payments' },
  { key: 'Admin', label: 'Admin' },
];

// Each endpoint: group, method, path, description, and an optional `sample`
// request body (omitted for GET/DELETE). Examples for curl/JS/Python are
// generated in the UI from these fields.
export const apiEndpoints = [
  // ---------------- Authentication ----------------
  {
    id: 'auth-register',
    group: 'Authentication',
    method: 'POST',
    path: '/api/auth/register',
    description: 'Register a new user account and receive an authentication token.',
    sample: { username: 'satoshi', email: 'satoshi@example.com', password: 'sup3rs3cret' },
  },
  {
    id: 'auth-login',
    group: 'Authentication',
    method: 'POST',
    path: '/api/auth/login',
    description: 'Authenticate with email and password, returns a JWT bearer token.',
    sample: { email: 'satoshi@example.com', password: 'sup3rs3cret' },
  },

  // ---------------- Users ----------------
  {
    id: 'users-list',
    group: 'Users',
    method: 'GET',
    path: '/api/users',
    description: 'List users. Requires authentication.',
    auth: true,
  },
  {
    id: 'users-get',
    group: 'Users',
    method: 'GET',
    path: '/api/users/:id',
    description: 'Get a single user profile by id.',
    auth: true,
  },
  {
    id: 'users-update',
    group: 'Users',
    method: 'PATCH',
    path: '/api/users/:id',
    description: 'Update the authenticated user\'s profile fields.',
    auth: true,
    sample: { displayName: 'Satoshi N.', bio: 'Building the garden economy.' },
  },

  // ---------------- Orders ----------------
  {
    id: 'orders-list',
    group: 'Orders',
    method: 'GET',
    path: '/api/orders',
    description: 'List orders for the authenticated user.',
    auth: true,
  },
  {
    id: 'orders-create',
    group: 'Orders',
    method: 'POST',
    path: '/api/orders',
    description: 'Create a new order for a skill or offer.',
    auth: true,
    sample: { skillId: 'skill_8f2', title: 'Smart-contract review', budget: 250, currency: 'XMR' },
  },
  {
    id: 'orders-get',
    group: 'Orders',
    method: 'GET',
    path: '/api/orders/:id',
    description: 'Get a single order by id.',
    auth: true,
  },
  {
    id: 'orders-status',
    group: 'Orders',
    method: 'PATCH',
    path: '/api/orders/:id/status',
    description: 'Update the status of an order (e.g. completed, cancelled).',
    auth: true,
    sample: { status: 'completed' },
  },

  // ---------------- Bounties ----------------
  {
    id: 'bounties-webhook',
    group: 'Bounties',
    method: 'POST',
    path: '/api/bounties/webhook',
    description: 'Receive bounty platform webhook events (issue opened/closed, payouts).',
    sample: { event: 'issue.opened', issueNumber: 147, repository: 'MyZubsterGateway' },
  },
  {
    id: 'bounties-status',
    group: 'Bounties',
    method: 'GET',
    path: '/api/bounties/status/:issueNumber',
    description: 'Get the current status and reward state of a bounty issue.',
    sample: null,
  },
  {
    id: 'bounties-update',
    group: 'Bounties',
    method: 'PUT',
    path: '/api/bounties/:issueNumber',
    description: 'Update a bounty issue assignment or lifecycle state.',
    sample: { status: 'in_review', assignedTo: 'foxxx009' },
  },

  // ---------------- Garden ----------------
  {
    id: 'garden-data',
    group: 'Garden',
    method: 'POST',
    path: '/api/garden/data',
    description: 'Submit garden / plant telemetry data point.',
    auth: true,
    sample: { gardenId: 'g_12', plantId: 'p_77', action: 'watered', value: 1.2 },
  },
  {
    id: 'garden-stats',
    group: 'Garden',
    method: 'GET',
    path: '/api/garden/:id/stats',
    description: 'Get aggregate stats for a garden by id.',
    auth: true,
  },
  {
    id: 'garden-activity',
    group: 'Garden',
    method: 'GET',
    path: '/api/garden/activity',
    description: 'List recent garden activity feed entries, filterable by garden, plantType and activityType.',
    auth: true,
  },
  {
    id: 'garden-activity-stream',
    group: 'Garden',
    method: 'GET',
    path: '/api/garden/activity/stream',
    description: 'Server-Sent Events stream of live garden activity (text/event-stream).',
    auth: true,
  },
  {
    id: 'garden-filters',
    group: 'Garden',
    method: 'GET',
    path: '/api/garden/filters',
    description: 'Get the available filter values (gardens, plant types, activity types) for the activity feed.',
    auth: true,
  },

  // ---------------- Payments ----------------
  {
    id: 'payments-create-order',
    group: 'Payments',
    method: 'POST',
    path: '/api/payments/create-order',
    description: 'Create a Monero payment order and return the subaddress to pay to.',
    sample: { amount: 0.5, currency: 'XMR', description: 'Bounty payout #147' },
  },
  {
    id: 'payments-status',
    group: 'Payments',
    method: 'GET',
    path: '/api/payments/status/:orderId',
    description: 'Check the status of a payment order by id.',
    sample: null,
  },
  {
    id: 'payments-balance',
    group: 'Payments',
    method: 'POST',
    path: '/api/payments/check-balance',
    description: 'Check the balance of a Monero wallet address.',
    sample: { address: '44kLzNXHV9EDxHN948HsvhhEQpQY6iyE6LfgCbFz463JM1bpz3UtWwUTPuQJ25nMzuQmfjYiDcqYvN9uYkTp3v5J2E1hisp' },
  },

  // ---------------- Admin ----------------
  {
    id: 'admin-dashboard',
    group: 'Admin',
    method: 'GET',
    path: '/api/admin/dashboard',
    description: 'Aggregated admin dashboard metrics. Requires admin role.',
    auth: true,
    admin: true,
  },
  {
    id: 'admin-users',
    group: 'Admin',
    method: 'GET',
    path: '/api/admin/users',
    description: 'List all users (admin view). Requires admin role.',
    auth: true,
    admin: true,
  },
  {
    id: 'admin-settings',
    group: 'Admin',
    method: 'GET',
    path: '/api/admin/settings',
    description: 'Read current gateway system settings. Requires admin role.',
    auth: true,
    admin: true,
  },
];
