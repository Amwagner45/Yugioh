#!/usr/bin/env python3
"""
Build-time card database seeding script

This script downloads all Yu-Gi-Oh cards from YGOPRODeck API and populates
the local database during Docker build time, so users don't need to sync.
"""

import sys
import os
import time
from pathlib import Path

# Add the src directory to Python path
# In Docker build context, we're already in /app (the backend directory)
current_path = Path(__file__).parent.parent
src_path = current_path / "src"
sys.path.insert(0, str(src_path))

# Add current path to PYTHONPATH for proper module discovery
sys.path.insert(0, str(current_path))

# Ensure we have the required environment variables for database path
if not os.getenv("DATABASE_PATH"):
    os.environ["DATABASE_PATH"] = str(current_path / "data" / "yugioh_deckbuilder.db")
if not os.getenv("DATA_PATH"):
    os.environ["DATA_PATH"] = str(current_path / "data")
if not os.getenv("CACHE_PATH"):
    os.environ["CACHE_PATH"] = str(current_path / "cache")

# Set PYTHONPATH environment variable
os.environ["PYTHONPATH"] = str(current_path)

from src.services.bulk_card_sync import bulk_sync_service
from src.database import init_database


def seed_card_database():
    """Seed the database with all Yu-Gi-Oh cards for build-time inclusion"""
    print("=" * 60)
    print("🎴 Yu-Gi-Oh Card Database Build Seeder")
    print("=" * 60)
    print()

    # Ensure data and cache directories exist
    data_dir = Path(os.getenv("DATA_PATH", "./data"))
    cache_dir = Path(os.getenv("CACHE_PATH", "./cache"))

    print(f"📂 Creating directories...")
    data_dir.mkdir(parents=True, exist_ok=True)
    cache_dir.mkdir(parents=True, exist_ok=True)
    print(f"   Data directory: {data_dir.absolute()}")
    print(f"   Cache directory: {cache_dir.absolute()}")
    print()

    # Ensure database is initialized
    print("📊 Initializing database...")
    if not init_database():
        print("❌ Failed to initialize database")
        return False
    print("✅ Database initialized successfully")
    print()

    # Check current status
    print("🔍 Checking current database status...")
    status = bulk_sync_service.get_sync_status()
    current_count = status.get("cached_cards", 0)
    print(f"   Current cached cards: {current_count}")
    print()

    # Force sync regardless of version to ensure we have latest data
    print("🌐 Starting bulk card download from YGOPRODeck API...")
    print("   This may take several minutes...")
    start_time = time.time()

    try:
        # Download and save all cards
        result = bulk_sync_service.sync_all_cards()

        if result["status"] == "success":
            duration = time.time() - start_time
            print(f"✅ Card database seeding completed successfully!")
            print(f"   Cards downloaded: {result['cards_downloaded']:,}")
            print(f"   Cards saved: {result['cards_saved']:,}")
            print(f"   Duration: {duration:.1f} seconds")
            print(f"   DB version: {result.get('db_version', 'Unknown')}")
            print()

            # Verify final count
            final_status = bulk_sync_service.get_sync_status()
            final_count = final_status.get("cached_cards", 0)
            print(f"📊 Final database stats:")
            print(f"   Total cards in cache: {final_count:,}")
            print()

            if final_count > 10000:  # Expect ~13,000+ cards
                print("🎉 Database seeding successful - ready for production!")
                return True
            else:
                print(f"⚠️  Warning: Only {final_count} cards cached (expected 13,000+)")
                return False

        else:
            print(
                f"❌ Card database seeding failed: {result.get('error', 'Unknown error')}"
            )
            return False

    except Exception as e:
        print(f"❌ Error during card database seeding: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = seed_card_database()

    if success:
        print("=" * 60)
        print("🎴 Build seeding completed successfully!")
        print("   Docker image will include pre-populated card database")
        print("=" * 60)
        sys.exit(0)
    else:
        print("=" * 60)
        print("❌ Build seeding failed!")
        print("   Docker build should be stopped")
        print("=" * 60)
        sys.exit(1)
