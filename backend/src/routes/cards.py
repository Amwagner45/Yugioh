from fastapi import APIRouter, HTTPException
from typing import Optional
import httpx
from ..models import Card, CardSearchResponse

router = APIRouter()


@router.get("/search", response_model=CardSearchResponse)
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
            return CardSearchResponse(
                data=data.get("data", []), count=len(data.get("data", []))
            )

    except httpx.TimeoutException:
        return CardSearchResponse(data=[], count=0, error="Request timeout")
    except httpx.HTTPError as e:
        return CardSearchResponse(data=[], count=0, error=f"HTTP error: {str(e)}")
    except Exception as e:
        return CardSearchResponse(data=[], count=0, error=f"Unexpected error: {str(e)}")


@router.get("/random", response_model=CardSearchResponse)
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
            return CardSearchResponse(data=[data], count=1)

    except Exception as e:
        return CardSearchResponse(
            data=[], count=0, error=f"Error fetching random cards: {str(e)}"
        )


@router.get("/{card_id}")
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
                raise HTTPException(status_code=404, detail="Card not found")

    except httpx.HTTPError:
        raise HTTPException(status_code=404, detail="Card not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching card: {str(e)}")
