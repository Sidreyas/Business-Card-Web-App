// Database initialization route for Express
// backend/routes/init-db-express.js

const { testConnection, initializeTables } = require('../lib/database');

async function initDbHandler(req, res) {
  try {
    console.log('Testing database connection...');
    const connectionTest = await testConnection();
    
    if (!connectionTest) {
      return res.status(500).json({
        success: false,
        error: 'Database connection failed',
        timestamp: new Date().toISOString()
      });
    }

    console.log('Initializing database tables...');
    const initialized = await initializeTables();
    
    if (!initialized) {
      return res.status(500).json({
        success: false,
        error: 'Database initialization failed',
        timestamp: new Date().toISOString()
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Database initialized successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Database initialization error:', error);
    return res.status(500).json({
      error: 'Database initialization failed',
      details: error.message,
      success: false
    });
  }
}

module.exports = initDbHandler;
