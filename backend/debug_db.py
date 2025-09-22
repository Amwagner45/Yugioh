#!/usr/bin/env python3
"""
Debug script to check database state
"""
import sys
import os

# Add the src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

from src.database import get_db_connection


def check_database():
    """Check database contents"""
    print("Checking database state...")

    try:
        with get_db_connection() as conn:
            # Check users table
            cursor = conn.execute("SELECT * FROM users")
            users = cursor.fetchall()
            print(f"Users in database: {len(users)}")
            for user in users:
                print(f"  User: {dict(user)}")

            # Try to insert default user manually
            if len(users) == 0:
                print("Attempting to insert default user...")
                try:
                    conn.execute(
                        """
                        INSERT INTO users (id, username, display_name, created_at, updated_at) 
                        VALUES (1, 'default', 'Default User', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    """
                    )
                    conn.commit()
                    print("✅ Default user inserted successfully")

                    # Check again
                    cursor = conn.execute("SELECT * FROM users")
                    users = cursor.fetchall()
                    print(f"Users after insert: {len(users)}")
                    for user in users:
                        print(f"  User: {dict(user)}")

                except Exception as e:
                    print(f"❌ Failed to insert default user: {e}")

            # Check if foreign keys are enabled
            cursor = conn.execute("PRAGMA foreign_keys")
            fk_status = cursor.fetchone()[0]
            print(f"Foreign keys enabled: {bool(fk_status)}")

            # Check table info
            cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in cursor.fetchall()]
            print(f"Tables: {tables}")

    except Exception as e:
        print(f"Error checking database: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    check_database()
