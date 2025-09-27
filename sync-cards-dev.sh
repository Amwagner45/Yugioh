#!/bin/bash
# Development script to sync cards before Docker build
# Run this when you want to ensure your local database is fully populated

set -e

echo "🎴 Yu-Gi-Oh Card Database Development Sync"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "backend/dev_sync_cards.py" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    echo "   Expected to find: backend/dev_sync_cards.py"
    exit 1
fi

# Change to backend directory
cd backend

echo "📂 Working directory: $(pwd)"
echo ""

# Run the sync script
echo "🚀 Starting card sync..."
python dev_sync_cards.py

echo ""
echo "✅ Development sync completed!"
echo ""
echo "Next steps:"
echo "  • Run 'docker-compose build' to build image with pre-populated database"
echo "  • Or run 'deploy.sh'/'deploy.bat' to build and deploy"
echo ""