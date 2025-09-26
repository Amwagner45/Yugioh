"""
Auto-import service for binder CSV files
Automatically imports CSV files found in the binders directory on application startup
"""

import os
import csv
import re
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

from ..database.models import Binder, BinderCard, Card
from ..services.file_export import FileExportService


class AutoImportService:
    """Service for automatically importing binder CSV files on startup"""

    def __init__(self, binders_path: str = "/app/binders"):
        """Initialize with binders directory path"""
        self.binders_path = Path(binders_path)
        self.import_stats = {
            "files_found": 0,
            "files_processed": 0,
            "files_skipped": 0,
            "files_failed": 0,
            "binders_created": 0,
            "cards_imported": 0,
            "errors": [],
        }

    def auto_import_binders(self) -> Dict[str, Any]:
        """
        Scan binders directory and import any CSV files not already in database
        Returns statistics about the import process
        """
        print("🔍 Starting automatic binder import scan...")

        # Reset stats
        self.import_stats = {
            "files_found": 0,
            "files_processed": 0,
            "files_skipped": 0,
            "files_failed": 0,
            "binders_created": 0,
            "cards_imported": 0,
            "errors": [],
        }

        try:
            if not self.binders_path.exists():
                print(f"⚠️ Binders directory not found: {self.binders_path}")
                return self.import_stats

            # Find all CSV files
            csv_files = list(self.binders_path.glob("*.csv"))
            self.import_stats["files_found"] = len(csv_files)

            if not csv_files:
                print("📁 No CSV files found in binders directory")
                return self.import_stats

            print(f"📁 Found {len(csv_files)} CSV files to check")

            # Get existing binders to avoid duplicates
            existing_binders = self._get_existing_binder_filenames()

            for csv_file in csv_files:
                try:
                    self._process_csv_file(csv_file, existing_binders)
                    self.import_stats["files_processed"] += 1
                except Exception as e:
                    error_msg = f"Failed to process {csv_file.name}: {str(e)}"
                    print(f"❌ {error_msg}")
                    self.import_stats["errors"].append(error_msg)
                    self.import_stats["files_failed"] += 1

            # Print summary
            self._print_import_summary()

        except Exception as e:
            error_msg = f"Critical error during auto-import: {str(e)}"
            print(f"💥 {error_msg}")
            self.import_stats["errors"].append(error_msg)

        return self.import_stats

    def _get_existing_binder_filenames(self) -> set:
        """Get a set of filenames that correspond to existing binders in database"""
        existing_filenames = set()

        try:
            # Get all binders from database
            all_binders = Binder.get_all()

            # Generate expected filenames for existing binders
            # Import here to avoid circular imports
            import re

            for binder in all_binders:
                # Create sanitized filename manually (without using FileExportService to avoid creating files)
                safe_name = binder.name if binder.name else "unnamed"

                # Remove or replace problematic characters
                safe_chars = []
                for char in safe_name:
                    if char.isalnum() or char in [" ", "-", "_"]:
                        safe_chars.append(char)
                    else:
                        safe_chars.append("_")

                # Join and clean up
                safe_name = "".join(safe_chars).strip()

                # Replace multiple spaces/underscores with single ones
                safe_name = re.sub(r"[_\s]+", "_", safe_name)

                # Limit length
                if len(safe_name) > 50:
                    safe_name = safe_name[:50]

                safe_name = safe_name.strip("_")

                expected_filename = f"{safe_name}_{binder.uuid[:8]}.csv"
                existing_filenames.add(expected_filename)

        except Exception as e:
            print(f"⚠️ Error checking existing binders: {e}")

        return existing_filenames

    def _process_csv_file(self, csv_file: Path, existing_filenames: set):
        """Process a single CSV file and import if needed"""
        filename = csv_file.name

        # Check if this file corresponds to an existing binder
        if filename in existing_filenames:
            print(f"⏭️ Skipping {filename} (already exists in database)")
            self.import_stats["files_skipped"] += 1
            return

        # Parse filename to extract binder name and potential UUID
        binder_name, uuid_hint = self._parse_filename(filename)

        # Check if we can find an existing binder by name
        existing_binder = Binder.get_by_name(binder_name)
        if existing_binder:
            print(f"⏭️ Skipping {filename} (binder '{binder_name}' already exists)")
            self.import_stats["files_skipped"] += 1
            return

        print(f"📥 Importing {filename}...")

        # Read and validate CSV file
        cards_data = self._read_csv_file(csv_file)
        if not cards_data:
            print(f"⚠️ {filename} appears to be empty or invalid")
            self.import_stats["files_skipped"] += 1
            return

        # Create new binder
        binder = self._create_binder_from_file(binder_name, filename, uuid_hint)

        # Import cards
        cards_imported = self._import_cards_to_binder(binder, cards_data)

        self.import_stats["binders_created"] += 1
        self.import_stats["cards_imported"] += cards_imported

        print(
            f"✅ Successfully imported {filename} -> Binder '{binder.name}' ({cards_imported} cards)"
        )

    def _parse_filename(self, filename: str) -> Tuple[str, Optional[str]]:
        """Parse filename to extract binder name and potential UUID"""
        # Remove .csv extension
        name_part = filename[:-4] if filename.endswith(".csv") else filename

        # Look for pattern: Name_UUID (where UUID is 8 characters)
        match = re.match(r"^(.+)_([a-f0-9]{8})$", name_part, re.IGNORECASE)
        if match:
            name_part = match.group(1)
            uuid_hint = match.group(2)
        else:
            uuid_hint = None

        # Convert underscores back to spaces and clean up
        binder_name = name_part.replace("_", " ").strip()

        # Ensure we have a valid name
        if not binder_name:
            binder_name = f"Imported Binder {datetime.now().strftime('%Y%m%d_%H%M%S')}"

        return binder_name, uuid_hint

    def _read_csv_file(self, csv_file: Path) -> List[Dict[str, str]]:
        """Read and parse CSV file, returning list of card data"""
        cards_data = []

        try:
            with open(csv_file, "r", encoding="utf-8") as file:
                # Detect delimiter and read file
                sample = file.read(1024)
                file.seek(0)

                sniffer = csv.Sniffer()
                delimiter = sniffer.sniff(sample).delimiter

                reader = csv.DictReader(file, delimiter=delimiter)

                # Normalize headers (handle different naming conventions)
                normalized_headers = self._normalize_headers(reader.fieldnames or [])

                for row in reader:
                    # Normalize row keys
                    normalized_row = {}
                    for original_key, value in row.items():
                        normalized_key = self._normalize_header(original_key)
                        normalized_row[normalized_key] = value.strip() if value else ""

                    # Skip empty rows
                    if self._is_valid_card_row(normalized_row):
                        cards_data.append(normalized_row)

        except Exception as e:
            raise Exception(f"Error reading CSV file: {e}")

        return cards_data

    def _normalize_headers(self, headers: List[str]) -> List[str]:
        """Normalize CSV headers to standard format"""
        return [self._normalize_header(header) for header in headers]

    def _normalize_header(self, header: str) -> str:
        """Normalize a single header to standard format"""
        header = header.lower().strip()

        # Map common variations to standard names
        header_mapping = {
            "card_id": "card_id",
            "cardid": "card_id",
            "id": "card_id",
            "card id": "card_id",
            "card_name": "card_name",
            "cardname": "card_name",
            "name": "card_name",
            "card name": "card_name",
            "quantity": "quantity",
            "qty": "quantity",
            "count": "quantity",
            "set_code": "set_code",
            "setcode": "set_code",
            "set code": "set_code",
            "set": "set_code",
            "rarity": "rarity",
            "condition": "condition",
            "edition": "edition",
            "notes": "notes",
            "note": "notes",
        }

        return header_mapping.get(header, header)

    def _is_valid_card_row(self, row: Dict[str, str]) -> bool:
        """Check if a CSV row contains valid card data"""
        # Must have either card_id or card_name
        card_id = row.get("card_id", "").strip()
        card_name = row.get("card_name", "").strip()
        quantity = row.get("quantity", "").strip()

        # Must have at least card ID or name, and valid quantity
        if not (card_id or card_name):
            return False

        # Quantity should be a positive number
        try:
            qty = int(quantity) if quantity else 1
            return qty > 0
        except ValueError:
            return False

    def _create_binder_from_file(
        self, name: str, filename: str, uuid_hint: Optional[str]
    ) -> Binder:
        """Create a new binder from imported file"""
        description = f"Auto-imported from {filename} on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"

        binder = Binder(
            user_id=1,  # Default user
            name=name,
            description=description,
            tags=["auto-imported"],
        )

        # Save the binder to get an ID and UUID
        binder.save()

        return binder

    def _normalize_condition(self, condition: str) -> str:
        """Normalize card condition to match database validation"""
        if not condition:
            return "Near Mint"

        condition_lower = condition.lower().strip()

        # Map common variations to standard conditions
        condition_mapping = {
            "mint": "Mint",
            "m": "Mint",
            "near mint": "Near Mint",
            "nm": "Near Mint",
            "lightly played": "Lightly Played",
            "light play": "Lightly Played",
            "lp": "Lightly Played",
            "moderately played": "Moderately Played",
            "mp": "Moderately Played",
            "played": "Moderately Played",
            "heavily played": "Heavily Played",
            "hp": "Heavily Played",
            "damaged": "Damaged",
            "dmg": "Damaged",
            "poor": "Damaged",
        }

        return condition_mapping.get(condition_lower, "Near Mint")

    def _import_cards_to_binder(
        self, binder: Binder, cards_data: List[Dict[str, str]]
    ) -> int:
        """Import cards into the binder"""
        cards_imported = 0

        for row in cards_data:
            try:
                card_id = row.get("card_id", "").strip()
                card_name = row.get("card_name", "").strip()
                quantity = int(row.get("quantity", "1"))

                # If we have card_id, use it; otherwise try to find by name
                if card_id:
                    try:
                        # Validate that card_id is numeric
                        card_id_int = int(card_id)
                    except ValueError:
                        print(f"⚠️ Invalid card ID '{card_id}', skipping row")
                        continue
                else:
                    # If only name is provided, we might need to look it up
                    # For now, skip if no card_id (this could be enhanced later)
                    print(f"⚠️ No card ID provided for '{card_name}', skipping row")
                    continue

                # Create binder card
                binder_card = BinderCard(
                    binder_id=binder.id,
                    card_id=card_id_int,
                    card_name=card_name or None,
                    quantity=quantity,
                    set_code=row.get("set_code") or None,
                    rarity=row.get("rarity") or None,
                    condition=self._normalize_condition(row.get("condition", "")),
                    edition=row.get("edition") or None,
                    notes=row.get("notes") or None,
                )

                # Save the card
                binder_card.save()
                cards_imported += 1

            except Exception as e:
                print(f"⚠️ Error importing card row {row}: {e}")
                continue

        return cards_imported

    def _print_import_summary(self):
        """Print a summary of the import process"""
        stats = self.import_stats

        print("\n📊 AUTO-IMPORT SUMMARY:")
        print("=" * 40)
        print(f"📁 Files found: {stats['files_found']}")
        print(f"✅ Files processed: {stats['files_processed']}")
        print(f"⏭️ Files skipped: {stats['files_skipped']}")
        print(f"❌ Files failed: {stats['files_failed']}")
        print(f"📋 Binders created: {stats['binders_created']}")
        print(f"🎴 Cards imported: {stats['cards_imported']}")

        if stats["errors"]:
            print(f"\n⚠️ Errors encountered:")
            for error in stats["errors"]:
                print(f"   • {error}")

        if stats["binders_created"] > 0:
            print(
                f"\n🎉 Successfully imported {stats['binders_created']} binders with {stats['cards_imported']} total cards!"
            )
        else:
            print("\n✨ No new binders to import (all files already exist)")

        print("=" * 40)


# Global instance
auto_import_service = AutoImportService()
