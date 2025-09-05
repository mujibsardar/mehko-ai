#!/bin/bash

# Simple development script for MEHKO AI
# Starts React dev server for frontend development

echo "🚀 Starting MEHKO AI development environment..."
echo ""

# Check if Docker Compose is running
if ! docker compose ps | grep -q "Up"; then
    echo "🐳 Starting Docker Compose services..."
    docker compose up -d
    echo "✅ Docker services started"
    echo ""
fi

# Start React dev server
echo "⚛️  Starting React dev server..."
echo "📱 Frontend will be available at: http://localhost:5173"
echo "🌐 API will be available at: http://localhost/api"
echo ""
echo "Press Ctrl+C to stop the dev server"
echo ""

npm run dev
