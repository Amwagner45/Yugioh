#!/usr/bin/env python3
"""
Database setup test script
Run this to verify database schema and basic operations
"""
import sys
import os

# Add the src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

from src.database import init_database, validate_database, get_db_connection
from src.database.models import User, Binder, Deck


def test_database_setup():
    """Test database initialization and basic operations"""
    print("Testing database setup...")

    # Initialize database
    if not init_database():
        print("❌ Failed to initialize database")
        return False

    print("✅ Database initialized successfully")

    # Validate schema
    if not validate_database():
        print("❌ Database schema validation failed")
        return False

    print("✅ Database schema validation passed")

    # Test basic operations
    try:
        # Test user operations
        user = User.get_default_user()
        print(f"✅ Default user: {user.username} ({user.display_name})")

        # Test binder operations
        binder = Binder(
            name="Test Binder",
            description="A test binder for verification",
            tags=["test", "verification"],
        )
        binder.save()
        print(f"✅ Created test binder: {binder.name} (UUID: {binder.uuid})")

        # Test deck operations
        deck = Deck(
            name="Test Deck",
            description="A test deck for verification",
            format="TCG",
            tags=["test"],
            binder_id=binder.id,
        )
        deck.save()
        print(f"✅ Created test deck: {deck.name} (UUID: {deck.uuid})")

        # Test retrieval
        binders = Binder.get_by_user()
        decks = Deck.get_by_user()
        print(f"✅ Retrieved {len(binders)} binders and {len(decks)} decks")

        # Clean up test data
        deck.delete()
        binder.delete()
        print("✅ Cleaned up test data")

        print("\n🎉 All database tests passed!")
        return True

    except Exception as e:
        print(f"❌ Database test failed: {e}")
        return False


def show_database_info():
    """Show information about the database"""
    print("\nDatabase Information:")
    print("=" * 50)

    try:
        with get_db_connection() as conn:
            # Show tables
            cursor = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
            )
            tables = [row[0] for row in cursor.fetchall()]
            print(f"Tables: {', '.join(tables)}")

            # Show schema version
            cursor = conn.execute(
                "SELECT version, description, applied_at FROM schema_version ORDER BY version DESC LIMIT 1"
            )
            version_info = cursor.fetchone()
            if version_info:
                print(
                    f"Schema Version: {version_info[0]} - {version_info[1]} (Applied: {version_info[2]})"
                )

            # Show record counts
            for table in ["users", "binders", "decks", "binder_cards", "deck_cards"]:
                if table in tables:
                    cursor = conn.execute(f"SELECT COUNT(*) FROM {table}")
                    count = cursor.fetchone()[0]
                    print(f"{table.title()}: {count} records")

    except Exception as e:
        print(f"Error getting database info: {e}")


if __name__ == "__main__":
    success = test_database_setup()
    show_database_info()
    sys.exit(0 if success else 1)
