"""
Configuration management for Yu-Gi-Oh Deck Builder
"""

import os
from pathlib import Path
from typing import Optional


class Config:
    """Application configuration"""

    def __init__(self):
        # Base paths
        self.app_dir = Path(__file__).parent.parent  # /app/src -> /app
        self.data_dir = Path(os.getenv("DATA_PATH", self.app_dir / "data"))
        self.cache_dir = Path(os.getenv("CACHE_PATH", self.app_dir / "cache"))

        # Ensure directories exist
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        # Database configuration
        self.database_path = os.getenv(
            "DATABASE_PATH", str(self.data_dir / "yugioh_deckbuilder.db")
        )

        # Cache configuration
        self.cache_directory = str(self.cache_dir)
        self.redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")

        # API configuration
        self.cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(
            ","
        )
        self.api_host = os.getenv("API_HOST", "0.0.0.0")
        self.api_port = int(os.getenv("API_PORT", "8000"))

        # YGOPRODeck API configuration
        self.ygoprodeck_api_url = os.getenv(
            "YGOPRODECK_API_URL", "https://db.ygoprodeck.com/api/v7"
        )
        self.ygoprodeck_rate_limit = int(
            os.getenv("YGOPRODECK_RATE_LIMIT", "20")
        )  # requests per second

        # Cache TTL settings (in seconds)
        self.card_data_ttl = int(os.getenv("CARD_DATA_TTL", "86400"))  # 24 hours
        self.search_results_ttl = int(
            os.getenv("SEARCH_RESULTS_TTL", "1800")
        )  # 30 minutes
        self.default_cache_ttl = int(os.getenv("DEFAULT_CACHE_TTL", "3600"))  # 1 hour

    @property
    def static_files_dir(self) -> Optional[str]:
        """Get static files directory (for serving frontend)"""
        static_dir = self.app_dir / "static"
        return str(static_dir) if static_dir.exists() else None


# Global configuration instance
config = Config()
