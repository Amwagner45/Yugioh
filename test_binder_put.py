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
        self.token_file = token_file or os.getenv('YGOPROG_TOKEN_FILE', 'ygoprog_token.json')
        self.token = None
        self.token_data = None
        self.load_token()
    
    @classmethod
    def from_env(cls) -> 'YGOProgAuth':
        """Create YGOProgAuth instance using environment variables"""
        instance = cls()
        username = os.getenv('YGOPROG_USERNAME')
        password = os.getenv('YGOPROG_PASSWORD')
        
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
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        
        payload = {"username": username, "password": password}
        
        try:
            print(f"Logging in to YGOProg as {username}...")
            response = requests.post(login_url, json=payload, headers=headers, timeout=30)
            
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
            header, payload, signature = self.token.split('.')
            payload += '=' * (4 - len(payload) % 4)
            payload_decoded = base64.b64decode(payload)
            self.token_data = json.loads(payload_decoded)
            
            # Save to file
            token_info = {
                "token": self.token,
                "decoded": self.token_data,
                "saved_at": datetime.now().isoformat()
            }
            
            with open(self.token_file, 'w') as f:
                json.dump(token_info, f, indent=2)
                
            print(f"Token saved to {self.token_file}")
            
        except Exception as e:
            print(f"Warning: Could not decode/save token: {e}")
    
    def load_token(self):
        """Load token from file if it exists and is valid"""
        if not os.path.exists(self.token_file):
            return
            
        try:
            with open(self.token_file, 'r') as f:
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
            
        exp = self.token_data.get('exp')
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
            
        exp = self.token_data.get('exp')
        iat = self.token_data.get('iat')
        
        info = {
            "username": self.token_data.get('username'),
            "user_id": self.token_data.get('userId'),
            "valid": self.is_token_valid()
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
    """Main function to run the test"""
    import argparse
    import getpass

    parser = argparse.ArgumentParser(
        description="Test PUT request to YGOProg binder API with automatic authentication"
    )
    parser.add_argument(
        "--binder-id",
        default=os.getenv("YGOPROG_DEFAULT_BINDER_ID", "68d18d726fd54b31888495b2"),
        help="Binder ID to update (default: from environment or screenshot)",
    )
    parser.add_argument(
        "--send",
        action="store_true",
        help="Actually send the request (default is dry run)",
    )
    parser.add_argument(
        "--custom-payload", help="Path to JSON file with custom payload"
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

    # Handle authentication
    auth = None
    manual_token = None

    if args.from_env:
        # Use environment-based authentication
        auth = YGOProgAuth.from_env()
        if not auth.get_token():
            print("❌ Failed to authenticate using environment variables")
            print(
                "Make sure YGOPROG_USERNAME and YGOPROG_PASSWORD are set in .env file"
            )
            sys.exit(1)
    elif args.username and args.password:
        # Use provided credentials
        auth = YGOProgAuth(args.token_file)

        if not auth.ensure_valid_token(args.username, args.password):
            print("❌ Authentication failed")
            sys.exit(1)
    elif args.username or args.password:
        # Partial credentials provided, prompt for missing
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
        # Try to load existing token or use environment
        auth = YGOProgAuth(args.token_file)
        if not auth.get_token():
            # Try environment credentials as fallback
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

    # Load payload
    if args.custom_payload:
        try:
            with open(args.custom_payload, "r") as f:
                payload = json.load(f)
        except FileNotFoundError:
            print(f"❌ ERROR - Custom payload file not found: {args.custom_payload}")
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"❌ ERROR - Invalid JSON in custom payload file: {e}")
            sys.exit(1)
    else:
        payload = create_test_payload()

    # Show auth info
    if auth:
        token_info = auth.get_token_info()
        print(f"🔐 Authenticated as: {token_info.get('username', 'Unknown')}")
        print(f"📅 Token expires: {token_info.get('expires_at', 'Unknown')}")
        print()

    # Run the test
    test_binder_put_request(
        args.binder_id, payload, auth, manual_token, dry_run=not args.send
    )


if __name__ == "__main__":
    main()
