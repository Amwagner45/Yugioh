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
                    # Get all unique field names from all cards
                    all_fieldnames = set()
                    for card in cards:
                        all_fieldnames.update(card.keys())
                    
                    # Convert to list and sort for consistency
                    fieldnames = sorted(list(all_fieldnames))
                    
                    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
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

    def update_binder_cards(self, binder_id: str, cards: List[Dict[str, Any]], method: str = "PUT") -> bool:
        """
        Update cards in a YGOProg binder - try different HTTP methods
        """
        if not self.auth.is_token_valid():
            print("❌ No valid authentication token")
            return False

        # Try different possible endpoints and methods
        endpoints_to_try = [
            f"/api/binder/{binder_id}/cards",
            f"/api/binder/{binder_id}",
            f"/api/user/binder/{binder_id}/cards",
            f"/api/user/binder/{binder_id}",
        ]
        
        headers = self._get_api_headers()
        payload = {"cards": cards}
        
        # If updating the whole binder, include additional fields
        if "/cards" not in endpoints_to_try[0]:
            # Get current binder info to preserve other fields
            current_binder = self.get_binder_contents(binder_id)
            if current_binder:
                payload.update({
                    "name": current_binder.get("name", "Unknown Binder"),
                    "description": current_binder.get("description", ""),
                    "_id": binder_id
                })

        for endpoint in endpoints_to_try:
            url = f"{self.base_url}{endpoint}"
            try:
                print(f"Trying {method} request to {endpoint}")
                print(f"📤 Sending payload with {len(cards)} cards")
                
                if len(cards) <= 3:
                    print(f"📋 Sample payload: {json.dumps(payload, indent=2)}")
                
                # Try the specified HTTP method
                if method.upper() == "PUT":
                    response = requests.put(url, json=payload, headers=headers, timeout=30)
                elif method.upper() == "PATCH":
                    response = requests.patch(url, json=payload, headers=headers, timeout=30)
                elif method.upper() == "POST":
                    response = requests.post(url, json=payload, headers=headers, timeout=30)
                else:
                    print(f"❌ Unsupported HTTP method: {method}")
                    continue

                print(f"📡 Response status: {response.status_code}")
                
                if response.status_code in [200, 201, 204]:
                    print(f"✅ SUCCESS with {method} to {endpoint}")
                    try:
                        response_data = response.json()
                        # Check if the response shows the expected number of cards
                        returned_cards = response_data.get("cards", [])
                        print(f"� Server reports {len(returned_cards)} cards in binder")
                        
                        if len(returned_cards) == len(cards):
                            print("✅ Card count matches - operation successful!")
                            return True
                        else:
                            print(f"⚠️ Card count mismatch: expected {len(cards)}, got {len(returned_cards)}")
                            if len(cards) == 0 and len(returned_cards) > 0:
                                print("❌ Clear operation failed - cards still present")
                                continue
                    except:
                        print(f"📡 Response text: {response.text[:200]}...")
                    
                    return True
                elif response.status_code == 404:
                    print(f"Endpoint {endpoint} not found (404)")
                    continue
                elif response.status_code == 401:
                    print("❌ Authentication failed - token may be expired")
                    return False
                else:
                    print(f"Endpoint {endpoint} returned {response.status_code}: {response.text[:200]}")
                    continue

            except requests.exceptions.RequestException as e:
                print(f"Error trying {endpoint}: {e}")
                continue

        print(f"❌ All endpoints failed for {method} method")
        return False

    def create_binder(self, name: str, description: str = "") -> Optional[str]:
        """
        Create a new binder
        Returns binder ID if successful, None if failed
        """
        if not self.auth.is_token_valid():
            print("❌ No valid authentication token")
            return None

        # Try different possible endpoints for creating binders
        possible_endpoints = [
            f"/api/binder/{name}",  # Based on browser dev tools showing POST to /api/binder/test5
            "/api/binder",
            "/api/binders",
            "/api/user/binder",
            "/api/user/binders",
        ]
        
        headers = self._get_api_headers()
        payload = {
            "name": name,
            "description": description,
            "cards": []
        }

        for endpoint in possible_endpoints:
            url = f"{self.base_url}{endpoint}"
            try:
                print(f"Trying to create binder at endpoint: {endpoint}")
                response = requests.post(url, json=payload, headers=headers, timeout=30)

                if response.status_code == 201 or response.status_code == 200:
                    data = response.json()
                    print(f"✅ Found working create endpoint: {endpoint}")
                    binder_id = data.get("_id") or data.get("id")
                    if binder_id:
                        print(f"✅ Binder '{name}' created successfully! ID: {binder_id}")
                        return binder_id
                    else:
                        print(f"⚠️ Binder created but no ID returned. Response: {data}")
                        return None
                elif response.status_code == 404:
                    print(f"Endpoint {endpoint} not found (404)")
                    continue
                elif response.status_code == 401:
                    print("❌ Authentication failed - token may be expired")
                    return None
                else:
                    print(f"Endpoint {endpoint} returned {response.status_code}: {response.text[:200]}")
                    continue

            except requests.exceptions.RequestException as e:
                print(f"Error trying {endpoint}: {e}")
                continue

        print("❌ Could not find working create binder endpoint")
        return None

    def delete_binder(self, binder_id: str) -> bool:
        """
        Delete a binder completely using the DELETE endpoint
        """
        if not self.auth.is_token_valid():
            print("❌ No valid authentication token")
            return False

        url = f"{self.base_url}/api/binder/{binder_id}"
        headers = self._get_api_headers()

        try:
            print(f"🗑️ Deleting binder {binder_id}...")
            print(f"📤 Sending DELETE request to {url}")
            response = requests.delete(url, headers=headers, timeout=30)

            print(f"📡 Response status: {response.status_code}")
            
            if response.status_code == 200 or response.status_code == 204:
                try:
                    if response.text:
                        response_data = response.json()
                        print(f"📡 Response: {json.dumps(response_data, indent=2)}")
                except:
                    print(f"📡 Response text: {response.text}")
                print("✅ Binder deleted successfully!")
                return True
            elif response.status_code == 401:
                print("❌ Authentication failed - token may be expired")
                return False
            elif response.status_code == 404:
                print("❌ Binder not found")
                return False
            elif response.status_code == 403:
                print("❌ Access denied - you may not have permission to delete this binder")
                return False
            else:
                print(f"❌ Delete failed with status {response.status_code}")
                print(f"Response: {response.text}")
                return False

        except requests.exceptions.RequestException as e:
            print(f"❌ Request failed: {e}")
            return False

    def remove_cards_from_binder(self, binder_id: str, card_names: List[str]) -> bool:
        """
        Remove specific cards from a binder by name
        """
        # First get current binder contents
        binder_data = self.get_binder_contents(binder_id)
        if not binder_data:
            print("❌ Could not retrieve binder contents")
            return False

        current_cards = binder_data.get("cards", [])
        if not current_cards:
            print("❌ No cards found in binder")
            return False

        # Remove the specified cards
        cards_to_keep = []
        removed_count = 0
        
        for card in current_cards:
            card_name = card.get("name", "").lower()
            if any(target_name.lower() == card_name for target_name in card_names):
                removed_count += 1
                print(f"🗑️ Removing: {card.get('name')}")
            else:
                cards_to_keep.append(card)

        if removed_count == 0:
            print(f"⚠️ No cards found matching: {', '.join(card_names)}")
            return False

        # Update the binder with remaining cards
        print(f"Updating binder with {len(cards_to_keep)} remaining cards...")
        return self.update_binder_cards(binder_id, cards_to_keep)

    def update_card_count(self, binder_id: str, card_code: str, rarity: str, count_delta: int) -> bool:
        """
        Update the count of a specific card in a binder using the /card/count endpoint
        count_delta: positive to add cards, negative to remove cards
        """
        if not self.auth.is_token_valid():
            print("❌ No valid authentication token")
            return False

        url = f"{self.base_url}/api/binder/{binder_id}/card/count"
        headers = self._get_api_headers()
        payload = {
            "code": card_code,
            "rarity": rarity,
            "count": count_delta
        }

        try:
            print(f"Updating card count: {card_code} ({rarity}) by {count_delta}")
            print(f"📤 Sending to {url}")
            print(f"📋 Payload: {json.dumps(payload, indent=2)}")
            
            response = requests.put(url, json=payload, headers=headers, timeout=30)
            
            print(f"📡 Response status: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    response_data = response.json()
                    print(f"📡 Response: {json.dumps(response_data, indent=2)}")
                except:
                    print(f"📡 Response text: {response.text}")
                print("✅ Card count updated successfully!")
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

    def remove_card_by_code(self, binder_id: str, card_code: str, rarity: str = None) -> bool:
        """
        Remove a card from binder by setting its count to 0 using the card/count endpoint
        """
        if not self.auth.is_token_valid():
            print("❌ No valid authentication token")
            return False

        # If no rarity specified, try to find the card in the binder first
        if not rarity:
            binder_data = self.get_binder_contents(binder_id)
            cards = binder_data.get("cards", [])
            
            matching_cards = [card for card in cards if card.get("code", "") == card_code]
            if not matching_cards:
                print(f"❌ Card with code {card_code} not found in binder")
                return False
            
            # If multiple rarities exist, remove all of them
            success_count = 0
            for card in matching_cards:
                card_rarity = card.get("rarity", "Common")
                current_count = card.get("count", 0)
                if current_count > 0:
                    # Use negative count to remove all copies
                    if self.update_card_count(binder_id, card_code, card_rarity, -current_count):
                        success_count += 1
                        print(f"✅ Removed {current_count}x {card.get('name', 'Unknown')} ({card_rarity})")
            
            return success_count > 0
        else:
            # Get current count first
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
            if current_count <= 0:
                print(f"⚠️ Card {card_code} ({rarity}) already has 0 count")
                return True
            
            # Remove all copies
            return self.update_card_count(binder_id, card_code, rarity, -current_count)

    def remove_single_card(self, binder_id: str, card_code: str, rarity: str) -> bool:
        """
        Remove a single card from binder by setting its count to 0 using the card/count endpoint
        This is a simplified version that only handles one card at a time
        """
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

    def remove_all_cards_from_binder(self, binder_id: str) -> bool:
        """
        Remove all cards from a binder by setting each card's count to 0 using the card/count endpoint
        (This clears the binder contents but keeps the binder itself)
        """
        if not self.auth.is_token_valid():
            print("❌ No valid authentication token")
            return False

        # Get current binder contents
        binder_data = self.get_binder_contents(binder_id)
        cards = binder_data.get("cards", [])
        
        if not cards:
            print("✅ Binder is already empty")
            return True
        
        print(f"🗑️ Removing all cards from binder (keeping binder itself)...")
        print(f"📊 Found {len(cards)} card types to remove")
        
        success_count = 0
        error_count = 0
        
        for i, card in enumerate(cards, 1):
            card_name = card.get("name", "Unknown")
            card_code = card.get("code", "")
            card_rarity = card.get("rarity", "Common")
            current_count = card.get("count", 0)
            
            if not card_code:
                print(f"⚠️ Skipping {card_name} - no card code")
                error_count += 1
                continue
            
            if current_count <= 0:
                print(f"⏭️ Skipping {card_name} - already 0 count")
                continue
            
            print(f"[{i}/{len(cards)}] Removing {current_count}x {card_name} ({card_code})")
            
            if self.update_card_count(binder_id, card_code, card_rarity, -current_count):
                success_count += 1
            else:
                error_count += 1
                
            # Longer delay to avoid overwhelming the API
            import time
            if i < len(cards):  # Don't sleep after the last card
                print(f"⏳ Waiting 10 seconds before next request...")
                time.sleep(10)
        print(f"📊 Results: {success_count} successful, {error_count} failed")
        return error_count == 0

    def clear_binder(self, binder_id: str) -> bool:
        """
        Remove all cards from a binder - try the new card/count method first
        """
        if not self.auth.is_token_valid():
            print("❌ No valid authentication token")
            return False

        print(f"🗑️ Clearing all cards from binder {binder_id}...")
        
        # Method 1: Try the new card/count approach
        print("Method 1: Using individual card/count operations...")
        if self.remove_all_cards_from_binder(binder_id):
            print("✅ Binder cleared successfully using card/count method!")
            return True
        
        # Fallback to old methods if the new one fails
        print("Method 1 failed, trying fallback methods...")
        
        # Method 2: Try to update with empty card list
        print("Method 2: Trying PUT with empty cards array...")
        success = self.update_binder_cards(binder_id, [])
        if success:
            # Verify it actually worked
            binder_data = self.get_binder_contents(binder_id)
            current_cards = binder_data.get("cards", [])
            if len(current_cards) == 0:
                print("✅ Method 2 successful - binder cleared!")
                return True
            else:
                print(f"❌ Method 2 failed - still has {len(current_cards)} cards")
        
        # Method 3: Try DELETE request on cards endpoint
        print("Method 3: Trying DELETE request...")
        try:
            url = f"{self.base_url}/api/binder/{binder_id}/cards"
            headers = self._get_api_headers()
            response = requests.delete(url, headers=headers, timeout=30)
            
            if response.status_code in [200, 204]:
                print("✅ DELETE request successful!")
                # Verify
                binder_data = self.get_binder_contents(binder_id)
                current_cards = binder_data.get("cards", [])
                if len(current_cards) == 0:
                    print("✅ Method 3 successful - binder cleared!")
                    return True
                else:
                    print(f"❌ Method 3 failed - still has {len(current_cards)} cards")
            else:
                print(f"DELETE request failed: {response.status_code}")
        except Exception as e:
            print(f"DELETE request error: {e}")
        
        print("❌ All clear methods failed")
        return False

    def import_csv_to_binder(self, csv_file_path: str, binder_id: str) -> bool:
        """
        Import cards from a CSV file to a binder
        Expects CSV format: cardname,cardq,cardid,cardrarity,cardcondition,card_edition,cardset,cardcode
        """
        if not self.auth.is_token_valid():
            print("❌ No valid authentication token")
            return False

        try:
            print(f"Reading CSV file: {csv_file_path}")
            cards = []
            
            with open(csv_file_path, 'r', encoding='utf-8') as csvfile:
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
                    if not name:
                        print(f"⚠️ Row {row_num}: Missing card name, skipping")
                        continue
                        
                    if not cardid_str or not cardid_str.isdigit():
                        print(f"⚠️ Row {row_num}: Invalid card ID for '{name}', skipping")
                        continue
                    
                    cardid = int(cardid_str)
                    count = int(count_str) if count_str.isdigit() else 1
                    
                    # Map CSV columns to YGOProg format - ensure all strings are non-null
                    card = {
                        "name": name,
                        "cardId": cardid,  # Note: YGOProg uses "cardId", not "cardid"
                        "count": count,
                        "rarity": rarity if rarity else "Unknown",
                        "set": card_set if card_set else "Unknown",
                        "code": code if code else ""
                    }
                    
                    cards.append(card)

            if not cards:
                print("❌ No valid cards found in CSV file")
                return False

            print(f"📥 Parsed {len(cards)} cards from CSV")
            print(f"Sample cards: {[c['name'] for c in cards[:3]]}")
            print(f"Sample card format: {cards[0] if cards else 'None'}")

            # Upload cards to binder
            return self.update_binder_cards(binder_id, cards)

        except FileNotFoundError:
            print(f"❌ CSV file not found: {csv_file_path}")
            return False
        except Exception as e:
            print(f"❌ Error processing CSV file: {e}")
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
    action_group.add_argument(
        "--create-binder", metavar="NAME", help="Create a new binder with the given name"
    )
    action_group.add_argument(
        "--delete-binder", metavar="BINDER_ID", help="Delete a binder completely (removes binder and all cards)"
    )
    action_group.add_argument(
        "--import-csv", metavar="CSV_FILE", help="Import cards from CSV file to a binder"
    )
    action_group.add_argument(
        "--remove-cards", metavar="CARD_NAMES", nargs="+", help="Remove specific cards from binder (space-separated names)"
    )
    action_group.add_argument(
        "--clear-binder", metavar="BINDER_ID", help="Remove all cards from a binder (keeps the empty binder)"
    )
    action_group.add_argument(
        "--remove-by-code", metavar="CARD_CODE", help="Remove card by code (e.g. 'MRD-EN060')"
    )
    action_group.add_argument(
        "--remove-card", nargs=2, metavar=("CARD_CODE", "RARITY"),
        help="Remove a single card by code and rarity (e.g. 'MRD-EN060' 'Ultra Rare')"
    )
    action_group.add_argument(
        "--test-card-count", nargs=3, metavar=("CARD_CODE", "RARITY", "COUNT_DELTA"), 
        help="Test card count update (code rarity count_delta)"
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

    elif args.create_binder:
        print(f"🆕 Creating new binder: '{args.create_binder}'")
        binder_id = binder_mgr.create_binder(args.create_binder, "Created via test script")
        if binder_id:
            print(f"✅ New binder created with ID: {binder_id}")
        else:
            print("❌ Failed to create binder")
            sys.exit(1)
        sys.exit(0)

    elif args.delete_binder:
        print(f"🗑️ Deleting binder: {args.delete_binder}")
        print("⚠️  WARNING: This will permanently delete the binder and all its cards!")
        confirm = input("Type 'DELETE' to confirm: ")
        if confirm == "DELETE":
            success = binder_mgr.delete_binder(args.delete_binder)
            if not success:
                sys.exit(1)
        else:
            print("❌ Deletion cancelled")
            sys.exit(1)
        sys.exit(0)

    elif args.import_csv:
        if not args.binder_id:
            print("❌ --binder-id required for CSV import")
            sys.exit(1)
        print(f"📥 Importing CSV '{args.import_csv}' to binder {args.binder_id}")
        success = binder_mgr.import_csv_to_binder(args.import_csv, args.binder_id)
        if not success:
            sys.exit(1)
        else:
            print("✅ CSV import completed successfully!")
        sys.exit(0)

    elif args.remove_cards:
        if not args.binder_id:
            print("❌ --binder-id required for removing cards")
            sys.exit(1)
        print(f"🗑️ Removing cards from binder {args.binder_id}: {', '.join(args.remove_cards)}")
        success = binder_mgr.remove_cards_from_binder(args.binder_id, args.remove_cards)
        if not success:
            sys.exit(1)
        else:
            print("✅ Cards removed successfully!")
        sys.exit(0)

    elif args.clear_binder:
        binder_id = args.clear_binder
        
        # If the argument is just "default" or empty, use the env variable
        if binder_id in ["default", ""]:
            binder_id = os.getenv("YGOPROG_DEFAULT_BINDER_ID")
            if not binder_id:
                print("❌ No default binder ID set in environment variables")
                sys.exit(1)
            print(f"Using default binder ID from environment: {binder_id}")
        
        print(f"🗑️ Clearing all cards from binder: {binder_id}")
        print("⚠️  WARNING: This will remove ALL cards from the binder!")
        confirm = input("Type 'CLEAR' to confirm: ")
        if confirm == "CLEAR":
            success = binder_mgr.clear_binder(binder_id)
            if not success:
                sys.exit(1)
            else:
                print("✅ Binder cleared successfully!")
        else:
            print("❌ Clear operation cancelled")
            sys.exit(1)
        sys.exit(0)

    elif args.remove_card:
        if not args.binder_id:
            print("❌ --binder-id required for removing cards")
            sys.exit(1)
        card_code, rarity = args.remove_card
        print(f"🗑️ Removing card {card_code} ({rarity}) from binder {args.binder_id}")
        success = binder_mgr.remove_single_card(args.binder_id, card_code, rarity)
        if not success:
            sys.exit(1)
        else:
            print("✅ Card removed successfully!")
        sys.exit(0)

    elif args.remove_by_code:
        if not args.binder_id:
            print("❌ --binder-id required for removing cards by code")
            sys.exit(1)
        print(f"🗑️ Removing card {args.remove_by_code} from binder {args.binder_id}")
        success = binder_mgr.remove_card_by_code(args.binder_id, args.remove_by_code)
        if not success:
            sys.exit(1)
        else:
            print("✅ Card removed successfully!")
        sys.exit(0)

    elif args.test_card_count:
        if not args.binder_id:
            print("❌ --binder-id required for testing card count")
            sys.exit(1)
        card_code, rarity, count_delta_str = args.test_card_count
        try:
            count_delta = int(count_delta_str)
        except ValueError:
            print(f"❌ Invalid count delta: {count_delta_str}")
            sys.exit(1)
        
        print(f"🧪 Testing card count update: {card_code} ({rarity}) by {count_delta}")
        success = binder_mgr.update_card_count(args.binder_id, card_code, rarity, count_delta)
        if not success:
            sys.exit(1)
        else:
            print("✅ Card count updated successfully!")
        sys.exit(0)

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
        print("   --list-binders           List all your binders")
        print("   --export-csv ID          Export binder to CSV")
        print("   --create-binder NAME     Create a new binder")
        print("   --delete-binder ID       Delete entire binder (removes binder completely)")
        print("   --import-csv FILE        Import CSV to binder (requires --binder-id)")
        print("   --remove-cards NAMES     Remove cards from binder (requires --binder-id)")
        print("   --clear-binder ID        Remove all cards from binder (keeps binder)")
        print("   --remove-card CODE RARITY Remove single card by code and rarity (requires --binder-id)")
        print("   --sync-binder            Sync cards to binder (default)")
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
