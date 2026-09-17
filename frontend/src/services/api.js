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
  getDashboard: () => api.get('/student/dashboard'),
  getProfile: () => api.get('/student/profile'),
  updateProfile: (data) => api.put('/student/profile', data),
  getRoom: () => api.get('/student/room'),
  getComplaints: (params) => api.get('/student/complaints', { params }),
  createComplaint: (data) => api.post('/student/complaints', data),
  getComplaintById: (id) => api.get(`/student/complaints/${id}`)
};

// Warden API calls
export const wardenAPI = {
  getDashboard: () => api.get('/warden/dashboard'),
  getComplaints: (params) => api.get('/warden/complaints', { params }),
  getComplaintById: (id) => api.get(`/warden/complaints/${id}`),
  updateComplaint: (id, data) => api.put(`/warden/complaints/${id}`, data),
  getComplaintStats: () => api.get('/warden/complaints/stats'),
  // Students
  getStudents: (params) => api.get('/warden/students', { params }),
  getStudentById: (id) => api.get(`/warden/students/${id}`),
  deleteStudent: (id) => api.delete(`/warden/students/${id}`)
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

// Room Allocation API calls (Warden/Admin)
export const roomAPI = {
  getRooms: () => api.get('/rooms'),
  getRoom: (id) => api.get(`/rooms/${id}`),
  searchStudents: (q) => api.get('/rooms/students/search', { params: { q } }),
  getAllocations: (status) => api.get('/rooms/allocations', { params: status ? { status } : {} }),
  allocateBed: (data) => api.post('/rooms/allocate', data),
  vacateAllocation: (id) => api.put(`/rooms/allocations/${id}/vacate`)
};

// Notifications API calls (shared by both roles; each user sees only their own)
export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all')
};

// Fees & Payments API calls
export const feeAPI = {
  // Student
  getMyFees: () => api.get('/fees/my'),
  getMyPayments: () => api.get('/fees/my/payments'),
  // studentId is never sent; the backend derives it from the auth token
  makePayment: (feeId, data) => api.post(`/fees/${feeId}/payments`, data),

  // Warden
  getAllFees: () => api.get('/fees'),
  createFee: (data) => api.post('/fees', data),
  getFee: (id) => api.get(`/fees/${id}`),
  updateFee: (id, data) => api.put(`/fees/${id}`, data),
  deleteFee: (id) => api.delete(`/fees/${id}`),
  getAllPayments: () => api.get('/fees/payments'),
  getPayment: (id) => api.get(`/fees/payments/${id}`),
  getSummary: () => api.get('/fees/summary'),
  getStudents: () => api.get('/fees/students')
};

export default api;
