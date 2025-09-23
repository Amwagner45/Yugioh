-- Yu-Gi-Oh Deck Builder Database Schema
-- SQLite compatible schema with PostgreSQL migration considerations

-- Enable foreign key constraints in SQLite
PRAGMA foreign_keys = ON;

-- Users table for future multi-user support
-- For now, single user mode will use a default user
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100),
    display_name VARCHAR(100),
    preferences JSON, -- Store user preferences as JSON
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Binders table - stores binder metadata
CREATE TABLE binders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid VARCHAR(36) UNIQUE NOT NULL, -- For external references
    user_id INTEGER NOT NULL DEFAULT 1,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    tags JSON, -- Store tags as JSON array
    is_default BOOLEAN DEFAULT FALSE, -- Mark default/main binder
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Card cache table - stores YGOPRODeck API data locally
CREATE TABLE card_cache (
    id INTEGER PRIMARY KEY, -- Use YGOPRODeck card ID directly
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    atk INTEGER,
    def INTEGER,
    level INTEGER,
    race VARCHAR(50),
    attribute VARCHAR(50),
    card_images JSON, -- Store image URLs as JSON
    card_sets JSON, -- Store set information as JSON
    banlist_info JSON, -- Store ban list status as JSON
    archetype VARCHAR(100),
    scale INTEGER, -- For Pendulum monsters
    linkval INTEGER, -- For Link monsters
    linkmarkers JSON, -- Store link markers as JSON array
    cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Binder cards - junction table for cards in binders
CREATE TABLE binder_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    binder_id INTEGER NOT NULL,
    card_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    set_code VARCHAR(20), -- Specific set code for this card
    rarity VARCHAR(50), -- Card rarity from the set
    condition VARCHAR(20) DEFAULT 'Near Mint', -- Card condition
    notes TEXT, -- Personal notes about this card
    date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (binder_id) REFERENCES binders(id) ON DELETE CASCADE,
    FOREIGN KEY (card_id) REFERENCES card_cache(id),
    UNIQUE(binder_id, card_id, set_code, rarity) -- Prevent duplicate entries
);

-- Decks table - stores deck metadata
CREATE TABLE decks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid VARCHAR(36) UNIQUE NOT NULL, -- For external references
    user_id INTEGER NOT NULL DEFAULT 1,
    binder_id INTEGER, -- Optional: link to source binder
    name VARCHAR(100) NOT NULL,
    description TEXT,
    format VARCHAR(50), -- Tournament format (TCG, OCG, etc.)
    tags JSON, -- Store tags as JSON array
    notes TEXT,
    is_valid BOOLEAN DEFAULT TRUE, -- Deck validation status
    validation_errors JSON, -- Store validation errors
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (binder_id) REFERENCES binders(id) ON DELETE SET NULL
);

-- Deck cards - stores cards in each deck section
CREATE TABLE deck_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deck_id INTEGER NOT NULL,
    card_id INTEGER NOT NULL,
    section VARCHAR(10) NOT NULL CHECK (section IN ('main', 'extra', 'side')),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 3),
    order_index INTEGER DEFAULT 0, -- For custom card ordering
    FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE,
    FOREIGN KEY (card_id) REFERENCES card_cache(id),
    UNIQUE(deck_id, card_id, section) -- Prevent duplicate entries in same section
);

-- Card sets table - for tracking set information and release dates
CREATE TABLE card_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    set_code VARCHAR(20) UNIQUE NOT NULL,
    set_name VARCHAR(200) NOT NULL,
    tcg_date DATE, -- TCG release date
    ocg_date DATE, -- OCG release date
    num_cards INTEGER, -- Total cards in set
    set_type VARCHAR(50), -- Booster Pack, Structure Deck, etc.
    series VARCHAR(100), -- Which series/era
    cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Binder set progress - track which sets have been "opened" for progression series
CREATE TABLE binder_set_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    binder_id INTEGER NOT NULL,
    set_code VARCHAR(20) NOT NULL,
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT, -- Notes about the opening (pulls, etc.)
    FOREIGN KEY (binder_id) REFERENCES binders(id) ON DELETE CASCADE,
    FOREIGN KEY (set_code) REFERENCES card_sets(set_code),
    UNIQUE(binder_id, set_code)
);

-- Banlists table - stores banlist metadata
CREATE TABLE banlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid VARCHAR(36) UNIQUE NOT NULL, -- For external references
    user_id INTEGER NOT NULL DEFAULT 1,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    start_date DATE, -- When this banlist becomes effective
    end_date DATE, -- When this banlist expires (optional)
    format_type VARCHAR(50) NOT NULL DEFAULT 'TCG', -- TCG, OCG, Custom, GOAT, Edison, etc.
    is_official BOOLEAN DEFAULT FALSE, -- Official banlist vs user-created
    is_active BOOLEAN DEFAULT TRUE, -- Whether the banlist is currently active
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Banlist cards - junction table for cards in banlists with restrictions
CREATE TABLE banlist_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    banlist_id INTEGER NOT NULL,
    card_id INTEGER NOT NULL,
    restriction_type VARCHAR(20) NOT NULL CHECK (restriction_type IN ('forbidden', 'limited', 'semi_limited', 'whitelist')),
    FOREIGN KEY (banlist_id) REFERENCES banlists(id) ON DELETE CASCADE,
    FOREIGN KEY (card_id) REFERENCES card_cache(id),
    UNIQUE(banlist_id, card_id) -- Prevent duplicate entries for same card in same banlist
);

-- Create indexes for better performance
CREATE INDEX idx_binder_cards_binder_id ON binder_cards(binder_id);
CREATE INDEX idx_binder_cards_card_id ON binder_cards(card_id);
CREATE INDEX idx_deck_cards_deck_id ON deck_cards(deck_id);
CREATE INDEX idx_deck_cards_card_id ON deck_cards(card_id);
CREATE INDEX idx_deck_cards_section ON deck_cards(section);
CREATE INDEX idx_card_cache_name ON card_cache(name);
CREATE INDEX idx_card_cache_type ON card_cache(type);
CREATE INDEX idx_card_cache_race ON card_cache(race);
CREATE INDEX idx_card_cache_attribute ON card_cache(attribute);
CREATE INDEX idx_binders_user_id ON binders(user_id);
CREATE INDEX idx_decks_user_id ON decks(user_id);
CREATE INDEX idx_decks_binder_id ON decks(binder_id);
CREATE INDEX idx_banlists_user_id ON banlists(user_id);
CREATE INDEX idx_banlists_format_type ON banlists(format_type);
CREATE INDEX idx_banlists_is_active ON banlists(is_active);
CREATE INDEX idx_banlist_cards_banlist_id ON banlist_cards(banlist_id);
CREATE INDEX idx_banlist_cards_card_id ON banlist_cards(card_id);
CREATE INDEX idx_banlist_cards_restriction ON banlist_cards(restriction_type);

-- Create triggers for updating timestamps
CREATE TRIGGER update_binders_timestamp AFTER UPDATE ON binders FOR EACH ROW BEGIN UPDATE binders SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;

CREATE TRIGGER update_decks_timestamp AFTER UPDATE ON decks FOR EACH ROW BEGIN UPDATE decks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;

CREATE TRIGGER update_banlists_timestamp AFTER UPDATE ON banlists FOR EACH ROW BEGIN UPDATE banlists SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;

-- Insert default user for single-user mode
INSERT OR IGNORE INTO users (id, username, display_name) 
VALUES (1, 'default', 'Default User');