// Update database schema with users table
require('dotenv').config();
const { Pool } = require('pg');

async function updateSchema() {
  console.log('Updating database schema...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to database');
    
    // Create users table
    console.log('Creating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        total_cards INTEGER DEFAULT 0
      );
    `);
    
    // Create index
    console.log('Creating username index...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
    `);
    
    // Check if table was created successfully
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Users table created successfully');
    } else {
      console.log('❌ Users table was not created');
    }
    
    client.release();
    await pool.end();
    console.log('✅ Schema update completed');
    
  } catch (error) {
    console.error('❌ Schema update failed:', error.message);
    process.exit(1);
  }
}

updateSchema();
