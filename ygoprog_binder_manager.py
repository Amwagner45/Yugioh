#!/usr/bin/env python3
"""
YGOProg Binder Manager
A clean, production-ready script for managing Yu-Gi-Oh card binders on YGOProg.com

Features:
- Authentication with token management
- Create/Delete binders
- Add/Remove cards from binders
- Import binders from CSV files
- Export binders to CSV files
"""

import requests
import json
import sys
import os
import base64
import getpass
import csv
import argparse
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

# Try to load environment variables
try:
    from dotenv import load_dotenv

    load_dotenv()
    DOTENV_AVAILABLE = True
except ImportError:
    DOTENV_AVAILABLE = False


class YGOProgAuth:
    """Handle authentication with YGOProg API"""

    def __init__(self, token_file: str = None):
        self.base_url = "https://api.ygoprog.com"
        self.token_file = token_file or os.getenv(
            "YGOPROG_TOKEN_FILE", "ygoprog_token.json"
        )
        self.token = None
        self.token_data = None
        self.load_token()

    @classmethod
    def from_env(cls) -> "YGOProgAuth":
        """Create YGOProgAuth instance using environment variables"""
        instance = cls()
        username = os.getenv("YGOPROG_USERNAME")
        password = os.getenv("YGOPROG_PASSWORD")

        if username and password:
            print(f"🔐 Found credentials in environment for user: {username}")
            if instance.ensure_valid_token(username, password):
                print("✅ Authenticated using environment credentials")
            else:
                print("❌ Failed to authenticate using environment credentials")
                sys.exit(1)
        elif not DOTENV_AVAILABLE:
            print("💡 Tip: Install python-dotenv to automatically load .env files")

        return instance

    def login(self, username: str, password: str) -> bool:
        """Login to YGOProg and get a bearer token"""
        login_url = f"{self.base_url}/api/login"

        headers = {
            "Content-Type": "application/json",
            "Origin": "https://www.ygoprog.com",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        }

        payload = {"username": username, "password": password}

        try:
            print(f"Logging in to YGOProg as {username}...")
            response = requests.post(
                login_url, json=payload, headers=headers, timeout=30
            )

            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.token = data.get("token")
                    if self.token:
                        self._decode_and_save_token()
                        print("✅ Login successful!")
                        return True
                    else:
                        print("❌ Login response missing token")
                        return False
                else:
                    print(f"❌ Login failed: {data.get('message', 'Unknown error')}")
                    return False
            else:
                print(f"❌ Login request failed with status {response.status_code}")
                return False

        except requests.exceptions.RequestException as e:
            print(f"❌ Login request failed: {e}")
            return False

    def _decode_and_save_token(self):
        """Decode JWT token and save token data to file"""
        if not self.token:
            return

        try:
            # Decode JWT payload
            header, payload, signature = self.token.split(".")
            payload += "=" * (4 - len(payload) % 4)
            payload_decoded = base64.b64decode(payload)
            self.token_data = json.loads(payload_decoded)

            # Save to file
            token_info = {
                "token": self.token,
                "decoded": self.token_data,
                "saved_at": datetime.now().isoformat(),
            }

            with open(self.token_file, "w") as f:
                json.dump(token_info, f, indent=2)

            print(f"Token saved to {self.token_file}")

        except Exception as e:
            print(f"Warning: Could not decode/save token: {e}")

    def load_token(self):
        """Load token from file if it exists and is valid"""
        if not os.path.exists(self.token_file):
            return

        try:
            with open(self.token_file, "r") as f:
                token_info = json.load(f)

            self.token = token_info.get("token")
            self.token_data = token_info.get("decoded")

            if self.is_token_valid():
                print(f"✅ Loaded valid token from {self.token_file}")
            else:
                print(f"⚠️ Token from {self.token_file} is expired")
                self.token = None
                self.token_data = None

        except Exception as e:
            print(f"Warning: Could not load token: {e}")

    def is_token_valid(self) -> bool:
        """Check if current token is valid and not expired"""
        if not self.token or not self.token_data:
            return False

        exp = self.token_data.get("exp")
        if not exp:
            return False

        expires_at = datetime.fromtimestamp(exp)
        now = datetime.now()
        buffer = timedelta(minutes=5)

        return expires_at > (now + buffer)

    def get_token(self) -> Optional[str]:
        """Get current valid token"""
        if self.is_token_valid():
            return self.token
        return None

    def get_token_info(self) -> Dict[str, Any]:
        """Get information about current token"""
        if not self.token_data:
            return {}

        exp = self.token_data.get("exp")
        iat = self.token_data.get("iat")

        info = {
            "username": self.token_data.get("username"),
            "user_id": self.token_data.get("userId"),
            "valid": self.is_token_valid(),
        }

        if exp:
            expires_at = datetime.fromtimestamp(exp)
            info["expires_at"] = expires_at.isoformat()
            info["expires_in"] = str(expires_at - datetime.now())

        if iat:
            info["issued_at"] = datetime.fromtimestamp(iat).isoformat()

        return info

    def ensure_valid_token(self, username: str = None, password: str = None) -> bool:
        """Ensure we have a valid token, logging in if necessary"""
        if self.is_token_valid():
            return True

        if username and password:
            return self.login(username, password)
        else:
            print("❌ No valid token and no credentials provided")
            return False


