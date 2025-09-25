#!/usr/bin/env python3
"""
YGOProg Binder Sync Test Script
A complete script to test pushing binder card data to YGOProg.com API
Includes built-in authentication and token management
"""

import requests
import json
import sys
import os
import base64
import getpass
import csv
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


class YGOProgBinder:
    """Handle binder operations with YGOProg API"""

    def __init__(self, auth: YGOProgAuth):
        self.auth = auth
        self.base_url = "https://api.ygoprog.com"

    def get_user_binders(self) -> List[Dict[str, Any]]:
        """
        Get list of user's binders
        Returns list of binder dictionaries with id, name, etc.
        """
        if not self.auth.is_token_valid():
            print("❌ No valid authentication token")
            return []

        # Try common endpoints for getting user binders
        possible_endpoints = [
            "/api/binders",
            "/api/user/binders",
            "/api/binder",
            "/api/me/binders",
        ]

        headers = self._get_api_headers()

        for endpoint in possible_endpoints:
            url = f"{self.base_url}{endpoint}"
            try:
                print(f"Trying endpoint: {endpoint}")
                response = requests.get(url, headers=headers, timeout=30)

                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ Found binders endpoint: {endpoint}")
                    print(f"Raw response: {json.dumps(data, indent=2)[:500]}...")

                    # Handle different response formats
                    if isinstance(data, list):
                        return data
                    elif isinstance(data, dict):
                        # Check common keys for binder lists
                        for key in ["binders", "data", "results"]:
                            if key in data and isinstance(data[key], list):
                                return data[key]
                        # If it's a single binder object, wrap in list
                        if "name" in data or "_id" in data:
                            return [data]

                    # If we got here, successful response but unknown format
                    print(f"⚠️ Unknown response format from {endpoint}")
                    return []

                elif response.status_code == 404:
                    print(f"Endpoint {endpoint} not found (404)")
                    continue
                else:
                    print(
                        f"Endpoint {endpoint} returned {response.status_code}: {response.text[:200]}"
                    )

            except requests.exceptions.RequestException as e:
                print(f"Error trying {endpoint}: {e}")
                continue

        print("❌ Could not find working binders endpoint")
        return []

    def get_binder_contents(self, binder_id: str) -> Dict[str, Any]:
        """
        Get contents of a specific binder
        """
        if not self.auth.is_token_valid():
            print("❌ No valid authentication token")
            return {}

        url = f"{self.base_url}/api/binder/{binder_id}"
        headers = self._get_api_headers()

        try:
            print(f"Fetching binder contents for ID: {binder_id}")
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
                print(f"Response: {response.text[:200]}")

        except requests.exceptions.RequestException as e:
            print(f"❌ Request failed: {e}")

        return {}

    def export_binder_to_csv(self, binder_id: str, filename: str = None) -> bool:
        """
        Export binder contents to CSV file
        """
        binder_data = self.get_binder_contents(binder_id)
        if not binder_data:
            return False

        cards = binder_data.get("cards", [])
        if not cards:
            print("❌ No cards found in binder")
            return False

        # Generate filename if not provided
        if not filename:
            binder_name = binder_data.get("name", "unknown_binder")
            # Clean filename
            safe_name = "".join(
                c for c in binder_name if c.isalnum() or c in (" ", "-", "_")
            ).rstrip()
            filename = f"{safe_name}_{binder_id[:8]}.csv"

        try:
            with open(filename, "w", newline="", encoding="utf-8") as csvfile:
                # Determine fieldnames from first card
                if cards:
                    fieldnames = list(cards[0].keys())
                    # Ensure common fields are first
                    priority_fields = [
                        "name",
                        "cardId",
                        "count",
                        "set",
                        "code",
                        "rarity",
                    ]
                    ordered_fields = []

                    for field in priority_fields:
                        if field in fieldnames:
                            ordered_fields.append(field)

                    # Add remaining fields
                    for field in fieldnames:
                        if field not in ordered_fields:
                            ordered_fields.append(field)

                    writer = csv.DictWriter(csvfile, fieldnames=ordered_fields)
                    writer.writeheader()

                    for card in cards:
                        writer.writerow(card)

                    print(f"✅ Exported {len(cards)} cards to {filename}")
                    return True

        except Exception as e:
            print(f"❌ Failed to write CSV: {e}")
            return False

        return False

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

    def update_binder_cards(self, binder_id: str, cards: List[Dict[str, Any]]) -> bool:
        """
        Update cards in a YGOProg binder (existing functionality)
        """
        if not self.auth.is_token_valid():
            print("❌ No valid authentication token")
            return False

        url = f"{self.base_url}/api/binder/{binder_id}/cards"
        headers = self._get_api_headers()
        payload = {"cards": cards}

        try:
            print(f"Updating binder {binder_id} with {len(cards)} cards...")
            response = requests.put(url, json=payload, headers=headers, timeout=30)

            if response.status_code == 200:
                print("✅ Binder updated successfully!")
                return True
            elif response.status_code == 401:
                print("❌ Authentication failed - token may be expired")
                return False
            else:
                print(f"❌ Update failed with status {response.status_code}")
                print(f"Response: {response.text}")
                return False

        except requests.exceptions.RequestException as e:
            print(f"❌ Request failed: {e}")
            return False


