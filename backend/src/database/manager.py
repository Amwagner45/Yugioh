"""
Database initialization and migration system for Yu-Gi-Oh Deck Builder
"""
import sqlite3
import os
import logging
from pathlib import Path
from typing import Optional
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DatabaseManager:
    """Manages database creation, migrations, and connections"""
    
    def __init__(self, db_path: str = "yugioh_deckbuilder.db"):
        """Initialize database manager
        
        Args:
            db_path: Path to the SQLite database file
        """
        self.db_path = db_path
        self.schema_dir = Path(__file__).parent
        self.migrations_dir = self.schema_dir / "migrations"
        
        # Ensure migrations directory exists
        self.migrations_dir.mkdir(exist_ok=True)
    
    def get_connection(self) -> sqlite3.Connection:
        """Get a database connection with foreign keys enabled"""
        conn = sqlite3.connect(self.db_path)
        conn.execute("PRAGMA foreign_keys = ON")
        conn.row_factory = sqlite3.Row  # Enable column access by name
        return conn
    
    def database_exists(self) -> bool:
        """Check if database file exists"""
        return os.path.exists(self.db_path)
    
    def get_schema_version(self) -> int:
        """Get current schema version from database"""
        try:
            with self.get_connection() as conn:
                cursor = conn.execute(
                    "SELECT version FROM schema_version ORDER BY applied_at DESC LIMIT 1"
                )
                result = cursor.fetchone()
                return result[0] if result else 0
        except sqlite3.OperationalError:
            # schema_version table doesn't exist yet
            return 0
    
    def create_schema_version_table(self):
        """Create the schema version tracking table"""
        with self.get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS schema_version (
                    version INTEGER PRIMARY KEY,
                    description TEXT NOT NULL,
                    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
    
    def initialize_database(self) -> bool:
        """Initialize database with base schema
        
        Returns:
            True if initialization was successful
        """
        try:
            logger.info(f"Initializing database at {self.db_path}")
            
            # Create schema version table first
            self.create_schema_version_table()
            
            # Read and execute main schema
            schema_file = self.schema_dir / "schema.sql"
            if not schema_file.exists():
                raise FileNotFoundError(f"Schema file not found: {schema_file}")
            
            with open(schema_file, 'r', encoding='utf-8') as f:
                schema_sql = f.read()
            
            with self.get_connection() as conn:
                # Execute schema in chunks (split by semicolon)
                statements = [stmt.strip() for stmt in schema_sql.split(';') if stmt.strip()]
                for statement in statements:
                    if statement:  # Only execute non-empty statements
                        try:
                            conn.execute(statement)
                        except Exception as e:
                            logger.error(f"Failed to execute statement: {statement[:100]}...")
                            logger.error(f"Error: {e}")
                            raise
                
                # Record initial schema version
                conn.execute(
                    "INSERT OR REPLACE INTO schema_version (version, description) VALUES (1, 'Initial schema')"
                )
                
                # Ensure default user exists
                conn.execute("""
                    INSERT OR IGNORE INTO users (id, username, display_name, created_at, updated_at) 
                    VALUES (1, 'default', 'Default User', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """)
                
                conn.commit()
            
            logger.info("Database initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")
            return False
    
    def apply_migrations(self) -> bool:
        """Apply any pending migrations
        
        Returns:
            True if all migrations applied successfully
        """
        try:
            current_version = self.get_schema_version()
            logger.info(f"Current schema version: {current_version}")
            
            # Get list of migration files
            migration_files = sorted([
                f for f in self.migrations_dir.glob("*.sql")
                if f.name.startswith(f"{current_version + 1:03d}_")
            ])
            
            if not migration_files:
                logger.info("No pending migrations")
                return True
            
            for migration_file in migration_files:
                version = int(migration_file.name[:3])
                description = migration_file.name[4:].replace('.sql', '').replace('_', ' ')
                
                logger.info(f"Applying migration {version}: {description}")
                
                with open(migration_file, 'r', encoding='utf-8') as f:
                    migration_sql = f.read()
                
                with self.get_connection() as conn:
                    statements = [stmt.strip() for stmt in migration_sql.split(';') if stmt.strip()]
                    for statement in statements:
                        conn.execute(statement)
                    
                    # Record migration
                    conn.execute(
                        "INSERT INTO schema_version (version, description) VALUES (?, ?)",
                        (version, description)
                    )
                    conn.commit()
                
                logger.info(f"Migration {version} applied successfully")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to apply migrations: {e}")
            return False
    
    def setup_database(self) -> bool:
        """Complete database setup (initialize + migrate)
        
        Returns:
            True if setup was successful
        """
        if not self.database_exists():
            if not self.initialize_database():
                return False
        
        return self.apply_migrations()
    
    def reset_database(self) -> bool:
        """Delete and recreate database (DESTRUCTIVE)
        
        Returns:
            True if reset was successful
        """
        try:
            if self.database_exists():
                os.remove(self.db_path)
                logger.info(f"Deleted existing database: {self.db_path}")
            
            return self.initialize_database()
            
        except Exception as e:
            logger.error(f"Failed to reset database: {e}")
            return False
    
    def validate_schema(self) -> bool:
        """Validate database schema integrity
        
        Returns:
            True if schema is valid
        """
        try:
            with self.get_connection() as conn:
                # Check that all expected tables exist
                expected_tables = [
                    'users', 'binders', 'card_cache', 'binder_cards',
                    'decks', 'deck_cards', 'card_sets', 'binder_set_progress',
                    'schema_version'
                ]
                
                cursor = conn.execute(
                    "SELECT name FROM sqlite_master WHERE type='table'"
                )
                existing_tables = {row[0] for row in cursor.fetchall()}
                
                missing_tables = set(expected_tables) - existing_tables
                if missing_tables:
                    logger.error(f"Missing tables: {missing_tables}")
                    return False
                
                # Check foreign key constraints
                conn.execute("PRAGMA foreign_key_check")
                
                logger.info("Schema validation passed")
                return True
                
        except Exception as e:
            logger.error(f"Schema validation failed: {e}")
            return False


def main():
    """Main function for command-line usage"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Yu-Gi-Oh Deck Builder Database Manager")
    parser.add_argument(
        "action",
        choices=["init", "migrate", "setup", "reset", "validate"],
        help="Action to perform"
    )
    parser.add_argument(
        "--db-path",
        default="yugioh_deckbuilder.db",
        help="Path to database file"
    )
    
    args = parser.parse_args()
    
    db_manager = DatabaseManager(args.db_path)
    
    if args.action == "init":
        success = db_manager.initialize_database()
    elif args.action == "migrate":
        success = db_manager.apply_migrations()
    elif args.action == "setup":
        success = db_manager.setup_database()
    elif args.action == "reset":
        success = db_manager.reset_database()
    elif args.action == "validate":
        success = db_manager.validate_schema()
    
    if success:
        logger.info(f"Action '{args.action}' completed successfully")
        exit(0)
    else:
        logger.error(f"Action '{args.action}' failed")
        exit(1)


if __name__ == "__main__":
    main()