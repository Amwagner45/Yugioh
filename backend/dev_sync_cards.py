#!/usr/bin/env python3
"""
Development card database sync script

Run this script during development to populate your local database
with all Yu-Gi-Oh cards before building the Docker image.
"""

import sys
import os
import time
from pathlib import Path

# Add the backend src directory to Python path
backend_path = Path(__file__).parent
src_path = backend_path / "src"
sys.path.insert(0, str(src_path))

from src.services.bulk_card_sync import bulk_sync_service
from src.database import init_database


def main():
    """Main development sync function"""
    print("=" * 60)
    print("🎴 Yu-Gi-Oh Card Database Development Sync")
    print("=" * 60)
    print()
    print("This script will download all Yu-Gi-Oh cards to your local database.")
    print("This is useful for:")
    print("• Development and testing")
    print("• Pre-populating data before Docker builds")
    print("• Ensuring search functionality works with full dataset")
    print()

    # Check current status
    print("🔍 Checking current database status...")
    status = bulk_sync_service.get_sync_status()
    current_count = status.get("cached_cards", 0)
    last_sync = status.get("last_sync", "Never")
    needs_sync = status.get("needs_sync", True)

    print(f"   Current cached cards: {current_count:,}")
    print(f"   Last sync: {last_sync}")
    print(f"   Needs sync: {needs_sync}")
    print()

    # Check API version
    print("🌐 Checking YGOPRODeck API status...")
    try:
        version_info = bulk_sync_service.check_db_version()
        api_version = version_info.get("database_version", "Unknown")
        print(f"   API database version: {api_version}")
    except Exception as e:
        print(f"   ⚠️  Could not check API version: {e}")
    print()

    # Ask for confirmation if database already has many cards
    if current_count > 5000 and not needs_sync:
        print(
            f"📊 You already have {current_count:,} cards cached and sync is not needed."
        )
        response = input("   Continue with sync anyway? (y/N): ").strip().lower()
        if response not in ["y", "yes"]:
            print("   Sync cancelled.")
            return
        print()

    # Start sync
    print("🚀 Starting card database sync...")
    print("   This will download ~13,000+ cards and may take several minutes...")

    # Ask for final confirmation
    response = input("   Continue? (Y/n): ").strip().lower()
    if response in ["n", "no"]:
        print("   Sync cancelled.")
        return

    print()
    start_time = time.time()

    try:
        # Initialize database if needed
        init_database()

        # Run sync
        result = bulk_sync_service.sync_all_cards()

        duration = time.time() - start_time

        if result["status"] == "success":
            print(f"✅ Development sync completed successfully!")
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

            print("🎉 Development sync successful!")
            print("   Your local database now contains all Yu-Gi-Oh cards.")
            print("   Search functionality will work with the complete dataset.")

        elif result["status"] == "skipped":
            print("ℹ️  Sync was skipped - database is already up to date.")

        else:
            print(f"❌ Development sync failed: {result.get('error', 'Unknown error')}")

    except KeyboardInterrupt:
        duration = time.time() - start_time
        print(f"\n⚠️  Sync interrupted after {duration:.1f} seconds")
        print("   Partial data may have been saved.")

    except Exception as e:
        print(f"❌ Error during development sync: {e}")
        import traceback

        traceback.print_exc()

    print()
    print("=" * 60)


if __name__ == "__main__":
    main()
