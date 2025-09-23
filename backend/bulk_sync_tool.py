"""
CLI tool for testing bulk card synchronization
"""

import sys
import asyncio
from pathlib import Path

# Add the src directory to Python path
backend_path = Path(__file__).parent
sys.path.append(str(backend_path / "src"))

from src.services.bulk_card_sync import bulk_sync_service


async def main():
    """Main CLI function"""
    print("Yu-Gi-Oh! Card Database Bulk Sync Tool")
    print("=" * 40)
    
    # Check current status
    print("\n1. Checking current sync status...")
    status = bulk_sync_service.get_sync_status()
    print(f"   Cached cards: {status.get('cached_cards', 0)}")
    print(f"   Last sync: {status.get('last_sync', 'Never')}")
    print(f"   DB version: {status.get('last_db_version', 'Unknown')}")
    print(f"   Needs sync: {status.get('needs_sync', True)}")
    
    # Check API version
    print("\n2. Checking YGOPRODeck API version...")
    try:
        version_info = bulk_sync_service.check_db_version()
        print(f"   Current API version: {version_info.get('database_version', 'Unknown')}")
        print(f"   Last update: {version_info.get('last_update', 'Unknown')}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Ask user if they want to sync
    if status.get('needs_sync', True):
        response = input("\n3. Do you want to start bulk synchronization? (y/N): ")
        if response.lower() in ['y', 'yes']:
            print("\n   Starting bulk synchronization...")
            print("   This may take several minutes for the first sync...")
            
            try:
                result = bulk_sync_service.sync_all_cards()
                
                if result['status'] == 'success':
                    print(f"   ✅ Success!")
                    print(f"   Cards downloaded: {result['cards_downloaded']}")
                    print(f"   Cards saved: {result['cards_saved']}")
                    print(f"   Duration: {result['duration_seconds']:.2f} seconds")
                    print(f"   DB version: {result['db_version']}")
                else:
                    print(f"   ❌ Failed: {result.get('error', 'Unknown error')}")
                    
            except Exception as e:
                print(f"   ❌ Error during sync: {e}")
        else:
            print("   Sync cancelled.")
    else:
        print("\n3. Database is up to date, no sync needed.")
    
    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(main())