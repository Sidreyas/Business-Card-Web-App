require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testConnection() {
  try {
    console.log('🔄 Testing database connection...');
    const client = await pool.connect();
    
    // Test users table
    const usersResult = await client.query('SELECT username, total_cards, created_at FROM users ORDER BY created_at DESC LIMIT 5');
    console.log('✅ Database connection successful!');
    console.log('\n📊 Recent users:');
    usersResult.rows.forEach(row => {
      console.log(`- ${row.username} (${row.total_cards} cards) - ${row.created_at}`);
    });
    
    // Test business_card_entries table
    const entriesResult = await client.query('SELECT user_name, name, company, created_at FROM business_card_entries ORDER BY created_at DESC LIMIT 3');
    console.log('\n💼 Recent business card entries:');
    entriesResult.rows.forEach(row => {
      console.log(`- ${row.user_name}: ${row.name || 'N/A'} at ${row.company || 'N/A'} - ${row.created_at}`);
    });
    
    client.release();
    console.log('\n✅ All database tests passed!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
}

testConnection();
