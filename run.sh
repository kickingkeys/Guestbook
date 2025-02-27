#!/bin/bash

# Simple script to start a local server for testing the Interactive Canvas application

echo "Starting local server for Interactive Canvas application..."

# Check if Python is available
if command -v python3 &>/dev/null; then
    echo "Using Python 3 HTTP server..."
    python3 -m http.server 8000
elif command -v python &>/dev/null; then
    echo "Using Python HTTP server..."
    python -m SimpleHTTPServer 8000
else
    echo "Python not found. Checking for Node.js..."
    
    if command -v npx &>/dev/null; then
        echo "Using Node.js http-server..."
        npx http-server -p 8000
    else
        echo "Error: Neither Python nor Node.js is available."
        echo "Please install Python or Node.js to run a local server."
        exit 1
    fi
fi

echo "Server started at http://localhost:8000"
echo "- Main application: http://localhost:8000/index.html"
echo "Press Ctrl+C to stop the server." 