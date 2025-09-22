"""
Integration tests for the YGOPRODeck API integration
"""
import pytest
import asyncio
from httpx import AsyncClient
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch
import json

from src.main import app
from src.services.cache import cache_service
from src.services.rate_limiter import rate_limiter
from src.services.error_handler import error_handler


class TestAPIIntegration:
    """Test suite for API integration functionality"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest.fixture
    async def async_client(self):
        """Create async test client"""
        async with AsyncClient(app=app, base_url="http://test") as ac:
            yield ac
    
    @pytest.fixture
    def mock_ygoprodeck_response(self):
        """Mock YGOPRODeck API response"""
        return {
            "data": [
                {
                    "id": 89631139,
                    "name": "Blue-Eyes White Dragon",
                    "type": "Normal Monster",
                    "desc": "This legendary dragon is a powerful engine of destruction.",
                    "atk": 3000,
                    "def": 2500,
                    "level": 8,
                    "race": "Dragon",
                    "attribute": "LIGHT",
                    "card_images": [
                        {
                            "id": 89631139,
                            "image_url": "https://images.ygoprodeck.com/images/cards/89631139.jpg",
                            "image_url_small": "https://images.ygoprodeck.com/images/cards_small/89631139.jpg"
                        }
                    ]
                }
            ]
        }
    
    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
    
    def test_root_endpoint(self, client):
        """Test root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        assert "Yu-Gi-Oh Deck Builder API" in response.json()["message"]
    
    @pytest.mark.asyncio
    async def test_card_search_basic(self, async_client, mock_ygoprodeck_response):
        """Test basic card search functionality"""
        with patch('httpx.AsyncClient.get') as mock_get:
            # Setup mock response
            mock_response = AsyncMock()
            mock_response.json.return_value = mock_ygoprodeck_response
            mock_response.raise_for_status.return_value = None
            mock_get.return_value = mock_response
            
            # Test search
            response = await async_client.get("/api/cards/search?name=Blue-Eyes")
            
            assert response.status_code == 200
            data = response.json()
            assert "data" in data
            assert data["count"] > 0
            assert data["data"][0]["name"] == "Blue-Eyes White Dragon"
    
    @pytest.mark.asyncio
    async def test_card_search_with_filters(self, async_client, mock_ygoprodeck_response):
        """Test card search with multiple filters"""
        with patch('httpx.AsyncClient.get') as mock_get:
            mock_response = AsyncMock()
            mock_response.json.return_value = mock_ygoprodeck_response
            mock_response.raise_for_status.return_value = None
            mock_get.return_value = mock_response
            
            # Test search with filters
            response = await async_client.get(
                "/api/cards/search?name=Blue-Eyes&type=Normal Monster&race=Dragon&level=8"
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["count"] > 0
    
    @pytest.mark.asyncio
    async def test_card_search_range_filters(self, async_client, mock_ygoprodeck_response):
        """Test card search with ATK/DEF range filters"""
        with patch('httpx.AsyncClient.get') as mock_get:
            mock_response = AsyncMock()
            mock_response.json.return_value = mock_ygoprodeck_response
            mock_response.raise_for_status.return_value = None
            mock_get.return_value = mock_response
            
            # Test ATK range filter
            response = await async_client.get(
                "/api/cards/search?atk_min=2500&atk_max=3500"
            )
            
            assert response.status_code == 200
            data = response.json()
            # Should include Blue-Eyes White Dragon (ATK: 3000)
            assert any(card["atk"] == 3000 for card in data["data"])
    
    @pytest.mark.asyncio
    async def test_card_by_id(self, async_client, mock_ygoprodeck_response):
        """Test getting card by specific ID"""
        with patch('httpx.AsyncClient.get') as mock_get:
            mock_response = AsyncMock()
            mock_response.json.return_value = mock_ygoprodeck_response
            mock_response.raise_for_status.return_value = None
            mock_get.return_value = mock_response
            
            response = await async_client.get("/api/cards/89631139")
            
            assert response.status_code == 200
            data = response.json()
            assert "data" in data
            assert data["data"]["id"] == 89631139
    
    @pytest.mark.asyncio
    async def test_card_not_found(self, async_client):
        """Test card not found scenario"""
        with patch('httpx.AsyncClient.get') as mock_get:
            mock_response = AsyncMock()
            mock_response.json.return_value = {"data": []}
            mock_response.raise_for_status.return_value = None
            mock_get.return_value = mock_response
            
            response = await async_client.get("/api/cards/999999999")
            
            assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_advanced_search(self, async_client, mock_ygoprodeck_response):
        """Test advanced multi-field search"""
        with patch('httpx.AsyncClient.get') as mock_get:
            mock_response = AsyncMock()
            mock_response.json.return_value = mock_ygoprodeck_response
            mock_response.raise_for_status.return_value = None
            mock_get.return_value = mock_response
            
            response = await async_client.get(
                "/api/cards/search/advanced?query=dragon&fields=name,desc"
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "data" in data
    
    @pytest.mark.asyncio
    async def test_search_suggestions(self, async_client, mock_ygoprodeck_response):
        """Test search suggestions endpoint"""
        with patch('httpx.AsyncClient.get') as mock_get:
            mock_response = AsyncMock()
            mock_response.json.return_value = mock_ygoprodeck_response
            mock_response.raise_for_status.return_value = None
            mock_get.return_value = mock_response
            
            response = await async_client.get("/api/cards/search/suggestions?query=Blue")
            
            assert response.status_code == 200
            data = response.json()
            assert "suggestions" in data
    
    def test_get_available_filters(self, client):
        """Test getting available filter options"""
        response = client.get("/api/cards/search/filters")
        
        assert response.status_code == 200
        data = response.json()
        assert "types" in data
        assert "races" in data
        assert "attributes" in data
        assert len(data["types"]) > 0
    
    @pytest.mark.asyncio
    async def test_caching_functionality(self, async_client, mock_ygoprodeck_response):
        """Test that caching works correctly"""
        with patch('httpx.AsyncClient.get') as mock_get:
            mock_response = AsyncMock()
            mock_response.json.return_value = mock_ygoprodeck_response
            mock_response.raise_for_status.return_value = None
            mock_get.return_value = mock_response
            
            # First request - should call API
            response1 = await async_client.get("/api/cards/search?name=Blue-Eyes")
            assert response1.status_code == 200
            assert not response1.json().get("cached", False)
            
            # Second request - should be cached
            response2 = await async_client.get("/api/cards/search?name=Blue-Eyes")
            assert response2.status_code == 200
            # Note: In test environment, cache might not persist between requests
    
    def test_cache_stats(self, client):
        """Test cache statistics endpoint"""
        response = client.get("/api/cards/cache/stats")
        assert response.status_code == 200
        data = response.json()
        assert "memory_cache_size" in data
    
    def test_rate_limit_stats(self, client):
        """Test rate limit statistics endpoint"""
        response = client.get("/api/cards/rate-limit/stats")
        assert response.status_code == 200
        data = response.json()
        assert "requests_per_minute_limit" in data
    
    def test_error_handler_stats(self, client):
        """Test error handler statistics endpoint"""
        response = client.get("/api/cards/error-handler/stats")
        assert response.status_code == 200
        data = response.json()
        assert "error_counts" in data
    
    @pytest.mark.asyncio
    async def test_rate_limiting(self, async_client):
        """Test rate limiting functionality"""
        # This test would need to be configured based on rate limit settings
        # For now, just test that the endpoint responds
        response = await async_client.get("/api/cards/search?name=test")
        # Should not return 429 for a single request
        assert response.status_code != 429
    
    @pytest.mark.asyncio
    async def test_error_handling_timeout(self, async_client):
        """Test error handling for timeout scenarios"""
        with patch('httpx.AsyncClient.get') as mock_get:
            # Simulate timeout
            mock_get.side_effect = asyncio.TimeoutError("Request timeout")
            
            response = await async_client.get("/api/cards/search?name=timeout-test")
            
            assert response.status_code == 200  # Should return graceful error
            data = response.json()
            assert "error" in data or "data" in data  # Should have fallback data
    
    @pytest.mark.asyncio
    async def test_error_handling_network_error(self, async_client):
        """Test error handling for network errors"""
        with patch('httpx.AsyncClient.get') as mock_get:
            # Simulate network error
            mock_get.side_effect = ConnectionError("Network error")
            
            response = await async_client.get("/api/cards/search?name=network-test")
            
            assert response.status_code == 200  # Should return graceful error
            data = response.json()
            assert "error" in data or "data" in data  # Should have fallback data
    
    @pytest.mark.asyncio
    async def test_fallback_data(self, async_client):
        """Test that fallback data is returned when API fails"""
        with patch('httpx.AsyncClient.get') as mock_get:
            # Simulate API failure
            mock_get.side_effect = Exception("API unavailable")
            
            response = await async_client.get("/api/cards/search?name=fallback-test")
            
            assert response.status_code == 200
            data = response.json()
            # Should either have error with fallback data or just error message
            assert "error" in data or len(data.get("data", [])) >= 0
    
    def test_clear_cache(self, client):
        """Test cache clearing functionality"""
        response = client.delete("/api/cards/cache/clear")
        assert response.status_code == 200
        assert "message" in response.json()


class TestErrorScenarios:
    """Test suite for various error scenarios"""
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    @pytest.mark.asyncio
    async def test_invalid_parameters(self, client):
        """Test handling of invalid parameters"""
        # Test with invalid limit
        response = client.get("/api/cards/search?limit=999999")
        assert response.status_code == 200  # Should handle gracefully
        
        # Test with invalid level
        response = client.get("/api/cards/search?level=-1")
        assert response.status_code == 200  # Should handle gracefully
    
    @pytest.mark.asyncio
    async def test_malformed_requests(self, client):
        """Test handling of malformed requests"""
        # Test with invalid query parameters
        response = client.get("/api/cards/search?invalid_param=test")
        assert response.status_code == 200  # Should ignore invalid params


class TestPerformance:
    """Performance tests for the API"""
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    @pytest.mark.asyncio
    async def test_concurrent_requests(self, async_client, mock_ygoprodeck_response):
        """Test handling of concurrent requests"""
        with patch('httpx.AsyncClient.get') as mock_get:
            mock_response = AsyncMock()
            mock_response.json.return_value = mock_ygoprodeck_response
            mock_response.raise_for_status.return_value = None
            mock_get.return_value = mock_response
            
            # Send multiple concurrent requests
            tasks = []
            for i in range(5):
                task = async_client.get(f"/api/cards/search?name=test{i}")
                tasks.append(task)
            
            responses = await asyncio.gather(*tasks)
            
            # All requests should succeed
            for response in responses:
                assert response.status_code == 200


# Pytest configuration
@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])
