#!/usr/bin/env python3

from src.database import get_db_connection

with get_db_connection() as conn:
    # Check cards table
    cursor = conn.execute("SELECT COUNT(*) FROM cards")
    card_count = cursor.fetchone()[0]
    print(f"Cards in database: {card_count}")

    # Check card_cache table
    try:
        cursor = conn.execute("SELECT COUNT(*) FROM card_cache")
        cache_count = cursor.fetchone()[0]
        print(f"Cards in cache: {cache_count}")
    except Exception as e:
        print(f"No card_cache table: {e}")

    # Check if we have any of the cards from the binder
    cursor = conn.execute("SELECT card_id FROM binder_cards LIMIT 10")
    binder_card_ids = [row[0] for row in cursor.fetchall()]
    print(f"First 10 binder card IDs: {binder_card_ids}")

    if binder_card_ids:
        placeholders = ",".join("?" * len(binder_card_ids))
        cursor = conn.execute(
            f"SELECT id FROM cards WHERE id IN ({placeholders})", binder_card_ids
        )
        found_cards = [row[0] for row in cursor.fetchall()]
        print(f"Cards found in database: {found_cards}")
        print(f"Missing cards: {set(binder_card_ids) - set(found_cards)}")