def create_test_payload() -> Dict[str, Any]:
    """
    Create a test payload based on the format shown in the inspector
    """
    test_cards = [
        {
            "cardid": 92731455,
            "code": "LOB-EN077",
            "count": 1,
            "name": "M-Warrior #2",
            "rarity": "Common",
            "set": "Legend of Blue Eyes White Dragon",
        },
        {
            "cardid": 1435851,
            "code": "LOB-092",
            "count": 1,
            "name": "Dragon Treasure",
            "rarity": "Common",
            "set": "Legend of Blue Eyes White Dragon",
        },
        {
            "cardid": 1635197,
            "code": "LOB-115",
            "count": 1,
            "name": "Drooling Lizard",
            "rarity": "Common",
            "set": "Legend of Blue Eyes White Dragon",
        },
    ]

    return {"cards": test_cards}


def get_request_headers(auth_token: str = None) -> Dict[str, str]:
    """
    Get the headers needed for the request based on the inspector data
    """
    headers = {
        "Accept": "*/*",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Accept-Language": "en-US,en;q=0.9",
        "Content-Type": "application/json",
        "Host": "api.ygoprog.com",
        "Origin": "https://www.ygoprog.com",
        "Sec-Ch-Ua": '"Chromium";v="140", "Not-A?Brand";v="24", "Microsoft Edge";v="140"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-site",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0",
    }

    # Add authorization header if token is provided
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"

    return headers


def test_binder_put_request(
    binder_id: str,
    payload: Dict[str, Any],
    auth: YGOProgAuth = None,
    auth_token: str = None,
    dry_run: bool = True,
) -> None:
    """
    Test the PUT request to the YGOProg binder API

    Args:
        binder_id: The binder ID to update
        payload: The card data payload
        auth: YGOProgAuth instance for automatic authentication
        auth_token: Manual bearer token (alternative to auth)
        dry_run: If True, only print what would be sent without making the request
    """
    url = f"https://api.ygoprog.com/api/binder/{binder_id}/cards"

    # Get token from auth system or use manual token
    token = None
    if auth:
        token = auth.get_token()
    elif auth_token:
        token = auth_token

    headers = get_request_headers(token)

    print(f"=== Testing PUT Request to YGOProg Binder API ===")
    print(f"URL: {url}")
    print(f"Method: PUT")
    print()

    print("Headers:")
    for key, value in headers.items():
        if key == "Authorization":
            # Mask the token for security
            masked_token = (
                f"Bearer {value[7:15]}...{value[-8:]}"
                if len(value) > 15
                else "Bearer [MASKED]"
            )
            print(f"  {key}: {masked_token}")
        else:
            print(f"  {key}: {value}")
    print()

    print("Payload:")
    print(json.dumps(payload, indent=2))
    print()

    if not token:
        print("⚠️  WARNING - No authentication token available!")
        print("   The request will likely fail with 401 Unauthorized")
        print("   Use --username and --password for automatic login")
        print("   Or use --auth-token for manual token")
        print()

    if dry_run:
        print("DRY RUN - Not actually sending the request")
        print("To send the actual request, run with --send flag")
        return

    try:
        print("Sending request...")
        response = requests.put(url, json=payload, headers=headers, timeout=30)

        print(f"Response Status Code: {response.status_code}")
        print(f"Response Headers:")
        for key, value in response.headers.items():
            print(f"  {key}: {value}")
        print()

        if response.status_code == 200:
            print("✅ SUCCESS - Request completed successfully")
            try:
                response_data = response.json()
                print("Response JSON:")
                print(json.dumps(response_data, indent=2))
            except json.JSONDecodeError:
                print("Response Text:")
                print(response.text)
        elif response.status_code == 401:
            print("❌ ERROR - Authentication failed (401 Unauthorized)")
            print("   Make sure you provide valid credentials or a valid bearer token")
            if auth and not auth.is_token_valid():
                print("   Your stored token may have expired - try logging in again")
        else:
            print(f"❌ ERROR - Request failed with status code {response.status_code}")
            print("Response Text:")
            print(response.text)

    except requests.exceptions.Timeout:
        print("❌ ERROR - Request timed out")
    except requests.exceptions.ConnectionError:
        print("❌ ERROR - Connection error")
    except requests.exceptions.RequestException as e:
        print(f"❌ ERROR - Request failed: {e}")


