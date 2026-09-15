import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login if unauthorized
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  changePassword: (data) => api.put('/auth/change-password', data)
};

// Student API calls
export const studentAPI = {
  getDashboard: () => api.get('/student/dashboard')
};

// Warden API calls
export const wardenAPI = {
  getDashboard: () => api.get('/warden/dashboard')
};

// Outpass API calls (Module 6)
export const outpassAPI = {
  // Student
  create: (data) => api.post('/outpass', data),
  getMine: () => api.get('/outpass/my'),
  // Warden
  getPending: () => api.get('/outpass/pending'),
  getApproved: () => api.get('/outpass/approved'),
  getOverdue: () => api.get('/outpass/overdue'),
  getAll: () => api.get('/outpass/all'),
  // Shared
  getById: (id) => api.get(`/outpass/${id}`),
  // Warden actions
  approve: (id, data = {}) => api.put(`/outpass/${id}/approve`, data),
  reject: (id, wardenComment) => api.put(`/outpass/${id}/reject`, { wardenComment }),
  markReturned: (id) => api.put(`/outpass/${id}/return`)
};

export default api;
