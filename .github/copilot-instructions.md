# System Prompt
When testing, debugging, or running the application, please run the docker compose file located in the root directory.
Avoid creating test files and just run them in the console. If you need to create a test file, please delete it after the issue is fixed.
Avoid creating README files and documentation files.
Avoid creating excessive files and try to integrate into the existing codebase where applicable, unless absolutely necessary.

# Yu-Gi-Oh Progression Series Deck Builder

## Project Overview
This is a web application/website designed to facilitate deck building for Yu-Gi-Oh trading card games, specifically tailored for a progression series format where players open booster packs chronologically and build decks only from cards they own.

## Core Concept
- **Progression Series**: Players open one box from each Yu-Gi-Oh set in chronological order
- **Binder System**: Track personal card collections (what cards players actually own)
- **Deck Building**: Create decks exclusively from owned cards in the player's binder
- **Enhanced UX**: Improve upon existing online deck builders with better sorting, filtering, and organization

## Key Features to Implement

### Binder Management (Card Collection)
- **Create/Save Binders**: Personal card collections that track owned cards
- **Import/Export Binders**: Share collections or backup data
- **Card Tracking**: Quantity tracking for each card owned
- **Set Organization**: Organize by which booster box/set cards came from
- **Search & Filter**: Find cards in collection by name, type, attribute, etc.

### Deck Building
- **Build from Binder**: Only allow cards that exist in player's binder
- **Deck Validation**: Ensure decks meet format requirements (40-60 cards, limited/banned list)
- **Save/Load Decks**: Persistent deck storage
- **Import/Export Decks**: Standard deck list formats (.ydk, text, etc.)
- **Deck Statistics**: Mana curve, card type distribution, etc.

### Enhanced Filtering & Organization
- **Advanced Search**: Multi-criteria filtering (type, attribute, level, ATK/DEF ranges)
- **Custom Tags**: User-defined labels for cards and decks
- **Smart Sorting**: Multiple sort options (alphabetical, rarity, set, power level)
- **Visual Organization**: Grid/list views, card image previews

### Data Integration
- **YGOPRODeck API**: Primary data source for card information and images
  - API Endpoint: https://db.ygoprodeck.com/api/v7/cardinfo.php
  - Provides: Card data, images, ban list status, set information
- **Card Images**: High-quality card artwork and readable text
- **Set Data**: Complete card set information for chronological progression

## Inspiration & Reference
- **FaBrary.net**: Reference for excellent deck building UX/UI
  - Clean, intuitive interface
  - Excellent filtering and search capabilities
  - Good deck visualization and statistics
  - Example deck: https://fabrary.net/decks/01K4DA92ZC7QMYDMHWY0RZF6VT

## Technical Considerations

### Data Models
```
Binder:
- id, name, description
- cards: [{ cardId, quantity, setCode, rarity }]
- created/modified dates

Deck:
- id, name, description, format
- mainDeck: [{ cardId, quantity }]
- extraDeck: [{ cardId, quantity }]
- sideDeck: [{ cardId, quantity }]
- tags, notes, created/modified dates

Card (from API):
- id, name, type, race, attribute
- atk, def, level, scale
- desc (card text)
- card_sets, card_images
- banlist_info
```

### Key Functionality
1. **Binder-First Approach**: Everything starts with what cards you own
2. **Real-time Validation**: Instant feedback on deck legality and card availability
3. **Batch Operations**: Add multiple cards to binders/decks efficiently
4. **Offline Capability**: Work with saved data when API is unavailable
5. **Export Compatibility**: Generate files compatible with popular simulators (YGOPro, etc.)

## User Experience Goals
- **Intuitive Navigation**: Easy to switch between binder and deck building modes
- **Visual Clarity**: Clear indication of card availability, quantities, and restrictions
- **Speed**: Fast search and filtering for large card collections
- **Accessibility**: Keyboard shortcuts, screen reader support
- **Mobile Friendly**: Responsive design for deck building on mobile devices

## Future Enhancements
- **Multi-player Binders**: Share collections within friend groups
- **Draft Simulation**: Simulate pack openings for upcoming sets
- **Deck Analysis**: Meta analysis, win rates, card synergy suggestions
- **Trade Management**: Track card trades between players
- **Statistics Dashboard**: Collection progress, deck performance metrics

## Development Notes
- Prioritize core binder and deck building functionality first
- Ensure robust error handling for API calls
- Implement proper caching for card data to reduce API calls
- Consider progressive web app (PWA) features for offline use
- Plan for scalability as card database grows with new sets
