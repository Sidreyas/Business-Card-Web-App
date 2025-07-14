#!/bin/bash
# Deployment script for Render
# backend/deploy.sh

echo "🚀 Starting Business Card OCR Backend deployment..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Test database connection
echo "🔍 Testing database connection..."
node -e "
require('dotenv').config();
const { testConnection } = require('./lib/database');
testConnection().then(success => {
  if (success) {
    console.log('✅ Database connection successful');
    process.exit(0);
  } else {
    console.error('❌ Database connection failed');
    process.exit(1);
  }
}).catch(err => {
  console.error('❌ Database test error:', err.message);
  process.exit(1);
});
"

if [ $? -eq 0 ]; then
    echo "🎉 Deployment preparation complete!"
    echo "🌐 Starting server..."
    npm start
else
    echo "❌ Deployment failed - database connection error"
    exit 1
fi
