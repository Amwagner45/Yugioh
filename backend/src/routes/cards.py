from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Optional
import httpx
from ..models import Card, CardSearchResponse
from ..services.cache import get_cache_service, CacheService
from ..services.rate_limiter import (
    apply_rate_limit,
    record_request_success,
    record_request_failure,
    request_queue,
    rate_limiter,
)
from ..services.error_handler import (
    error_handler,
    fallback_strategy,
    safe_api_call,
    with_error_handling,
)

router = APIRouter()


async def make_ygoprodeck_request(url: str, params: dict = None):
    """Make a request to YGOPRODeck API with proper error handling"""

    async def _request():
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, timeout=10.0)
            response.raise_for_status()
            return response.json()

    return await request_queue.execute_request(_request)


@router.get("/search", response_model=CardSearchResponse)
async def search_cards(
    request: Request,
    # Basic filters
    name: Optional[str] = None,
    type: Optional[str] = None,
    race: Optional[str] = None,
    attribute: Optional[str] = None,
    level: Optional[int] = None,
    # ATK/DEF filters
    atk: Optional[int] = None,
    atk_min: Optional[int] = None,
    atk_max: Optional[int] = None,
    def_: Optional[int] = None,
    def_min: Optional[int] = None,
    def_max: Optional[int] = None,
    # Advanced filters
    archetype: Optional[str] = None,
    banlist: Optional[str] = None,  # forbidden, limited, semi-limited
    format: Optional[str] = None,  # tcg, ocg, goat, etc.
    sort: Optional[str] = None,  # name, atk, def, level, id
    order: Optional[str] = None,  # asc, desc
    # Set and rarity filters
    cardset: Optional[str] = None,
    rarity: Optional[str] = None,
    # Text search options
    description: Optional[str] = None,  # search in card description
    fuzzy: Optional[bool] = False,  # fuzzy name matching
    # Pagination
    limit: int = 20,
    offset: int = 0,
    cache_service: CacheService = Depends(get_cache_service),
):
    """
    Enhanced search for Yu-Gi-Oh cards with comprehensive filtering options
    """
    # Apply rate limiting
    client_ip = await apply_rate_limit(request, "search", is_external_api=True)

    # Prepare search parameters for YGOPRODeck API
    search_params = {}

    # Basic filters
    if name:
        if fuzzy:
            search_params["fname"] = name  # fuzzy name search
        else:
            search_params["name"] = name  # exact name search

    if type:
        search_params["type"] = type
    if race:
        search_params["race"] = race
    if attribute:
        search_params["attribute"] = attribute
    if level:
        search_params["level"] = level

    # ATK/DEF filters
    if atk is not None:
        search_params["atk"] = atk
    elif atk_min is not None or atk_max is not None:
        # For range queries, we'll need to filter results post-API call
        # YGOPRODeck doesn't support range queries directly
        pass

    if def_ is not None:
        search_params["def"] = def_
    elif def_min is not None or def_max is not None:
        # For range queries, we'll need to filter results post-API call
        pass

    # Advanced filters
    if archetype:
        search_params["archetype"] = archetype
    if banlist:
        search_params["banlist"] = banlist
    if format:
        search_params["format"] = format
    if sort:
        search_params["sort"] = sort
    if order:
        search_params["order"] = order

    # Set and rarity filters
    if cardset:
        search_params["cardset"] = cardset

    # Text description search
    if description:
        search_params["fname"] = description  # Search in description

    # Pagination
    if limit and limit <= 100:  # YGOPRODeck limits to 100
        search_params["num"] = limit
        search_params["offset"] = offset

    # Create cache key from all parameters
    cache_key_params = search_params.copy()
    cache_key_params.update(
        {
            "atk_min": atk_min,
            "atk_max": atk_max,
            "def_min": def_min,
            "def_max": def_max,
            "rarity": rarity,
            "fuzzy": fuzzy,
        }
    )

    # Check cache first
    try:
        cached_results = await cache_service.get_card_search_results(cache_key_params)
        if cached_results is not None:
            await record_request_success(client_ip, "search", is_external_api=False)
            return CardSearchResponse(
                data=cached_results, count=len(cached_results), cached=True
            )
    except Exception as e:
        error_handler.logger.warning(f"Cache lookup failed: {e}")

    # Define the API call function
    async def api_call():
        data = await make_ygoprodeck_request(
            "https://db.ygoprodeck.com/api/v7/cardinfo.php", params=search_params
        )
        return data.get("data", [])

    # Execute with comprehensive error handling
    try:
        card_data = await error_handler.retry_with_backoff(
            api_call, operation_type="api_request"
        )

        # Apply client-side filters that YGOPRODeck doesn't support
        filtered_data = card_data

        # ATK range filter
        if atk_min is not None or atk_max is not None:
            filtered_data = [
                card
                for card in filtered_data
                if card.get("atk") is not None
                and (
                    (atk_min is None or card["atk"] >= atk_min)
                    and (atk_max is None or card["atk"] <= atk_max)
                )
            ]

        # DEF range filter
        if def_min is not None or def_max is not None:
            filtered_data = [
                card
                for card in filtered_data
                if card.get("def") is not None
                and (
                    (def_min is None or card["def"] >= def_min)
                    and (def_max is None or card["def"] <= def_max)
                )
            ]

        # Rarity filter (requires checking card_sets)
        if rarity:
            filtered_data = [
                card
                for card in filtered_data
                if any(
                    card_set.get("set_rarity", "").lower() == rarity.lower()
                    for card_set in card.get("card_sets", [])
                )
            ]

        # Cache the results
        try:
            await cache_service.cache_card_search_results(
                cache_key_params, filtered_data
            )
        except Exception as e:
            error_handler.logger.warning(f"Failed to cache results: {e}")

        # Record successful request
        await record_request_success(client_ip, "search", is_external_api=True)

        return CardSearchResponse(
            data=filtered_data, count=len(filtered_data), cached=False
        )

    except Exception as e:
        await record_request_failure(client_ip, "search", is_external_api=True)

        # Try fallback strategies
        try:
            # Try to get some popular cards as fallback
            fallback_data = await fallback_strategy.get_popular_cards_fallback()

            # Apply basic filters to fallback data
            if name:
                fallback_data = [
                    card
                    for card in fallback_data
                    if name.lower() in card["name"].lower()
                ]

            if type:
                fallback_data = [
                    card
                    for card in fallback_data
                    if type.lower() in card["type"].lower()
                ]

            if race:
                fallback_data = [
                    card
                    for card in fallback_data
                    if card.get("race", "").lower() == race.lower()
                ]

            if attribute:
                fallback_data = [
                    card
                    for card in fallback_data
                    if card.get("attribute", "").lower() == attribute.lower()
                ]

            return CardSearchResponse(
                data=fallback_data,
                count=len(fallback_data),
                error=f"API temporarily unavailable. Showing fallback results.",
                cached=False,
            )
        except Exception:
            # Ultimate fallback
            return CardSearchResponse(
                data=[],
                count=0,
                error=error_handler.create_standardized_error(e, "search")["message"],
                cached=False,
            )


