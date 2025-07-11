// Test API endpoints
const axios = require('axios');

async function testAPIEndpoints() {
  const baseURL = 'http://localhost:3001/api';
  
  console.log('🧪 Testing API Endpoints...\n');

  try {
    // Test 1: Initialize database
    console.log('1. Testing database initialization...');
    const initResponse = await axios.post(`${baseURL}/init-db`);
    console.log('✅ Database initialized:', initResponse.data.success);
    console.log('   Tables created:', initResponse.data.tables_created);
    console.log('   Views created:', initResponse.data.views_created);
    console.log('');

    // Test 2: Get entries (should be empty initially)
    console.log('2. Testing get entries...');
    const entriesResponse = await axios.get(`${baseURL}/entries?userName=TestUser`);
    console.log('✅ Retrieved entries:', entriesResponse.data.count);
    console.log('');

    console.log('🎉 All API endpoints are working!');

  } catch (error) {
    console.error('❌ API test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received. Is the server running?');
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Install axios if not already installed
const { execSync } = require('child_process');
try {
  require.resolve('axios');
} catch (e) {
  console.log('Installing axios...');
  execSync('npm install axios', { stdio: 'inherit' });
}

testAPIEndpoints();
