"""
Bulk card synchronization service for downloading all YGOPRODeck cards
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, List, Optional
from ..database.models import Card
from ..database import get_db_connection


class BulkCardSyncService:
    """Service for bulk downloading and caching all Yu-Gi-Oh cards"""

    API_BASE_URL = "https://db.ygoprodeck.com/api/v7"
    BULK_ENDPOINT = f"{API_BASE_URL}/cardinfo.php"
    VERSION_ENDPOINT = f"{API_BASE_URL}/checkDBVer.php"

    def __init__(self):
        self.last_sync_time = None
        self.last_db_version = None

    def check_db_version(self) -> Dict:
        """Check the current database version from YGOPRODeck"""
        try:
            response = requests.get(self.VERSION_ENDPOINT, timeout=10)
            response.raise_for_status()
            data = response.json()
            # API returns a list with one object
            if isinstance(data, list) and len(data) > 0:
                return data[0]
            return data if isinstance(data, dict) else {}
        except Exception as e:
            print(f"Error checking database version: {e}")
            return {}

    def needs_sync(self) -> bool:
        """Check if we need to sync cards based on version or age"""
        version_info = self.check_db_version()
        if not version_info:
            return True  # Sync if we can't check version

        current_version = version_info.get("database_version")
        if current_version != self.last_db_version:
            return True

        # Also sync if we haven't synced in a while (daily check)
        if not self.last_sync_time:
            return True

        time_diff = datetime.now() - self.last_sync_time
        return time_diff.days >= 1

    def download_all_cards(self) -> List[Dict]:
        """Download all cards from YGOPRODeck API"""
        print("Starting bulk card download from YGOPRODeck...")

        try:
            # Make request with longer timeout for bulk data
            response = requests.get(self.BULK_ENDPOINT, timeout=120)
            response.raise_for_status()

            data = response.json()
            cards = data.get("data", [])

            print(f"Downloaded {len(cards)} cards from YGOPRODeck API")
            return cards

        except Exception as e:
            print(f"Error downloading cards: {e}")
            raise

    def save_cards_to_cache(self, cards: List[Dict]) -> int:
        """Save downloaded cards to local cache"""
        saved_count = 0

        with get_db_connection() as conn:
            cursor = conn.cursor()

            # Prepare bulk insert/update
            for card_data in cards:
                try:
                    # Create Card object from API data
                    card = Card.from_api_response(card_data)

                    # Save to cache
                    card.save_to_cache()
                    saved_count += 1

                    if saved_count % 1000 == 0:
                        print(f"Saved {saved_count} cards to cache...")

                except Exception as e:
                    print(f"Error saving card {card_data.get('id', 'unknown')}: {e}")
                    continue

        print(f"Successfully saved {saved_count} cards to cache")
        return saved_count

    def sync_all_cards(self) -> Dict:
        """Full synchronization of all cards"""
        start_time = datetime.now()

        try:
            # Check if sync is needed
            if not self.needs_sync():
                print("Card database is up to date, skipping sync")
                return {"status": "skipped", "reason": "up_to_date"}

            # Download all cards
            cards = self.download_all_cards()

            # Save to cache
            saved_count = self.save_cards_to_cache(cards)

            # Update sync metadata
            self.last_sync_time = datetime.now()
            version_info = self.check_db_version()
            self.last_db_version = version_info.get("database_version")

            # Save sync metadata to database
            self._save_sync_metadata()

            duration = (datetime.now() - start_time).total_seconds()

            result = {
                "status": "success",
                "cards_downloaded": len(cards),
                "cards_saved": saved_count,
                "duration_seconds": duration,
                "db_version": self.last_db_version,
                "sync_time": self.last_sync_time.isoformat(),
            }

            print(f"Bulk sync completed in {duration:.2f} seconds")
            return result

        except Exception as e:
            print(f"Bulk sync failed: {e}")
            return {"status": "error", "error": str(e)}

    def _save_sync_metadata(self):
        """Save sync metadata to database"""
        with get_db_connection() as conn:
            cursor = conn.cursor()

            # Create metadata table if it doesn't exist
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS sync_metadata (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    updated_at TEXT
                )
            """
            )

            # Save last sync time and version
            now = datetime.now().isoformat()

            cursor.execute(
                """
                INSERT OR REPLACE INTO sync_metadata (key, value, updated_at)
                VALUES (?, ?, ?)
            """,
                ("last_sync_time", self.last_sync_time.isoformat(), now),
            )

            cursor.execute(
                """
                INSERT OR REPLACE INTO sync_metadata (key, value, updated_at)
                VALUES (?, ?, ?)
            """,
                ("last_db_version", str(self.last_db_version), now),
            )

            conn.commit()

    def get_sync_status(self) -> Dict:
        """Get current sync status"""
        with get_db_connection() as conn:
            cursor = conn.cursor()

            try:
                cursor.execute("SELECT COUNT(*) FROM card_cache")
                card_count = cursor.fetchone()[0]

                cursor.execute(
                    """
                    SELECT key, value, updated_at FROM sync_metadata 
                    WHERE key IN ('last_sync_time', 'last_db_version')
                """
                )
                metadata = {row[0]: row[1] for row in cursor.fetchall()}

                return {
                    "cached_cards": card_count,
                    "last_sync": metadata.get("last_sync_time"),
                    "db_version": metadata.get("last_db_version"),
                    "needs_sync": self.needs_sync(),
                }

            except Exception as e:
                return {"error": str(e)}


# Global instance
bulk_sync_service = BulkCardSyncService()
