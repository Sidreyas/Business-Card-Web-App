// Test script for backend API
// backend/test-backend.js

const axios = require('axios');

const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-backend-app.onrender.com'
  : 'http://localhost:5000';

async function testBackendAPI() {
  console.log('🧪 Testing Backend API...\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  try {
    // Test 1: Health Check
    console.log('1. Testing health check...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed:', healthResponse.data.status);
    console.log('   Service:', healthResponse.data.service);
    console.log('   Timestamp:', healthResponse.data.timestamp);
    console.log('');

    // Test 2: Database Initialization
    console.log('2. Testing database initialization...');
    const initResponse = await axios.post(`${BASE_URL}/api/init-db`);
    console.log('✅ Database initialization:', initResponse.data.success ? 'Success' : 'Failed');
    console.log('   Message:', initResponse.data.message);
    console.log('');

    // Test 3: Username Check (Non-existent)
    console.log('3. Testing username availability...');
    const usernameResponse = await axios.get(`${BASE_URL}/api/check-username?username=testuser12345`);
    console.log('✅ Username check passed');
    console.log('   Username exists:', usernameResponse.data.exists);
    console.log('');

    // Test 4: Get Entries
    console.log('4. Testing get entries...');
    const entriesResponse = await axios.get(`${BASE_URL}/api/entries?limit=5`);
    console.log('✅ Get entries passed');
    console.log('   Entries count:', entriesResponse.data.count);
    console.log('');

    console.log('🎉 All backend tests passed!\n');
    console.log('Backend is ready for production! 🚀');

  } catch (error) {
    console.error('❌ Test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
    } else if (error.request) {
      console.error('No response received. Is the server running?');
      console.error('URL:', error.config?.url);
    } else {
      console.error('Error:', error.message);
    }
    
    console.log('\n🔍 Troubleshooting:');
    console.log('1. Make sure the backend server is running');
    console.log('2. Check environment variables');
    console.log('3. Verify database connection');
    console.log('4. Check network connectivity');
  }
}

// Run tests
testBackendAPI();
