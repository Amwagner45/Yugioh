"""
Caching service for API responses and card data
"""

import json
import os
from datetime import datetime, timedelta
from typing import Any, Optional, Dict, List
import asyncio
import hashlib
import diskcache as dc

try:
    import aioredis

    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False


class CacheService:
    """
    Multi-level caching service that supports:
    1. In-memory cache (fastest)
    2. Disk cache (persistent across restarts)
    3. Redis cache (for production scaling)
    """

    def __init__(self):
        self.memory_cache: Dict[str, Dict[str, Any]] = {}
        self.cache_dir = os.path.join(os.path.dirname(__file__), "..", "..", "cache")
        os.makedirs(self.cache_dir, exist_ok=True)

        # Initialize disk cache
        self.disk_cache = dc.Cache(self.cache_dir)

        # Redis connection (will be None if Redis is not available)
        self.redis_client: Optional[aioredis.Redis] = None

        # Cache configuration
        self.default_ttl = 3600  # 1 hour in seconds
        self.card_data_ttl = 86400  # 24 hours for card data
        self.search_results_ttl = 1800  # 30 minutes for search results

    async def initialize_redis(self, redis_url: str = "redis://localhost:6379"):
        """Initialize Redis connection if available"""
        if REDIS_AVAILABLE:
            try:
                self.redis_client = aioredis.from_url(redis_url)
                await self.redis_client.ping()
                print("Redis cache initialized successfully")
            except Exception as e:
                print(f"Redis initialization failed: {e}")
                self.redis_client = None
        else:
            print("Redis not available, using disk and memory cache only")

    def _generate_cache_key(self, prefix: str, **kwargs) -> str:
        """Generate a cache key from parameters"""
        # Sort kwargs to ensure consistent key generation
        sorted_params = sorted(kwargs.items())
        params_str = json.dumps(sorted_params, sort_keys=True)
        params_hash = hashlib.md5(params_str.encode()).hexdigest()
        return f"{prefix}:{params_hash}"

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache (memory -> disk -> redis)"""
        # Check memory cache first
        if key in self.memory_cache:
            entry = self.memory_cache[key]
            if entry["expires_at"] > datetime.now():
                return entry["data"]
            else:
                # Remove expired entry
                del self.memory_cache[key]

        # Check disk cache
        try:
            data = self.disk_cache.get(key)
            if data is not None:
                # Store in memory cache for faster access
                self.memory_cache[key] = {
                    "data": data,
                    "expires_at": datetime.now() + timedelta(seconds=self.default_ttl),
                }
                return data
        except Exception as e:
            print(f"Disk cache read error: {e}")

        # Check Redis cache
        if self.redis_client:
            try:
                data = await self.redis_client.get(key)
                if data:
                    parsed_data = json.loads(data)
                    # Store in memory and disk cache
                    self.memory_cache[key] = {
                        "data": parsed_data,
                        "expires_at": datetime.now()
                        + timedelta(seconds=self.default_ttl),
                    }
                    self.disk_cache.set(key, parsed_data, expire=self.default_ttl)
                    return parsed_data
            except Exception as e:
                print(f"Redis cache read error: {e}")

        return None

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set value in all cache layers"""
        if ttl is None:
            ttl = self.default_ttl

        # Store in memory cache
        self.memory_cache[key] = {
            "data": value,
            "expires_at": datetime.now() + timedelta(seconds=ttl),
        }

        # Store in disk cache
        try:
            self.disk_cache.set(key, value, expire=ttl)
        except Exception as e:
            print(f"Disk cache write error: {e}")

        # Store in Redis cache
        if self.redis_client:
            try:
                await self.redis_client.setex(key, ttl, json.dumps(value, default=str))
            except Exception as e:
                print(f"Redis cache write error: {e}")

    async def delete(self, key: str) -> None:
        """Delete value from all cache layers"""
        # Remove from memory cache
        if key in self.memory_cache:
            del self.memory_cache[key]

        # Remove from disk cache
        try:
            self.disk_cache.delete(key)
        except Exception as e:
            print(f"Disk cache delete error: {e}")

        # Remove from Redis cache
        if self.redis_client:
            try:
                await self.redis_client.delete(key)
            except Exception as e:
                print(f"Redis cache delete error: {e}")

    async def clear_expired(self) -> None:
        """Clear expired entries from memory cache"""
        now = datetime.now()
        expired_keys = [
            key
            for key, entry in self.memory_cache.items()
            if entry["expires_at"] <= now
        ]
        for key in expired_keys:
            del self.memory_cache[key]

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return {
            "memory_cache_size": len(self.memory_cache),
            "disk_cache_size": len(self.disk_cache),
            "redis_available": self.redis_client is not None,
            "cache_directory": self.cache_dir,
        }

    # Card-specific cache methods
    async def get_card_search_results(
        self, search_params: Dict[str, Any]
    ) -> Optional[List[Dict[str, Any]]]:
        """Get cached card search results"""
        key = self._generate_cache_key("card_search", **search_params)
        return await self.get(key)

    async def cache_card_search_results(
        self, search_params: Dict[str, Any], results: List[Dict[str, Any]]
    ) -> None:
        """Cache card search results"""
        key = self._generate_cache_key("card_search", **search_params)
        await self.set(key, results, ttl=self.search_results_ttl)

    async def get_card_by_id(self, card_id: int) -> Optional[Dict[str, Any]]:
        """Get cached card data by ID"""
        key = f"card:{card_id}"
        return await self.get(key)

    async def cache_card_by_id(self, card_id: int, card_data: Dict[str, Any]) -> None:
        """Cache card data by ID"""
        key = f"card:{card_id}"
        await self.set(key, card_data, ttl=self.card_data_ttl)


# Global cache service instance
cache_service = CacheService()


async def get_cache_service() -> CacheService:
    """Dependency to get cache service"""
    return cache_service


async def initialize_cache():
    """Initialize cache service at startup"""
    await cache_service.initialize_redis()
    print("Cache service initialized")


async def cleanup_cache():
    """Cleanup cache service at shutdown"""
    if cache_service.redis_client:
        await cache_service.redis_client.close()
    print("Cache service cleaned up")
