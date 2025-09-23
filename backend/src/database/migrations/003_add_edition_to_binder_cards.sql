-- Migration: Add edition column to binder_cards table
-- Add support for card edition tracking (1st Edition, Unlimited, etc.)

ALTER TABLE binder_cards ADD COLUMN edition VARCHAR(50);

-- Update the unique constraint to include edition
-- First drop the old constraint (SQLite doesn't support DROP CONSTRAINT)
-- We'll create a new table and copy data

-- Create new table with updated constraint
CREATE TABLE binder_cards_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    binder_id INTEGER NOT NULL,
    card_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    set_code VARCHAR(20), -- Specific set code for this card
    rarity VARCHAR(50), -- Card rarity from the set
    condition VARCHAR(20) DEFAULT 'Near Mint', -- Card condition
    edition VARCHAR(50), -- Card edition (1st Edition, Unlimited, etc.)
    notes TEXT, -- Personal notes about this card
    date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (binder_id) REFERENCES binders(id) ON DELETE CASCADE,
    FOREIGN KEY (card_id) REFERENCES card_cache(id),
    UNIQUE(binder_id, card_id, set_code, rarity, edition) -- Prevent duplicate entries
);

-- Copy data from old table
INSERT INTO binder_cards_new (id, binder_id, card_id, quantity, set_code, rarity, condition, edition, notes, date_added)
SELECT id, binder_id, card_id, quantity, set_code, rarity, condition, NULL, notes, date_added
FROM binder_cards;

-- Drop old table and rename new one
DROP TABLE binder_cards;
ALTER TABLE binder_cards_new RENAME TO binder_cards;

-- Recreate indexes
CREATE INDEX idx_binder_cards_binder_id ON binder_cards(binder_id);
CREATE INDEX idx_binder_cards_card_id ON binder_cards(card_id);