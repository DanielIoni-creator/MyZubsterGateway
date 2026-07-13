// src/services/api.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Crea istanza axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor per il token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ========== AUTH ==========
export const register = (email, password, name) => 
  api.post('/auth/register', { email, password, name });

export const login = (email, password) => 
  api.post('/auth/login', { email, password });

export const getProfile = () => 
  api.get('/auth/profile');

// ========== ORDERS ==========
export const createOrder = (items, total, currency = 'XMR') => 
  api.post('/orders', { items, total, currency });

export const getOrders = () => 
  api.get('/orders/user/me');

export const getOrder = (orderId) => 
  api.get(`/orders/${orderId}`);

export const cancelOrder = (orderId) => 
  api.put(`/orders/${orderId}/cancel`);

// ========== PAYMENTS ==========
export const startPayment = (orderId, amount) => 
  api.post(`/orders/${orderId}/pay`, { amount });

export const getPaymentStatus = (paymentId) => 
  api.get(`/orders/payments/${paymentId}/status`);

export default api;