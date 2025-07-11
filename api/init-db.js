// Database initialization and migration API
// /api/init-db.js

const { query, testConnection } = require('./lib/database');
const { readFile } = require('fs/promises');
const path = require('path');

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST to initialize database.' });
  }

  try {
    // Test database connection first
    console.log('Testing database connection...');
    const connectionTest = await testConnection();
    
    if (!connectionTest) {
      return res.status(500).json({
        success: false,
        error: 'Database connection failed',
        timestamp: new Date().toISOString()
      });
    }

    // Create users table
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        total_cards INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create business_card_entries table
    const createBusinessCardEntriesTable = `
      CREATE TABLE IF NOT EXISTS business_card_entries (
        id SERIAL PRIMARY KEY,
        user_name VARCHAR(255) NOT NULL,
        ocr_text TEXT NOT NULL,
        ocr_method VARCHAR(50) NOT NULL,
        parsing_method VARCHAR(50) NOT NULL,
        name VARCHAR(255),
        title VARCHAR(255),
        company VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        website VARCHAR(255),
        address TEXT,
        user_comment TEXT,
        ocr_success BOOLEAN DEFAULT TRUE,
        parsing_success BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create business_card_summary view for easier querying
    const createSummaryView = `
      CREATE OR REPLACE VIEW business_card_summary AS
      SELECT 
        bce.*,
        u.last_active as user_last_active,
        u.total_cards as user_total_cards
      FROM business_card_entries bce
      LEFT JOIN users u ON bce.user_name = u.username
      ORDER BY bce.created_at DESC;
    `;

    // Execute table creation queries
    await query(createUsersTable);
    console.log('Users table created/verified');

    await query(createBusinessCardEntriesTable);
    console.log('Business card entries table created/verified');

    await query(createSummaryView);
    console.log('Business card summary view created/verified');

    // Test the tables by checking if they exist
    const tablesCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'business_card_entries')
      ORDER BY table_name;
    `);

    const viewsCheck = await query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name = 'business_card_summary';
    `);

    return res.status(200).json({
      success: true,
      message: 'Database initialized successfully',
      tables_created: tablesCheck.rows.map(row => row.table_name),
      views_created: viewsCheck.rows.map(row => row.table_name),
      timestamp: new Date().toISOString()
    });
    
    if (!connectionTest) {
      return res.status(500).json({
        error: 'Database connection failed',
        success: false
      });
    }

    console.log('Database connection successful. Running schema migration...');

    // Create tables and views
    const schemaSQL = `
      -- Users table to manage unique usernames
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(100) UNIQUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          total_cards INTEGER DEFAULT 0
      );

      -- Create index for username lookups
      CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);

      -- Main table for all business card entries
      CREATE TABLE IF NOT EXISTS business_card_entries (
          id SERIAL PRIMARY KEY,
          
          -- User Information
          user_name VARCHAR(100) NOT NULL,
          
          -- OCR Results
          ocr_text TEXT,
          ocr_method VARCHAR(50), -- 'amazon_textract', 'google_vision', 'tesseract', 'ocr_space'
          parsing_method VARCHAR(50) DEFAULT 'rule_based', -- 'rule_based', 'ai', 'fallback'
          
          -- Parsed Business Card Data
          name VARCHAR(255),
          title VARCHAR(255),
          company VARCHAR(255),
          email VARCHAR(255),
          phone VARCHAR(50),
          website VARCHAR(255),
          address TEXT,
          
          -- User Comments and Metadata
          user_comment TEXT,
          
          -- Timestamps
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          generated_on DATE DEFAULT CURRENT_DATE,
          
          -- Optional: Success indicators
          ocr_success BOOLEAN DEFAULT true,
          parsing_success BOOLEAN DEFAULT true
      );

      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_business_card_user_name ON business_card_entries (user_name);
      CREATE INDEX IF NOT EXISTS idx_business_card_created_at ON business_card_entries (created_at);
      CREATE INDEX IF NOT EXISTS idx_business_card_company ON business_card_entries (company);
      CREATE INDEX IF NOT EXISTS idx_business_card_email ON business_card_entries (email);
      CREATE INDEX IF NOT EXISTS idx_business_card_generated_on ON business_card_entries (generated_on);

      -- Create a view for easy querying with formatted data
      CREATE OR REPLACE VIEW business_card_summary AS
      SELECT 
          id,
          user_name,
          name,
          title,
          company,
          email,
          phone,
          website,
          CASE 
              WHEN LENGTH(address) > 100 THEN SUBSTRING(address, 1, 100) || '...'
              ELSE address
          END as address_short,
          address,
          user_comment,
          ocr_method,
          parsing_method,
          created_at,
          DATE(created_at) as created_date,
          CASE 
              WHEN created_at >= CURRENT_TIMESTAMP - INTERVAL '1 day' THEN 'Today'
              WHEN created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days' THEN 'This Week'
              WHEN created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days' THEN 'This Month'
              ELSE 'Older'
          END as time_category,
          ocr_success,
          parsing_success
      FROM business_card_entries
      ORDER BY created_at DESC;
    `;

    // Execute the schema
    await query(schemaSQL);

    // Check if tables were created successfully
    const tableCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('business_card_entries')
    `);

    const viewCheck = await query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name = 'business_card_summary'
    `);

    console.log('Database initialization completed successfully');

    return res.status(200).json({
      success: true,
      message: 'Database initialized successfully',
      tables_created: tableCheck.rows.map(row => row.table_name),
      views_created: viewCheck.rows.map(row => row.table_name),
      connection_test: connectionTest
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
