// Simple insert and query test
require('dotenv').config();
const { Pool } = require('pg');

async function quickTest() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('✅ Testing database functionality...');
    
    // Test insert
    const insertResult = await pool.query(`
      INSERT INTO business_card_entries (
        user_name, name, company, email, phone, ocr_method, parsing_method
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at
    `, ['TestUser', 'John Doe', 'Test Corp', 'john@test.com', '555-1234', 'test', 'rule_based']);
    
    console.log('✅ Inserted test entry with ID:', insertResult.rows[0].id);
    
    // Test select
    const selectResult = await pool.query('SELECT * FROM business_card_entries WHERE user_name = $1', ['TestUser']);
    console.log('✅ Retrieved', selectResult.rows.length, 'entries for TestUser');
    
    // Test view
    const viewResult = await pool.query('SELECT * FROM business_card_summary LIMIT 1');
    console.log('✅ View working, sample entry:', {
      name: viewResult.rows[0]?.name,
      company: viewResult.rows[0]?.company,
      time_category: viewResult.rows[0]?.time_category
    });
    
    await pool.end();
    console.log('🎉 Database is fully functional!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

quickTest();