def main():
    """Main function to run the script"""
    import argparse
    import getpass

    parser = argparse.ArgumentParser(
        description="YGOProg Binder Management Tool - Sync, list, and export binders"
    )

    # Main actions
    action_group = parser.add_argument_group("Actions")
    action_group.add_argument(
        "--list-binders", action="store_true", help="List all binders in your account"
    )
    action_group.add_argument(
        "--export-csv", metavar="BINDER_ID", help="Export binder contents to CSV file"
    )
    action_group.add_argument(
        "--export-filename", help="Custom filename for CSV export (optional)"
    )
    action_group.add_argument(
        "--sync-binder",
        action="store_true",
        help="Sync cards to a binder (original functionality)",
    )

    # Sync options
    sync_group = parser.add_argument_group("Sync Options")
    sync_group.add_argument(
        "--binder-id",
        default=os.getenv("YGOPROG_DEFAULT_BINDER_ID", "68d18d726fd54b31888495b2"),
        help="Binder ID for sync operations (default: from environment)",
    )
    sync_group.add_argument(
        "--send",
        action="store_true",
        help="Actually send the sync request (default is dry run)",
    )
    sync_group.add_argument(
        "--custom-payload", help="Path to JSON file with custom payload for sync"
    )

    # Authentication options
    auth_group = parser.add_argument_group("Authentication Options")
    auth_group.add_argument(
        "--username",
        default=os.getenv("YGOPROG_USERNAME"),
        help="YGOProg username (or set YGOPROG_USERNAME env var)",
    )
    auth_group.add_argument(
        "--password",
        default=os.getenv("YGOPROG_PASSWORD"),
        help="YGOProg password (or set YGOPROG_PASSWORD env var)",
    )
    auth_group.add_argument(
        "--from-env",
        action="store_true",
        help="Use credentials from environment variables (.env file)",
    )
    auth_group.add_argument(
        "--auth-token", help="Manual bearer token (alternative to username/password)"
    )
    auth_group.add_argument("--auth-file", help="File containing the bearer token")
    auth_group.add_argument(
        "--token-file",
        default=os.getenv("YGOPROG_TOKEN_FILE", "ygoprog_token.json"),
        help="File to store/load authentication token",
    )

    args = parser.parse_args()

    # Handle authentication (same as before)
    auth = None
    manual_token = None

    if args.from_env:
        auth = YGOProgAuth.from_env()
        if not auth.get_token():
            print("❌ Failed to authenticate using environment variables")
            print(
                "Make sure YGOPROG_USERNAME and YGOPROG_PASSWORD are set in .env file"
            )
            sys.exit(1)
    elif args.username and args.password:
        auth = YGOProgAuth(args.token_file)
        if not auth.ensure_valid_token(args.username, args.password):
            print("❌ Authentication failed")
            sys.exit(1)
    elif args.username or args.password:
        auth = YGOProgAuth(args.token_file)
        username = args.username or input("YGOProg Username: ")
        password = args.password or getpass.getpass("YGOProg Password: ")
        if not auth.ensure_valid_token(username, password):
            print("❌ Authentication failed")
            sys.exit(1)
    elif args.auth_token:
        manual_token = args.auth_token
    elif args.auth_file:
        try:
            with open(args.auth_file, "r") as f:
                manual_token = f.read().strip()
        except FileNotFoundError:
            print(f"❌ ERROR - Auth token file not found: {args.auth_file}")
            sys.exit(1)
    else:
        auth = YGOProgAuth(args.token_file)
        if not auth.get_token():
            username = os.getenv("YGOPROG_USERNAME")
            password = os.getenv("YGOPROG_PASSWORD")

            if username and password:
                print("🔐 Using credentials from environment...")
                if not auth.ensure_valid_token(username, password):
                    print("❌ Environment authentication failed")
                    sys.exit(1)
            else:
                print("❌ No authentication method provided!")
                print("Options:")
                print("  - Use --from-env (requires .env file with credentials)")
                print("  - Use --username/--password")
                print("  - Use --auth-token for manual token")
                print("  - Use --auth-file for token from file")
                sys.exit(1)

    # Show auth info if we have it
    if auth:
        token_info = auth.get_token_info()
        print(f"🔐 Authenticated as: {token_info.get('username', 'Unknown')}")
        print(f"📅 Token expires: {token_info.get('expires_at', 'Unknown')}")
        print()

    # Create binder manager
    if auth:
        binder_mgr = YGOProgBinder(auth)
    else:
        # For manual token, create a minimal auth object
        temp_auth = YGOProgAuth()
        temp_auth.token = manual_token
        temp_auth.token_data = {"exp": 9999999999}  # Fake expiry for validation
        binder_mgr = YGOProgBinder(temp_auth)

    # Handle different actions
    if args.list_binders:
        print("📚 Fetching your binders...")
        binders = binder_mgr.get_user_binders()

        if binders:
            print(f"\n✅ Found {len(binders)} binder(s):")
            print("-" * 80)
            for i, binder in enumerate(binders, 1):
                binder_id = binder.get("_id", "Unknown ID")
                binder_name = binder.get("name", "Unnamed Binder")
                card_count = len(binder.get("cards", []))

                print(f"{i:2d}. {binder_name}")
                print(f"    ID: {binder_id}")
                print(f"    Cards: {card_count}")
                print()

            print("💡 To export a binder, copy the ID and use:")
            print("   python test_binder_put.py --export-csv BINDER_ID --from-env")
        else:
            print("❌ No binders found or unable to access binders endpoint")
        sys.exit(0)  # Exit after listing binders

    elif args.export_csv:
        print(f"📤 Exporting binder {args.export_csv} to CSV...")
        success = binder_mgr.export_binder_to_csv(args.export_csv, args.export_filename)
        if not success:
            sys.exit(1)
        else:
            print("✅ CSV export completed successfully!")
            sys.exit(0)  # Exit after successful export

    elif args.sync_binder:
        # Explicit sync behavior
        # Load payload
        if args.custom_payload:
            try:
                with open(args.custom_payload, "r") as f:
                    payload = json.load(f)
            except FileNotFoundError:
                print(
                    f"❌ ERROR - Custom payload file not found: {args.custom_payload}"
                )
                sys.exit(1)
            except json.JSONDecodeError as e:
                print(f"❌ ERROR - Invalid JSON in custom payload file: {e}")
                sys.exit(1)
        else:
            payload = create_test_payload()

        # Run the sync test
        test_binder_put_request(
            args.binder_id, payload, auth, manual_token, dry_run=not args.send
        )
        sys.exit(0)  # Exit after sync test

    else:
        # No action specified, default to sync for backwards compatibility
        print("💡 No action specified. Use --help to see available options:")
        print("   --list-binders       List all your binders")
        print("   --export-csv ID      Export binder to CSV")
        print("   --sync-binder        Sync cards to binder (default)")
        print()
        print("Running default sync behavior...")

        # Load payload
        if args.custom_payload:
            try:
                with open(args.custom_payload, "r") as f:
                    payload = json.load(f)
            except FileNotFoundError:
                print(
                    f"❌ ERROR - Custom payload file not found: {args.custom_payload}"
                )
                sys.exit(1)
            except json.JSONDecodeError as e:
                print(f"❌ ERROR - Invalid JSON in custom payload file: {e}")
                sys.exit(1)
        else:
            payload = create_test_payload()

        # Run the sync test
        test_binder_put_request(
            args.binder_id, payload, auth, manual_token, dry_run=not args.send
        )


if __name__ == "__main__":
    main()