@router.get("/search/advanced")
async def advanced_search(
    request: Request,
    query: str,  # Multi-field search query
    fields: Optional[str] = "name,desc",  # Comma-separated fields to search
    cache_service: CacheService = Depends(get_cache_service),
):
    """
    Advanced multi-field search across card names, descriptions, and other fields
    """
    client_ip = await apply_rate_limit(request, "advanced_search", is_external_api=True)

    search_fields = [f.strip() for f in fields.split(",")]

    try:
        # For advanced search, we'll need to fetch more data and filter client-side
        async def api_call():
            # Search by name first to get a broad set
            data = await make_ygoprodeck_request(
                "https://db.ygoprodeck.com/api/v7/cardinfo.php", params={"fname": query}
            )
            return data.get("data", [])

        card_data = await error_handler.retry_with_backoff(
            api_call, operation_type="api_request"
        )

        # Filter results based on query matching multiple fields
        filtered_data = []
        query_lower = query.lower()

        for card in card_data:
            match_found = False

            if "name" in search_fields and query_lower in card.get("name", "").lower():
                match_found = True
            if "desc" in search_fields and query_lower in card.get("desc", "").lower():
                match_found = True
            if "type" in search_fields and query_lower in card.get("type", "").lower():
                match_found = True
            if "race" in search_fields and query_lower in card.get("race", "").lower():
                match_found = True
            if (
                "attribute" in search_fields
                and query_lower in card.get("attribute", "").lower()
            ):
                match_found = True

            if match_found:
                filtered_data.append(card)

        await record_request_success(client_ip, "advanced_search", is_external_api=True)

        return CardSearchResponse(
            data=filtered_data, count=len(filtered_data), cached=False
        )

    except Exception as e:
        await record_request_failure(client_ip, "advanced_search", is_external_api=True)
        return CardSearchResponse(
            data=[],
            count=0,
            error=error_handler.create_standardized_error(e, "advanced_search")[
                "message"
            ],
            cached=False,
        )


