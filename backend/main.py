from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
import httpx
from typing import List, Optional
from pydantic import BaseModel

app = FastAPI(
    title="Yu-Gi-Oh Deck Builder API",
    description="API for managing Yu-Gi-Oh card collections and deck building",
    version="1.0.0",
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models for API responses
class Card(BaseModel):
    id: int
    name: str
    type: str
    desc: str
    atk: Optional[int] = None
    def_: Optional[int] = None
    level: Optional[int] = None
    race: Optional[str] = None
    attribute: Optional[str] = None
    card_images: Optional[List[dict]] = None


class CardSearchResponse(BaseModel):
    data: List[Card]


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


@app.get("/api/cards/search")
async def search_cards(
    name: Optional[str] = None,
    type: Optional[str] = None,
    race: Optional[str] = None,
    attribute: Optional[str] = None,
    level: Optional[int] = None,
    limit: int = 20,
):
    """
    Search for Yu-Gi-Oh cards using the YGOPRODeck API
    """
    try:
        # Build query parameters for YGOPRODeck API
        params = {}
        if name:
            params["fname"] = name
        if type:
            params["type"] = type
        if race:
            params["race"] = race
        if attribute:
            params["attribute"] = attribute
        if level:
            params["level"] = level

        # Add num parameter to limit results
        if limit and limit < 100:  # Only add if limit is reasonable
            params["num"] = limit
            params["offset"] = 0  # Required when using num

        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://db.ygoprodeck.com/api/v7/cardinfo.php",
                params=params,
                timeout=10.0,
            )
            response.raise_for_status()

            data = response.json()
            return {"data": data.get("data", []), "count": len(data.get("data", []))}

    except httpx.TimeoutException:
        return {"error": "Request timeout", "data": [], "count": 0}
    except httpx.HTTPError as e:
        return {"error": f"HTTP error: {str(e)}", "data": [], "count": 0}
    except Exception as e:
        return {"error": f"Unexpected error: {str(e)}", "data": [], "count": 0}


@app.get("/api/cards/random")
async def get_random_cards(count: int = 10):
    """
    Get random Yu-Gi-Oh cards for testing
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://db.ygoprodeck.com/api/v7/randomcard.php", timeout=10.0
            )
            response.raise_for_status()

            # Get single random card, we'll call this multiple times for variety
            data = response.json()
            return {"data": [data], "count": 1}

    except Exception as e:
        return {
            "error": f"Error fetching random cards: {str(e)}",
            "data": [],
            "count": 0,
        }


@app.get("/api/cards/{card_id}")
async def get_card_by_id(card_id: int):
    """
    Get a specific card by its ID
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://db.ygoprodeck.com/api/v7/cardinfo.php?id={card_id}",
                timeout=10.0,
            )
            response.raise_for_status()

            data = response.json()
            if data.get("data"):
                return {"data": data["data"][0]}
            else:
                return {"error": "Card not found", "data": None}

    except Exception as e:
        return {"error": f"Error fetching card: {str(e)}", "data": None}


# Placeholder endpoints for future development
@app.get("/api/binders")
async def get_binders():
    """Get all binders (placeholder)"""
    return {"data": [], "message": "Binder management coming soon"}


@app.get("/api/decks")
async def get_decks():
    """Get all decks (placeholder)"""
    return {"data": [], "message": "Deck management coming soon"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
