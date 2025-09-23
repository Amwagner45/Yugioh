from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from ..database.models import Deck, DeckCard, ValidationError

router = APIRouter()


class CreateDeckRequest(BaseModel):
    name: str
    description: Optional[str] = None
    format: Optional[str] = None
    binder_id: Optional[int] = None
    tags: List[str] = []
    notes: Optional[str] = None


class UpdateDeckRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    format: Optional[str] = None
    binder_id: Optional[int] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None


class DeckResponse(BaseModel):
    id: int
    uuid: str
    name: str
    description: Optional[str]
    format: Optional[str]
    binder_id: Optional[int]
    tags: List[str]
    notes: Optional[str]
    is_valid: bool
    validation_errors: List[str]
    created_at: str
    updated_at: str
    main_deck: List[dict] = []
    extra_deck: List[dict] = []
    side_deck: List[dict] = []


@router.get("/", response_model=List[DeckResponse])
async def get_decks():
    """Get all decks for the user"""
    try:
        decks = Deck.get_by_user(user_id=1)
        deck_responses = []

        for deck in decks:
            # Get cards for each section
            main_deck = [
                {
                    "card_id": card.card_id,
                    "quantity": card.quantity,
                    "card_name": card.card_name,
                    "card_type": card.card_type,
                }
                for card in deck.get_cards("main")
            ]
            extra_deck = [
                {
                    "card_id": card.card_id,
                    "quantity": card.quantity,
                    "card_name": card.card_name,
                    "card_type": card.card_type,
                }
                for card in deck.get_cards("extra")
            ]
            side_deck = [
                {
                    "card_id": card.card_id,
                    "quantity": card.quantity,
                    "card_name": card.card_name,
                    "card_type": card.card_type,
                }
                for card in deck.get_cards("side")
            ]

            deck_responses.append(
                DeckResponse(
                    id=deck.id,
                    uuid=deck.uuid,
                    name=deck.name,
                    description=deck.description,
                    format=deck.format,
                    binder_id=deck.binder_id,
                    tags=deck.tags,
                    notes=deck.notes,
                    is_valid=deck.is_valid,
                    validation_errors=deck.validation_errors,
                    created_at=deck.created_at.isoformat() if deck.created_at else "",
                    updated_at=deck.updated_at.isoformat() if deck.updated_at else "",
                    main_deck=main_deck,
                    extra_deck=extra_deck,
                    side_deck=side_deck,
                )
            )

        return deck_responses
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=DeckResponse)
async def create_deck(deck_request: CreateDeckRequest):
    """Create a new deck"""
    try:
        deck = Deck(
            user_id=1,
            name=deck_request.name,
            description=deck_request.description,
            format=deck_request.format,
            binder_id=deck_request.binder_id,
            tags=deck_request.tags,
            notes=deck_request.notes,
        )
        deck.save()

        return DeckResponse(
            id=deck.id,
            uuid=deck.uuid,
            name=deck.name,
            description=deck.description,
            format=deck.format,
            binder_id=deck.binder_id,
            tags=deck.tags,
            notes=deck.notes,
            is_valid=deck.is_valid,
            validation_errors=deck.validation_errors,
            created_at=deck.created_at.isoformat() if deck.created_at else "",
            updated_at=deck.updated_at.isoformat() if deck.updated_at else "",
            main_deck=[],
            extra_deck=[],
            side_deck=[],
        )
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=e.errors)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{deck_id}", response_model=DeckResponse)
async def get_deck(deck_id: str):
    """Get a specific deck"""
    try:
        # Try to get by UUID first, then by ID
        deck = Deck.get_by_uuid(deck_id)
        if not deck:
            try:
                deck_id_int = int(deck_id)
                deck = Deck.get_by_id(deck_id_int)
            except ValueError:
                deck = None

        if not deck:
            raise HTTPException(status_code=404, detail="Deck not found")

        # Get cards for each section
        main_deck = [
            {
                "card_id": card.card_id,
                "quantity": card.quantity,
                "card_name": card.card_name,
                "card_type": card.card_type,
            }
            for card in deck.get_cards("main")
        ]
        extra_deck = [
            {
                "card_id": card.card_id,
                "quantity": card.quantity,
                "card_name": card.card_name,
                "card_type": card.card_type,
            }
            for card in deck.get_cards("extra")
        ]
        side_deck = [
            {
                "card_id": card.card_id,
                "quantity": card.quantity,
                "card_name": card.card_name,
                "card_type": card.card_type,
            }
            for card in deck.get_cards("side")
        ]

        return DeckResponse(
            id=deck.id,
            uuid=deck.uuid,
            name=deck.name,
            description=deck.description,
            format=deck.format,
            binder_id=deck.binder_id,
            tags=deck.tags,
            notes=deck.notes,
            is_valid=deck.is_valid,
            validation_errors=deck.validation_errors,
            created_at=deck.created_at.isoformat() if deck.created_at else "",
            updated_at=deck.updated_at.isoformat() if deck.updated_at else "",
            main_deck=main_deck,
            extra_deck=extra_deck,
            side_deck=side_deck,
        )
    except Exception as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail="Deck not found")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{deck_id}", response_model=DeckResponse)
