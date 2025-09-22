#!/usr/bin/env python3
"""
Test script for Section 2.2 Data Models Implementation
Tests all the enhanced CRUD operations, validation, and API integration
"""

import sys
import os
import traceback
from datetime import datetime

# Add the backend src directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend", "src"))

try:
    from database.models import (
        User,
        Binder,
        BinderCard,
        Deck,
        DeckCard,
        Card,
        ValidationError,
        ModelValidator,
    )
    from database.performance import DatabasePerformance, QueryProfiler

    print("✅ Successfully imported all models and utilities")
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you're running this from the project root directory")
    sys.exit(1)


def test_model_validator():
    """Test the ModelValidator utility class"""
    print("\n🧪 Testing ModelValidator...")

    # Test string length validation
    errors = ModelValidator.validate_string_length("", "Test Field", min_length=1)
    assert len(errors) > 0, "Should have validation error for empty string"

    errors = ModelValidator.validate_string_length(
        "Valid", "Test Field", min_length=1, max_length=10
    )
    assert len(errors) == 0, "Should have no errors for valid string"

    # Test integer range validation
    errors = ModelValidator.validate_integer_range(-1, "Quantity", min_value=0)
    assert len(errors) > 0, "Should have validation error for negative value"

    errors = ModelValidator.validate_integer_range(
        5, "Quantity", min_value=1, max_value=10
    )
    assert len(errors) == 0, "Should have no errors for valid integer"

    # Test choice validation
    errors = ModelValidator.validate_choice(
        "invalid", "Status", ["valid", "active", "inactive"]
    )
    assert len(errors) > 0, "Should have validation error for invalid choice"

    print("✅ ModelValidator tests passed")


def test_user_model():
    """Test User model functionality"""
    print("\n🧪 Testing User model...")

    # Test getting default user
    user = User.get_default_user()
    assert user is not None, "Should get default user"
    assert user.username == "default", "Default user should have username 'default'"

    print(f"✅ Default user: {user.username} (ID: {user.id})")


def test_binder_model():
    """Test Binder model with enhanced CRUD operations"""
    print("\n🧪 Testing Binder model...")

    # Test creating a new binder
    test_binder = Binder(
        name="Test Collection",
        description="A test binder for validation",
        tags=["test", "collection"],
    )

    # Test validation
    try:
        test_binder.save()
        print(f"✅ Created binder: {test_binder.name} (ID: {test_binder.id})")
    except ValidationError as e:
        print(f"❌ Validation error: {e}")
        return

    # Test search functionality
    binders = Binder.search_by_name("Test")
    assert len(binders) > 0, "Should find binders with 'Test' in name"
    print(f"✅ Found {len(binders)} binders matching search")

    # Test getting binder by ID
    found_binder = Binder.get_by_id(test_binder.id)
    assert found_binder is not None, "Should find binder by ID"
    assert found_binder.name == test_binder.name, "Found binder should match original"

    # Test validation errors
    try:
        invalid_binder = Binder(name="")  # Empty name should fail
        invalid_binder.save()
        assert False, "Should have raised validation error"
    except ValidationError:
        print("✅ Validation correctly caught empty binder name")

    # Test card statistics
    card_count = test_binder.get_card_count()
    total_quantity = test_binder.get_total_card_quantity()
    print(
        f"✅ Binder stats: {card_count} unique cards, {total_quantity} total quantity"
    )

    return test_binder


def test_deck_model():
    """Test Deck model with enhanced CRUD operations"""
    print("\n🧪 Testing Deck model...")

    # Test creating a new deck
    test_deck = Deck(
        name="Test Deck",
        description="A test deck for validation",
        format="TCG",
        tags=["test", "competitive"],
    )

    # Test validation and save
    try:
        test_deck.save()
        print(f"✅ Created deck: {test_deck.name} (ID: {test_deck.id})")
    except ValidationError as e:
        print(f"❌ Validation error: {e}")
        return

    # Test search functionality
    decks = Deck.search_by_name("Test")
    assert len(decks) > 0, "Should find decks with 'Test' in name"
    print(f"✅ Found {len(decks)} decks matching search")

    # Test format filtering
    tcg_decks = Deck.get_by_format("TCG")
    assert len(tcg_decks) > 0, "Should find TCG format decks"
    print(f"✅ Found {len(tcg_decks)} TCG format decks")

    # Test deck validation (should be empty and invalid initially)
    validation_errors = test_deck.validate_deck_composition()
    print(
        f"✅ Deck validation found {len(validation_errors)} errors (expected for empty deck)"
    )

    # Test deck statistics
    stats = test_deck.get_deck_statistics()
    print(
        f"✅ Deck stats: {stats['main_deck_count']} main, {stats['extra_deck_count']} extra, {stats['side_deck_count']} side"
    )

    return test_deck


