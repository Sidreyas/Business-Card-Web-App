// API service for business card operations
// /src/services/api.js

import axios from 'axios';

// Configuration
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-vercel-app.vercel.app/api'  // Replace with your Vercel URL
  : 'http://localhost:3000/api'; // For local development with Vercel dev

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Business Card API functions
export const businessCardAPI = {
  
  // Initialize database (run once)
  async initializeDatabase() {
    try {
      const response = await api.post('/init-db');
      return response.data;
    } catch (error) {
      throw new Error(`Database initialization failed: ${error.response?.data?.details || error.message}`);
    }
  },

  // Upload and process business card
  async uploadBusinessCard(imageFile, userName, comment = '') {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('userName', userName);
      formData.append('comment', comment);

      const response = await api.post('/upload-db', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // Longer timeout for OCR processing
      });

      return response.data;
    } catch (error) {
      throw new Error(`Upload failed: ${error.response?.data?.details || error.message}`);
    }
  },

  // Get business card entries for a user
  async getEntries(userName, options = {}) {
    try {
      const params = {
        userName,
        limit: options.limit || 50,
        offset: options.offset || 0,
        includeStats: options.includeStats || false
      };

      const response = await api.get('/entries', { params });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get entries: ${error.response?.data?.details || error.message}`);
    }
  },

  // Get all entries (admin view)
  async getAllEntries(options = {}) {
    try {
      const params = {
        limit: options.limit || 100,
        offset: options.offset || 0
      };

      const response = await api.get('/entries', { params });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get all entries: ${error.response?.data?.details || error.message}`);
    }
  },

  // Health check
  async healthCheck() {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  }
};

// Legacy support for direct axios calls
export default api;