@router.get("/search/filters")
async def get_available_filters(request: Request):
    """
    Get available filter options for the search interface
    """
    await apply_rate_limit(request, "get_filters", is_external_api=False)

    return {
        "types": [
            "Effect Monster",
            "Normal Monster",
            "Ritual Monster",
            "Fusion Monster",
            "Synchro Monster",
            "XYZ Monster",
            "Link Monster",
            "Spell Card",
            "Trap Card",
            "Pendulum Effect Monster",
        ],
        "races": [
            "Warrior",
            "Spellcaster",
            "Dragon",
            "Beast",
            "Fiend",
            "Machine",
            "Aqua",
            "Pyro",
            "Rock",
            "Winged Beast",
            "Plant",
            "Insect",
            "Thunder",
            "Dinosaur",
            "Beast-Warrior",
            "Zombie",
            "Reptile",
            "Psychic",
            "Divine-Beast",
            "Creator God",
            "Wyrm",
            "Cyberse",
        ],
        "attributes": ["LIGHT", "DARK", "WATER", "FIRE", "EARTH", "WIND", "DIVINE"],
        "banlist_status": ["Forbidden", "Limited", "Semi-Limited"],
        "rarities": [
            "Common",
            "Rare",
            "Super Rare",
            "Ultra Rare",
            "Secret Rare",
            "Ghost Rare",
            "Ultimate Rare",
            "Parallel Rare",
            "Gold Rare",
        ],
        "formats": ["TCG", "OCG", "GOAT", "Edison"],
        "sort_options": ["name", "atk", "def", "level", "id"],
        "search_fields": ["name", "desc", "type", "race", "attribute"],
    }


@router.get("/search/suggestions")
async def get_search_suggestions(
    request: Request,
    query: str,
    limit: int = 10,
    cache_service: CacheService = Depends(get_cache_service),
):
    """
    Get search suggestions based on partial query
    """
    client_ip = await apply_rate_limit(request, "suggestions", is_external_api=True)

    if len(query) < 2:
        return {"suggestions": []}

    try:
        # Check cache for suggestions
        cache_key = f"suggestions:{query.lower()}:{limit}"
        cached_suggestions = await cache_service.get(cache_key)
        if cached_suggestions:
            return {"suggestions": cached_suggestions}

        # Search for cards matching the query
        async def api_call():
            data = await make_ygoprodeck_request(
                "https://db.ygoprodeck.com/api/v7/cardinfo.php",
                params={"fname": query, "num": limit * 2},  # Get more to filter
            )
            return data.get("data", [])

        card_data = await error_handler.retry_with_backoff(
            api_call, operation_type="api_request"
        )

        # Extract unique suggestions
        suggestions = []
        seen = set()

        for card in card_data:
            name = card.get("name", "")
            if name and name.lower() not in seen:
                suggestions.append(
                    {"name": name, "id": card.get("id"), "type": card.get("type")}
                )
                seen.add(name.lower())

                if len(suggestions) >= limit:
                    break

        # Cache suggestions for 5 minutes
        await cache_service.set(cache_key, suggestions, ttl=300)

        await record_request_success(client_ip, "suggestions", is_external_api=True)

        return {"suggestions": suggestions}

    except Exception as e:
        await record_request_failure(client_ip, "suggestions", is_external_api=True)
        return {"suggestions": [], "error": str(e)}


