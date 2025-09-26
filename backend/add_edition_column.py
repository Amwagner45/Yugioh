#!/usr/bin/env python3
"""
Add edition column to binder_cards table
"""

import sqlite3
import sys
import os

# Add the src directory to the path so we can import our config
sys.path.append(os.path.join(os.path.dirname(__file__), "src"))

from database.manager import DatabaseManager


def add_edition_column():
    """Add edition column to binder_cards table if it doesn't exist"""
    try:
        # Use the same database path as the application
        db_path = os.path.join(
            os.path.dirname(__file__), "data", "yugioh_deckbuilder.db"
        )
        db_manager = DatabaseManager(db_path)

        with db_manager.get_connection() as conn:
            # Check if edition column already exists
            cursor = conn.execute("PRAGMA table_info(binder_cards)")
            columns = [row[1] for row in cursor.fetchall()]

            if "edition" not in columns:
                print("Adding 'edition' column to binder_cards table...")
                conn.execute("ALTER TABLE binder_cards ADD COLUMN edition TEXT")
                conn.commit()
                print("✅ Successfully added 'edition' column")
            else:
                print("⏭️ 'edition' column already exists")

        return True

    except Exception as e:
        print(f"❌ Error adding edition column: {e}")
        return False


if __name__ == "__main__":
    print("🔧 Adding edition column to database...")
    success = add_edition_column()
    sys.exit(0 if success else 1)
