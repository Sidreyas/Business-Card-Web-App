// Express.js server for Render deployment
// backend/server.js

const express = require('express');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Import route handlers
const uploadHandler = require('./routes/upload-db-express');
const entriesHandler = require('./routes/entries-express');
const { checkUsernameGet, checkUsernamePost } = require('./routes/check-username-express');
const updateEntryHandler = require('./routes/update-entry-express');
const initDbHandler = require('./routes/init-db-express');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration for production
const corsOptions = {
  origin: [
    'https://business-card-web-app.vercel.app', // New production URL
    'https://business-card-app-phi.vercel.app', // Old URL (for transition)
    'https://*.vercel.app', // Any Vercel deployments
    'http://localhost:3000', // For local development
    'http://localhost:3001', // Alternative local port
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With', 
    'Content-Type', 
    'Accept',
    'Authorization',
    'X-CSRF-Token',
    'X-Requested-With',
    'Accept-Version',
    'Content-Length',
    'Content-MD5',
    'Date',
    'X-Api-Version'
  ]
};

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

app.use(cors(corsOptions));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Business Card OCR API',
    version: '1.0.0'
  });
});

// API Routes
app.post('/api/upload-db', upload.single('image'), uploadHandler);
app.get('/api/entries', entriesHandler);
app.get('/api/check-username', checkUsernameGet);
app.post('/api/check-username', checkUsernamePost);
app.post('/api/update-entry', updateEntryHandler);
app.post('/api/init-db', initDbHandler);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'File too large. Maximum size is 20MB.',
        code: 'FILE_TOO_LARGE'
      });
    }
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Business Card OCR API server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 CORS enabled for: ${corsOptions.origin.join(', ')}`);
  console.log(`🗄️  Database URL configured: ${process.env.DATABASE_URL ? 'Yes' : 'No'}`);
});

module.exports = app;
