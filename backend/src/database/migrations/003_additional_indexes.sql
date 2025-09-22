-- Additional indexes for improved performance
-- Migration 003: Add indexes for new query patterns

-- Indexes for card search and filtering
CREATE INDEX IF NOT EXISTS idx_card_cache_archetype ON card_cache(archetype);
CREATE INDEX IF NOT EXISTS idx_card_cache_level ON card_cache(level);
CREATE INDEX IF NOT EXISTS idx_card_cache_atk ON card_cache(atk);
CREATE INDEX IF NOT EXISTS idx_card_cache_def ON card_cache(def);
CREATE INDEX IF NOT EXISTS idx_card_cache_last_updated ON card_cache(last_updated);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_card_cache_type_race ON card_cache(type, race);
CREATE INDEX IF NOT EXISTS idx_card_cache_attribute_level ON card_cache(attribute, level);

-- Indexes for binder card queries
CREATE INDEX IF NOT EXISTS idx_binder_cards_set_code ON binder_cards(set_code);
CREATE INDEX IF NOT EXISTS idx_binder_cards_rarity ON binder_cards(rarity);
CREATE INDEX IF NOT EXISTS idx_binder_cards_condition ON binder_cards(condition);
CREATE INDEX IF NOT EXISTS idx_binder_cards_date_added ON binder_cards(date_added);

-- Composite index for binder card uniqueness check
CREATE INDEX IF NOT EXISTS idx_binder_cards_unique_check ON binder_cards(binder_id, card_id, set_code, rarity);

-- Indexes for deck queries
CREATE INDEX IF NOT EXISTS idx_decks_format ON decks(format);
CREATE INDEX IF NOT EXISTS idx_decks_is_valid ON decks(is_valid);
CREATE INDEX IF NOT EXISTS idx_decks_created_at ON decks(created_at);
CREATE INDEX IF NOT EXISTS idx_deck_cards_order_index ON deck_cards(order_index);

-- Indexes for UUID lookups (faster than scanning)
CREATE INDEX IF NOT EXISTS idx_binders_uuid ON binders(uuid);
CREATE INDEX IF NOT EXISTS idx_decks_uuid ON decks(uuid);

-- Indexes for card sets
CREATE INDEX IF NOT EXISTS idx_card_sets_tcg_date ON card_sets(tcg_date);
CREATE INDEX IF NOT EXISTS idx_card_sets_ocg_date ON card_sets(ocg_date);
CREATE INDEX IF NOT EXISTS idx_card_sets_set_type ON card_sets(set_type);

-- Indexes for binder set progress
CREATE INDEX IF NOT EXISTS idx_binder_set_progress_opened_at ON binder_set_progress(opened_at);

-- Text search indexes (for SQLite FTS if needed in future)
-- These would be added when implementing full-text search
-- CREATE VIRTUAL TABLE IF NOT EXISTS card_cache_fts USING fts5(name, description, content='card_cache', content_rowid='id');