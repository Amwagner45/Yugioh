"""
Database models for Yu-Gi-Oh Deck Builder
SQLAlchemy-style models for database operations
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import json
import uuid
from dataclasses import dataclass, field
from ..database import get_db_connection


class ValidationError(Exception):
    """Custom exception for validation errors"""

    def __init__(self, errors: List[str]):
        self.errors = errors
        super().__init__(f"Validation failed: {', '.join(errors)}")


class ModelValidator:
    """Utility class for common validation operations"""

    @staticmethod
    def validate_string_length(
        value: str, field_name: str, min_length: int = 0, max_length: int = None
    ) -> List[str]:
        """Validate string length constraints"""
        errors = []

        if value is None:
            if min_length > 0:
                errors.append(f"{field_name} cannot be None")
            return errors

        value = str(value).strip()

        if len(value) < min_length:
            errors.append(f"{field_name} must be at least {min_length} characters")

        if max_length and len(value) > max_length:
            errors.append(f"{field_name} cannot exceed {max_length} characters")

        return errors

    @staticmethod
    def validate_integer_range(
        value: int, field_name: str, min_value: int = None, max_value: int = None
    ) -> List[str]:
        """Validate integer range constraints"""
        errors = []

        if value is None:
            return errors

        if min_value is not None and value < min_value:
            errors.append(f"{field_name} must be at least {min_value}")

        if max_value is not None and value > max_value:
            errors.append(f"{field_name} cannot exceed {max_value}")

        return errors

    @staticmethod
    def validate_list_length(
        value: List[Any], field_name: str, max_length: int = None
    ) -> List[str]:
        """Validate list length constraints"""
        errors = []

        if value is None:
            return errors

        if max_length is not None and len(value) > max_length:
            errors.append(f"{field_name} cannot have more than {max_length} items")

        return errors

    @staticmethod
    def validate_choice(value: str, field_name: str, choices: List[str]) -> List[str]:
        """Validate that value is in allowed choices"""
        errors = []

        if value is not None and value not in choices:
            errors.append(f"{field_name} must be one of: {', '.join(choices)}")

        return errors


@dataclass
class User:
    """User model for database operations"""

    id: Optional[int] = None
    username: str = ""
    email: Optional[str] = None
    display_name: Optional[str] = None
    preferences: Dict[str, Any] = field(default_factory=dict)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @classmethod
    def get_default_user(cls) -> "User":
        """Get the default user for single-user mode"""
        with get_db_connection() as conn:
            cursor = conn.execute("SELECT * FROM users WHERE id = 1")
            row = cursor.fetchone()
            if row:
                return cls.from_db_row(row)
            else:
                # Create default user if not exists
                user = cls(id=1, username="default", display_name="Default User")
                user.save()
                return user

    @classmethod
    def from_db_row(cls, row) -> "User":
        """Create User from database row"""
        preferences = json.loads(row["preferences"]) if row["preferences"] else {}
        return cls(
            id=row["id"],
            username=row["username"],
            email=row["email"],
            display_name=row["display_name"],
            preferences=preferences,
            created_at=(
                datetime.fromisoformat(row["created_at"]) if row["created_at"] else None
            ),
            updated_at=(
                datetime.fromisoformat(row["updated_at"]) if row["updated_at"] else None
            ),
        )

    def save(self) -> "User":
        """Save user to database"""
        with get_db_connection() as conn:
            if self.id and self.id > 0:
                # Update existing user
                conn.execute(
                    """
                    UPDATE users SET username = ?, email = ?, display_name = ?, 
                           preferences = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """,
                    (
                        self.username,
                        self.email,
                        self.display_name,
                        json.dumps(self.preferences),
                        self.id,
                    ),
                )
            else:
                # Insert new user
                if self.id == 1:
                    # Special case for default user - insert with specific ID
                    conn.execute(
                        """
                        INSERT OR REPLACE INTO users (id, username, email, display_name, preferences)
                        VALUES (?, ?, ?, ?, ?)
                    """,
                        (
                            1,
                            self.username,
                            self.email,
                            self.display_name,
                            json.dumps(self.preferences),
                        ),
                    )
                    self.id = 1
                else:
                    # Regular insert with auto-generated ID
                    cursor = conn.execute(
                        """
                        INSERT INTO users (username, email, display_name, preferences)
                        VALUES (?, ?, ?, ?)
                    """,
                        (
                            self.username,
                            self.email,
                            self.display_name,
                            json.dumps(self.preferences),
                        ),
                    )
                    self.id = cursor.lastrowid
            conn.commit()
        return self


@dataclass
class Binder:
    """Binder model for database operations"""

    id: Optional[int] = None
    uuid: str = field(default_factory=lambda: str(uuid.uuid4()))
    user_id: int = 1
    name: str = ""
    description: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    is_default: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @classmethod
    def get_by_uuid(cls, binder_uuid: str) -> Optional["Binder"]:
        """Get binder by UUID"""
        with get_db_connection() as conn:
            cursor = conn.execute(
                "SELECT * FROM binders WHERE uuid = ?", (binder_uuid,)
            )
            row = cursor.fetchone()
            return cls.from_db_row(row) if row else None

    @classmethod
    def get_by_user(cls, user_id: int = 1) -> List["Binder"]:
        """Get all binders for a user"""
        with get_db_connection() as conn:
            cursor = conn.execute(
                "SELECT * FROM binders WHERE user_id = ? ORDER BY created_at DESC",
                (user_id,),
            )
            return [cls.from_db_row(row) for row in cursor.fetchall()]

    @classmethod
    def get_by_id(cls, binder_id: int) -> Optional["Binder"]:
        """Get binder by ID"""
        with get_db_connection() as conn:
            cursor = conn.execute("SELECT * FROM binders WHERE id = ?", (binder_id,))
            row = cursor.fetchone()
            return cls.from_db_row(row) if row else None

    @classmethod
    def get_default_binder(cls, user_id: int = 1) -> Optional["Binder"]:
        """Get the default binder for a user"""
        with get_db_connection() as conn:
            cursor = conn.execute(
                "SELECT * FROM binders WHERE user_id = ? AND is_default = 1 LIMIT 1",
                (user_id,),
            )
            row = cursor.fetchone()
            return cls.from_db_row(row) if row else None

    @classmethod
    def search_by_name(cls, search_term: str, user_id: int = 1) -> List["Binder"]:
        """Search binders by name"""
        with get_db_connection() as conn:
            cursor = conn.execute(
                "SELECT * FROM binders WHERE user_id = ? AND name LIKE ? ORDER BY name",
                (user_id, f"%{search_term}%"),
            )
            return [cls.from_db_row(row) for row in cursor.fetchall()]

    @classmethod
    def from_db_row(cls, row) -> "Binder":
        """Create Binder from database row"""
        tags = json.loads(row["tags"]) if row["tags"] else []
        return cls(
            id=row["id"],
            uuid=row["uuid"],
            user_id=row["user_id"],
            name=row["name"],
            description=row["description"],
            tags=tags,
            is_default=bool(row["is_default"]),
            created_at=(
                datetime.fromisoformat(row["created_at"]) if row["created_at"] else None
            ),
            updated_at=(
                datetime.fromisoformat(row["updated_at"]) if row["updated_at"] else None
            ),
        )

    def save(self) -> "Binder":
        """Save binder to database"""
        # Validate before saving
        self.validate()

        with get_db_connection() as conn:
            if self.id:
                # Update existing binder
                conn.execute(
                    """
                    UPDATE binders SET name = ?, description = ?, tags = ?, 
                           is_default = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """,
                    (
                        self.name,
                        self.description,
                        json.dumps(self.tags),
                        self.is_default,
                        self.id,
                    ),
                )
            else:
                # Insert new binder
                cursor = conn.execute(
                    """
                    INSERT INTO binders (uuid, user_id, name, description, tags, is_default)
                    VALUES (?, ?, ?, ?, ?, ?)
                """,
                    (
                        self.uuid,
                        self.user_id,
                        self.name,
                        self.description,
                        json.dumps(self.tags),
                        self.is_default,
                    ),
                )
                self.id = cursor.lastrowid
            conn.commit()
        return self

    def validate(self) -> List[str]:
        """Validate binder data and return list of errors"""
        errors = []

        # Use ModelValidator for consistent validation
        errors.extend(
            ModelValidator.validate_string_length(
                self.name, "Binder name", min_length=1, max_length=100
            )
        )
        errors.extend(
            ModelValidator.validate_string_length(
                self.description, "Binder description", max_length=500
            )
        )
        errors.extend(
            ModelValidator.validate_list_length(self.tags, "Binder tags", max_length=20)
        )

        # Validate individual tags
        for tag in self.tags:
            errors.extend(
                ModelValidator.validate_string_length(tag, "Tag", max_length=50)
            )

        if errors:
            raise ValidationError(errors)

        return errors

    def delete(self) -> bool:
        """Delete binder from database"""
        if not self.id:
            return False

        with get_db_connection() as conn:
            conn.execute("DELETE FROM binders WHERE id = ?", (self.id,))
            conn.commit()
        return True

    def get_cards(self) -> List["BinderCard"]:
        """Get all cards in this binder"""
        if not self.id:
            return []

        with get_db_connection() as conn:
            cursor = conn.execute(
                """
                SELECT bc.*, cc.name, cc.type, cc.race, cc.attribute 
                FROM binder_cards bc
                JOIN card_cache cc ON bc.card_id = cc.id
                WHERE bc.binder_id = ?
                ORDER BY cc.name
            """,
                (self.id,),
            )
            return [BinderCard.from_db_row(row) for row in cursor.fetchall()]

    def add_card(
        self,
        card_id: int,
        quantity: int = 1,
        set_code: str = None,
        rarity: str = None,
        condition: str = "Near Mint",
        edition: str = None,
        notes: str = None,
    ) -> "BinderCard":
        """Add a card to this binder"""
        if not self.id:
            raise ValueError("Cannot add cards to unsaved binder")

        binder_card = BinderCard(
            binder_id=self.id,
            card_id=card_id,
            quantity=quantity,
            set_code=set_code,
            rarity=rarity,
            condition=condition,
            edition=edition,
            notes=notes,
        )
        return binder_card.save()

    def remove_card(
        self, card_id: int, set_code: str = None, rarity: str = None
    ) -> bool:
        """Remove a card from this binder"""
        if not self.id:
            return False

        with get_db_connection() as conn:
            query = "DELETE FROM binder_cards WHERE binder_id = ? AND card_id = ?"
            params = [self.id, card_id]

            if set_code:
                query += " AND set_code = ?"
                params.append(set_code)
            if rarity:
                query += " AND rarity = ?"
                params.append(rarity)

            conn.execute(query, params)
            conn.commit()
            return True

    def get_card_count(self) -> int:
        """Get total number of unique cards in this binder"""
        if not self.id:
            return 0

        with get_db_connection() as conn:
            cursor = conn.execute(
                "SELECT COUNT(*) FROM binder_cards WHERE binder_id = ?", (self.id,)
            )
            return cursor.fetchone()[0]

    def get_total_card_quantity(self) -> int:
        """Get total quantity of all cards in this binder"""
        if not self.id:
            return 0

        with get_db_connection() as conn:
            cursor = conn.execute(
                "SELECT SUM(quantity) FROM binder_cards WHERE binder_id = ?", (self.id,)
            )
            result = cursor.fetchone()[0]
            return result if result else 0


@dataclass
class BinderCard:
    """Binder card model for database operations"""

    id: Optional[int] = None
    binder_id: int = 0
    card_id: int = 0
    quantity: int = 1
    set_code: Optional[str] = None
    rarity: Optional[str] = None
    condition: str = "Near Mint"
    edition: Optional[str] = (
        None  # New field for card edition (1st Edition, Unlimited, etc.)
    )
    notes: Optional[str] = None
    date_added: Optional[datetime] = None

    # Card info from join
    card_name: Optional[str] = None
    card_type: Optional[str] = None
    card_race: Optional[str] = None
    card_attribute: Optional[str] = None

    @classmethod
    def from_db_row(cls, row) -> "BinderCard":
        """Create BinderCard from database row"""
        return cls(
            id=row["id"],
            binder_id=row["binder_id"],
            card_id=row["card_id"],
            quantity=row["quantity"],
            set_code=row["set_code"],
            rarity=row["rarity"],
            condition=row["condition"],
            edition=(
                row["edition"] if "edition" in row.keys() else None
            ),  # Handle potential missing column
            notes=row["notes"],
            date_added=(
                datetime.fromisoformat(row["date_added"]) if row["date_added"] else None
            ),
            card_name=row["name"] if "name" in row.keys() else None,
            card_type=row["type"] if "type" in row.keys() else None,
            card_race=row["race"] if "race" in row.keys() else None,
            card_attribute=row["attribute"] if "attribute" in row.keys() else None,
        )

    def save(self) -> "BinderCard":
        """Save binder card to database"""
        # Validate before saving
        self.validate()

        with get_db_connection() as conn:
            if self.id:
                # Update existing entry
                conn.execute(
                    """
                    UPDATE binder_cards SET quantity = ?, set_code = ?, 
                           rarity = ?, condition = ?, edition = ?, notes = ?
                    WHERE id = ?
                """,
                    (
                        self.quantity,
                        self.set_code,
                        self.rarity,
                        self.condition,
                        self.edition,
                        self.notes,
                        self.id,
                    ),
                )
            else:
                # Check for existing entry with same card/set/rarity
                cursor = conn.execute(
                    """
                    SELECT id, quantity FROM binder_cards 
                    WHERE binder_id = ? AND card_id = ? AND 
                          COALESCE(set_code, '') = COALESCE(?, '') AND 
                          COALESCE(rarity, '') = COALESCE(?, '') AND
                          COALESCE(edition, '') = COALESCE(?, '')
                """,
                    (
                        self.binder_id,
                        self.card_id,
                        self.set_code,
                        self.rarity,
                        self.edition,
                    ),
                )
                existing = cursor.fetchone()

                if existing:
                    # Update quantity of existing entry
                    self.id = existing[0]
                    self.quantity += existing[1]
                    conn.execute(
                        """
                        UPDATE binder_cards SET quantity = ?, condition = ?, edition = ?, notes = ?
                        WHERE id = ?
                    """,
                        (
                            self.quantity,
                            self.condition,
                            self.edition,
                            self.notes,
                            self.id,
                        ),
                    )
                else:
                    # Insert new entry
                    cursor = conn.execute(
                        """
                        INSERT INTO binder_cards (binder_id, card_id, quantity, set_code, rarity, condition, edition, notes)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                        (
                            self.binder_id,
                            self.card_id,
                            self.quantity,
                            self.set_code,
                            self.rarity,
                            self.condition,
                            self.edition,
                            self.notes,
                        ),
                    )
                    self.id = cursor.lastrowid
            conn.commit()
        return self

    def validate(self) -> List[str]:
        """Validate binder card data and return list of errors"""
        errors = []

        # Validate quantity
        errors.extend(
            ModelValidator.validate_integer_range(
                self.quantity, "Card quantity", min_value=1, max_value=999
            )
        )

        # Validate string fields
        errors.extend(
            ModelValidator.validate_string_length(
                self.set_code, "Set code", max_length=20
            )
        )
        errors.extend(
            ModelValidator.validate_string_length(self.rarity, "Rarity", max_length=50)
        )
        errors.extend(
            ModelValidator.validate_string_length(
                self.edition, "Edition", max_length=50
            )
        )
        errors.extend(
            ModelValidator.validate_string_length(self.notes, "Notes", max_length=500)
        )

        # Validate condition choices
        allowed_conditions = [
            "Mint",
            "Near Mint",
            "Lightly Played",
            "Moderately Played",
            "Heavily Played",
            "Damaged",
        ]
        if self.condition:
            errors.extend(
                ModelValidator.validate_choice(
                    self.condition, "Card condition", allowed_conditions
                )
            )

        if errors:
            raise ValidationError(errors)

        return errors

    def delete(self) -> bool:
        """Delete binder card from database"""
        if not self.id:
            return False

        with get_db_connection() as conn:
            conn.execute("DELETE FROM binder_cards WHERE id = ?", (self.id,))
            conn.commit()
        return True


