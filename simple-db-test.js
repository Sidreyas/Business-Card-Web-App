// Simple database connection test
require('dotenv').config();
const { Pool } = require('pg');

async function testSimpleConnection() {
  console.log('Testing direct database connection...');
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to database successfully!');
    
    const result = await client.query('SELECT NOW() as current_time, version()');
    console.log('Current time:', result.rows[0].current_time);
    console.log('Database version:', result.rows[0].version);
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Error code:', error.code);
  }
}

testSimpleConnection();
