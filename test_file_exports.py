#!/usr/bin/env python3
"""
Test script to verify automatic file export functionality
"""

import sys
import os
import tempfile
from pathlib import Path

# Add the backend src to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend", "src"))


def test_file_export_service():
    """Test the file export service with temporary data"""
    print("Testing File Export Service...")

    try:
        # Create temporary directory for testing
        with tempfile.TemporaryDirectory() as temp_dir:
            print(f"Using temporary directory: {temp_dir}")

            # Import the service with temporary path
            from services.file_export import FileExportService

            # Create service instance with temp directory
            export_service = FileExportService(base_data_path=temp_dir)

            # Test directory creation
            assert (
                export_service.binders_path.exists()
            ), "Binders directory was not created"
            assert (
                export_service.decklists_path.exists()
            ), "Decklists directory was not created"
            print("✅ Directories created successfully")

            # Test filename sanitization
            test_names = [
                "Normal Binder Name",
                "Binder with / illegal \\ chars",
                "Binder with <> quotes",
                "",
                None,
            ]

            for name in test_names:
                safe_name = export_service._sanitize_filename(name)
                print(f"'{name}' -> '{safe_name}'")
                assert safe_name, "Sanitized name should not be empty"
                assert not any(
                    char in safe_name
                    for char in ["/", "\\", "<", ">", ":", "*", "?", '"', "|"]
                ), f"Unsafe characters in '{safe_name}'"
            print("✅ Filename sanitization works")

            # Test empty file listing (should return empty lists)
            binder_files = export_service.list_binder_files()
            deck_files = export_service.list_deck_files()

            assert isinstance(binder_files, list), "Binder files should return a list"
            assert isinstance(deck_files, list), "Deck files should return a list"
            assert len(binder_files) == 0, "Should have no binder files initially"
            assert len(deck_files) == 0, "Should have no deck files initially"
            print("✅ File listing works for empty directories")

            print("🎉 File Export Service basic functionality verified!")
            return True

    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure you're running this from the project root directory")
        return False
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback

        traceback.print_exc()
        return False


def test_model_integration():
    """Test that the models can import the export service without circular imports"""
    print("\nTesting Model Integration...")

    try:
        # Test that we can import models without issues
        from database.models import Binder, Deck

        print("✅ Models imported successfully")

        # Test that the file export service can be imported from models
        from services.file_export import file_export_service

        print("✅ File export service imported successfully")

        print("🎉 Model integration test passed!")
        return True

    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False


def main():
    """Run all tests"""
    print("=" * 50)
    print("Yu-Gi-Oh Deck Builder - File Export Tests")
    print("=" * 50)

    tests = [test_file_export_service, test_model_integration]

    passed = 0
    failed = 0

    for test in tests:
        try:
            if test():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"❌ Test {test.__name__} crashed: {e}")
            failed += 1

    print("\n" + "=" * 50)
    print(f"Test Results: {passed} passed, {failed} failed")
    print("=" * 50)

    if failed == 0:
        print("🎉 All tests passed!")
        return True
    else:
        print("❌ Some tests failed")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
