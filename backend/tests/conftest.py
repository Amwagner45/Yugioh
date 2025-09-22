"""
Test configuration and fixtures
"""
import pytest
import asyncio
from httpx import AsyncClient
from fastapi.testclient import TestClient

from src.main import app


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    yield loop
    loop.close()


@pytest.fixture
def test_client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
async def async_test_client():
    """Create an async test client for the FastAPI app."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


@pytest.fixture
def sample_card_data():
    """Sample card data for testing."""
    return {
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


@pytest.fixture
def sample_api_response(sample_card_data):
    """Sample API response for testing."""
    return {
        "data": [sample_card_data]
    }


@pytest.fixture
def mock_ygoprodeck_response(sample_api_response):
    """Mock YGOPRODeck API response."""
    return sample_api_response