async def get_random_cards(
    request: Request,
    count: int = 10,
    cache_service: CacheService = Depends(get_cache_service),
):
    """
    Get random Yu-Gi-Oh cards for testing with error handling
    """
    # Apply rate limiting
    client_ip = await apply_rate_limit(request, "random", is_external_api=True)

    async def api_call():
        data = await make_ygoprodeck_request(
            "https://db.ygoprodeck.com/api/v7/randomcard.php"
        )
        return [data]

    try:
        card_data = await error_handler.retry_with_backoff(
            api_call, operation_type="api_request"
        )

        # Record successful request
        await record_request_success(client_ip, "random", is_external_api=True)

        return CardSearchResponse(data=card_data, count=len(card_data), cached=False)

    except Exception as e:
        await record_request_failure(client_ip, "random", is_external_api=True)

        # Fallback to popular cards
        try:
            import random

            fallback_data = await fallback_strategy.get_popular_cards_fallback()
            random_card = [random.choice(fallback_data)] if fallback_data else []

            return CardSearchResponse(
                data=random_card,
                count=len(random_card),
                error="API temporarily unavailable. Showing fallback card.",
                cached=False,
            )
        except Exception:
            return CardSearchResponse(
                data=[],
                count=0,
                error=error_handler.create_standardized_error(e, "random")["message"],
                cached=False,
            )


@router.get("/{card_id}")
async def get_card_by_id(
    card_id: int,
    request: Request,
    cache_service: CacheService = Depends(get_cache_service),
):
    """
    Get a specific card by its ID with caching, rate limiting, and error handling
    """
    # Apply rate limiting
    client_ip = await apply_rate_limit(request, "get_by_id", is_external_api=True)

    # Check cache first
    try:
        cached_card = await cache_service.get_card_by_id(card_id)
        if cached_card is not None:
            await record_request_success(client_ip, "get_by_id", is_external_api=False)
            return {"data": cached_card, "cached": True}
    except Exception as e:
        error_handler.logger.warning(f"Cache lookup failed: {e}")

    # Define the API call function
    async def api_call():
        data = await make_ygoprodeck_request(
            f"https://db.ygoprodeck.com/api/v7/cardinfo.php?id={card_id}"
        )

        if not data.get("data"):
            raise HTTPException(status_code=404, detail="Card not found")

        return data["data"][0]

    try:
        card_data = await error_handler.retry_with_backoff(
            api_call, operation_type="api_request"
        )

        # Cache the card data
        try:
            await cache_service.cache_card_by_id(card_id, card_data)
        except Exception as e:
            error_handler.logger.warning(f"Failed to cache card: {e}")

        # Record successful request
        await record_request_success(client_ip, "get_by_id", is_external_api=True)

        return {"data": card_data, "cached": False}

    except HTTPException:
        # Re-raise HTTP exceptions (like 404)
        await record_request_failure(client_ip, "get_by_id", is_external_api=True)
        raise
    except Exception as e:
        await record_request_failure(client_ip, "get_by_id", is_external_api=True)

        # Create standardized error response
        error_response = error_handler.create_standardized_error(e, "get_by_id")
        raise HTTPException(status_code=500, detail=error_response)


@router.get("/cache/stats")
async def get_cache_stats(
    request: Request, cache_service: CacheService = Depends(get_cache_service)
):
    """
    Get cache statistics for debugging
    """
    await apply_rate_limit(request, "cache_stats", is_external_api=False)
    return cache_service.get_stats()


@router.get("/rate-limit/stats")
async def get_rate_limit_stats(request: Request):
    """
    Get rate limiting statistics
    """
    await apply_rate_limit(request, "rate_limit_stats", is_external_api=False)
    return rate_limiter.get_stats()


@router.get("/error-handler/stats")
async def get_error_handler_stats(request: Request):
    """
    Get error handling statistics
    """
    await apply_rate_limit(request, "error_stats", is_external_api=False)
    return error_handler.get_error_stats()


@router.delete("/cache/clear")
async def clear_cache(
    request: Request, cache_service: CacheService = Depends(get_cache_service)
):
    """
    Clear all cached data (for debugging)
    """
    await apply_rate_limit(request, "clear_cache", is_external_api=False)
    await cache_service.clear_expired()
    return {"message": "Cache cleared successfully"}
