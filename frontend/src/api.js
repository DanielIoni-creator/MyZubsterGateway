// frontend/src/api.js
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:10000';

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

// Aggiungi qui altre funzioni per:
// - bounty, stake, rewards, escrow, animal rescue, logo, code, ecc.
export default { fetchHealth, createRobot, getRobotStatus };