async def update_deck(deck_id: str, deck_request: UpdateDeckRequest):
    """Update a deck"""
    try:
        # Try to get by UUID first, then by ID
        deck = Deck.get_by_uuid(deck_id)
        if not deck:
            try:
                deck_id_int = int(deck_id)
                deck = Deck.get_by_id(deck_id_int)
            except ValueError:
                deck = None

        if not deck:
            raise HTTPException(status_code=404, detail="Deck not found")

        # Update fields that were provided
        if deck_request.name is not None:
            deck.name = deck_request.name
        if deck_request.description is not None:
            deck.description = deck_request.description
        if deck_request.format is not None:
            deck.format = deck_request.format
        if deck_request.binder_id is not None:
            deck.binder_id = deck_request.binder_id
        if deck_request.tags is not None:
            deck.tags = deck_request.tags
        if deck_request.notes is not None:
            deck.notes = deck_request.notes

        deck.save()

        # Get updated card data
        main_deck = [
            {
                "card_id": card.card_id,
                "quantity": card.quantity,
                "card_name": card.card_name,
                "card_type": card.card_type,
            }
            for card in deck.get_cards("main")
        ]
        extra_deck = [
            {
                "card_id": card.card_id,
                "quantity": card.quantity,
                "card_name": card.card_name,
                "card_type": card.card_type,
            }
            for card in deck.get_cards("extra")
        ]
        side_deck = [
            {
                "card_id": card.card_id,
                "quantity": card.quantity,
                "card_name": card.card_name,
                "card_type": card.card_type,
            }
            for card in deck.get_cards("side")
        ]

        return DeckResponse(
            id=deck.id,
            uuid=deck.uuid,
            name=deck.name,
            description=deck.description,
            format=deck.format,
            binder_id=deck.binder_id,
            tags=deck.tags,
            notes=deck.notes,
            is_valid=deck.is_valid,
            validation_errors=deck.validation_errors,
            created_at=deck.created_at.isoformat() if deck.created_at else "",
            updated_at=deck.updated_at.isoformat() if deck.updated_at else "",
            main_deck=main_deck,
            extra_deck=extra_deck,
            side_deck=side_deck,
        )
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=e.errors)
    except Exception as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail="Deck not found")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{deck_id}")
async def delete_deck(deck_id: str):
    """Delete a deck"""
    try:
        # Try to get by UUID first, then by ID
        deck = Deck.get_by_uuid(deck_id)
        if not deck:
            try:
                deck_id_int = int(deck_id)
                deck = Deck.get_by_id(deck_id_int)
            except ValueError:
                deck = None

        if not deck:
            raise HTTPException(status_code=404, detail="Deck not found")

        success = deck.delete()
        if success:
            return {"message": "Deck deleted successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete deck")
    except Exception as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail="Deck not found")
        raise HTTPException(status_code=500, detail=str(e))


# Card management endpoints
@router.post("/{deck_id}/cards")
async def add_card_to_deck(
    deck_id: str, card_id: int, section: str = "main", quantity: int = 1
):
    """Add a card to a deck section"""
    try:
        deck = Deck.get_by_uuid(deck_id)
        if not deck:
            try:
                deck_id_int = int(deck_id)
                deck = Deck.get_by_id(deck_id_int)
            except ValueError:
                deck = None

        if not deck:
            raise HTTPException(status_code=404, detail="Deck not found")

        if section not in ["main", "extra", "side"]:
            raise HTTPException(
                status_code=400, detail="Section must be 'main', 'extra', or 'side'"
            )

        deck_card = deck.add_card(card_id, section, quantity)

        return {
            "message": "Card added successfully",
            "deck_card": {
                "card_id": deck_card.card_id,
                "section": deck_card.section,
                "quantity": deck_card.quantity,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{deck_id}/cards/{card_id}")
async def remove_card_from_deck(
    deck_id: str, card_id: int, section: str = "main", quantity: int = 1
):
    """Remove cards from a deck section"""
    try:
        deck = Deck.get_by_uuid(deck_id)
        if not deck:
            try:
                deck_id_int = int(deck_id)
                deck = Deck.get_by_id(deck_id_int)
            except ValueError:
                deck = None

        if not deck:
            raise HTTPException(status_code=404, detail="Deck not found")

        if section not in ["main", "extra", "side"]:
            raise HTTPException(
                status_code=400, detail="Section must be 'main', 'extra', or 'side'"
            )

        success = deck.remove_card(card_id, section, quantity)

        if success:
            return {"message": "Card removed successfully"}
        else:
            raise HTTPException(status_code=404, detail="Card not found in deck")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{deck_id}/validate")
async def validate_deck(deck_id: str):
    """Validate deck composition according to Yu-Gi-Oh rules"""
    try:
        deck = Deck.get_by_uuid(deck_id)
        if not deck:
            try:
                deck_id_int = int(deck_id)
                deck = Deck.get_by_id(deck_id_int)
            except ValueError:
                deck = None

        if not deck:
            raise HTTPException(status_code=404, detail="Deck not found")

        validation_errors = deck.validate_deck_composition()
        deck.save()  # Save updated validation status

        return {
            "is_valid": deck.is_valid,
            "validation_errors": validation_errors,
            "statistics": deck.get_deck_statistics(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
