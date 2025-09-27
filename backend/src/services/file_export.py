"""
File export services for automatic saving of binders and decks
"""

import os
import csv
import json
from typing import Optional, List, Dict, Any
from datetime import datetime
from pathlib import Path

from ..database.models import Binder, Deck, BinderCard, DeckCard, Card


class FileExportService:
    """Service for automatically exporting binders and decks to local files"""

    def __init__(self, base_data_path: str = "/app"):
        """
        Initialize with base data path
        Default path works for Docker container
        """
        self.base_data_path = Path(base_data_path)
        self.binders_path = self.base_data_path / "binders"
        self.decklists_path = self.base_data_path / "decklists"

        # Ensure directories exist
        self.binders_path.mkdir(parents=True, exist_ok=True)
        self.decklists_path.mkdir(parents=True, exist_ok=True)

    def save_binder_as_csv(self, binder: Binder) -> Optional[str]:
        """
        Export a binder to CSV file in the docker-data/binders directory
        Returns the file path if successful, None if failed
        """
        try:
            if not binder or not binder.id:
                return None

            # Generate safe filename - use binder name only, no UUID suffix
            safe_name = self._sanitize_filename(binder.name)
            filename = f"{safe_name}.csv"
            file_path = self.binders_path / filename

            # Get binder cards with details
            cards = binder.get_cards()

            if not cards:
                # Create empty CSV with headers
                with open(file_path, "w", newline="", encoding="utf-8") as csvfile:
                    writer = csv.writer(csvfile)
                    writer.writerow(
                        [
                            "Card ID",
                            "Card Name",
                            "Quantity",
                            "Set Code",
                            "Rarity",
                            "Condition",
                            "Edition",
                            "Notes",
                            "Type",
                            "Attribute",
                            "Race",
                            "Level",
                            "ATK",
                            "DEF",
                        ]
                    )
                return str(file_path)

            # Write CSV file
            with open(file_path, "w", newline="", encoding="utf-8") as csvfile:
                fieldnames = [
                    "Card ID",
                    "Card Name",
                    "Quantity",
                    "Set Code",
                    "Rarity",
                    "Condition",
                    "Edition",
                    "Notes",
                    "Type",
                    "Attribute",
                    "Race",
                    "Level",
                    "ATK",
                    "DEF",
                ]
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()

                for binder_card in cards:
                    # Get card details from cache
                    card_details = Card.get_by_id(
                        binder_card.card_id, fetch_if_missing=False
                    )

                    row = {
                        "Card ID": binder_card.card_id,
                        "Card Name": binder_card.card_name
                        or (
                            card_details.name
                            if card_details
                            else f"Card {binder_card.card_id}"
                        ),
                        "Quantity": binder_card.quantity,
                        "Set Code": binder_card.set_code or "",
                        "Rarity": binder_card.rarity or "",
                        "Condition": binder_card.condition or "Near Mint",
                        "Edition": binder_card.edition or "",
                        "Notes": binder_card.notes or "",
                        "Type": card_details.type if card_details else "",
                        "Attribute": card_details.attribute if card_details else "",
                        "Race": card_details.race if card_details else "",
                        "Level": card_details.level if card_details else "",
                        "ATK": card_details.atk if card_details else "",
                        "DEF": card_details.def_ if card_details else "",
                    }
                    writer.writerow(row)

            print(f"✅ Exported binder '{binder.name}' to {file_path}")
            return str(file_path)

        except Exception as e:
            print(f"❌ Failed to export binder '{binder.name}' to CSV: {e}")
            return None

    def save_deck_as_ydk(self, deck: Deck) -> Optional[str]:
        """
        Export a deck to YDK file in the docker-data/decklists directory
        Returns the file path if successful, None if failed
        """
        try:
            if not deck or not deck.id:
                return None

            # Generate safe filename - use deck name only, no UUID suffix
            safe_name = self._sanitize_filename(deck.name)
            filename = f"{safe_name}.ydk"
            file_path = self.decklists_path / filename

            # Get deck cards by section
            main_deck = deck.get_cards("main")
            extra_deck = deck.get_cards("extra")
            side_deck = deck.get_cards("side")

            # Write YDK file
            with open(file_path, "w", encoding="utf-8") as ydkfile:
                ydkfile.write("#created by Yu-Gi-Oh Deck Builder\n")
                ydkfile.write(f"# Deck: {deck.name}\n")
                if deck.description:
                    ydkfile.write(f"# Description: {deck.description}\n")
                if deck.format:
                    ydkfile.write(f"# Format: {deck.format}\n")
                ydkfile.write(f"# Generated: {datetime.now().isoformat()}\n")
                ydkfile.write("\n")

                # Main deck
                ydkfile.write("#main\n")
                for card in main_deck:
                    for _ in range(card.quantity):
                        ydkfile.write(f"{card.card_id}\n")

                # Extra deck
                ydkfile.write("#extra\n")
                for card in extra_deck:
                    for _ in range(card.quantity):
                        ydkfile.write(f"{card.card_id}\n")

                # Side deck
                ydkfile.write("!side\n")
                for card in side_deck:
                    for _ in range(card.quantity):
                        ydkfile.write(f"{card.card_id}\n")

            print(f"✅ Exported deck '{deck.name}' to {file_path}")
            return str(file_path)

        except Exception as e:
            print(f"❌ Failed to export deck '{deck.name}' to YDK: {e}")
            return None

    def save_deck_as_json(self, deck: Deck) -> Optional[str]:
        """
        Export a deck to JSON file as backup (in addition to YDK)
        Returns the file path if successful, None if failed
        """
        try:
            if not deck or not deck.id:
                return None

            # Generate safe filename - use deck name only, no UUID suffix
            safe_name = self._sanitize_filename(deck.name)
            filename = f"{safe_name}.json"
            file_path = self.decklists_path / filename

            # Get deck cards by section with details
            main_deck = []
            extra_deck = []
            side_deck = []

            for card in deck.get_cards("main"):
                main_deck.append(
                    {
                        "card_id": card.card_id,
                        "quantity": card.quantity,
                        "card_name": card.card_name,
                    }
                )

            for card in deck.get_cards("extra"):
                extra_deck.append(
                    {
                        "card_id": card.card_id,
                        "quantity": card.quantity,
                        "card_name": card.card_name,
                    }
                )

            for card in deck.get_cards("side"):
                side_deck.append(
                    {
                        "card_id": card.card_id,
                        "quantity": card.quantity,
                        "card_name": card.card_name,
                    }
                )

            # Build deck data
            deck_data = {
                "type": "deck",
                "version": "1.0.0",
                "generated": datetime.now().isoformat(),
                "deck": {
                    "id": deck.id,
                    "uuid": deck.uuid,
                    "name": deck.name,
                    "description": deck.description,
                    "format": deck.format,
                    "tags": deck.tags,
                    "notes": deck.notes,
                    "is_valid": deck.is_valid,
                    "validation_errors": deck.validation_errors,
                    "created_at": (
                        deck.created_at.isoformat() if deck.created_at else None
                    ),
                    "updated_at": (
                        deck.updated_at.isoformat() if deck.updated_at else None
                    ),
                },
                "main_deck": main_deck,
                "extra_deck": extra_deck,
                "side_deck": side_deck,
            }

            # Write JSON file
            with open(file_path, "w", encoding="utf-8") as jsonfile:
                json.dump(deck_data, jsonfile, indent=2, ensure_ascii=False)

            print(f"✅ Exported deck '{deck.name}' JSON backup to {file_path}")
            return str(file_path)

        except Exception as e:
            print(f"❌ Failed to export deck '{deck.name}' to JSON: {e}")
            return None

    def delete_binder_csv(self, binder: Binder) -> bool:
        """
        Delete the CSV file associated with a binder
        Returns True if successfully deleted, False if not found or error
        """
        try:
            if not binder or not binder.uuid:
                return False

            # Generate the filename pattern that would have been used - use binder name only, no UUID suffix
            safe_name = self._sanitize_filename(binder.name)
            filename = f"{safe_name}.csv"
            file_path = self.binders_path / filename

            if file_path.exists():
                file_path.unlink()
                print(f"✅ Deleted binder CSV file: {filename}")
                return True
            else:
                print(f"⚠️ Binder CSV file not found: {filename}")
                return False

        except Exception as e:
            print(f"❌ Failed to delete binder CSV file for '{binder.name}': {e}")
            return False

    def cleanup_old_files(self, max_age_days: int = 30):
        """
        Clean up old export files to prevent disk space issues
        """
        try:
            cutoff_date = datetime.now().timestamp() - (max_age_days * 24 * 60 * 60)

            # Clean binder files
            for file_path in self.binders_path.glob("*.csv"):
                if file_path.stat().st_mtime < cutoff_date:
                    file_path.unlink()
                    print(f"🧹 Cleaned up old binder file: {file_path.name}")

            # Clean deck files
            for file_path in self.decklists_path.glob("*.ydk"):
                if file_path.stat().st_mtime < cutoff_date:
                    file_path.unlink()
                    print(f"🧹 Cleaned up old deck file: {file_path.name}")

            for file_path in self.decklists_path.glob("*.json"):
                if file_path.stat().st_mtime < cutoff_date:
                    file_path.unlink()
                    print(f"🧹 Cleaned up old deck backup: {file_path.name}")

        except Exception as e:
            print(f"❌ Error during cleanup: {e}")

    def list_binder_files(self) -> List[Dict[str, Any]]:
        """
        List all binder CSV files with metadata
        """
        files = []
        try:
            for file_path in self.binders_path.glob("*.csv"):
                stat = file_path.stat()
                files.append(
                    {
                        "filename": file_path.name,
                        "path": str(file_path),
                        "size": stat.st_size,
                        "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                        "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    }
                )
        except Exception as e:
            print(f"❌ Error listing binder files: {e}")

        return files

    def list_deck_files(self) -> List[Dict[str, Any]]:
        """
        List all deck files with metadata
        """
        files = []
        try:
            for file_path in self.decklists_path.glob("*"):
                if file_path.suffix in [".ydk", ".json"]:
                    stat = file_path.stat()
                    files.append(
                        {
                            "filename": file_path.name,
                            "path": str(file_path),
                            "format": file_path.suffix[1:],  # Remove the dot
                            "size": stat.st_size,
                            "created": datetime.fromtimestamp(
                                stat.st_ctime
                            ).isoformat(),
                            "modified": datetime.fromtimestamp(
                                stat.st_mtime
                            ).isoformat(),
                        }
                    )
        except Exception as e:
            print(f"❌ Error listing deck files: {e}")

        return files

    def _sanitize_filename(self, name: str) -> str:
        """
        Sanitize a name for use as a filename
        """
        if not name:
            name = "unnamed"

        # Remove or replace problematic characters
        safe_chars = []
        for char in name:
            if char.isalnum() or char in [" ", "-", "_"]:
                safe_chars.append(char)
            else:
                safe_chars.append("_")

        # Join and clean up
        safe_name = "".join(safe_chars).strip()

        # Replace multiple spaces/underscores with single ones
        import re

        safe_name = re.sub(r"[_\s]+", "_", safe_name)

        # Limit length
        if len(safe_name) > 50:
            safe_name = safe_name[:50]

        return safe_name.strip("_")


# Global instance
file_export_service = FileExportService()
