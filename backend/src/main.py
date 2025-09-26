from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import os
from src.routes import cards, binders, decks, banlists, exports
from src.services.cache import initialize_cache, cleanup_cache
from src.config import config
from src.database.manager import DatabaseManager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan events"""
    # Startup
    print(f"Starting Yu-Gi-Oh Deck Builder API...")
    print(f"Data directory: {config.data_dir}")
    print(f"Cache directory: {config.cache_dir}")
    print(f"Database path: {config.database_path}")

    # Initialize database
    db_manager = DatabaseManager(config.database_path)
    if not db_manager.setup_database():
        raise RuntimeError("Failed to initialize database")

    # Initialize cache
    await initialize_cache()

    print("Application startup complete")
    yield

    # Shutdown
    print("Shutting down application...")
    await cleanup_cache()
    print("Application shutdown complete")


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
        allow_origins=config.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include routers
    app.include_router(cards.router, prefix="/api/cards", tags=["cards"])
    app.include_router(binders.router, prefix="/api/binders", tags=["binders"])
    app.include_router(decks.router, prefix="/api/decks", tags=["decks"])
    app.include_router(banlists.router, tags=["banlists"])
    app.include_router(exports.router, prefix="/api/exports", tags=["exports"])

    @app.get("/api")
    async def api_root():
        """API root endpoint"""
        return {
            "message": "Yu-Gi-Oh Deck Builder API",
            "version": "1.0.0",
            "docs": "/docs",
            "status": "operational",
        }

    @app.get("/api/health")
    async def health_check():
        """Health check endpoint"""
        return {"status": "healthy", "service": "yugioh-deck-builder-api"}

    # Serve static files (frontend) if available
    if config.static_files_dir:
        # Mount static assets first (CSS, JS, images)
        app.mount(
            "/assets",
            StaticFiles(directory=os.path.join(config.static_files_dir, "assets")),
            name="assets",
        )

        # Handle favicon and other static files
        @app.get("/vite.svg")
        async def vite_svg():
            return FileResponse(os.path.join(config.static_files_dir, "vite.svg"))

        # SPA fallback: serve index.html for all non-API routes
        @app.get("/{path:path}")
        async def serve_spa(request: Request, path: str):
            # If it's an API route, let it pass through to the API handlers
            if path.startswith("api/"):
                # This will result in a 404 which is correct for unknown API routes
                from fastapi import HTTPException

                raise HTTPException(status_code=404, detail="Not found")

            # For all other routes, serve the React SPA
            return FileResponse(os.path.join(config.static_files_dir, "index.html"))

        print(f"Serving static files from: {config.static_files_dir}")
        print(f"SPA routing enabled for React Router")

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=config.api_host, port=config.api_port)