@dataclass
class Deck:
    """Deck model for database operations"""

    id: Optional[int] = None
    uuid: str = field(default_factory=lambda: str(uuid.uuid4()))
    user_id: int = 1
    binder_id: Optional[int] = None
    name: str = ""
    description: Optional[str] = None
    format: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    notes: Optional[str] = None
    is_valid: bool = True
    validation_errors: List[str] = field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @classmethod
    def get_by_uuid(cls, deck_uuid: str) -> Optional["Deck"]:
        """Get deck by UUID"""
        with get_db_connection() as conn:
            cursor = conn.execute("SELECT * FROM decks WHERE uuid = ?", (deck_uuid,))
            row = cursor.fetchone()
            return cls.from_db_row(row) if row else None

    @classmethod
    def get_by_user(cls, user_id: int = 1) -> List["Deck"]:
        """Get all decks for a user"""
        with get_db_connection() as conn:
            cursor = conn.execute(
                "SELECT * FROM decks WHERE user_id = ? ORDER BY created_at DESC",
                (user_id,),
            )
            return [cls.from_db_row(row) for row in cursor.fetchall()]

    @classmethod
    def get_by_id(cls, deck_id: int) -> Optional["Deck"]:
        """Get deck by ID"""
        with get_db_connection() as conn:
            cursor = conn.execute("SELECT * FROM decks WHERE id = ?", (deck_id,))
            row = cursor.fetchone()
            return cls.from_db_row(row) if row else None

    @classmethod
    def get_by_binder(cls, binder_id: int) -> List["Deck"]:
        """Get all decks associated with a binder"""
        with get_db_connection() as conn:
            cursor = conn.execute(
                "SELECT * FROM decks WHERE binder_id = ? ORDER BY created_at DESC",
                (binder_id,),
            )
            return [cls.from_db_row(row) for row in cursor.fetchall()]

    @classmethod
    def search_by_name(cls, search_term: str, user_id: int = 1) -> List["Deck"]:
        """Search decks by name"""
        with get_db_connection() as conn:
            cursor = conn.execute(
                "SELECT * FROM decks WHERE user_id = ? AND name LIKE ? ORDER BY name",
                (user_id, f"%{search_term}%"),
            )
            return [cls.from_db_row(row) for row in cursor.fetchall()]

    @classmethod
    def get_by_format(cls, format_name: str, user_id: int = 1) -> List["Deck"]:
        """Get all decks for a specific format"""
        with get_db_connection() as conn:
            cursor = conn.execute(
                "SELECT * FROM decks WHERE user_id = ? AND format = ? ORDER BY created_at DESC",
                (user_id, format_name),
            )
            return [cls.from_db_row(row) for row in cursor.fetchall()]

    @classmethod
    def from_db_row(cls, row) -> "Deck":
        """Create Deck from database row"""
        tags = json.loads(row["tags"]) if row["tags"] else []
        validation_errors = (
            json.loads(row["validation_errors"]) if row["validation_errors"] else []
        )
        return cls(
            id=row["id"],
            uuid=row["uuid"],
            user_id=row["user_id"],
            binder_id=row["binder_id"],
            name=row["name"],
            description=row["description"],
            format=row["format"],
            tags=tags,
            notes=row["notes"],
            is_valid=bool(row["is_valid"]),
            validation_errors=validation_errors,
            created_at=(
                datetime.fromisoformat(row["created_at"]) if row["created_at"] else None
            ),
            updated_at=(
                datetime.fromisoformat(row["updated_at"]) if row["updated_at"] else None
            ),
        )

    def save(self) -> "Deck":
        """Save deck to database"""
        # Validate before saving
        self.validate()

        with get_db_connection() as conn:
            if self.id:
                # Update existing deck
                conn.execute(
                    """
                    UPDATE decks SET name = ?, description = ?, format = ?, tags = ?,
                           notes = ?, is_valid = ?, validation_errors = ?, 
                           binder_id = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """,
                    (
                        self.name,
                        self.description,
                        self.format,
                        json.dumps(self.tags),
                        self.notes,
                        self.is_valid,
                        json.dumps(self.validation_errors),
                        self.binder_id,
                        self.id,
                    ),
                )
            else:
                # Insert new deck
                cursor = conn.execute(
                    """
                    INSERT INTO decks (uuid, user_id, binder_id, name, description, format, 
                                     tags, notes, is_valid, validation_errors)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        self.uuid,
                        self.user_id,
                        self.binder_id,
                        self.name,
                        self.description,
                        self.format,
                        json.dumps(self.tags),
                        self.notes,
                        self.is_valid,
                        json.dumps(self.validation_errors),
                    ),
                )
                self.id = cursor.lastrowid
            conn.commit()
        return self

    def validate(self) -> List[str]:
        """Validate deck data and return list of errors"""
        errors = []

        # Use ModelValidator for consistent validation
        errors.extend(
            ModelValidator.validate_string_length(
                self.name, "Deck name", min_length=1, max_length=100
            )
        )
        errors.extend(
            ModelValidator.validate_string_length(
                self.description, "Deck description", max_length=500
            )
        )
        errors.extend(
            ModelValidator.validate_string_length(
                self.notes, "Deck notes", max_length=1000
            )
        )
        errors.extend(
            ModelValidator.validate_list_length(self.tags, "Deck tags", max_length=20)
        )

        # Validate individual tags
        for tag in self.tags:
            errors.extend(
                ModelValidator.validate_string_length(tag, "Tag", max_length=50)
            )

        if errors:
            raise ValidationError(errors)

        return errors

    def validate_deck_composition(self) -> List[str]:
        """Validate deck composition according to Yu-Gi-Oh rules"""
        validation_errors = []

        if not self.id:
            return validation_errors

        # Get card counts by section
        main_deck_cards = self.get_cards("main")
        extra_deck_cards = self.get_cards("extra")
        side_deck_cards = self.get_cards("side")

        # Calculate total quantities
        main_deck_count = sum(card.quantity for card in main_deck_cards)
        extra_deck_count = sum(card.quantity for card in extra_deck_cards)
        side_deck_count = sum(card.quantity for card in side_deck_cards)

        # Main deck validation
        if main_deck_count < 40:
            validation_errors.append(
                f"Main deck must have at least 40 cards (currently {main_deck_count})"
            )
        elif main_deck_count > 60:
            validation_errors.append(
                f"Main deck cannot exceed 60 cards (currently {main_deck_count})"
            )

        # Extra deck validation
        if extra_deck_count > 15:
            validation_errors.append(
                f"Extra deck cannot exceed 15 cards (currently {extra_deck_count})"
            )

        # Side deck validation
        if side_deck_count > 15:
            validation_errors.append(
                f"Side deck cannot exceed 15 cards (currently {side_deck_count})"
            )

        # Card limit validation (3 copies max per card across all sections)
        all_cards = main_deck_cards + extra_deck_cards + side_deck_cards
        card_totals = {}

        for card in all_cards:
            if card.card_id in card_totals:
                card_totals[card.card_id] += card.quantity
            else:
                card_totals[card.card_id] = card.quantity

        for card_id, total_quantity in card_totals.items():
            if total_quantity > 3:
                card_name = self._get_card_name(card_id)
                validation_errors.append(
                    f"'{card_name}' appears {total_quantity} times (maximum 3 allowed)"
                )

        # Update deck validation status
        self.validation_errors = validation_errors
        self.is_valid = len(validation_errors) == 0

        return validation_errors

    def _get_card_name(self, card_id: int) -> str:
        """Helper method to get card name by ID"""
        with get_db_connection() as conn:
            cursor = conn.execute(
                "SELECT name FROM card_cache WHERE id = ?", (card_id,)
            )
            row = cursor.fetchone()
            return row[0] if row else f"Card ID {card_id}"

    def delete(self) -> bool:
        """Delete deck from database"""
        if not self.id:
            return False

        with get_db_connection() as conn:
            conn.execute("DELETE FROM decks WHERE id = ?", (self.id,))
            conn.commit()
        return True

    def get_cards(self, section: Optional[str] = None) -> List["DeckCard"]:
        """Get cards in this deck, optionally filtered by section"""
        if not self.id:
            return []

        query = """
            SELECT dc.*, cc.name, cc.type, cc.race, cc.attribute 
            FROM deck_cards dc
            JOIN card_cache cc ON dc.card_id = cc.id
            WHERE dc.deck_id = ?
        """
        params = [self.id]

        if section:
            query += " AND dc.section = ?"
            params.append(section)

        query += " ORDER BY dc.section, dc.order_index, cc.name"

        with get_db_connection() as conn:
            cursor = conn.execute(query, params)
            return [DeckCard.from_db_row(row) for row in cursor.fetchall()]

    def add_card(
        self, card_id: int, section: str = "main", quantity: int = 1
    ) -> "DeckCard":
        """Add a card to this deck"""
        if not self.id:
            raise ValueError("Cannot add cards to unsaved deck")

        if section not in ["main", "extra", "side"]:
            raise ValueError("Section must be 'main', 'extra', or 'side'")

        # Check if card already exists in this section
        with get_db_connection() as conn:
            cursor = conn.execute(
                "SELECT id, quantity FROM deck_cards WHERE deck_id = ? AND card_id = ? AND section = ?",
                (self.id, card_id, section),
            )
            existing = cursor.fetchone()

            if existing:
                # Update quantity of existing card
                deck_card = DeckCard(
                    id=existing[0],
                    deck_id=self.id,
                    card_id=card_id,
                    section=section,
                    quantity=min(existing[1] + quantity, 3),  # Max 3 copies
                )
            else:
                # Create new deck card entry
                deck_card = DeckCard(
                    deck_id=self.id,
                    card_id=card_id,
                    section=section,
                    quantity=min(quantity, 3),
                )

        return deck_card.save()

    def remove_card(
        self, card_id: int, section: str = "main", quantity: int = 1
    ) -> bool:
        """Remove cards from this deck"""
        if not self.id:
            return False

        with get_db_connection() as conn:
            cursor = conn.execute(
                "SELECT id, quantity FROM deck_cards WHERE deck_id = ? AND card_id = ? AND section = ?",
                (self.id, card_id, section),
            )
            existing = cursor.fetchone()

            if not existing:
                return False

            current_quantity = existing[1]
            new_quantity = current_quantity - quantity

            if new_quantity <= 0:
                # Remove card entirely
                conn.execute("DELETE FROM deck_cards WHERE id = ?", (existing[0],))
            else:
                # Update quantity
                conn.execute(
                    "UPDATE deck_cards SET quantity = ? WHERE id = ?",
                    (new_quantity, existing[0]),
                )

            conn.commit()
            return True

    def clear_section(self, section: str) -> bool:
        """Clear all cards from a specific section"""
        if not self.id:
            return False

        if section not in ["main", "extra", "side"]:
            return False

        with get_db_connection() as conn:
            conn.execute(
                "DELETE FROM deck_cards WHERE deck_id = ? AND section = ?",
                (self.id, section),
            )
            conn.commit()
            return True

    def copy_to_new_deck(self, new_name: str) -> "Deck":
        """Create a copy of this deck with a new name"""
        if not self.id:
            raise ValueError("Cannot copy unsaved deck")

        # Create new deck
        new_deck = Deck(
            user_id=self.user_id,
            binder_id=self.binder_id,
            name=new_name,
            description=f"Copy of {self.name}",
            format=self.format,
            tags=self.tags.copy(),
            notes=self.notes,
        )
        new_deck.save()

        # Copy all cards
        cards = self.get_cards()
        for card in cards:
            new_deck_card = DeckCard(
                deck_id=new_deck.id,
                card_id=card.card_id,
                section=card.section,
                quantity=card.quantity,
                order_index=card.order_index,
            )
            new_deck_card.save()

        return new_deck

    def get_deck_statistics(self) -> Dict[str, Any]:
        """Get statistical information about this deck"""
        if not self.id:
            return {}

        cards = self.get_cards()

        # Basic counts
        main_deck = [c for c in cards if c.section == "main"]
        extra_deck = [c for c in cards if c.section == "extra"]
        side_deck = [c for c in cards if c.section == "side"]

        main_count = sum(c.quantity for c in main_deck)
        extra_count = sum(c.quantity for c in extra_deck)
        side_count = sum(c.quantity for c in side_deck)

        # Type distribution
        type_counts = {}
        for card in main_deck:
            card_type = card.card_type or "Unknown"
            type_counts[card_type] = type_counts.get(card_type, 0) + card.quantity

        return {
            "main_deck_count": main_count,
            "extra_deck_count": extra_count,
            "side_deck_count": side_count,
            "total_unique_cards": len(cards),
            "type_distribution": type_counts,
            "is_valid": self.is_valid,
            "validation_errors": self.validation_errors,
        }


@dataclass
class DeckCard:
    """Deck card model for database operations"""

    id: Optional[int] = None
    deck_id: int = 0
    card_id: int = 0
    section: str = "main"  # main, extra, side
    quantity: int = 1
    order_index: int = 0

    # Card info from join
    card_name: Optional[str] = None
    card_type: Optional[str] = None
    card_race: Optional[str] = None
    card_attribute: Optional[str] = None

    @classmethod
    def from_db_row(cls, row) -> "DeckCard":
        """Create DeckCard from database row"""
        return cls(
            id=row["id"],
            deck_id=row["deck_id"],
            card_id=row["card_id"],
            section=row["section"],
            quantity=row["quantity"],
            order_index=row["order_index"],
            card_name=row["name"] if "name" in row.keys() else None,
            card_type=row["type"] if "type" in row.keys() else None,
            card_race=row["race"] if "race" in row.keys() else None,
            card_attribute=row["attribute"] if "attribute" in row.keys() else None,
        )

    def save(self) -> "DeckCard":
        """Save deck card to database"""
        # Validate before saving
        self.validate()

        with get_db_connection() as conn:
            if self.id:
                # Update existing entry
                conn.execute(
                    """
                    UPDATE deck_cards SET quantity = ?, section = ?, order_index = ?
                    WHERE id = ?
                """,
                    (self.quantity, self.section, self.order_index, self.id),
                )
            else:
                # Insert new entry
                cursor = conn.execute(
                    """
                    INSERT INTO deck_cards (deck_id, card_id, section, quantity, order_index)
                    VALUES (?, ?, ?, ?, ?)
                """,
                    (
                        self.deck_id,
                        self.card_id,
                        self.section,
                        self.quantity,
                        self.order_index,
                    ),
                )
                self.id = cursor.lastrowid
            conn.commit()
        return self

    def validate(self) -> List[str]:
        """Validate deck card data and return list of errors"""
        errors = []

        # Validate quantity and order index
        errors.extend(
            ModelValidator.validate_integer_range(
                self.quantity, "Card quantity", min_value=1, max_value=3
            )
        )
        errors.extend(
            ModelValidator.validate_integer_range(
                self.order_index, "Order index", min_value=0
            )
        )

        # Validate section choices
        allowed_sections = ["main", "extra", "side"]
        errors.extend(
            ModelValidator.validate_choice(self.section, "Section", allowed_sections)
        )

        if errors:
            raise ValidationError(errors)

        return errors

    def delete(self) -> bool:
        """Delete deck card from database"""
        if not self.id:
            return False

        with get_db_connection() as conn:
            conn.execute("DELETE FROM deck_cards WHERE id = ?", (self.id,))
            conn.commit()
        return True


@dataclass
class Card:
    """Card model for database operations and API integration"""

    id: int = 0
    name: str = ""
    type: str = ""
    description: str = ""
    atk: Optional[int] = None
    def_: Optional[int] = None
    level: Optional[int] = None
    race: Optional[str] = None
    attribute: Optional[str] = None
    card_images: List[Dict[str, Any]] = field(default_factory=list)
    card_sets: List[Dict[str, Any]] = field(default_factory=list)
    banlist_info: Dict[str, Any] = field(default_factory=dict)
    archetype: Optional[str] = None
    scale: Optional[int] = None
    linkval: Optional[int] = None
    linkmarkers: List[str] = field(default_factory=list)
    cached_at: Optional[datetime] = None
    last_updated: Optional[datetime] = None

    @classmethod
    def get_by_id(cls, card_id: int, fetch_if_missing: bool = True) -> Optional["Card"]:
        """Get card by ID from cache, optionally fetch from API if missing"""
        with get_db_connection() as conn:
            cursor = conn.execute("SELECT * FROM card_cache WHERE id = ?", (card_id,))
            row = cursor.fetchone()

            if row:
                return cls.from_db_row(row)
            elif fetch_if_missing:
                # Try to fetch from API
                return cls.fetch_from_api(card_id)
            else:
                return None

    @classmethod
    def search_by_name(cls, name: str, exact_match: bool = False) -> List["Card"]:
        """Search cards by name in local cache"""
        with get_db_connection() as conn:
            if exact_match:
                cursor = conn.execute(
                    "SELECT * FROM card_cache WHERE name = ?", (name,)
                )
            else:
                cursor = conn.execute(
                    "SELECT * FROM card_cache WHERE name LIKE ? ORDER BY name",
                    (f"%{name}%",),
                )

            return [cls.from_db_row(row) for row in cursor.fetchall()]

    @classmethod
    def search_by_filters(cls, filters: Dict[str, Any]) -> List["Card"]:
        """Search cards by multiple filters"""
        query = "SELECT * FROM card_cache WHERE 1=1"
        params = []

        if filters.get("name"):
            query += " AND name LIKE ?"
            params.append(f"%{filters['name']}%")

        if filters.get("name_fuzzy"):
            query += " AND name LIKE ?"
            params.append(f"%{filters['name_fuzzy']}%")

        if filters.get("type"):
            query += " AND type = ?"
            params.append(filters["type"])

        if filters.get("race"):
            query += " AND race = ?"
            params.append(filters["race"])

        if filters.get("attribute"):
            query += " AND attribute = ?"
            params.append(filters["attribute"])

        if filters.get("level"):
            query += " AND level = ?"
            params.append(filters["level"])

        if filters.get("archetype"):
            query += " AND archetype LIKE ?"
            params.append(f"%{filters['archetype']}%")

        if filters.get("atk_min") is not None:
            query += " AND atk >= ?"
            params.append(filters["atk_min"])

        if filters.get("atk_max") is not None:
            query += " AND atk <= ?"
            params.append(filters["atk_max"])

        if filters.get("def_min") is not None:
            query += " AND def >= ?"
            params.append(filters["def_min"])

        if filters.get("def_max") is not None:
            query += " AND def <= ?"
            params.append(filters["def_max"])

        query += " ORDER BY name LIMIT 1000"  # Limit results for performance

        with get_db_connection() as conn:
            cursor = conn.execute(query, params)
            return [cls.from_db_row(row) for row in cursor.fetchall()]

    @classmethod
    def fetch_from_api(cls, card_id: int) -> Optional["Card"]:
        """Fetch card data from YGOPRODeck API and cache it"""
        try:
            import requests
            from ..services.cache import cache_service as cache_manager

            # TODO: Add rate limiting
            # if not cache_manager.can_make_request():
            #     return None

            response = requests.get(
                f"https://db.ygoprodeck.com/api/v7/cardinfo.php?id={card_id}"
            )

            if response.status_code == 200:
                data = response.json()
                if data.get("data"):
                    card_data = data["data"][0]
                    card = cls.from_api_data(card_data)
                    card.save()
                    return card

        except Exception as e:
            print(f"Error fetching card {card_id} from API: {e}")

        return None

    @classmethod
    def bulk_fetch_from_api(cls, name_query: str = None) -> List["Card"]:
        """Fetch multiple cards from API by name query"""
        try:
            import requests
            from ..services.cache import cache_service as cache_manager

            # TODO: Add rate limiting
            # if not cache_manager.can_make_request():
            #     return []

            url = "https://db.ygoprodeck.com/api/v7/cardinfo.php"
            params = {}

            if name_query:
                params["fname"] = name_query

            response = requests.get(url, params=params)

            if response.status_code == 200:
                data = response.json()
                cards = []

                for card_data in data.get("data", []):
                    card = cls.from_api_data(card_data)
                    card.save()
                    cards.append(card)

                return cards

        except Exception as e:
            print(f"Error fetching cards from API: {e}")

        return []

    @classmethod
    def from_api_data(cls, api_data: Dict[str, Any]) -> "Card":
        """Create Card from YGOPRODeck API response data"""
        return cls(
            id=api_data.get("id", 0),
            name=api_data.get("name", ""),
            type=api_data.get("type", ""),
            description=api_data.get("desc", ""),
            atk=api_data.get("atk"),
            def_=api_data.get("def"),
            level=api_data.get("level"),
            race=api_data.get("race"),
            attribute=api_data.get("attribute"),
            card_images=api_data.get("card_images", []),
            card_sets=api_data.get("card_sets", []),
            banlist_info=api_data.get("banlist_info", {}),
            archetype=api_data.get("archetype"),
            scale=api_data.get("scale"),
            linkval=api_data.get("linkval"),
            linkmarkers=api_data.get("linkmarkers", []),
        )

    @classmethod
    def from_db_row(cls, row) -> "Card":
        """Create Card from database row"""
        return cls(
            id=row["id"],
            name=row["name"],
            type=row["type"],
            description=row["description"],
            atk=row["atk"],
            def_=row["def"],
            level=row["level"],
            race=row["race"],
            attribute=row["attribute"],
            card_images=json.loads(row["card_images"]) if row["card_images"] else [],
            card_sets=json.loads(row["card_sets"]) if row["card_sets"] else [],
            banlist_info=json.loads(row["banlist_info"]) if row["banlist_info"] else {},
            archetype=row["archetype"],
            scale=row["scale"],
            linkval=row["linkval"],
            linkmarkers=json.loads(row["linkmarkers"]) if row["linkmarkers"] else [],
            cached_at=(
                datetime.fromisoformat(row["cached_at"]) if row["cached_at"] else None
            ),
            last_updated=(
                datetime.fromisoformat(row["last_updated"])
                if row["last_updated"]
                else None
            ),
        )

    @classmethod
    def from_api_response(cls, data: Dict[str, Any]) -> "Card":
        """Create Card from YGOPRODeck API response data"""
        now = datetime.now()

        return cls(
            id=int(data.get("id", 0)),
            name=data.get("name", ""),
            type=data.get("type", ""),
            description=data.get("desc", ""),
            atk=data.get("atk"),
            def_=data.get("def"),
            level=data.get("level"),
            race=data.get("race"),
            attribute=data.get("attribute"),
            card_images=data.get("card_images", []),
            card_sets=data.get("card_sets", []),
            banlist_info=data.get("banlist_info", {}),
            archetype=data.get("archetype"),
            scale=data.get("scale"),
            linkval=data.get("linkval"),
            linkmarkers=data.get("linkmarkers", []),
            cached_at=now,
            last_updated=now,
        )

    def save(self) -> "Card":
        """Save card to cache database"""
        with get_db_connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO card_cache 
                (id, name, type, description, atk, def, level, race, attribute,
                 card_images, card_sets, banlist_info, archetype, scale, linkval, 
                 linkmarkers, last_updated)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """,
                (
                    self.id,
                    self.name,
                    self.type,
                    self.description,
                    self.atk,
                    self.def_,
                    self.level,
                    self.race,
                    self.attribute,
                    json.dumps(self.card_images),
                    json.dumps(self.card_sets),
                    json.dumps(self.banlist_info),
                    self.archetype,
                    self.scale,
                    self.linkval,
                    json.dumps(self.linkmarkers),
                ),
            )
            conn.commit()
        return self

    def get_primary_image_url(self) -> Optional[str]:
        """Get the primary image URL for this card"""
        if self.card_images:
            return self.card_images[0].get("image_url")
        return None

    def get_small_image_url(self) -> Optional[str]:
        """Get the small image URL for this card"""
        if self.card_images:
            return self.card_images[0].get("image_url_small")
        return None

    def get_sets(self) -> List[str]:
        """Get list of set codes this card appears in"""
        return [card_set.get("set_code", "") for card_set in self.card_sets]

    def is_banned(self, format_name: str = "tcg") -> bool:
        """Check if card is banned in specified format"""
        ban_status = self.banlist_info.get(f"ban_{format_name}")
        return ban_status == "Banned"

    def is_limited(self, format_name: str = "tcg") -> bool:
        """Check if card is limited in specified format"""
        ban_status = self.banlist_info.get(f"ban_{format_name}")
        return ban_status == "Limited"

    def is_semi_limited(self, format_name: str = "tcg") -> bool:
        """Check if card is semi-limited in specified format"""
        ban_status = self.banlist_info.get(f"ban_{format_name}")
        return ban_status == "Semi-Limited"

    def get_max_copies(self, format_name: str = "tcg") -> int:
        """Get maximum number of copies allowed in specified format"""
        if self.is_banned(format_name):
            return 0
        elif self.is_limited(format_name):
            return 1
        elif self.is_semi_limited(format_name):
            return 2
        else:
            return 3

    def validate_in_binder(self, binder_id: int) -> bool:
        """Check if this card exists in the specified binder"""
        with get_db_connection() as conn:
            cursor = conn.execute(
                "SELECT COUNT(*) FROM binder_cards WHERE binder_id = ? AND card_id = ?",
                (binder_id, self.id),
            )
            count = cursor.fetchone()[0]
            return count > 0

    def get_quantity_in_binder(self, binder_id: int) -> int:
        """Get total quantity of this card in the specified binder"""
        with get_db_connection() as conn:
            cursor = conn.execute(
                "SELECT SUM(quantity) FROM binder_cards WHERE binder_id = ? AND card_id = ?",
                (binder_id, self.id),
            )
            result = cursor.fetchone()[0]
            return result if result else 0

    def save_to_cache(self) -> bool:
        """Save this card to the local cache database"""
        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()

                # Insert or replace card in cache
                cursor.execute(
                    """
                    INSERT OR REPLACE INTO card_cache (
                        id, name, type, description, atk, def, level, race, attribute,
                        card_images, card_sets, banlist_info, archetype, scale, linkval,
                        linkmarkers, cached_at, last_updated
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        self.id,
                        self.name,
                        self.type,
                        self.description,
                        self.atk,
                        self.def_,
                        self.level,
                        self.race,
                        self.attribute,
                        json.dumps(self.card_images),
                        json.dumps(self.card_sets),
                        json.dumps(self.banlist_info),
                        self.archetype,
                        self.scale,
                        self.linkval,
                        json.dumps(self.linkmarkers),
                        self.cached_at.isoformat() if self.cached_at else None,
                        self.last_updated.isoformat() if self.last_updated else None,
                    ),
                )

                conn.commit()
                return True

        except Exception as e:
            print(f"Error saving card {self.id} to cache: {e}")
            return False

    @staticmethod
    def refresh_cache_from_api(max_age_days: int = 30) -> int:
        """Refresh old cached cards from API"""
        try:
            import requests
            from ..services.cache import cache_service as cache_manager

            cutoff_date = datetime.now() - timedelta(days=max_age_days)

            with get_db_connection() as conn:
                cursor = conn.execute(
                    "SELECT id FROM card_cache WHERE last_updated < ? LIMIT 100",
                    (cutoff_date.isoformat(),),
                )
                old_cards = cursor.fetchall()

            refreshed_count = 0
            for card_row in old_cards:
                # TODO: Add rate limiting check
                # if cache_manager.can_make_request():
                card = Card.fetch_from_api(card_row[0])
                if card:
                    refreshed_count += 1
                # else:
                #     break  # Rate limit reached

            return refreshed_count

        except Exception as e:
            print(f"Error refreshing cache: {e}")
            return 0