class YGOProgBinderManager:
    """Handle binder operations with YGOProg API"""

    def __init__(self, auth: YGOProgAuth):
        self.auth = auth
        self.base_url = "https://api.ygoprog.com"

    def _get_api_headers(self) -> Dict[str, str]:
        """Get headers for API requests"""
        return {
            "Accept": "*/*",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "en-US,en;q=0.9",
            "Content-Type": "application/json",
            "Host": "api.ygoprog.com",
            "Origin": "https://www.ygoprog.com",
            "Authorization": f"Bearer {self.auth.get_token()}",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        }

    def get_binder_contents(self, binder_id: str) -> Dict[str, Any]:
        """Get contents of a specific binder"""
        if not self.auth.is_token_valid():
            print("❌ No valid authentication token")
            return {}

        url = f"{self.base_url}/api/binder/{binder_id}"
        headers = self._get_api_headers()

        try:
            print(f"🔍 Fetching binder contents for ID: {binder_id}")
            response = requests.get(url, headers=headers, timeout=30)

            if response.status_code == 200:
                data = response.json()
                print("✅ Successfully retrieved binder contents")
                return data
            elif response.status_code == 404:
                print(f"❌ Binder not found: {binder_id}")
            elif response.status_code == 403:
                print(f"❌ Access denied to binder: {binder_id}")
            else:
                print(f"❌ Failed to get binder contents: {response.status_code}")

        except requests.exceptions.RequestException as e:
            print(f"❌ Request failed: {e}")

        return {}

    def create_binder(self, name: str, description: str = "") -> Optional[str]:
        """Create a new binder"""
        if not self.auth.is_token_valid():
            print("❌ No valid authentication token")
            return None

        url = f"{self.base_url}/api/binder/{name}"
        headers = self._get_api_headers()
        payload = {"name": name, "description": description, "cards": []}

        try:
            print(f"🆕 Creating binder '{name}'...")
            response = requests.post(url, json=payload, headers=headers, timeout=30)

            if response.status_code in [200, 201]:
                data = response.json()
                binder_id = data.get("_id") or data.get("id")
                if binder_id:
                    print(f"✅ Binder '{name}' created successfully! ID: {binder_id}")
                    return binder_id
                else:
                    print(f"⚠️ Binder created but no ID returned")
                    return None
            else:
                print(f"❌ Create binder failed: {response.status_code}")
                print(f"Response: {response.text[:200]}")
                return None

        except requests.exceptions.RequestException as e:
            print(f"❌ Request failed: {e}")
            return None

    def delete_binder(self, binder_id: str) -> bool:
        """Delete a binder completely"""
        if not self.auth.is_token_valid():
            print("❌ No valid authentication token")
            return False

        url = f"{self.base_url}/api/binder/{binder_id}"
        headers = self._get_api_headers()

        try:
            print(f"🗑️ Deleting binder {binder_id}...")
            response = requests.delete(url, headers=headers, timeout=30)

            if response.status_code in [200, 204]:
                print("✅ Binder deleted successfully!")
                return True
            elif response.status_code == 404:
                print("❌ Binder not found")
                return False
            elif response.status_code == 403:
                print(
                    "❌ Access denied - you may not have permission to delete this binder"
                )
                return False
            else:
                print(f"❌ Delete failed with status {response.status_code}")
                return False

        except requests.exceptions.RequestException as e:
            print(f"❌ Request failed: {e}")
            return False

    def update_card_count(
        self, binder_id: str, card_code: str, rarity: str, count_delta: int
    ) -> bool:
        """Update the count of a specific card in a binder"""
        if not self.auth.is_token_valid():
            print("❌ No valid authentication token")
            return False

        url = f"{self.base_url}/api/binder/{binder_id}/card/count"
        headers = self._get_api_headers()
        payload = {"code": card_code, "rarity": rarity, "count": count_delta}

        try:
            print(f"🔄 Updating card count: {card_code} ({rarity}) by {count_delta}")
            response = requests.put(url, json=payload, headers=headers, timeout=30)

            if response.status_code == 200:
                print("✅ Card count updated successfully!")
                return True
            else:
                print(f"❌ Update failed with status {response.status_code}")
                return False

        except requests.exceptions.RequestException as e:
            print(f"❌ Request failed: {e}")
            return False

    def remove_card(self, binder_id: str, card_code: str, rarity: str) -> bool:
        """Remove a card from binder by setting its count to 0"""
        if not self.auth.is_token_valid():
            print("❌ No valid authentication token")
            return False

        # Get current binder contents to find the card
        print(f"🔍 Looking for card {card_code} ({rarity}) in binder...")
        binder_data = self.get_binder_contents(binder_id)
        cards = binder_data.get("cards", [])

        target_card = None
        for card in cards:
            if card.get("code", "") == card_code and card.get("rarity", "") == rarity:
                target_card = card
                break

        if not target_card:
            print(f"❌ Card {card_code} ({rarity}) not found in binder")
            return False

        current_count = target_card.get("count", 0)
        card_name = target_card.get("name", "Unknown")

        if current_count <= 0:
            print(f"⚠️ Card {card_name} ({card_code}) already has 0 count")
            return True

        print(f"🗑️ Removing {current_count}x {card_name} ({card_code} - {rarity})")

        # Remove all copies by setting count to negative current count
        return self.update_card_count(binder_id, card_code, rarity, -current_count)

    def add_cards_to_binder(self, binder_id: str, cards: List[Dict[str, Any]]) -> bool:
        """Add cards to a binder"""
        if not self.auth.is_token_valid():
            print("❌ No valid authentication token")
            return False

        url = f"{self.base_url}/api/binder/{binder_id}/cards"
        headers = self._get_api_headers()
        payload = {"cards": cards}

        try:
            print(f"📤 Adding {len(cards)} cards to binder...")
            response = requests.put(url, json=payload, headers=headers, timeout=30)

            if response.status_code == 200:
                try:
                    response_data = response.json()
                    returned_cards = response_data.get("cards", [])
                    print(f"✅ Server reports {len(returned_cards)} cards in binder")
                    return True
                except:
                    print("✅ Cards added successfully!")
                    return True
            else:
                print(f"❌ Add cards failed with status {response.status_code}")
                return False

        except requests.exceptions.RequestException as e:
            print(f"❌ Request failed: {e}")
            return False

    def import_csv_to_binder(self, csv_file_path: str, binder_id: str) -> bool:
        """Import cards from a CSV file to a binder"""
        if not self.auth.is_token_valid():
            print("❌ No valid authentication token")
            return False

        try:
            print(f"📥 Reading CSV file: {csv_file_path}")
            cards = []

            with open(csv_file_path, "r", encoding="utf-8") as csvfile:
                reader = csv.DictReader(csvfile)

                for row_num, row in enumerate(reader, 1):
                    # Extract and validate data
                    name = row.get("cardname", "").strip()
                    cardid_str = row.get("cardid", "").strip()
                    count_str = row.get("cardq", "1").strip()
                    rarity = row.get("cardrarity", "").strip()
                    card_set = row.get("cardset", "").strip()
                    code = row.get("cardcode", "").strip()

                    # Validate required fields
                    if not name or not cardid_str or not cardid_str.isdigit():
                        print(f"⚠️ Row {row_num}: Invalid data for '{name}', skipping")
                        continue

                    cardid = int(cardid_str)
                    count = int(count_str) if count_str.isdigit() else 1

                    # Map CSV columns to YGOProg format
                    card = {
                        "name": name,
                        "cardId": cardid,
                        "count": count,
                        "rarity": rarity if rarity else "Unknown",
                        "set": card_set if card_set else "Unknown",
                        "code": code if code else "",
                    }

                    cards.append(card)

            if not cards:
                print("❌ No valid cards found in CSV file")
                return False

            print(f"📊 Parsed {len(cards)} cards from CSV")
            print(f"Sample cards: {[c['name'] for c in cards[:3]]}")

            # Upload cards to binder
            return self.add_cards_to_binder(binder_id, cards)

        except FileNotFoundError:
            print(f"❌ CSV file not found: {csv_file_path}")
            return False
        except Exception as e:
            print(f"❌ Error processing CSV file: {e}")
            return False

    def export_binder_to_csv(self, binder_id: str, filename: str = None) -> bool:
        """Export binder contents to CSV file using dedicated CSV export API"""
        if not self.auth.is_token_valid():
            print("❌ No valid authentication token")
            return False

        # Use the dedicated CSV export API endpoint
        url = f"{self.base_url}/api/export/binder/csv/{binder_id}"
        headers = self._get_api_headers()
        # Override Content-Type for CSV endpoint
        headers["Accept"] = "text/csv"

        try:
            print(f"📤 Requesting CSV export for binder ID: {binder_id}")
            response = requests.get(url, headers=headers, timeout=30)

            if response.status_code == 200:
                # Generate filename if not provided
                if not filename:
                    # Try to get filename from Content-Disposition header
                    content_disposition = response.headers.get('Content-Disposition', '')
                    if 'filename=' in content_disposition:
                        # Extract filename from header like "attachment; filename=data.csv"
                        filename = content_disposition.split('filename=')[1].strip().strip('"')
                    else:
                        # Fallback to default naming
                        filename = f"binder_{binder_id[:8]}.csv"

                # Write CSV content to file
                with open(filename, "w", encoding="utf-8", newline="") as csvfile:
                    csvfile.write(response.text)

                # Count lines to report number of cards (subtract 1 for header, ignore empty lines)
                lines = [line.strip() for line in response.text.strip().split('\n') if line.strip()]
                card_count = max(0, len(lines) - 1) if lines else 0
                print(f"✅ Exported {card_count} cards to {filename}")
                return True

            elif response.status_code == 404:
                print(f"❌ Binder not found: {binder_id}")
                return False
            elif response.status_code == 403:
                print(f"❌ Access denied to binder: {binder_id}")
                return False
            else:
                print(f"❌ CSV export failed with status {response.status_code}")
                if response.text:
                    print(f"Response: {response.text[:200]}")
                return False

        except requests.exceptions.RequestException as e:
            print(f"❌ Request failed: {e}")
            return False


