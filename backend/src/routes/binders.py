from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import List, Optional
import csv
import io
from ..database.models import Binder, BinderCard, Card, ValidationError

router = APIRouter()


@router.get("/", response_model=List[dict])
async def get_binders(include_card_details: bool = True):
    """Get all binders for the default user with optional card details"""
    try:
        binders = Binder.get_by_user(user_id=1)
        result = []
        
        for binder in binders:
            binder_data = {
                "id": binder.id,
                "uuid": binder.uuid,
                "name": binder.name,
                "description": binder.description,
                "tags": binder.tags,
                "is_default": binder.is_default,
                "created_at": (
                    binder.created_at.isoformat() if binder.created_at else None
                ),
                "updated_at": (
                    binder.updated_at.isoformat() if binder.updated_at else None
                ),
                "card_count": binder.get_card_count(),
                "total_quantity": binder.get_total_card_quantity(),
            }
            
            # Include card details if requested
            if include_card_details:
                from ..database.models import Card
                
                cards = binder.get_cards()
                binder_data["cards"] = []
                
                for binder_card in cards:
                    # Get card details from database cache (no external API calls)
                    card_details = Card.get_by_id(binder_card.card_id, fetch_if_missing=False)
                    
                    card_entry = {
                        "id": binder_card.id,
                        "card_id": binder_card.card_id,
                        "card_name": binder_card.card_name,
                        "quantity": binder_card.quantity,
                        "set_code": binder_card.set_code,
                        "rarity": binder_card.rarity,
                        "condition": binder_card.condition,
                        "edition": binder_card.edition,
                        "notes": binder_card.notes,
                        "date_added": (
                            binder_card.date_added.isoformat() if binder_card.date_added else None
                        ),
                    }
                    
                    # Include full card details if available in cache
                    if card_details:
                        card_entry["card_details"] = {
                            "id": card_details.id,
                            "name": card_details.name,
                            "type": card_details.type,
                            "desc": card_details.description,
                            "atk": card_details.atk,
                            "def": card_details.def_,
                            "level": card_details.level,
                            "race": card_details.race,
                            "attribute": card_details.attribute,
                            "archetype": card_details.archetype,
                            "scale": card_details.scale,
                            "linkval": card_details.linkval,
                            "linkmarkers": card_details.linkmarkers,
                            "card_images": card_details.card_images,
                            "card_sets": card_details.card_sets,
                            "banlist_info": card_details.banlist_info,
                        }
                    
                    binder_data["cards"].append(card_entry)
            
            result.append(binder_data)
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=dict)
async def create_binder(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
):
    """Create a new binder"""
    try:
        # Parse tags if provided
        tag_list = []
        if tags:
            tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()]

        binder = Binder(
            user_id=1,
            name=name,
            description=description,
            tags=tag_list,
        )
        binder.save()

        return {
            "id": binder.id,
            "uuid": binder.uuid,
            "name": binder.name,
            "description": binder.description,
            "tags": binder.tags,
            "created_at": binder.created_at.isoformat() if binder.created_at else None,
        }
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=e.errors)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{binder_uuid}", response_model=dict)
async def get_binder(binder_uuid: str, include_card_details: bool = False):
    """Get a specific binder with its cards and optionally card details"""
    try:
        binder = Binder.get_by_uuid(binder_uuid)
        if not binder:
            raise HTTPException(status_code=404, detail="Binder not found")

        cards = binder.get_cards()

        # Build the response
        response = {
            "id": binder.id,
            "uuid": binder.uuid,
            "name": binder.name,
            "description": binder.description,
            "tags": binder.tags,
            "is_default": binder.is_default,
            "created_at": binder.created_at.isoformat() if binder.created_at else None,
            "updated_at": binder.updated_at.isoformat() if binder.updated_at else None,
            "cards": [],
        }

        # If card details are requested, fetch them from the database cache
        if include_card_details:
            from ..database.models import Card
            
            for binder_card in cards:
                try:
                    # Get card details from database cache (no external API calls)
                    card_details = Card.get_by_id(binder_card.card_id, fetch_if_missing=False)
                    
                    card_entry = {
                        "id": binder_card.id,
                        "card_id": binder_card.card_id,
                        "card_name": binder_card.card_name,
                        "quantity": binder_card.quantity,
                        "set_code": binder_card.set_code,
                        "rarity": binder_card.rarity,
                        "condition": binder_card.condition,
                        "edition": binder_card.edition,
                        "notes": binder_card.notes,
                        "date_added": (
                            binder_card.date_added.isoformat() if binder_card.date_added else None
                        ),
                    }
                    
                    # Include full card details if available in cache
                    if card_details:
                        card_entry["card_details"] = {
                            "id": card_details.id,
                            "name": card_details.name,
                            "type": card_details.type,
                            "desc": card_details.description,
                            "atk": card_details.atk,
                            "def": card_details.def_,
                            "level": card_details.level,
                            "race": card_details.race,
                            "attribute": card_details.attribute,
                            "archetype": card_details.archetype,
                            "scale": card_details.scale,
                            "linkval": card_details.linkval,
                            "linkmarkers": card_details.linkmarkers,
                            "card_images": card_details.card_images,
                            "card_sets": card_details.card_sets,
                            "banlist_info": card_details.banlist_info,
                        }
                    
                    response["cards"].append(card_entry)
                    
                except Exception as card_error:
                    print(f"Error processing card {binder_card.card_id}: {card_error}")
                    # Still include the basic card info even if details fail
                    card_entry = {
                        "id": binder_card.id,
                        "card_id": binder_card.card_id,
                        "card_name": binder_card.card_name,
                        "quantity": binder_card.quantity,
                        "set_code": binder_card.set_code,
                        "rarity": binder_card.rarity,
                        "condition": binder_card.condition,
                        "edition": binder_card.edition,
                        "notes": binder_card.notes,
                        "date_added": (
                            binder_card.date_added.isoformat() if binder_card.date_added else None
                        ),
                    }
                    response["cards"].append(card_entry)
        else:
            # Just include basic binder card info without details
            response["cards"] = [
                {
                    "id": card.id,
                    "card_id": card.card_id,
                    "card_name": card.card_name,
                    "quantity": card.quantity,
                    "set_code": card.set_code,
                    "rarity": card.rarity,
                    "condition": card.condition,
                    "edition": card.edition,
                    "notes": card.notes,
                    "date_added": (
                        card.date_added.isoformat() if card.date_added else None
                    ),
                }
                for card in cards
            ]

        return response
    except Exception as e:
        print(f"Error in get_binder: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{binder_uuid}", response_model=dict)
