#!/usr/bin/env python3
"""
Test server to verify banlist routes work
"""

import sys
import os

# Add current directory to Python path
sys.path.insert(0, '.')

from src.main import create_app
import uvicorn

def main():
    print("Creating test server...")
    app = create_app()
    
    # Check if banlist routes are registered
    banlist_routes = [route for route in app.routes if hasattr(route, 'path') and 'banlists' in route.path]
    print(f"Found {len(banlist_routes)} banlist routes:")
    for route in banlist_routes[:3]:  # Show first 3
        print(f"  {route.methods} {route.path}")
    
    print("\nStarting server on http://localhost:8001...")
    print("Test banlist endpoint: http://localhost:8001/api/banlists")
    
    uvicorn.run(app, host="127.0.0.1", port=8001, log_level="info")

if __name__ == "__main__":
    main()