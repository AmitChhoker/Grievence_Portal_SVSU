// Frontend Configuration
import axios from 'axios';

export const API_BASE = 'http://localhost:5000';

export const API_ENDPOINTS = {
    // Authentication
    STUDENT_REGISTER: '/api/auth/register/student',
    TEACHER_REGISTER: '/api/auth/register/teacher',
    HOD_REGISTER: '/api/auth/register/hod',
    DEAN_REGISTER: '/api/auth/register/dean',
    STUDENT_LOGIN: '/api/auth/login',
    TEACHER_LOGIN: '/api/auth/login/teacher',
    HOD_LOGIN: '/api/auth/login/hod',
    DEAN_LOGIN: '/api/auth/login/dean',
    
    // Complaints
    FILE_COMPLAINT: '/api/complaints/file-complaint',
    MY_COMPLAINTS: '/api/complaints/my-complaints',
    PUBLIC_COMPLAINTS: '/api/complaints/public-complaints',
    TEACHER_COMPLAINTS: '/api/complaints/teacher-complaints',
    HOD_COMPLAINTS: '/api/complaints/hod-complaints',
    DEAN_COMPLAINTS: '/api/complaints/dean-complaints',
    UPDATE_STATUS: '/api/complaints/update-status',
    SHARE_NEXT: '/api/complaints/share-next',
    LIKE_COMPLAINT: '/api/complaints/like',
    STUDENT_STATS: '/api/complaints/student-stats',
    TEACHER_STATS: '/api/complaints/teacher-stats',
    
    // Password Update
    UPDATE_PASSWORD_TEACHER: '/api/auth/update-password/teacher',
    UPDATE_PASSWORD_HOD: '/api/auth/update-password/hod',
    UPDATE_PASSWORD_DEAN: '/api/auth/update-password/dean',
    
    // Common
    GET_TEACHERS: '/api/auth/teachers',
    GET_HODS: '/api/auth/hods',
    GET_DEANS: '/api/auth/deans',
    GET_STUDENTS: '/api/auth/students',
    DASHBOARD_STATS: '/api/auth/dashboard-stats',
    VERIFY_TOKEN: '/api/auth/verify-token',
    HEALTH: '/api/health',
    TEST: '/api/test'
};

// Test backend connection
export const checkBackendConnection = async () => {
  try {
    console.log('Testing connection to:', `${API_BASE}/api/health`);
    const response = await axios.get(`${API_BASE}/api/health`);
    console.log('✅ Backend connection successful:', response.data);
    return { connected: true, data: response.data };
  } catch (error) {
    console.error('❌ Backend connection failed:', error.message);
    return { 
      connected: false, 
      error: error.message,
      suggestion: 'Make sure backend server is running on port 5000'
    };
  }
};

// Axios default configuration
axios.defaults.baseURL = API_BASE;

// CRITICAL FIX: Use localStorage consistently across all components
export const setAuthToken = (token) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    // Use localStorage consistently
    localStorage.setItem('token', token);
  } else {
    delete axios.defaults.headers.common['Authorization'];
    localStorage.removeItem('token');
  }
};

// Get stored token from localStorage
export const getStoredToken = () => {
  return localStorage.getItem('token');
};

// Get stored user data based on role
export const getStoredUser = () => {
  if (localStorage.getItem('user')) {
    return JSON.parse(localStorage.getItem('user'));
  } else if (localStorage.getItem('teacher')) {
    return JSON.parse(localStorage.getItem('teacher'));
  } else if (localStorage.getItem('hod')) {
    return JSON.parse(localStorage.getItem('hod'));
  } else if (localStorage.getItem('dean')) {
    return JSON.parse(localStorage.getItem('dean'));
  }
  return null;
};

// Initialize auth token from localStorage on app start
export const initializeAuth = () => {
  const token = getStoredToken();
  if (token) {
    setAuthToken(token);
  }
};

// Enhanced response interceptor to handle token expiration
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.log('🛑 Token expired or invalid, logging out...');
      
      // Clear all storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('teacher');
      localStorage.removeItem('hod');
      localStorage.removeItem('dean');
      
      // Remove axios header
      delete axios.defaults.headers.common['Authorization'];
      
      // Get current path to redirect to appropriate login
      const currentPath = window.location.pathname;
      let loginPath = '/login';
      
      if (currentPath.includes('teacher')) loginPath = '/teacher-login';
      else if (currentPath.includes('hod')) loginPath = '/hod-login';
      else if (currentPath.includes('dean')) loginPath = '/dean-login';
      
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('login')) {
        window.location.href = loginPath;
      }
    }
    return Promise.reject(error);
  }
);

// Enhanced storage event listener to handle multiple tabs
window.addEventListener('storage', (event) => {
  if (event.key === 'token' && event.newValue === null) {
    // Another tab logged out, clear current tab's auth
    console.log('🔔 Another tab logged out, clearing auth in current tab...');
    delete axios.defaults.headers.common['Authorization'];
  }
});

// Initialize auth when module is loaded
initializeAuth();