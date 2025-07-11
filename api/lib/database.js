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
  return result.rows[0];
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

// Statistics and Analytics
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
  getUserStats,
  getGlobalStats
};
