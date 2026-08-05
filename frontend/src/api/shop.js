/**
 * Shop API module for MyZubster merchant interface
 * Handles merchant onboarding, shop data, and social robot post generation
 */
import api from '../utils/axiosConfig';

const SHOP_BASE = '/api/merchant';

/**
 * Save or update shop profile
 */
export const saveShopProfile = (shopData) => api.post(`${SHOP_BASE}/profile`, shopData);

/**
 * Get shop profile for current user
 */
export const getShopProfile = () => api.get(`${SHOP_BASE}/profile`);

/**
 * Upload shop logo/photo
 * @param {FormData} formData - multipart form with image file
 */
export const uploadShopPhoto = (formData) => api.post(`${SHOP_BASE}/photos`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});

/**
 * Get all uploaded photos for the shop
 */
export const getShopPhotos = () => api.get(`${SHOP_BASE}/photos`);

/**
 * Generate a social media post via the robot API
 * @param {Object} postData - { content, imageIds, platform }
 */
export const generatePost = (postData) => api.post(`${SHOP_BASE}/posts/generate`, postData);

/**
 * Get post history for the shop
 */
export const getPostHistory = () => api.get(`${SHOP_BASE}/posts`);

/**
 * Approve a generated post for publishing
 * @param {string} postId
 */
export const approvePost = (postId) => api.patch(`${SHOP_BASE}/posts/${postId}/approve`);

/**
 * Delete a post
 * @param {string} postId
 */
export const deletePost = (postId) => api.delete(`${SHOP_BASE}/posts/${postId}`);

/**
 * Check if shop exists (onboarding status)
 */
export const getShopStatus = () => api.get(`${SHOP_BASE}/status`);