def main():
    """Main function to run the script"""
    parser = argparse.ArgumentParser(
        description="YGOProg Binder Manager - Clean production tool for managing Yu-Gi-Oh binders"
    )

    # Main actions
    parser.add_argument(
        "--create-binder",
        metavar="NAME",
        help="Create a new binder with the given name",
    )
    parser.add_argument(
        "--delete-binder", metavar="BINDER_ID", help="Delete a binder completely"
    )
    parser.add_argument(
        "--import-csv",
        metavar="CSV_FILE",
        help="Import cards from CSV file to a binder (requires --binder-id)",
    )
    parser.add_argument(
        "--export-csv", metavar="BINDER_ID", help="Export binder contents to CSV file"
    )
    parser.add_argument(
        "--export-filename", help="Custom filename for CSV export (optional)"
    )
    parser.add_argument(
        "--remove-card",
        nargs=2,
        metavar=("CARD_CODE", "RARITY"),
        help="Remove a card by code and rarity (requires --binder-id)",
    )
    parser.add_argument(
        "--add-card",
        nargs=5,
        metavar=("CARD_NAME", "CARD_ID", "RARITY", "COUNT", "SET"),
        help="Add a card to binder (requires --binder-id) - Format: NAME ID RARITY COUNT SET",
    )

    # Options
    parser.add_argument(
        "--binder-id",
        default=os.getenv("YGOPROG_DEFAULT_BINDER_ID"),
        help="Binder ID for operations (default: from environment)",
    )
    parser.add_argument(
        "--from-env",
        action="store_true",
        help="Use credentials from environment variables (.env file)",
    )
    parser.add_argument(
        "--username", default=os.getenv("YGOPROG_USERNAME"), help="YGOProg username"
    )
    parser.add_argument(
        "--password", default=os.getenv("YGOPROG_PASSWORD"), help="YGOProg password"
    )

    args = parser.parse_args()

    # Handle authentication
    auth = None
    if args.from_env:
        auth = YGOProgAuth.from_env()
    elif args.username and args.password:
        auth = YGOProgAuth()
        if not auth.ensure_valid_token(args.username, args.password):
            print("❌ Authentication failed")
            sys.exit(1)
    elif args.username:
        auth = YGOProgAuth()
        password = getpass.getpass("YGOProg Password: ")
        if not auth.ensure_valid_token(args.username, password):
            print("❌ Authentication failed")
            sys.exit(1)
    else:
        print("❌ No authentication method provided!")
        print("Use --from-env (requires .env file) or --username/--password")
        sys.exit(1)

    if not auth or not auth.get_token():
        print("❌ Failed to authenticate")
        sys.exit(1)

    # Show auth info
    token_info = auth.get_token_info()
    print(f"🔐 Authenticated as: {token_info.get('username', 'Unknown')}")
    print(f"📅 Token expires: {token_info.get('expires_at', 'Unknown')}")
    print()

    # Create binder manager
    binder_mgr = YGOProgBinderManager(auth)

    # Handle different actions
    if args.create_binder:
        print(f"🆕 Creating new binder: '{args.create_binder}'")
        binder_id = binder_mgr.create_binder(args.create_binder)
        if binder_id:
            print(f"✅ New binder created with ID: {binder_id}")
        else:
            sys.exit(1)

    elif args.delete_binder:
        print(f"🗑️ Deleting binder: {args.delete_binder}")
        print("⚠️  WARNING: This will permanently delete the binder and all its cards!")
        confirm = input("Type 'DELETE' to confirm: ")
        if confirm == "DELETE":
            if not binder_mgr.delete_binder(args.delete_binder):
                sys.exit(1)
        else:
            print("❌ Deletion cancelled")
            sys.exit(1)

    elif args.export_csv:
        print(f"📤 Exporting binder {args.export_csv} to CSV...")
        if not binder_mgr.export_binder_to_csv(args.export_csv, args.export_filename):
            sys.exit(1)

    elif args.import_csv:
        if not args.binder_id:
            print("❌ --binder-id required for CSV import")
            sys.exit(1)
        print(f"📥 Importing CSV '{args.import_csv}' to binder {args.binder_id}")
        if not binder_mgr.import_csv_to_binder(args.import_csv, args.binder_id):
            sys.exit(1)

    elif args.remove_card:
        if not args.binder_id:
            print("❌ --binder-id required for removing cards")
            sys.exit(1)
        card_code, rarity = args.remove_card
        print(f"🗑️ Removing card {card_code} ({rarity}) from binder {args.binder_id}")
        if not binder_mgr.remove_card(args.binder_id, card_code, rarity):
            sys.exit(1)

    elif args.add_card:
        if not args.binder_id:
            print("❌ --binder-id required for adding cards")
            sys.exit(1)
        card_name, card_id_str, rarity, count_str, card_set = args.add_card
        try:
            card_id = int(card_id_str)
            count = int(count_str)
        except ValueError:
            print("❌ Invalid card ID or count")
            sys.exit(1)

        card = {
            "name": card_name,
            "cardId": card_id,
            "count": count,
            "rarity": rarity,
            "set": card_set,
            "code": "",
        }

        print(f"➕ Adding {count}x {card_name} to binder {args.binder_id}")
        if not binder_mgr.add_cards_to_binder(args.binder_id, [card]):
            sys.exit(1)

    else:
        print("❌ No action specified. Use --help to see available options.")
        sys.exit(1)

    print("✅ Operation completed successfully!")


if __name__ == "__main__":
    main()
