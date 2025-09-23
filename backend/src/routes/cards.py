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
            response = await client.get(
                url, params=params, timeout=30.0
            )  # Increased timeout
            response.raise_for_status()
            return response.json()

    return await request_queue.execute_request(_request)


@router.get("/test-api")
async def test_api_connection(request: Request):
    """Test YGOPRODeck API connection with a simple request"""
    await apply_rate_limit(request, "test_api", is_external_api=True)

    try:
        # Simple request for a known card
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://db.ygoprodeck.com/api/v7/cardinfo.php?id=89631139",  # Blue-Eyes White Dragon
                timeout=30.0,
            )
            response.raise_for_status()
            data = response.json()
            return {"status": "success", "data": data.get("data", [])}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@router.get("/search", response_model=CardSearchResponse)
async def search_cards(
    request: Request,
    # Basic filters
    name: Optional[str] = None,  # Fuzzy name search (like fname in YGOPRODeck API)
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
    # Apply rate limiting (local database search, not external API)
    client_ip = await apply_rate_limit(request, "search", is_external_api=False)

    # Build search filters for local database
    search_filters = {}

    # Basic filters
    # Handle name for fuzzy name search (like fname in YGOPRODeck API)
    if name:
        search_filters["name_fuzzy"] = name
    if type:
        search_filters["type"] = type
    if race:
        search_filters["race"] = race
    if attribute:
        search_filters["attribute"] = attribute
    if level:
        search_filters["level"] = level
    if archetype:
        search_filters["archetype"] = archetype

    # ATK/DEF range filters
    if atk is not None:
        search_filters["atk_min"] = atk
        search_filters["atk_max"] = atk
    else:
        if atk_min is not None:
            search_filters["atk_min"] = atk_min
        if atk_max is not None:
            search_filters["atk_max"] = atk_max

    if def_ is not None:
        search_filters["def_min"] = def_
        search_filters["def_max"] = def_
    else:
        if def_min is not None:
            search_filters["def_min"] = def_min
        if def_max is not None:
            search_filters["def_max"] = def_max

    # Create cache key from all parameters
    cache_key_params = search_filters.copy()
    cache_key_params.update(
        {
            "name": name,
            "cardset": cardset,
            "rarity": rarity,
            "description": description,
            "fuzzy": fuzzy,
            "limit": limit,
            "offset": offset,
        }
    )

    # Check memory cache first
    try:
        cached_results = await cache_service.get_card_search_results(cache_key_params)
        if cached_results is not None:
            await record_request_success(client_ip, "search", is_external_api=False)
            return CardSearchResponse(
                data=cached_results, count=len(cached_results), cached=True
            )
    except Exception as e:
        error_handler.logger.warning(f"Memory cache lookup failed: {e}")

    # Search local database
    try:
        from ..database.models import Card

        # Get cards from local database
        card_models = Card.search_by_filters(search_filters)

        # Convert card models to API format
        card_data = []
        for card in card_models:
            card_dict = {
                "id": card.id,
                "name": card.name,
                "type": card.type,
                "desc": card.description,
                "atk": card.atk,
                "def": card.def_,
                "level": card.level,
                "race": card.race,
                "attribute": card.attribute,
                "archetype": card.archetype,
                "scale": card.scale,
                "linkval": card.linkval,
                "linkmarkers": card.linkmarkers,
                "card_images": card.card_images,
                "card_sets": card.card_sets,
                "banlist_info": card.banlist_info,
            }
            card_data.append(card_dict)

        # Apply additional filters that require post-processing
        filtered_data = card_data

        # Description/text search filter
        if description:
            filtered_data = [
                card
                for card in filtered_data
                if description.lower() in card.get("desc", "").lower()
            ]

        # Set filter (requires checking card_sets)
        if cardset:
            set_code_mapping = {
                "LOB": "Legend of Blue Eyes White Dragon",
                "MRD": "Metal Raiders",
                "SDP": "Starter Deck: Pegasus",
                "SDK": "Starter Deck: Kaiba",
                "SDY": "Starter Deck: Yugi",
                "MRL": "Magic Ruler",
                "PSV": "Pharaoh's Servant",
                "LON": "Labyrinth of Nightmare",
                "LOD": "Legacy of Darkness",
                "PGD": "Pharaonic Guardian",
                "MFC": "Magician's Force",
                "DCR": "Dark Crisis",
                "IOC": "Invasion of Chaos",
                "AST": "Ancient Sanctuary",
                "SOD": "Soul of the Duelist",
                "RDS": "Rise of Destiny",
                "FET": "Flaming Eternity",
                "TLM": "The Lost Millennium",
                "CRV": "Cybernetic Revolution",
                "EEN": "Elemental Energy",
            }

            # Get the full set name for comparison
            full_set_name = set_code_mapping.get(cardset, cardset)

            filtered_data = [
                card
                for card in filtered_data
                if any(
                    cardset.upper() in card_set.get("set_code", "").upper()
                    or cardset.lower() in card_set.get("set_name", "").lower()
                    or full_set_name.lower() in card_set.get("set_name", "").lower()
                    for card_set in card.get("card_sets", [])
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

        # Apply sorting
        if sort:
            reverse_order = order and order.lower() == "desc"
            if sort == "name":
                filtered_data.sort(
                    key=lambda x: x.get("name", ""), reverse=reverse_order
                )
            elif sort == "atk":
                filtered_data.sort(
                    key=lambda x: x.get("atk") or 0, reverse=reverse_order
                )
            elif sort == "def":
                filtered_data.sort(
                    key=lambda x: x.get("def") or 0, reverse=reverse_order
                )
            elif sort == "level":
                filtered_data.sort(
                    key=lambda x: x.get("level") or 0, reverse=reverse_order
                )
            elif sort == "id":
                filtered_data.sort(key=lambda x: x.get("id", 0), reverse=reverse_order)

        # Cache the results
        try:
            await cache_service.cache_card_search_results(
                cache_key_params, filtered_data
            )
        except Exception as e:
            error_handler.logger.warning(f"Failed to cache results: {e}")

        # Apply pagination
        total_count = len(filtered_data)
        start_idx = offset
        end_idx = min(offset + limit, total_count)
        paginated_data = filtered_data[start_idx:end_idx]

        # Record successful request
        await record_request_success(client_ip, "search", is_external_api=False)

        return CardSearchResponse(
            data=paginated_data,
            count=len(paginated_data),
            total=total_count,
            cached=False,
        )

    except Exception as e:
        await record_request_failure(client_ip, "search", is_external_api=False)
        error_handler.logger.warning(f"Database search failed: {str(e)}")

        # Fallback: try external API if local search fails
        error_handler.logger.warning("Falling back to external API search")

        # Apply rate limiting for external API
        client_ip = await apply_rate_limit(
            request, "search_fallback", is_external_api=True
        )

        # Prepare search parameters for YGOPRODeck API fallback
        search_params = {}
        if name:
            search_params["fname"] = name
        if type:
            search_params["type"] = type
        if race:
            search_params["race"] = race
        if attribute:
            search_params["attribute"] = attribute
        if level:
            search_params["level"] = level
        if archetype:
            search_params["archetype"] = archetype

        # Define the API call function for fallback
        async def api_call():
            print(f"Making fallback API request with params: {search_params}")
            data = await make_ygoprodeck_request(
                "https://db.ygoprodeck.com/api/v7/cardinfo.php", params=search_params
            )
            return data.get("data", [])

        try:
            card_data = await error_handler.retry_with_backoff(
                api_call, operation_type="api_request"
            )

            # Apply basic filtering to fallback data
            filtered_data = card_data
            if name:
                filtered_data = [
                    card
                    for card in filtered_data
                    if name.lower() in card.get("name", "").lower()
                ]

            # Cache and return fallback results
            try:
                await cache_service.cache_card_search_results(
                    cache_key_params, filtered_data
                )
            except Exception as e:
                error_handler.logger.warning(f"Failed to cache fallback results: {e}")

            # Apply pagination
            total_count = len(filtered_data)
            start_idx = offset
            end_idx = min(offset + limit, total_count)
            paginated_data = filtered_data[start_idx:end_idx]

            # Record successful request
            await record_request_success(
                client_ip, "search_fallback", is_external_api=True
            )

            return CardSearchResponse(
                data=paginated_data,
                count=len(paginated_data),
                total=total_count,
                cached=False,
                error="Local search failed. Showing external API results.",
            )

        except Exception as fallback_error:
            await record_request_failure(
                client_ip, "search_fallback", is_external_api=True
            )
            error_handler.logger.error(
                f"Both local and external search failed: {fallback_error}"
            )

            return CardSearchResponse(
                data=[],
                count=0,
                total=0,
                cached=False,
                error="Search temporarily unavailable. Please try again later.",
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
    # Apply rate limiting (local database search, not external API)
    client_ip = await apply_rate_limit(
        request, "advanced_search", is_external_api=False
    )

    search_fields = [f.strip() for f in fields.split(",")]

    try:
        # Search local database for all cards, then filter by fields
        from ..database.models import Card
        from ..database import get_db_connection

        # Get all cards from local database (we'll filter them manually)
        # For efficiency, we could add a direct text search to the database in the future
        with get_db_connection() as conn:
            cursor = conn.execute(
                "SELECT * FROM card_cache LIMIT 5000"
            )  # Limit for performance
            all_cards = [Card.from_db_row(row) for row in cursor.fetchall()]

        # Convert to API format and filter results based on query matching multiple fields
        filtered_data = []
        query_lower = query.lower()

        for card in all_cards:
            match_found = False

            # Convert card to dict format
            card_dict = {
                "id": card.id,
                "name": card.name,
                "type": card.type,
                "desc": card.description,
                "atk": card.atk,
                "def": card.def_,
                "level": card.level,
                "race": card.race,
                "attribute": card.attribute,
                "archetype": card.archetype,
                "scale": card.scale,
                "linkval": card.linkval,
                "linkmarkers": card.linkmarkers,
                "card_images": card.card_images,
                "card_sets": card.card_sets,
                "banlist_info": card.banlist_info,
            }

            # Check if query matches any of the specified fields
            if (
                "name" in search_fields
                and query_lower in card_dict.get("name", "").lower()
            ):
                match_found = True
            if (
                "desc" in search_fields
                and query_lower in card_dict.get("desc", "").lower()
            ):
                match_found = True
            if (
                "type" in search_fields
                and query_lower in card_dict.get("type", "").lower()
            ):
                match_found = True
            if (
                "race" in search_fields
                and query_lower in card_dict.get("race", "").lower()
            ):
                match_found = True
            if (
                "attribute" in search_fields
                and query_lower in card_dict.get("attribute", "").lower()
            ):
                match_found = True

            if match_found:
                filtered_data.append(card_dict)

        await record_request_success(
            client_ip, "advanced_search", is_external_api=False
        )

        return CardSearchResponse(
            data=filtered_data, count=len(filtered_data), cached=False
        )

    except Exception as e:
        await record_request_failure(
            client_ip, "advanced_search", is_external_api=False
        )
        error_handler.logger.warning(f"Local advanced search failed: {str(e)}")

        # Fallback to external API if local search fails
        error_handler.logger.warning("Falling back to external API for advanced search")

        # Apply rate limiting for external API
        client_ip = await apply_rate_limit(
            request, "advanced_search_fallback", is_external_api=True
        )

        try:
            # Fallback to external API
            async def api_call():
                data = await make_ygoprodeck_request(
                    "https://db.ygoprodeck.com/api/v7/cardinfo.php",
                    params={"fname": query},
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

                if (
                    "name" in search_fields
                    and query_lower in card.get("name", "").lower()
                ):
                    match_found = True
                if (
                    "desc" in search_fields
                    and query_lower in card.get("desc", "").lower()
                ):
                    match_found = True
                if (
                    "type" in search_fields
                    and query_lower in card.get("type", "").lower()
                ):
                    match_found = True
                if (
                    "race" in search_fields
                    and query_lower in card.get("race", "").lower()
                ):
                    match_found = True
                if (
                    "attribute" in search_fields
                    and query_lower in card.get("attribute", "").lower()
                ):
                    match_found = True

                if match_found:
                    filtered_data.append(card)

            await record_request_success(
                client_ip, "advanced_search_fallback", is_external_api=True
            )

            return CardSearchResponse(
                data=filtered_data,
                count=len(filtered_data),
                cached=False,
                error="Local search failed. Showing external API results.",
            )

        except Exception as fallback_error:
            await record_request_failure(
                client_ip, "advanced_search_fallback", is_external_api=True
            )
            return CardSearchResponse(
                data=[],
                count=0,
                error="Advanced search temporarily unavailable. Please try again later.",
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
    # Apply rate limiting (local database search, not external API)
    client_ip = await apply_rate_limit(request, "suggestions", is_external_api=False)

    if len(query) < 2:
        return {"suggestions": []}

    try:
        # Check cache for suggestions
        cache_key = f"suggestions:{query.lower()}:{limit}"
        cached_suggestions = await cache_service.get(cache_key)
        if cached_suggestions:
            return {"suggestions": cached_suggestions}

        # Search local database for cards matching the query
        from ..database.models import Card

        # Use the existing search_by_name method for suggestions
        matching_cards = Card.search_by_name(query, exact_match=False)

        # Extract unique suggestions
        suggestions = []
        seen = set()

        for card in matching_cards:
            name = card.name
            if name and name.lower() not in seen:
                suggestions.append({"name": name, "id": card.id, "type": card.type})
                seen.add(name.lower())

                if len(suggestions) >= limit:
                    break

        # Cache suggestions for 5 minutes
        await cache_service.set(cache_key, suggestions, ttl=300)

        await record_request_success(client_ip, "suggestions", is_external_api=False)

        return {"suggestions": suggestions}

    except Exception as e:
        await record_request_failure(client_ip, "suggestions", is_external_api=False)
        error_handler.logger.warning(f"Local suggestions search failed: {str(e)}")

        # Fallback to external API if local search fails
        error_handler.logger.warning("Falling back to external API for suggestions")

        # Apply rate limiting for external API
        client_ip = await apply_rate_limit(
            request, "suggestions_fallback", is_external_api=True
        )

        try:
            # Search for cards matching the query from external API
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

            await record_request_success(
                client_ip, "suggestions_fallback", is_external_api=True
            )

            return {
                "suggestions": suggestions,
                "error": "Local search failed. Showing external API results.",
            }

        except Exception as fallback_error:
            await record_request_failure(
                client_ip, "suggestions_fallback", is_external_api=True
            )
            return {
                "suggestions": [],
                "error": "Suggestions temporarily unavailable. Please try again later.",
            }


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
    client_ip = await apply_rate_limit(request, "get_by_id", is_external_api=False)

    # Check memory cache first
    try:
        cached_card = await cache_service.get_card_by_id(card_id)
        if cached_card is not None:
            await record_request_success(client_ip, "get_by_id", is_external_api=False)
            return {"data": cached_card, "cached": True}
    except Exception as e:
        error_handler.logger.warning(f"Memory cache lookup failed: {e}")

    # Check database cache (this is where all bulk-synced cards are stored)
    from ..database.models import Card

    try:
        card = Card.get_by_id(card_id, fetch_if_missing=False)
        if card is not None:
            # Convert card model to dict format
            card_data = {
                "id": card.id,
                "name": card.name,
                "type": card.type,
                "desc": card.description,
                "atk": card.atk,
                "def": card.def_,
                "level": card.level,
                "race": card.race,
                "attribute": card.attribute,
                "archetype": card.archetype,
                "scale": card.scale,
                "linkval": card.linkval,
                "linkmarkers": card.linkmarkers,
                "card_images": card.card_images,
                "card_sets": card.card_sets,
                "banlist_info": card.banlist_info,
            }

            # Store in memory cache for faster access next time
            try:
                await cache_service.cache_card_by_id(card_id, card_data)
            except Exception as e:
                error_handler.logger.warning(f"Failed to cache card in memory: {e}")

            await record_request_success(client_ip, "get_by_id", is_external_api=False)
            return {"data": card_data, "cached": True}
    except Exception as e:
        error_handler.logger.warning(f"Database cache lookup failed: {e}")

    # Only make external API call if card is not in database (which shouldn't happen after bulk sync)
    error_handler.logger.warning(
        f"Card {card_id} not found in local database cache, attempting external API call"
    )

    # Apply rate limiting for external API
    client_ip = await apply_rate_limit(request, "get_by_id", is_external_api=True)

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

        # Cache the card data in both memory and database
        try:
            await cache_service.cache_card_by_id(card_id, card_data)
            # Also save to database for future use
            card = Card.from_api_response(card_data)
            card.save()
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


# Bulk Card Synchronization Routes
from fastapi import BackgroundTasks
from ..services.bulk_card_sync import bulk_sync_service


@router.get("/sync/status")
async def get_sync_status():
    """Get current card synchronization status"""
    try:
        status = bulk_sync_service.get_sync_status()
        return status
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error getting sync status: {str(e)}"
        )


@router.post("/sync/start")
async def start_sync(background_tasks: BackgroundTasks):
    """Start card synchronization in the background"""
    try:
        # Check if sync is already needed
        if not bulk_sync_service.needs_sync():
            return {
                "status": "skipped",
                "message": "Card database is already up to date",
            }

        # Start sync in background
        background_tasks.add_task(bulk_sync_service.sync_all_cards)

        return {
            "status": "started",
            "message": "Card synchronization started in background",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error starting sync: {str(e)}")


@router.post("/sync/force")
async def force_sync(background_tasks: BackgroundTasks):
    """Force card synchronization regardless of version"""
    try:
        # Force sync by bypassing version check
        background_tasks.add_task(bulk_sync_service.sync_all_cards)

        return {
            "status": "started",
            "message": "Force card synchronization started in background",
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error starting force sync: {str(e)}"
        )


@router.get("/sync/version")
async def check_api_version():
    """Check YGOPRODeck API database version"""
    try:
        version_info = bulk_sync_service.check_db_version()
        return version_info
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error checking API version: {str(e)}"
        )
