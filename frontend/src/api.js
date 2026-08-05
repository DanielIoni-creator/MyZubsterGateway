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

// Social Robot API - Merchant Post Generation
export async function generateSocialPost(storeId) {
  const res = await fetch(`${API_BASE}/api/robot/social/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storeId }),
  });
  return res.json();
}

export async function getMerchantPosts() {
  const res = await fetch(`${API_BASE}/api/robot/merchant/posts`);
  return res.json();
}

export async function getMerchantProfile() {
  const res = await fetch(`${API_BASE}/api/robot/merchant/profile`);
  return res.json();
}

export async function createMerchant(merchantData) {
  const res = await fetch(`${API_BASE}/api/robot/merchant/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(merchantData),
  });
  return res.json();
}

export async function approvePost(postId) {
  const res = await fetch(`${API_BASE}/api/robot/social/posts/${postId}/approve`, {
    method: 'PATCH',
  });
  return res.json();
}

export async function rejectPost(postId) {
  const res = await fetch(`${API_BASE}/api/robot/social/posts/${postId}/reject`, {
    method: 'PATCH',
  });
  return res.json();
}

export default { fetchHealth, createRobot, getRobotStatus, generateSocialPost, getMerchantPosts, getMerchantProfile, createMerchant, approvePost, rejectPost };
