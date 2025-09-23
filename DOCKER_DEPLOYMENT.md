# Yu-Gi-Oh Deck Builder - Docker Deployment

This guide explains how to deploy the Yu-Gi-Oh Deck Builder using Docker, with persistent data storage for your card cache, binders, decks, and settings.

## Quick Start

### Windows
```bash
# Clone and navigate to the repository
cd Yugioh

# Run the deployment script
deploy.bat
```

### Linux/macOS
```bash
# Clone and navigate to the repository
cd Yugioh

# Make the script executable and run it
chmod +x deploy.sh
./deploy.sh
```

The application will be available at: **http://localhost:8000**

## What Gets Persisted

Your data is automatically saved in Docker volumes and will persist across container updates and restarts:

### 📦 Persistent Data
- **Card Cache**: Downloaded card data from YGOPRODeck API (`./docker-data/cache/`)
- **Binder Data**: Your card collections and favorite binder (`./docker-data/app-data/`)
- **Deck Data**: All your saved decks (`./docker-data/app-data/`)
- **Settings**: Theme preferences and future settings (`./docker-data/app-data/`)

### 🗂️ Data Structure
```
docker-data/
├── app-data/           # Application database and user data
│   └── yugioh_deckbuilder.db
└── cache/              # YGOPRODeck API cache
    ├── cache.db
    └── [cached files]
```

## Manual Docker Commands

If you prefer to manage Docker manually:

### Build and Start
```bash
# Create data directories
mkdir -p docker-data/app-data docker-data/cache

# Build and start
docker-compose build
docker-compose up -d
```

### View Logs
```bash
docker-compose logs -f yugioh-deck-builder
```

### Stop/Restart
```bash
# Stop
docker-compose down

# Restart
docker-compose restart

# Update to new version
git pull
docker-compose build
docker-compose up -d
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` to customize configuration:

```bash
cp .env.example .env
```

Key settings:
- `CARD_DATA_TTL`: How long to cache card data (default: 24 hours)
- `CORS_ORIGINS`: Allowed frontend URLs
- `YGOPRODECK_RATE_LIMIT`: API rate limiting

### Data Backup

Your persistent data is stored in `./docker-data/`. To backup:

```bash
# Create backup
tar -czf yugioh-backup-$(date +%Y%m%d).tar.gz docker-data/

# Restore backup
tar -xzf yugioh-backup-YYYYMMDD.tar.gz
```

## Sharing with Friends

### Option 1: Share the Docker Image
```bash
# Save image to file
docker save yugioh-deck-builder > yugioh-deck-builder.tar

# Load on another machine
docker load < yugioh-deck-builder.tar
```

### Option 2: Share the Repository
Your friends can clone the repository and run:
```bash
git clone [your-repo-url]
cd Yugioh
./deploy.sh  # or deploy.bat on Windows
```

## Troubleshooting

### Health Check Failed
```bash
# Check application logs
docker-compose logs yugioh-deck-builder

# Verify health endpoint
curl http://localhost:8000/api/health
```

### Permission Issues (Linux/macOS)
```bash
# Fix data directory permissions
sudo chown -R $USER:$USER docker-data/
chmod -R 755 docker-data/
```

### Port Already in Use
Edit `docker-compose.yml` to change the port:
```yaml
ports:
  - "8080:8000"  # Change 8000 to 8080 or another port
```

### Data Loss Prevention
- Never delete `docker-data/` directory
- Always backup before major updates
- Data persists across container recreation

## Development vs Production

This Docker setup is suitable for:
- ✅ Sharing with friends
- ✅ Personal use
- ✅ Small groups
- ❌ Production hosting (additional security needed)

For production hosting, consider:
- Adding HTTPS/SSL certificates
- Setting up proper authentication
- Using a dedicated database server
- Implementing proper backup strategies

## Accessing Your Data

### Database Access
```bash
# Access SQLite database
docker-compose exec yugioh-deck-builder sqlite3 /app/data/yugioh_deckbuilder.db
```

### File System Access
```bash
# Browse application files
docker-compose exec yugioh-deck-builder ls -la /app/data/
```

## Updates

To update to a new version:
1. Pull the latest code: `git pull`
2. Run the deployment script: `./deploy.sh` or `deploy.bat`
3. Your data will be preserved automatically

The Docker setup ensures your binders, decks, and cached card data survive updates!