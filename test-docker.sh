#!/bin/bash

# Test script for Docker deployment

echo "🧪 Testing Docker deployment..."

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed or not in PATH"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed or not in PATH"
    exit 1
fi

echo "✅ Docker and docker-compose are available"

# Check if required files exist
required_files=("Dockerfile" "docker-compose.yml" ".dockerignore")
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Required file missing: $file"
        exit 1
    fi
done

echo "✅ All required Docker files are present"

# Check if data directories exist
if [ ! -d "docker-data/app-data" ] || [ ! -d "docker-data/cache" ]; then
    echo "📁 Creating data directories..."
    mkdir -p docker-data/app-data docker-data/cache
fi

echo "✅ Data directories are ready"

# Test build (but don't run)
echo "🏗️  Testing Docker build..."
if docker-compose build --no-cache yugioh-deck-builder; then
    echo "✅ Docker build successful!"
else
    echo "❌ Docker build failed"
    exit 1
fi

echo ""
echo "🎉 Docker setup test completed successfully!"
echo ""
echo "Next steps:"
echo "  - Run './deploy.sh' to start the application"
echo "  - Or run 'docker-compose up -d' manually"
echo ""