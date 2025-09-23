"""
Banlist management routes for Yu-Gi-Oh deck builder API
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from typing import List, Optional, Dict, Any
import json
import re
import tempfile
import os
from datetime import datetime

from ..database.models import Banlist, Card

router = APIRouter(prefix="/api/banlists", tags=["banlists"])


@router.get("/", include_in_schema=False)
@router.get("")
async def get_all_banlists(include_inactive: bool = False):
    """Get all banlists"""
    try:
        banlists = Banlist.get_all(include_inactive=include_inactive)
        return {
            "banlists": [banlist.to_dict() for banlist in banlists],
            "count": len(banlists),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{banlist_id}")
async def get_banlist(banlist_id: str):
    """Get banlist by ID or UUID"""
    try:
        # Try UUID first, then integer ID
        banlist = Banlist.get_by_uuid(banlist_id)
        if not banlist:
            try:
                banlist_id_int = int(banlist_id)
                banlist = Banlist.get_by_id(banlist_id_int)
            except ValueError:
                banlist = None

        if not banlist:
            raise HTTPException(status_code=404, detail="Banlist not found")

        return banlist.to_dict()

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/")
async def create_banlist(data: Dict[str, Any]):
    """Create a new banlist"""
    try:
        banlist = Banlist.from_dict(data)
        success = banlist.save()

        if not success:
            raise HTTPException(status_code=400, detail="Failed to create banlist")

        return banlist.to_dict()

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{banlist_id}")
async def update_banlist(banlist_id: str, data: Dict[str, Any]):
    """Update an existing banlist"""
    try:
        # Get existing banlist
        banlist = Banlist.get_by_uuid(banlist_id)
        if not banlist:
            try:
                banlist_id_int = int(banlist_id)
                banlist = Banlist.get_by_id(banlist_id_int)
            except ValueError:
                banlist = None

        if not banlist:
            raise HTTPException(status_code=404, detail="Banlist not found")

        # Update fields
        banlist.name = data.get("name", banlist.name)
        banlist.description = data.get("description", banlist.description)
        banlist.format_type = data.get("format_type", banlist.format_type)
        banlist.is_official = data.get("is_official", banlist.is_official)
        banlist.is_active = data.get("is_active", banlist.is_active)

        # Handle date fields
        if data.get("start_date"):
            banlist.start_date = datetime.fromisoformat(data["start_date"])
        if data.get("end_date"):
            banlist.end_date = datetime.fromisoformat(data["end_date"])

        # Update card lists
        banlist.forbidden_cards = data.get("forbidden_cards", banlist.forbidden_cards)
        banlist.limited_cards = data.get("limited_cards", banlist.limited_cards)
        banlist.semi_limited_cards = data.get(
            "semi_limited_cards", banlist.semi_limited_cards
        )
        banlist.whitelist_cards = data.get("whitelist_cards", banlist.whitelist_cards)

        success = banlist.save()
        if not success:
            raise HTTPException(status_code=400, detail="Failed to update banlist")

        return banlist.to_dict()

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{banlist_id}")
async def delete_banlist(banlist_id: str):
    """Delete a banlist"""
    try:
        # Get existing banlist
        banlist = Banlist.get_by_uuid(banlist_id)
        if not banlist:
            try:
                banlist_id_int = int(banlist_id)
                banlist = Banlist.get_by_id(banlist_id_int)
            except ValueError:
                banlist = None

        if not banlist:
            raise HTTPException(status_code=404, detail="Banlist not found")

        success = banlist.delete()
        if not success:
            raise HTTPException(status_code=400, detail="Failed to delete banlist")

        return {"message": "Banlist deleted successfully"}

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{banlist_id}/cards/{card_id}")
async def add_card_to_banlist(
    banlist_id: str, card_id: int, restriction_type: str = Form(...)
):
    """Add a card to a banlist with specified restriction"""
    try:
        # Validate restriction type
        valid_restrictions = ["forbidden", "limited", "semi_limited", "whitelist"]
        if restriction_type not in valid_restrictions:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid restriction type. Must be one of: {', '.join(valid_restrictions)}",
            )

        # Get banlist
        banlist = Banlist.get_by_uuid(banlist_id)
        if not banlist:
            try:
                banlist_id_int = int(banlist_id)
                banlist = Banlist.get_by_id(banlist_id_int)
            except ValueError:
                banlist = None

        if not banlist:
            raise HTTPException(status_code=404, detail="Banlist not found")

        # Verify card exists
        card = Card.get_by_id(card_id)
        if not card:
            raise HTTPException(status_code=404, detail="Card not found")

        # Add card to appropriate list
        success = banlist.add_card_to_list(card_id, restriction_type)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to add card to banlist")

        # Save banlist
        success = banlist.save()
        if not success:
            raise HTTPException(status_code=400, detail="Failed to save banlist")

        return {"message": f"Card {card.name} added to {restriction_type} list"}

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{banlist_id}/cards/{card_id}")
async def remove_card_from_banlist(banlist_id: str, card_id: int):
    """Remove a card from all restriction lists in a banlist"""
    try:
        # Get banlist
        banlist = Banlist.get_by_uuid(banlist_id)
        if not banlist:
            try:
                banlist_id_int = int(banlist_id)
                banlist = Banlist.get_by_id(banlist_id_int)
            except ValueError:
                banlist = None

        if not banlist:
            raise HTTPException(status_code=404, detail="Banlist not found")

        # Remove card from all lists
        banlist.remove_card_from_all_lists(card_id)

        # Save banlist
        success = banlist.save()
        if not success:
            raise HTTPException(status_code=400, detail="Failed to save banlist")

        return {"message": "Card removed from banlist"}

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{banlist_id}/cards/{card_id}/restriction")
async def get_card_restriction(banlist_id: str, card_id: int):
    """Get restriction level for a specific card in a banlist"""
    try:
        # Get banlist
        banlist = Banlist.get_by_uuid(banlist_id)
        if not banlist:
            try:
                banlist_id_int = int(banlist_id)
                banlist = Banlist.get_by_id(banlist_id_int)
            except ValueError:
                banlist = None

        if not banlist:
            raise HTTPException(status_code=404, detail="Banlist not found")

        restriction = banlist.get_card_restriction(card_id)
        max_copies = banlist.get_max_copies(card_id)

        return {
            "card_id": card_id,
            "restriction": restriction,
            "max_copies": max_copies,
        }

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/import/lflist")
async def import_lflist_file(file: UploadFile = File(...)):
    """Import a banlist from .lflist.conf file"""
    try:
        if not file.filename.endswith(".lflist.conf"):
            raise HTTPException(
                status_code=400, detail="File must be a .lflist.conf file"
            )

        # Read file content
        content = await file.read()
        content_str = content.decode("utf-8")

        # Parse the lflist file
        banlist = parse_lflist_content(content_str, file.filename)

        # Save to database
        success = banlist.save()
        if not success:
            raise HTTPException(
                status_code=400, detail="Failed to save imported banlist"
            )

        return {
            "message": f"Successfully imported banlist: {banlist.name}",
            "banlist": banlist.to_dict(),
        }

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{banlist_id}/export/lflist")
async def export_banlist_to_lflist(banlist_id: str):
    """Export a banlist to .lflist.conf file"""
    try:
        # Get banlist
        banlist = Banlist.get_by_uuid(banlist_id)
        if not banlist:
            try:
                banlist_id_int = int(banlist_id)
                banlist = Banlist.get_by_id(banlist_id_int)
            except ValueError:
                banlist = None

        if not banlist:
            raise HTTPException(status_code=404, detail="Banlist not found")

        # Generate lflist content
        lflist_content = generate_lflist_content(banlist)

        # Create temporary file
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".lflist.conf", delete=False
        ) as tmp:
            tmp.write(lflist_content)
            tmp_path = tmp.name

        # Return file
        filename = f"{banlist.name.replace(' ', '_').lower()}.lflist.conf"

        return FileResponse(
            path=tmp_path,
            media_type="text/plain",
            filename=filename,
            background=None,  # File will be deleted after response
        )

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{banlist_id}/validate-deck")
async def validate_deck_against_banlist(banlist_id: str, deck_data: Dict[str, Any]):
    """Validate a deck against a banlist"""
    try:
        # Get banlist
        banlist = Banlist.get_by_uuid(banlist_id)
        if not banlist:
            try:
                banlist_id_int = int(banlist_id)
                banlist = Banlist.get_by_id(banlist_id_int)
            except ValueError:
                banlist = None

        if not banlist:
            raise HTTPException(status_code=404, detail="Banlist not found")

        # Validate deck
        violations = []
        is_valid = True

        # Combine all deck cards
        all_cards = []
        all_cards.extend(deck_data.get("mainDeck", []))
        all_cards.extend(deck_data.get("extraDeck", []))
        all_cards.extend(deck_data.get("sideDeck", []))

        # Group cards by ID and sum quantities
        card_totals = {}
        for card in all_cards:
            card_id = card["cardId"]
            quantity = card["quantity"]

            if card_id in card_totals:
                card_totals[card_id] += quantity
            else:
                card_totals[card_id] = quantity

        # Check each card against banlist
        for card_id, total_quantity in card_totals.items():
            max_allowed = banlist.get_max_copies(card_id)
            restriction = banlist.get_card_restriction(card_id)

            if total_quantity > max_allowed:
                is_valid = False
                card = Card.get_by_id(card_id)
                card_name = card.name if card else f"Card ID {card_id}"

                violations.append(
                    {
                        "card_id": card_id,
                        "card_name": card_name,
                        "current_quantity": total_quantity,
                        "max_allowed": max_allowed,
                        "restriction": restriction,
                    }
                )

        return {
            "is_valid": is_valid,
            "violations": violations,
            "banlist_name": banlist.name,
        }

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


def parse_lflist_content(content: str, filename: str) -> Banlist:
    """Parse .lflist.conf file content into Banlist object"""
    lines = content.strip().split("\n")

    # Initialize banlist
    banlist = Banlist()
    banlist.format_type = "Custom"
    banlist.is_official = False

    current_section = None

    for line in lines:
        line = line.strip()

        # Skip empty lines
        if not line:
            continue

        # Handle banlist name (first line starting with !)
        if line.startswith("!") and not banlist.name:
            banlist.name = line[1:].strip()
            continue

        # Handle metadata
        if line.startswith("--StartDate"):
            date_str = line.split(" ", 1)[1].strip()
            try:
                banlist.start_date = datetime.fromisoformat(date_str)
            except ValueError:
                pass
        elif line.startswith("--EndDate"):
            date_str = line.split(" ", 1)[1].strip()
            try:
                banlist.end_date = datetime.fromisoformat(date_str)
            except ValueError:
                pass
        elif line.startswith("$whitelist"):
            current_section = "whitelist"
        elif line.startswith("#forbidden"):
            current_section = "forbidden"
        elif line.startswith("#limited"):
            current_section = "limited"
        elif line.startswith("#semi-limited"):
            current_section = "semi_limited"
        elif line.startswith("#whitelist"):
            current_section = "whitelist"
        elif line.startswith("#") or line.startswith("--"):
            # Skip other comments and metadata
            continue
        else:
            # Parse card entry
            if current_section and line:
                # Extract card ID and limit (format: "12345678 1 --Card Name")
                parts = line.split(" ", 2)
                if len(parts) >= 2:
                    try:
                        card_id = int(parts[0])
                        limit = int(parts[1])

                        # Add card to appropriate list based on current section
                        if current_section == "forbidden":
                            banlist.forbidden_cards.append(card_id)
                        elif current_section == "limited":
                            banlist.limited_cards.append(card_id)
                        elif current_section == "semi_limited":
                            banlist.semi_limited_cards.append(card_id)
                        elif current_section == "whitelist":
                            banlist.whitelist_cards.append(card_id)

                    except ValueError:
                        # Skip invalid lines
                        continue

    # Set default name if not found
    if not banlist.name:
        banlist.name = filename.replace(".lflist.conf", "").replace("_", " ").title()

    return banlist


def generate_lflist_content(banlist: Banlist) -> str:
    """Generate .lflist.conf content from Banlist object"""
    lines = []

    # Header with banlist name
    lines.append(f"!{banlist.name}")

    # Metadata
    if banlist.start_date:
        lines.append(f"--StartDate {banlist.start_date.strftime('%Y-%m-%d')}")
    if banlist.end_date:
        lines.append(f"--EndDate {banlist.end_date.strftime('%Y-%m-%d')}")

    # Whitelist section (if any)
    if banlist.whitelist_cards:
        lines.append("$whitelist")
        for card_id in banlist.whitelist_cards:
            card = Card.get_by_id(card_id)
            card_name = card.name if card else f"Unknown Card {card_id}"
            lines.append(f"{card_id} 3 --{card_name}")

    # Forbidden section
    if banlist.forbidden_cards:
        lines.append("#forbidden")
        for card_id in banlist.forbidden_cards:
            card = Card.get_by_id(card_id)
            card_name = card.name if card else f"Unknown Card {card_id}"
            lines.append(f"{card_id} 0 --{card_name}")

    # Limited section
    if banlist.limited_cards:
        lines.append("#limited")
        for card_id in banlist.limited_cards:
            card = Card.get_by_id(card_id)
            card_name = card.name if card else f"Unknown Card {card_id}"
            lines.append(f"{card_id} 1 --{card_name}")

    # Semi-limited section
    if banlist.semi_limited_cards:
        lines.append("#semi-limited")
        for card_id in banlist.semi_limited_cards:
            card = Card.get_by_id(card_id)
            card_name = card.name if card else f"Unknown Card {card_id}"
            lines.append(f"{card_id} 2 --{card_name}")

    return "\n".join(lines)
