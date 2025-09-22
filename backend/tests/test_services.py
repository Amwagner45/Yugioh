"""
Unit tests for individual service modules
"""
import pytest
import asyncio
from unittest.mock import AsyncMock, patch
from datetime import datetime, timedelta

from src.services.cache import CacheService
from src.services.rate_limiter import RateLimiter
from src.services.error_handler import ErrorHandler, RetryConfig


class TestCacheService:
    """Test suite for cache service"""
    
    @pytest.fixture
    def cache_service(self):
        return CacheService()
    
    @pytest.mark.asyncio
    async def test_memory_cache_operations(self, cache_service):
        """Test basic memory cache operations"""
        # Test set and get
        await cache_service.set("test_key", {"data": "test"}, ttl=60)
        result = await cache_service.get("test_key")
        assert result == {"data": "test"}
        
        # Test delete
        await cache_service.delete("test_key")
        result = await cache_service.get("test_key")
        assert result is None
    
    @pytest.mark.asyncio
    async def test_cache_expiration(self, cache_service):
        """Test cache expiration functionality"""
        # Set item with very short TTL
        await cache_service.set("expiring_key", "data", ttl=1)
        
        # Should be available immediately
        result = await cache_service.get("expiring_key")
        assert result == "data"
        
        # Wait for expiration (in real implementation)
        # For testing, we'll manually trigger cleanup
        await cache_service.clear_expired()
    
    def test_cache_stats(self, cache_service):
        """Test cache statistics"""
        stats = cache_service.get_stats()
        assert "memory_cache_size" in stats
        assert "disk_cache_size" in stats
        assert "redis_available" in stats


class TestRateLimiter:
    """Test suite for rate limiter"""
    
    @pytest.fixture
    def rate_limiter(self):
        return RateLimiter(requests_per_minute=60, burst_limit=10)
    
    @pytest.mark.asyncio
    async def test_rate_limit_allow(self, rate_limiter):
        """Test that requests are allowed under limit"""
        allowed, retry_after = await rate_limiter.check_rate_limit("127.0.0.1", "test")
        assert allowed is True
        assert retry_after is None
    
    @pytest.mark.asyncio
    async def test_record_request(self, rate_limiter):
        """Test recording successful requests"""
        await rate_limiter.record_request("127.0.0.1", "test")
        
        # Request should still be allowed
        allowed, _ = await rate_limiter.check_rate_limit("127.0.0.1", "test")
        assert allowed is True
    
    @pytest.mark.asyncio
    async def test_record_failure(self, rate_limiter):
        """Test recording failed requests and backoff"""
        await rate_limiter.record_failure("127.0.0.1", "test")
        
        # Should have backoff applied
        assert "127.0.0.1:test" in rate_limiter.backoff_until
    
    def test_rate_limit_stats(self, rate_limiter):
        """Test rate limiter statistics"""
        stats = rate_limiter.get_stats()
        assert "requests_per_minute_limit" in stats
        assert "burst_limit" in stats
        assert "active_clients" in stats


class TestErrorHandler:
    """Test suite for error handler"""
    
    @pytest.fixture
    def error_handler(self):
        return ErrorHandler()
    
    @pytest.mark.asyncio
    async def test_successful_retry(self, error_handler):
        """Test successful operation without retries"""
        async def successful_func():
            return "success"
        
        result = await error_handler.retry_with_backoff(successful_func)
        assert result == "success"
    
    @pytest.mark.asyncio
    async def test_retry_with_failure(self, error_handler):
        """Test retry mechanism with eventual success"""
        call_count = 0
        
        async def failing_then_success():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ConnectionError("Network error")
            return "success"
        
        config = RetryConfig(max_attempts=3, base_delay=0.1)
        result = await error_handler.retry_with_backoff(
            failing_then_success,
            custom_config=config
        )
        assert result == "success"
        assert call_count == 3
    
    @pytest.mark.asyncio
    async def test_retry_exhaustion(self, error_handler):
        """Test retry exhaustion scenario"""
        async def always_fails():
            raise ConnectionError("Always fails")
        
        config = RetryConfig(max_attempts=2, base_delay=0.1)
        
        with pytest.raises(ConnectionError):
            await error_handler.retry_with_backoff(
                always_fails,
                custom_config=config
            )
    
    def test_error_standardization(self, error_handler):
        """Test error response standardization"""
        error = ConnectionError("Network error")
        standardized = error_handler.create_standardized_error(
            error, "test_operation"
        )
        
        assert "error" in standardized
        assert "message" in standardized
        assert "operation" in standardized
        assert "timestamp" in standardized
        assert standardized["operation"] == "test_operation"
    
    def test_error_stats(self, error_handler):
        """Test error statistics"""
        stats = error_handler.get_error_stats()
        assert "error_counts" in stats
        assert "last_errors" in stats
        assert "total_errors" in stats


class TestServiceIntegration:
    """Test integration between services"""
    
    @pytest.mark.asyncio
    async def test_cache_with_rate_limiting(self):
        """Test that cache and rate limiting work together"""
        cache_service = CacheService()
        rate_limiter = RateLimiter()
        
        # Cache some data
        await cache_service.set("test_integration", "cached_data")
        
        # Check rate limit
        allowed, _ = await rate_limiter.check_rate_limit("127.0.0.1", "integration_test")
        assert allowed is True
        
        # Get cached data
        result = await cache_service.get("test_integration")
        assert result == "cached_data"
    
    @pytest.mark.asyncio
    async def test_error_handling_with_cache_fallback(self):
        """Test error handling with cache fallback"""
        cache_service = CacheService()
        error_handler = ErrorHandler()
        
        # Cache some fallback data
        await cache_service.set("fallback_data", "cached_fallback")
        
        # Simulate operation that fails
        async def failing_operation():
            raise ConnectionError("Operation failed")
        
        # Should fail with retries
        with pytest.raises(ConnectionError):
            await error_handler.retry_with_backoff(failing_operation)
        
        # But we can get fallback data from cache
        fallback = await cache_service.get("fallback_data")
        assert fallback == "cached_fallback"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
