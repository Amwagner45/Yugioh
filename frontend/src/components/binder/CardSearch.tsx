import React, { useState, useEffect } from 'react';
import { cardService } from '../../services/api';
import type { Card, CardSearchParams, Binder } from '../../types';

interface CardSearchProps {
    selectedBinder: Binder | null;
    onAddToBinder: (cardId: number, quantity: number) => void;
    isAddingCard?: boolean;
}

interface SearchFilters {
    name: string;
    type: string;
    race: string;
    attribute: string;
    level: string;
}

const CardSearch: React.FC<CardSearchProps> = ({
    selectedBinder,
    onAddToBinder,
    isAddingCard = false,
}) => {
    const [searchResults, setSearchResults] = useState<Card[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    const [filters, setFilters] = useState<SearchFilters>({
        name: '',
        type: '',
        race: '',
        attribute: '',
        level: '',
    });

    const [selectedCard, setSelectedCard] = useState<Card | null>(null);
    const [quantity, setQuantity] = useState(1);

    // Debounced search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (filters.name.trim().length >= 2 ||
                filters.type || filters.race || filters.attribute || filters.level) {
                handleSearch();
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [filters]);

    const handleSearch = async () => {
        setIsLoading(true);
        setError(null);
        setHasSearched(true);

        try {
            const searchParams: CardSearchParams = {};

            if (filters.name.trim()) {
                searchParams.name = filters.name.trim();
            }
            if (filters.type) {
                searchParams.type = filters.type;
            }
            if (filters.race) {
                searchParams.race = filters.race;
            }
            if (filters.attribute) {
                searchParams.attribute = filters.attribute;
            }
            if (filters.level) {
                searchParams.level = parseInt(filters.level);
            }

            searchParams.limit = 50; // Limit results to keep UI responsive

            const response = await cardService.searchCards(searchParams);

            if (response.error) {
                // If there's an error but we have fallback data, show warning instead of error
                if (response.data && response.data.length > 0) {
                    setError(response.error); // Show the warning message
                    setSearchResults(response.data); // But also show the fallback results
                } else {
                    setError(response.error);
                    setSearchResults([]);
                }
            } else {
                setSearchResults(response.data);
            }
        } catch (err) {
            setError('Failed to search cards. Please try again.');
            setSearchResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFilterChange = (field: keyof SearchFilters, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const handleClearFilters = () => {
        setFilters({
            name: '',
            type: '',
            race: '',
            attribute: '',
            level: '',
        });
        setSearchResults([]);
        setHasSearched(false);
        setError(null);
    };

    const handleCardSelect = (card: Card) => {
        setSelectedCard(card);
        setQuantity(1);
    };

    const handleAddCard = () => {
        if (selectedCard && selectedBinder) {
            onAddToBinder(selectedCard.id, quantity);
            setSelectedCard(null);
            setQuantity(1);
        }
    };

    const isCardInBinder = (cardId: number) => {
        return selectedBinder?.cards.some(card => card.cardId === cardId);
    };

    const getCardQuantityInBinder = (cardId: number) => {
        const binderCard = selectedBinder?.cards.find(card => card.cardId === cardId);
        return binderCard?.quantity || 0;
    };

    // Card type options (common Yu-Gi-Oh types)
    const cardTypes = [
        'Monster', 'Spell Card', 'Trap Card', 'Effect Monster', 'Normal Monster',
        'Fusion Monster', 'Synchro Monster', 'XYZ Monster', 'Link Monster', 'Ritual Monster'
    ];

    // Attribute options
    const attributes = [
        'DARK', 'LIGHT', 'FIRE', 'WATER', 'EARTH', 'WIND', 'DIVINE'
    ];

    // Race options (simplified list)
    const races = [
        'Dragon', 'Spellcaster', 'Warrior', 'Beast', 'Machine', 'Fiend',
        'Zombie', 'Aqua', 'Insect', 'Plant', 'Rock', 'Thunder', 'Psychic'
    ];

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Card Search</h2>
                {selectedBinder ? (
                    <p className="text-gray-600">
                        Search for cards to add to "{selectedBinder.name}"
                    </p>
                ) : (
                    <p className="text-gray-600 text-red-600">
                        Please select a binder first to add cards
                    </p>
                )}
            </div>

            {/* Search Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {/* Name Search */}
                <div>
                    <label htmlFor="card-name" className="block text-sm font-medium text-gray-700 mb-2">
                        Card Name
                    </label>
                    <input
                        id="card-name"
                        type="text"
                        value={filters.name}
                        onChange={(e) => handleFilterChange('name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Search by name..."
                    />
                </div>

                {/* Type Filter */}
                <div>
                    <label htmlFor="card-type" className="block text-sm font-medium text-gray-700 mb-2">
                        Type
                    </label>
                    <select
                        id="card-type"
                        value={filters.type}
                        onChange={(e) => handleFilterChange('type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">All Types</option>
                        {cardTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>

                {/* Attribute Filter */}
                <div>
                    <label htmlFor="card-attribute" className="block text-sm font-medium text-gray-700 mb-2">
                        Attribute
                    </label>
                    <select
                        id="card-attribute"
                        value={filters.attribute}
                        onChange={(e) => handleFilterChange('attribute', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">All Attributes</option>
                        {attributes.map(attribute => (
                            <option key={attribute} value={attribute}>{attribute}</option>
                        ))}
                    </select>
                </div>

                {/* Race Filter */}
                <div>
                    <label htmlFor="card-race" className="block text-sm font-medium text-gray-700 mb-2">
                        Race/Type
                    </label>
                    <select
                        id="card-race"
                        value={filters.race}
                        onChange={(e) => handleFilterChange('race', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">All Races</option>
                        {races.map(race => (
                            <option key={race} value={race}>{race}</option>
                        ))}
                    </select>
                </div>

                {/* Level Filter */}
                <div>
                    <label htmlFor="card-level" className="block text-sm font-medium text-gray-700 mb-2">
                        Level
                    </label>
                    <select
                        id="card-level"
                        value={filters.level}
                        onChange={(e) => handleFilterChange('level', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">All Levels</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(level => (
                            <option key={level} value={level.toString()}>{level}</option>
                        ))}
                    </select>
                </div>

                {/* Clear Filters */}
                <div className="flex items-end">
                    <button
                        onClick={handleClearFilters}
                        className="w-full px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                        Clear Filters
                    </button>
                </div>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="text-center py-8">
                    <div className="inline-flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Searching cards...
                    </div>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className={`border rounded-md p-4 mb-6 ${searchResults.length > 0
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-red-50 border-red-200'
                    }`}>
                    <div className="flex">
                        <svg className={`w-5 h-5 ${searchResults.length > 0 ? 'text-yellow-400' : 'text-red-400'
                            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="ml-3">
                            <h3 className={`text-sm font-medium ${searchResults.length > 0 ? 'text-yellow-800' : 'text-red-800'
                                }`}>
                                {searchResults.length > 0 ? 'Warning' : 'Search Error'}
                            </h3>
                            <p className={`text-sm mt-1 ${searchResults.length > 0 ? 'text-yellow-700' : 'text-red-700'
                                }`}>{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Search Results */}
            {hasSearched && !isLoading && !error && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900">
                            Search Results ({searchResults.length})
                        </h3>
                    </div>

                    {searchResults.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-600">No cards found matching your search criteria.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {searchResults.map((card) => (
                                <div
                                    key={card.id}
                                    className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${selectedCard?.id === card.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                                        }`}
                                    onClick={() => handleCardSelect(card)}
                                >
                                    {/* Card Image */}
                                    {card.card_images && card.card_images[0] && (
                                        <img
                                            src={card.card_images[0].image_url_small}
                                            alt={card.name}
                                            className="w-full h-32 object-contain mb-3"
                                            loading="lazy"
                                        />
                                    )}

                                    {/* Card Info */}
                                    <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">
                                        {card.name}
                                    </h4>

                                    <div className="text-sm text-gray-600 space-y-1">
                                        <div>Type: {card.type}</div>
                                        {card.race && <div>Race: {card.race}</div>}
                                        {card.attribute && <div>Attribute: {card.attribute}</div>}
                                        {card.level && <div>Level: {card.level}</div>}
                                        {card.atk !== undefined && <div>ATK: {card.atk}</div>}
                                        {card.def !== undefined && <div>DEF: {card.def}</div>}
                                    </div>

                                    {/* Binder Status */}
                                    {isCardInBinder(card.id) && (
                                        <div className="mt-2 text-sm text-green-600 font-medium">
                                            In binder (×{getCardQuantityInBinder(card.id)})
                                        </div>
                                    )}

                                    {/* Add Button */}
                                    {selectedBinder && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCardSelect(card);
                                            }}
                                            className="mt-3 w-full bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 text-sm"
                                            disabled={!selectedBinder}
                                        >
                                            Select
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Add Card Modal */}
            {selectedCard && selectedBinder && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                            Add Card to Binder
                        </h3>

                        <div className="mb-4">
                            <h4 className="font-medium text-gray-700 mb-2">{selectedCard.name}</h4>
                            <p className="text-sm text-gray-600">
                                Adding to: {selectedBinder.name}
                            </p>
                        </div>

                        <div className="mb-6">
                            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                                Quantity
                            </label>
                            <input
                                id="quantity"
                                type="number"
                                min="1"
                                max="99"
                                value={quantity}
                                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setSelectedCard(null)}
                                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                                disabled={isAddingCard}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddCard}
                                disabled={isAddingCard}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                            >
                                {isAddingCard && (
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                )}
                                Add to Binder
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CardSearch;