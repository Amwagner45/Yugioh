"""
Database models for Yu-Gi-Oh Deck Builder
SQLAlchemy-style models for database operations
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
import json
import uuid
from dataclasses import dataclass, field
from ..database import get_db_connection


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
            notes=row["notes"],
            date_added=(
                datetime.fromisoformat(row["date_added"]) if row["date_added"] else None
            ),
            card_name=row.get("name"),
            card_type=row.get("type"),
            card_race=row.get("race"),
            card_attribute=row.get("attribute"),
        )

    def save(self) -> "BinderCard":
        """Save binder card to database"""
        with get_db_connection() as conn:
            if self.id:
                # Update existing entry
                conn.execute(
                    """
                    UPDATE binder_cards SET quantity = ?, set_code = ?, 
                           rarity = ?, condition = ?, notes = ?
                    WHERE id = ?
                """,
                    (
                        self.quantity,
                        self.set_code,
                        self.rarity,
                        self.condition,
                        self.notes,
                        self.id,
                    ),
                )
            else:
                # Insert new entry
                cursor = conn.execute(
                    """
                    INSERT INTO binder_cards (binder_id, card_id, quantity, set_code, rarity, condition, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        self.binder_id,
                        self.card_id,
                        self.quantity,
                        self.set_code,
                        self.rarity,
                        self.condition,
                        self.notes,
                    ),
                )
                self.id = cursor.lastrowid
            conn.commit()
        return self

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
            card_name=row.get("name"),
            card_type=row.get("type"),
            card_race=row.get("race"),
            card_attribute=row.get("attribute"),
        )

    def save(self) -> "DeckCard":
        """Save deck card to database"""
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

    def delete(self) -> bool:
        """Delete deck card from database"""
        if not self.id:
            return False

        with get_db_connection() as conn:
            conn.execute("DELETE FROM deck_cards WHERE id = ?", (self.id,))
            conn.commit()
        return True
