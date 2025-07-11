// Database connection utility
// /api/lib/database.js

const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.DATABASE_MAX_CONNECTIONS) || 20,
      idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT) || 30000,
      connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT) || 60000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }
  return pool;
}

async function query(text, params) {
  const client = getPool();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Initialize database tables if they don't exist
async function initializeTables() {
  try {
    // Drop existing conflicting views first
    try {
      await query('DROP VIEW IF EXISTS business_card_summary CASCADE;');
      console.log('Dropped existing business_card_summary view');
    } catch (dropError) {
      console.log('No existing view to drop or drop failed:', dropError.message);
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

    // Execute table creation
    await query(createUsersTable);
    console.log('Users table created successfully');
    
    await query(createBusinessCardEntriesTable);
    console.log('Business card entries table created successfully');

    // Create business_card_summary view after tables are created
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

    await query(createSummaryView);
    console.log('Business card summary view created successfully');
    
    console.log('Database tables initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing database tables:', error);
    return false;
  }
}

// Test database connection
async function testConnection() {
  try {
    const result = await query('SELECT NOW() as current_time');
    console.log('Database connected successfully:', result.rows[0].current_time);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Business Card Entry Operations
async function insertBusinessCardEntry(entry) {
  try {
    // First, ensure the user exists in the users table
    if (entry.user_name && entry.user_name !== 'Anonymous') {
      await createUser(entry.user_name);
    }

    const queryText = `
      INSERT INTO business_card_entries (
        user_name, ocr_text, ocr_method, parsing_method,
        name, title, company, email, phone, website, address,
        user_comment, ocr_success, parsing_success
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
    
    const values = [
      entry.user_name,
      entry.ocr_text,
      entry.ocr_method,
      entry.parsing_method,
      entry.name,
      entry.title,
      entry.company,
      entry.email,
      entry.phone,
      entry.website,
      entry.address,
      entry.user_comment,
      entry.ocr_success,
      entry.parsing_success
    ];

    const result = await query(queryText, values);
    
    // Update user activity and card count
    if (entry.user_name && entry.user_name !== 'Anonymous') {
      await updateUserActivity(entry.user_name);
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Error inserting business card entry:', error);
    throw error;
  }
}

async function getBusinessCardEntries(userName, limit = 50, offset = 0) {
  const queryText = `
    SELECT * FROM business_card_summary 
    WHERE user_name = $1 
    ORDER BY created_at DESC 
    LIMIT $2 OFFSET $3
  `;
  
  const result = await query(queryText, [userName, limit, offset]);
  return result.rows;
}

async function getAllBusinessCardEntries(limit = 100, offset = 0) {
  const queryText = `
    SELECT * FROM business_card_summary 
    ORDER BY created_at DESC 
    LIMIT $1 OFFSET $2
  `;
  
  const result = await query(queryText, [limit, offset]);
  return result.rows;
}

async function getBusinessCardEntry(id) {
  const queryText = 'SELECT * FROM business_card_entries WHERE id = $1';
  const result = await query(queryText, [id]);
  return result.rows[0];
}

async function updateBusinessCardEntry(id, updates) {
  const fields = Object.keys(updates);
  const values = Object.values(updates);
  const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
  
  const queryText = `
    UPDATE business_card_entries 
    SET ${setClause} 
    WHERE id = $1 
    RETURNING *
  `;
  
  const result = await query(queryText, [id, ...values]);
  return result.rows[0];
}

async function deleteBusinessCardEntry(id) {
  const queryText = 'DELETE FROM business_card_entries WHERE id = $1 RETURNING *';
  const result = await query(queryText, [id]);
  return result.rows[0];
}

// User Management Operations
async function checkUsernameExists(username) {
  const queryText = 'SELECT EXISTS(SELECT 1 FROM users WHERE username = $1)';
  const result = await query(queryText, [username]);
  return result.rows[0].exists;
}

async function createUser(username) {
  try {
    const queryText = `
      INSERT INTO users (username)
      VALUES ($1)
      ON CONFLICT (username) DO UPDATE SET last_active = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const result = await query(queryText, [username]);
    return result.rows[0];
  } catch (error) {
    // If users table doesn't exist, try to initialize it
    if (error.code === '42P01') {
      console.log('Users table not found, initializing database...');
      const initialized = await initializeTables();
      if (initialized) {
        // Retry the user creation
        const queryText = `
          INSERT INTO users (username)
          VALUES ($1)
          ON CONFLICT (username) DO UPDATE SET last_active = CURRENT_TIMESTAMP
          RETURNING *
        `;
        const result = await query(queryText, [username]);
        return result.rows[0];
      }
    }
    throw error;
  }
}

async function updateUserActivity(username) {
  const queryText = `
    UPDATE users 
    SET last_active = CURRENT_TIMESTAMP,
        total_cards = (SELECT COUNT(*) FROM business_card_entries WHERE user_name = $1)
    WHERE username = $1
    RETURNING *
  `;
  const result = await query(queryText, [username]);
  return result.rows[0];
}

async function getUserStats(userName) {
  const queryText = `
    SELECT 
      COUNT(*) as total_entries,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today_entries,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as week_entries,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as month_entries,
      COUNT(DISTINCT company) FILTER (WHERE company IS NOT NULL AND company != '') as unique_companies,
      AVG(CASE WHEN ocr_success THEN 1 ELSE 0 END) * 100 as ocr_success_rate
    FROM business_card_entries 
    WHERE user_name = $1
  `;
  
  const result = await query(queryText, [userName]);
  return result.rows[0];
}

async function getGlobalStats() {
  const queryText = `
    SELECT 
      COUNT(*) as total_entries,
      COUNT(DISTINCT user_name) as total_users,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today_entries,
      COUNT(DISTINCT company) FILTER (WHERE company IS NOT NULL AND company != '') as unique_companies,
      AVG(CASE WHEN ocr_success THEN 1 ELSE 0 END) * 100 as global_ocr_success_rate
    FROM business_card_entries
  `;
  
  const result = await query(queryText);
  return result.rows[0];
}

module.exports = {
  query,
  testConnection,
  insertBusinessCardEntry,
  getBusinessCardEntries,
  getAllBusinessCardEntries,
  getBusinessCardEntry,
  updateBusinessCardEntry,
  deleteBusinessCardEntry,
  checkUsernameExists,
  createUser,
  updateUserActivity,
  getUserStats,
  getGlobalStats,
  initializeTables
};
