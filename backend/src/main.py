from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from src.routes import cards, binders, decks
from src.services.cache import initialize_cache, cleanup_cache


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan events"""
    # Startup
    await initialize_cache()
    yield
    # Shutdown
    await cleanup_cache()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application"""
    app = FastAPI(
        title="Yu-Gi-Oh Deck Builder API",
        description="API for managing Yu-Gi-Oh card collections and deck building",
        version="1.0.0",
        lifespan=lifespan,
        redirect_slashes=False,
    )

    # Enable CORS for frontend development
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],  # Vite dev server
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include routers
    app.include_router(cards.router, prefix="/api/cards", tags=["cards"])
    app.include_router(binders.router, prefix="/api/binders", tags=["binders"])
    app.include_router(decks.router, prefix="/api/decks", tags=["decks"])

    @app.get("/")
    async def root():
        """Root endpoint with API information"""
        return {
            "message": "Yu-Gi-Oh Deck Builder API",
            "version": "1.0.0",
            "docs": "/docs",
            "status": "operational",
        }

    @app.get("/health")
    async def health_check():
        """Health check endpoint"""
        return {"status": "healthy", "service": "yugioh-deck-builder-api"}

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