async def update_binder(
    binder_uuid: str,
    name: str = Form(...),
    description: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
):
    """Update a binder"""
    try:
        binder = Binder.get_by_uuid(binder_uuid)
        if not binder:
            raise HTTPException(status_code=404, detail="Binder not found")

        # Parse tags if provided
        tag_list = []
        if tags:
            tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()]

        binder.name = name
        binder.description = description
        binder.tags = tag_list
        binder.save()

        return {
            "id": binder.id,
            "uuid": binder.uuid,
            "name": binder.name,
            "description": binder.description,
            "tags": binder.tags,
            "updated_at": binder.updated_at.isoformat() if binder.updated_at else None,
        }
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=e.errors)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{binder_uuid}")
async def delete_binder(binder_uuid: str):
    """Delete a binder"""
    try:
        binder = Binder.get_by_uuid(binder_uuid)
        if not binder:
            raise HTTPException(status_code=404, detail="Binder not found")

        binder.delete()
        return {"message": "Binder deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{binder_uuid}/import-csv")
async def import_csv_to_binder(
    binder_uuid: str,
    file: UploadFile = File(...),
    create_new: bool = Form(False),
    binder_name: Optional[str] = Form(None),
):
    """Import cards from CSV file to a binder"""
    try:
        # Validate file type
        if not file.filename.endswith(".csv"):
            raise HTTPException(status_code=400, detail="File must be a CSV")

        # Read CSV content
        content = await file.read()
        csv_content = content.decode("utf-8")

        # Get or create binder
        if create_new:
            if not binder_name:
                binder_name = f"Imported - {file.filename}"

            binder = Binder(
                user_id=1,
                name=binder_name,
                description=f"Imported from {file.filename}",
            )
            binder.save()
        else:
            binder = Binder.get_by_uuid(binder_uuid)
            if not binder:
                raise HTTPException(status_code=404, detail="Binder not found")

        # Parse CSV and import cards
        result = await parse_and_import_csv(csv_content, binder)

        return {
            "success": True,
            "binder_uuid": binder.uuid,
            "binder_name": binder.name,
            "imported_cards": result["imported_cards"],
            "errors": result["errors"],
            "warnings": result["warnings"],
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


async def parse_and_import_csv(csv_content: str, binder: Binder) -> dict:
    """Parse CSV content and import cards to binder"""
    errors = []
    warnings = []
    imported_cards = 0

    try:
        # Parse CSV
        csv_reader = csv.DictReader(io.StringIO(csv_content))

        # Check if it's the new format
        fieldnames = csv_reader.fieldnames
        if not fieldnames:
            errors.append("CSV file appears to be empty")
            return {"imported_cards": 0, "errors": errors, "warnings": warnings}

        # Normalize field names
        fieldnames_lower = [name.lower().strip() for name in fieldnames]

        # Check format type
        is_new_format = (
            "cardname" in fieldnames_lower
            and "cardq" in fieldnames_lower
            and "cardid" in fieldnames_lower
        )

        if is_new_format:
            # New format: cardname, cardq, cardid, cardrarity, cardcondition, card_edition, cardset, cardcode
            for row_num, row in enumerate(csv_reader, start=2):
                try:
                    card_id = int(row.get("cardid", 0))
                    quantity = int(row.get("cardq", 0))

                    if card_id <= 0 or quantity <= 0:
                        warnings.append(
                            f"Row {row_num}: Invalid card ID ({card_id}) or quantity ({quantity})"
                        )
                        continue

                    # ONLY get card from cache, DO NOT fetch from API during import
                    card = Card.get_by_id(card_id, fetch_if_missing=False)
                    if not card:
                        # Skip missing cards with a warning
                        warnings.append(
                            f"Row {row_num}: Card {card_id} ({row.get('cardname', 'Unknown')}) not found in cache. Please sync card database first."
                        )
                        continue

                    # Map condition abbreviations to full names
                    condition_mapping = {
                        "M": "Mint",
                        "NM": "Near Mint",
                        "LP": "Lightly Played",
                        "MP": "Moderately Played",
                        "HP": "Heavily Played",
                        "D": "Damaged",
                        "": "Near Mint",  # Default for empty values
                    }

                    raw_condition = row.get("cardcondition", "").strip()
                    condition = (
                        condition_mapping.get(raw_condition, raw_condition)
                        or "Near Mint"
                    )

                    # Add card to binder
                    binder.add_card(
                        card_id=card_id,
                        quantity=quantity,
                        set_code=row.get("cardcode", "").strip() or None,
                        rarity=row.get("cardrarity", "").strip() or None,
                        condition=condition,
                        edition=row.get("card_edition", "").strip() or None,
                    )
                    imported_cards += 1

                except (ValueError, ValidationError) as e:
                    warnings.append(f"Row {row_num}: {str(e)}")
                except Exception as e:
                    errors.append(f"Row {row_num}: Unexpected error - {str(e)}")
        else:
            # Legacy format or other format
            errors.append(
                "CSV format not recognized. Expected columns: cardname, cardq, cardid, cardrarity, cardcondition, card_edition, cardset, cardcode"
            )

    except Exception as e:
        errors.append(f"Failed to parse CSV: {str(e)}")

    return {
        "imported_cards": imported_cards,
        "errors": errors,
        "warnings": warnings,
    }


@router.post("/{binder_uuid}/cards")
async def add_card_to_binder(
    binder_uuid: str,
    card_id: int = Form(...),
    quantity: int = Form(1),
    set_code: Optional[str] = Form(None),
    rarity: Optional[str] = Form(None),
    condition: str = Form("Near Mint"),
    edition: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
):
    """Add a card to a binder"""
    try:
        binder = Binder.get_by_uuid(binder_uuid)
        if not binder:
            raise HTTPException(status_code=404, detail="Binder not found")

        # Fetch card info if not cached
        card = Card.get_by_id(card_id, fetch_if_missing=True)
        if not card:
            raise HTTPException(
                status_code=404, detail=f"Card with ID {card_id} not found"
            )

        binder_card = binder.add_card(
            card_id=card_id,
            quantity=quantity,
            set_code=set_code,
            rarity=rarity,
            condition=condition,
            edition=edition,
            notes=notes,
        )

        return {
            "id": binder_card.id,
            "card_id": binder_card.card_id,
            "quantity": binder_card.quantity,
            "set_code": binder_card.set_code,
            "rarity": binder_card.rarity,
            "condition": binder_card.condition,
            "edition": binder_card.edition,
            "notes": binder_card.notes,
        }

    except ValidationError as e:
        raise HTTPException(status_code=400, detail=e.errors)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
