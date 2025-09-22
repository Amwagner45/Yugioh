# Project Structure Documentation

## Overview
This document describes the organized project structure for the Yu-Gi-Oh Deck Builder application.

## Project Structure

```
Yugioh/
├── .github/
│   └── development-plan.md          # Development roadmap and phases
├── frontend/                        # React + TypeScript frontend
│   ├── public/
│   ├── src/
│   │   ├── components/              # Reusable React components
│   │   │   ├── common/              # Shared components (Navigation, etc.)
│   │   │   ├── binder/              # Binder-specific components
│   │   │   └── deck/                # Deck builder components
│   │   ├── pages/                   # Page components for routing
│   │   │   ├── HomePage.tsx
│   │   │   ├── BinderPage.tsx
│   │   │   └── DeckBuilderPage.tsx
│   │   ├── services/                # API communication layer
│   │   │   └── api.ts              # Axios-based API service
│   │   ├── types/                   # TypeScript type definitions
│   │   │   └── index.ts            # Core data types (Card, Binder, Deck)
│   │   ├── utils/                   # Utility functions
│   │   │   └── helpers.ts          # Card formatting, validation, etc.
│   │   ├── hooks/                   # Custom React hooks
│   │   │   └── useStorage.ts       # localStorage/sessionStorage hooks
│   │   ├── assets/                  # Static assets (images, icons)
│   │   ├── App.tsx                  # Main app with routing
│   │   ├── main.tsx                 # React app entry point
│   │   └── index.css               # Global styles
│   ├── .env                        # Environment variables
│   ├── .env.development            # Development-specific env vars
│   ├── package.json                # Dependencies and scripts
│   ├── tsconfig.json               # TypeScript configuration
│   ├── vite.config.ts              # Vite build configuration
│   ├── tailwind.config.js          # Tailwind CSS configuration
│   └── eslint.config.js            # ESLint configuration
├── backend/                         # FastAPI Python backend
│   ├── src/
│   │   ├── models/                  # Pydantic data models
│   │   │   └── __init__.py         # Card, Binder, Deck models
│   │   ├── routes/                  # API route handlers
│   │   │   ├── cards.py            # Card-related endpoints
│   │   │   ├── binders.py          # Binder endpoints (placeholders)
│   │   │   └── decks.py            # Deck endpoints (placeholders)
│   │   ├── services/               # Business logic layer
│   │   ├── utils/                  # Utility functions
│   │   ├── database/               # Database configuration
│   │   └── main.py                 # FastAPI app configuration
│   ├── main.py                     # Application entry point
│   ├── requirements.txt            # Python dependencies
│   └── package.json               # Package metadata
├── .venv/                          # Python virtual environment
├── .gitignore                      # Git ignore rules
├── Makefile                        # Build and development commands
├── Makefile.windows               # Windows-specific make commands
├── start-dev.bat                  # Windows development startup script
└── README.md                      # Project overview and setup
```

## Development Environment

### Frontend (React + TypeScript)
- **Framework**: React 19.1.1 with TypeScript
- **Build Tool**: Vite 7.1.7
- **Styling**: Tailwind CSS 4.1.13
- **HTTP Client**: Axios 1.12.2
- **Routing**: React Router DOM
- **Linting**: ESLint with TypeScript support
- **Formatting**: Prettier

### Backend (FastAPI + Python)
- **Framework**: FastAPI 0.115.4
- **Runtime**: Python 3.12.8
- **Web Server**: Uvicorn 0.32.0
- **Database**: SQLAlchemy 2.0.36 (SQLite for local development)
- **HTTP Client**: httpx 0.28.0
- **Testing**: pytest 8.3.3

## Key Features Implemented

### 1. Organized Folder Structure ✓
- Proper separation of concerns
- Modular component organization
- Clean API layer structure

### 2. Development Environment Configuration ✓
- Hot reload for both frontend and backend
- TypeScript support with proper types
- Linting and formatting configured
- Environment variable management

### 3. Basic Routing Structure ✓
- React Router setup with navigation
- Home, Binder, and Deck Builder pages
- Responsive navigation component

### 4. API Foundation ✓
- FastAPI backend with proper structure
- CORS configuration for development
- YGOPRODeck API integration
- Type-safe API communication layer

### 5. Version Control Setup ✓
- Git repository with proper .gitignore
- Structured commit organization
- Environment files properly excluded

## Development Workflow

### Starting the Application
1. **Frontend**: `cd frontend && npm run dev` (runs on http://localhost:5173)
2. **Backend**: `cd backend && python main.py` (runs on http://localhost:8000)

### Development URLs
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### Next Steps (Phase 2)
- Database schema design and implementation
- Data models with CRUD operations
- Local storage integration
- Card caching strategy

## Architecture Decisions

### Frontend Architecture
- **Component Organization**: Organized by feature (binder, deck) and shared components
- **State Management**: Starting with React hooks, will add context/state management as needed
- **API Layer**: Centralized service layer with error handling
- **Offline-First**: localStorage hooks for data persistence

### Backend Architecture
- **API Design**: RESTful endpoints with proper HTTP methods
- **Data Validation**: Pydantic models for request/response validation
- **Database**: SQLAlchemy ORM for database operations
- **External API**: YGOPRODeck integration for card data

### Development Principles
1. **Offline-First**: Application works without internet connection
2. **Type Safety**: Full TypeScript coverage for better development experience
3. **Modular Design**: Easy to extend and maintain
4. **Performance**: Optimized for large card collections
5. **User Experience**: Intuitive interface inspired by FaBrary

## Current Status
**Phase 1.2 Complete** - Project structure setup finished
- ✅ Proper folder organization
- ✅ Development environment configured
- ✅ Basic routing implemented
- ✅ API foundation established
- ✅ Version control verified

Ready to proceed to **Phase 1.3 - YGOPRODeck API Integration** and **Phase 2 - Core Data Models & Database**.
