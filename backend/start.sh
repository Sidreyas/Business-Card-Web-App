#!/bin/bash

echo "Setting up Business Card OCR Backend..."

# Remove old virtual environment if it exists
if [ -d "venv" ]; then
    echo "Removing old virtual environment..."
    rm -rf venv
fi

# Create virtual environment
echo "Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip first
echo "Upgrading pip..."
pip install --upgrade pip

# Install requirements one by one to handle any conflicts
echo "Installing Python dependencies..."
pip install Flask
pip install flask-cors
pip install google-cloud-vision
pip install Pillow
pip install gunicorn

# Start the Flask server
echo "Starting Flask server on port 5000..."
python app.py
