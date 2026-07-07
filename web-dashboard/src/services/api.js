const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1';

class ApiService {
  constructor() {
    this.baseUrl = API_URL;
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }
    return data;
  }

  getBookings(userId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/bookings/history/${userId}?${query}`);
  }

  createBooking(data) {
    return this.request('/bookings', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  updateBookingStatus(id, status) {
    return this.request(`/bookings/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  getBooking(id) {
    return this.request(`/bookings/${id}`);
  }

  getSkills(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/skills?${query}`);
  }

  createSkill(data) {
    return this.request('/skills', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  register(data) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  logout() {
    this.token = null;
    localStorage.removeItem('token');
  }
}

export default new ApiService();