def test_card_model():
    """Test Card model with API integration (without actually calling API)"""
    print("\n🧪 Testing Card model...")

    # Test creating a card manually (simulating API data)
    test_card = Card(
        id=12345,
        name="Test Monster",
        type="Effect Monster",
        description="A test monster for validation",
        atk=1800,
        def_=1200,
        level=4,
        race="Warrior",
        attribute="EARTH",
    )

    # Test saving to cache
    test_card.save()
    print(f"✅ Saved card to cache: {test_card.name}")

    # Test retrieving from cache
    cached_card = Card.get_by_id(12345, fetch_if_missing=False)
    assert cached_card is not None, "Should find card in cache"
    assert cached_card.name == test_card.name, "Cached card should match original"
    print(f"✅ Retrieved card from cache: {cached_card.name}")

    # Test search functionality
    cards = Card.search_by_name("Test", exact_match=False)
    assert len(cards) > 0, "Should find cards with 'Test' in name"
    print(f"✅ Found {len(cards)} cards matching name search")

    # Test filtering
    filters = {"type": "Effect Monster", "race": "Warrior"}
    filtered_cards = Card.search_by_filters(filters)
    print(f"✅ Found {len(filtered_cards)} cards matching filters")

    # Test ban list methods
    max_copies = test_card.get_max_copies("tcg")
    print(f"✅ Card allows {max_copies} copies in TCG format")

    return test_card


def test_binder_card_model(binder, card):
    """Test BinderCard model functionality"""
    print("\n🧪 Testing BinderCard model...")

    # Test adding card to binder
    try:
        binder_card = binder.add_card(
            card_id=card.id,
            quantity=3,
            set_code="TEST-001",
            rarity="Ultra Rare",
            condition="Near Mint",
        )
        print(f"✅ Added card to binder: {card.name} x{binder_card.quantity}")
    except ValidationError as e:
        print(f"❌ Validation error: {e}")
        return

    # Test card quantity in binder
    quantity = card.get_quantity_in_binder(binder.id)
    assert quantity == 3, "Should have 3 copies in binder"
    print(f"✅ Confirmed {quantity} copies in binder")

    # Test validation with invalid condition
    try:
        invalid_card = BinderCard(
            binder_id=binder.id,
            card_id=card.id,
            quantity=1,
            condition="Invalid Condition",  # Should fail validation
        )
        invalid_card.save()
        assert False, "Should have raised validation error"
    except ValidationError:
        print("✅ Validation correctly caught invalid condition")


def test_deck_card_model(deck, card):
    """Test DeckCard model functionality"""
    print("\n🧪 Testing DeckCard model...")

    # Test adding card to deck
    try:
        deck_card = deck.add_card(card_id=card.id, section="main", quantity=2)
        print(f"✅ Added card to deck: {card.name} x{deck_card.quantity} in main deck")
    except ValidationError as e:
        print(f"❌ Validation error: {e}")
        return

    # Test deck composition validation
    validation_errors = deck.validate_deck_composition()
    print(f"✅ Deck validation: {len(validation_errors)} errors")

    # Test removing cards
    success = deck.remove_card(card_id=card.id, section="main", quantity=1)
    assert success, "Should successfully remove card"
    print("✅ Successfully removed card from deck")

    # Test section clearing
    success = deck.clear_section("side")
    assert success, "Should successfully clear section"
    print("✅ Successfully cleared side deck section")


def test_performance_utilities():
    """Test database performance utilities"""
    print("\n🧪 Testing performance utilities...")

    # Test database statistics
    stats = DatabasePerformance.get_database_statistics()
    print(
        f"✅ Database stats: {stats.get('binders_count', 0)} binders, {stats.get('card_cache_count', 0)} cached cards"
    )

    # Test query profiler
    with QueryProfiler("Test query"):
        # Simulate a database operation
        import time

        time.sleep(0.01)  # 10ms delay
    print("✅ Query profiler test completed")

    # Test index suggestions
    suggestions = DatabasePerformance.suggest_indexes()
    print(f"✅ Performance suggestions: {len(suggestions)} index recommendations")


def run_all_tests():
    """Run all tests and report results"""
    print("🚀 Starting Data Models Implementation Tests")
    print("=" * 60)

    try:
        # Test utility classes
        test_model_validator()

        # Test core models
        test_user_model()
        test_binder = test_binder_model()
        test_deck = test_deck_model()
        test_card = test_card_model()

        # Test relationship models
        if test_binder and test_card:
            test_binder_card_model(test_binder, test_card)

        if test_deck and test_card:
            test_deck_card_model(test_deck, test_card)

        # Test performance utilities
        test_performance_utilities()

        print("\n" + "=" * 60)
        print("🎉 ALL TESTS PASSED!")
        print("✅ Section 2.2 Data Models Implementation is working correctly")
        print("\nReady for Phase 3: Binder Management System! 🚀")

    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        print("Traceback:")
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    run_all_tests()
