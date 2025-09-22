"""
Database connection and configuration module
"""

import sqlite3
import os
import logging
from contextlib import contextmanager
from typing import Generator
from .manager import DatabaseManager

# Configure logging
logger = logging.getLogger(__name__)

# Default database configuration
DEFAULT_DB_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "cache", "yugioh_deckbuilder.db"
)

# Global database manager instance
_db_manager = None


def get_db_manager() -> DatabaseManager:
    """Get the global database manager instance"""
    global _db_manager
    if _db_manager is None:
        # Ensure cache directory exists
        os.makedirs(os.path.dirname(DEFAULT_DB_PATH), exist_ok=True)
        _db_manager = DatabaseManager(DEFAULT_DB_PATH)
    return _db_manager


@contextmanager
def get_db_connection() -> Generator[sqlite3.Connection, None, None]:
    """Get a database connection context manager

    Usage:
        with get_db_connection() as conn:
            cursor = conn.execute("SELECT * FROM users")
            results = cursor.fetchall()
    """
    db_manager = get_db_manager()
    conn = db_manager.get_connection()
    try:
        yield conn
    finally:
        conn.close()


def init_database() -> bool:
    """Initialize the database if it doesn't exist

    Returns:
        True if initialization was successful
    """
    db_manager = get_db_manager()
    success = db_manager.setup_database()

    if success:
        # Ensure default user exists
        try:
            with get_db_connection() as conn:
                conn.execute(
                    """
                    INSERT OR IGNORE INTO users (id, username, display_name, created_at, updated_at) 
                    VALUES (1, 'default', 'Default User', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """
                )
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to create default user: {e}")
            return False

    return success


def reset_database() -> bool:
    """Reset the database (DESTRUCTIVE - deletes all data)

    Returns:
        True if reset was successful
    """
    db_manager = get_db_manager()
    return db_manager.reset_database()


def validate_database() -> bool:
    """Validate database schema

    Returns:
        True if schema is valid
    """
    db_manager = get_db_manager()
    return db_manager.validate_schema()
