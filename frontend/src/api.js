// frontend/src/api.js
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:10000';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function createRobot(robotData) {
  const res = await fetch(`${API_BASE}/api/robot/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(robotData),
  });
  return res.json();
}

export async function getRobotStatus(robotId) {
  const res = await fetch(`${API_BASE}/api/robot/status/${robotId}`);
  return res.json();
}

export async function getRewards({ userId, page = 1, limit = 10 } = {}) {
  const params = new URLSearchParams({ userId, limit: String(limit), page: String(page) });
  const res = await fetch(`${API_BASE}/api/rewards?${params}`);
  return res.json();
}

export default { fetchHealth, createRobot, getRobotStatus, getRewards };
