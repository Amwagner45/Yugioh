from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class Card(BaseModel):
    """Card model for API responses"""

    id: int
    name: str
    type: str
    desc: str
    atk: Optional[int] = None
    def_: Optional[int] = Field(None, alias="def")
    level: Optional[int] = None
    race: Optional[str] = None
    attribute: Optional[str] = None
    card_images: Optional[List[dict]] = None
    card_sets: Optional[List[dict]] = None
    banlist_info: Optional[dict] = None


class BinderCard(BaseModel):
    """Card entry in a binder"""

    card_id: int
    quantity: int = Field(ge=1)
    set_code: Optional[str] = None
    rarity: Optional[str] = None
    condition: Optional[str] = None
    notes: Optional[str] = None


class Binder(BaseModel):
    """Binder model"""

    id: Optional[str] = None
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    cards: List[BinderCard] = []
    created_at: Optional[datetime] = None
    modified_at: Optional[datetime] = None
    tags: Optional[List[str]] = []


class DeckCard(BaseModel):
    """Card entry in a deck"""

    card_id: int
    quantity: int = Field(ge=1, le=3)


class Deck(BaseModel):
    """Deck model"""

    id: Optional[str] = None
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    format: Optional[str] = None
    main_deck: List[DeckCard] = []
    extra_deck: List[DeckCard] = []
    side_deck: List[DeckCard] = []
    tags: Optional[List[str]] = []
    notes: Optional[str] = Field(None, max_length=1000)
    created_at: Optional[datetime] = None
    modified_at: Optional[datetime] = None


class CardSearchResponse(BaseModel):
    """Response model for card search"""

    data: List[Card]
    count: int
    total: Optional[int] = None  # Total number of results before pagination
    error: Optional[str] = None
    cached: Optional[bool] = False


class ErrorResponse(BaseModel):
    """Standard error response"""

    error: str
    details: Optional[str] = None
