// API Configuration
// /src/config/api.js

export const API_CONFIG = {
  BASE_URL: process.env.NODE_ENV === 'production' 
    ? 'https://your-backend-app.onrender.com/api'  // Replace with your Render backend URL
    : 'http://localhost:5000/api', // For local development with Express server
  TIMEOUT: 60000, // 60 seconds for OCR processing
};

// Helper function to get full API URL
export const getApiUrl = (endpoint) => {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_CONFIG.BASE_URL}/${cleanEndpoint}`;
};

export default API_CONFIG;
