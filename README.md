# Yu-Gi-Oh Progression Series Deck Builder

A web application for managing Yu-Gi-Oh card collections and building decks specifically designed for progression series formats.

## Project Structure

```
yugioh-deck-builder/
├── frontend/          # React + TypeScript frontend
├── backend/           # FastAPI backend
├── .github/           # GitHub workflows and documentation
├── README.md          # This file
└── docker-compose.yml # Optional: Docker setup for easy deployment
```

## Quick Start

### Option 1: Docker (Recommended for Sharing)
The easiest way to run and share the application:

**Windows:**
```bash
git clone <repository-url>
cd yugioh-deck-builder
deploy.bat
```

**Linux/macOS:**
```bash
git clone <repository-url>
cd yugioh-deck-builder
chmod +x deploy.sh
./deploy.sh
```

Access at: **http://localhost:8000**

See [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) for detailed Docker instructions.

### Option 2: Development Setup

### Prerequisites
- Node.js 18+ and npm
- Python 3.9+
- Git

### Development Setup

1. **Clone and setup the project:**
   ```bash
   git clone <repository-url>
   cd yugioh-deck-builder
   ```

2. **Setup Backend:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

3. **Setup Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## Features

### Core Features
- **Binder Management**: Track your personal card collection
- **Deck Building**: Create decks only from cards you own
- **Import/Export**: Share decks and collections with friends
- **Offline Support**: Works without internet connection
- **YGOPRODeck Integration**: Automatic card data and images

### Progression Series Support
- Chronological set opening tracking
- Collection progress visualization
- Multi-player binder sharing (future)

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: FastAPI, SQLite/PostgreSQL, Python 3.9+
- **APIs**: YGOPRODeck API for card data
- **Development**: ESLint, Prettier, uvicorn

## Development

### Frontend Development
```bash
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
```

### Backend Development
```bash
cd backend
uvicorn main:app --reload  # Start development server
pytest                     # Run tests
alembic upgrade head       # Run database migrations
```

## Sharing with Friends

### Docker Method (Recommended)
1. Share your repository or the Docker setup files
2. Friends run `deploy.bat` (Windows) or `./deploy.sh` (Linux/macOS)
3. Their data is automatically persisted in `docker-data/`
4. Updates preserve all data (binders, decks, cache, settings)

### Manual Method
1. Download the latest release
2. Follow the Development Setup guide above
3. The application runs entirely locally - no internet required after setup

## Contributing

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for development guidelines.

## License

This project is for personal use and learning purposes.
