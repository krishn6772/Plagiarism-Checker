import axios from 'axios';

// Use environment variable for flexibility between dev and prod
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for CORS with credentials
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
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

// Handle 401 errors (unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const register = (userData) => api.post('/auth/register', userData);
export const login = (credentials) => api.post('/auth/login', credentials);
export const getMe = () => api.get('/auth/me');

// Plagiarism APIs
export const checkPlagiarism = (data) => api.post('/plagiarism/check', data);
export const uploadFiles = (formData) => {
  return api.post('/plagiarism/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};
export const checkGoogleOnly = (data) => api.post('/plagiarism/check-google-only', data);

// File History Check API
export const checkFileHistory = (formData) => {
  return api.post('/files/check-file-history', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// History APIs
export const getMyHistory = () => api.get('/history/my-history');
export const getAllHistory = () => api.get('/history/all');
export const deleteHistory = (historyId) => api.delete(`/history/${historyId}`);
export const clearMyHistory = () => api.delete('/history/clear/my-history');

// History Search APIs
export const searchInHistory = (data) => api.post('/history/search-history', data);
export const searchInAllHistory = (data) => api.post('/history/search-all-history', data);

// Admin APIs
export const getAllUsers = () => api.get('/admin/users');
export const deleteUser = (userId) => api.delete(`/admin/users/${userId}`);
export const toggleAdminStatus = (userId) => api.patch(`/admin/users/${userId}/toggle-admin`);
export const getStats = () => api.get('/admin/stats');

export default api;
export { API_BASE_URL };