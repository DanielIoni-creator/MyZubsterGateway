import api from '../utils/axiosConfig';

export const register = (userData) => api.post('/auth/register', userData);
export const login = (credentials) => api.post('/auth/login', credentials);
export const getProfile = () => api.get('/auth/profile');
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};
