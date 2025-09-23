"""
Database migration to add banlist support
"""

import sqlite3
import sys
import os

# Add the src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from database import get_db_connection

def migrate_add_banlist_tables():
    """Add banlist tables to the database"""
    
    migration_sql = """
    -- Banlists table - stores banlist metadata
    CREATE TABLE IF NOT EXISTS banlists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid VARCHAR(36) UNIQUE NOT NULL,
        user_id INTEGER NOT NULL DEFAULT 1,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        start_date DATE,
        end_date DATE,
        format_type VARCHAR(50) NOT NULL DEFAULT 'TCG',
        is_official BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Banlist cards - junction table for cards in banlists with restrictions
    CREATE TABLE IF NOT EXISTS banlist_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        banlist_id INTEGER NOT NULL,
        card_id INTEGER NOT NULL,
        restriction_type VARCHAR(20) NOT NULL CHECK (restriction_type IN ('forbidden', 'limited', 'semi_limited', 'whitelist')),
        FOREIGN KEY (banlist_id) REFERENCES banlists(id) ON DELETE CASCADE,
        FOREIGN KEY (card_id) REFERENCES card_cache(id),
        UNIQUE(banlist_id, card_id)
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_banlists_user_id ON banlists(user_id);
    CREATE INDEX IF NOT EXISTS idx_banlists_format_type ON banlists(format_type);
    CREATE INDEX IF NOT EXISTS idx_banlists_is_active ON banlists(is_active);
    CREATE INDEX IF NOT EXISTS idx_banlist_cards_banlist_id ON banlist_cards(banlist_id);
    CREATE INDEX IF NOT EXISTS idx_banlist_cards_card_id ON banlist_cards(card_id);
    CREATE INDEX IF NOT EXISTS idx_banlist_cards_restriction ON banlist_cards(restriction_type);

    -- Create trigger for updating timestamps
    CREATE TRIGGER IF NOT EXISTS update_banlists_timestamp 
    AFTER UPDATE ON banlists 
    FOR EACH ROW 
    BEGIN 
        UPDATE banlists SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
    END;
    """
    
    try:
        with get_db_connection() as conn:
            # Execute the migration
            conn.executescript(migration_sql)
            conn.commit()
            
            print("✅ Successfully added banlist tables")
            
            # Verify tables were created
            cursor = conn.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name IN ('banlists', 'banlist_cards')
                ORDER BY name
            """)
            
            tables = [row[0] for row in cursor.fetchall()]
            print(f"📋 Created tables: {', '.join(tables)}")
            
            return True
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False

def main():
    """Run the migration"""
    print("🚀 Starting banlist tables migration...")
    
    success = migrate_add_banlist_tables()
    
    if success:
        print("✅ Migration completed successfully!")
    else:
        print("❌ Migration failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()