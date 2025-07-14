#!/bin/bash
# Render build script for backend deployment

echo "Starting backend build process..."

# Navigate to backend directory
cd backend

# Install dependencies
echo "Installing dependencies..."
npm ci

echo "Build completed successfully!"
