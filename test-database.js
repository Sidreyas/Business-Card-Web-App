// Test script for database setup
// node test-database.js

require('dotenv').config({ path: './.env' });
const { testConnection, insertBusinessCardEntry, getBusinessCardEntries } = require('./api/lib/database');

async function testDatabase() {
  console.log('🧪 Testing Database Connection and Functions...\n');

  try {
    // Test 1: Connection
    console.log('1. Testing database connection...');
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }
    console.log('✅ Database connection successful\n');

    // Test 2: Insert a sample entry
    console.log('2. Testing data insertion...');
    const sampleEntry = {
      user_name: 'Test User',
      ocr_text: 'John Smith\nSenior Developer\nTechCorp Inc\njohn@techcorp.com\n555-123-4567',
      ocr_method: 'test',
      parsing_method: 'rule_based',
      name: 'John Smith',
      title: 'Senior Developer',
      company: 'TechCorp Inc',
      email: 'john@techcorp.com',
      phone: '555-123-4567',
      website: '',
      address: '',
      user_comment: 'Test entry from database test script',
      ocr_success: true,
      parsing_success: true
    };

    const insertedEntry = await insertBusinessCardEntry(sampleEntry);
    console.log('✅ Sample entry inserted with ID:', insertedEntry.id);
    console.log('   Entry details:', {
      id: insertedEntry.id,
      user_name: insertedEntry.user_name,
      name: insertedEntry.name,
      company: insertedEntry.company,
      created_at: insertedEntry.created_at
    });
    console.log('');

    // Test 3: Retrieve entries
    console.log('3. Testing data retrieval...');
    const entries = await getBusinessCardEntries('Test User', 10, 0);
    console.log('✅ Retrieved entries:', entries.length);
    if (entries.length > 0) {
      console.log('   Latest entry:', {
        id: entries[0].id,
        name: entries[0].name,
        company: entries[0].company,
        time_category: entries[0].time_category
      });
    }
    console.log('');

    console.log('🎉 All database tests passed! Database is ready for use.');

  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  testDatabase();
}

module.exports = { testDatabase };
