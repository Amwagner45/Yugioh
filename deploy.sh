#!/bin/bash

# Docker deployment script for Yu-Gi-Oh Deck Builder

set -e

echo "🚀 Building and deploying Yu-Gi-Oh Deck Builder..."

# Create data directories if they don't exist
echo "📁 Creating data directories..."
mkdir -p ./docker-data/app-data
mkdir -p ./docker-data/cache

# Set proper permissions for the data directories
echo "🔒 Setting permissions..."
chmod 755 ./docker-data/app-data
chmod 755 ./docker-data/cache

# Build the Docker image
echo "🏗️  Building Docker image..."
docker-compose build

# Start the services
echo "🚀 Starting services..."
docker-compose up -d

# Wait for health check
echo "⏳ Waiting for application to be healthy..."
timeout=60
counter=0

while [ $counter -lt $timeout ]; do
    if docker-compose exec yugioh-deck-builder curl -f http://localhost:8000/api/health > /dev/null 2>&1; then
        echo "✅ Application is healthy!"
        break
    fi
    
    echo "Waiting... ($((counter + 5))s)"
    sleep 5
    counter=$((counter + 5))
done

if [ $counter -ge $timeout ]; then
    echo "❌ Application failed to become healthy within ${timeout}s"
    echo "📋 Checking logs..."
    docker-compose logs yugioh-deck-builder
    exit 1
fi

echo ""
echo "🎉 Yu-Gi-Oh Deck Builder deployed successfully!"
echo ""
echo "📍 Application URL: http://localhost:8000"
echo "📋 API Documentation: http://localhost:8000/docs"
echo "📊 Health Check: http://localhost:8000/api/health"
echo ""
echo "💾 Data is persisted in:"
echo "   - App data: ./docker-data/app-data"
echo "   - Cache: ./docker-data/cache"
echo ""
echo "📖 Useful commands:"
echo "   - View logs: docker-compose logs -f yugioh-deck-builder"
echo "   - Stop: docker-compose down"
echo "   - Restart: docker-compose restart"
echo "   - Update: ./deploy.sh (run this script again)"
echo ""