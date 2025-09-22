import React, { useState, useEffect } from 'react';
import { cardService } from '../../services/api';
import CardDetailModal from '../common/CardDetailModal';
import BulkAddModal from './BulkAddModal';
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
    atkMin: string;
    atkMax: string;
    defMin: string;
    defMax: string;
    archetype: string;
    banlist: string;
    cardset: string;
    rarity: string;
    description: string;
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
        atkMin: '',
        atkMax: '',
        defMin: '',
        defMax: '',
        archetype: '',
        banlist: '',
        cardset: '',
        rarity: '',
        description: '',
    });

    const [selectedCard, setSelectedCard] = useState<Card | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailCard, setDetailCard] = useState<Card | null>(null);
    const [showBulkAddModal, setShowBulkAddModal] = useState(false);

    // Debounced search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (filters.name.trim().length >= 2 ||
                filters.type || filters.race || filters.attribute || filters.level ||
                filters.atkMin || filters.atkMax || filters.defMin || filters.defMax ||
                filters.archetype || filters.banlist || filters.cardset || filters.rarity ||
                filters.description.trim().length >= 2) {
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

            // Add new filter parameters
            if (filters.atkMin) {
                searchParams.atk_min = parseInt(filters.atkMin);
            }
            if (filters.atkMax) {
                searchParams.atk_max = parseInt(filters.atkMax);
            }
            if (filters.defMin) {
                searchParams.def_min = parseInt(filters.defMin);
            }
            if (filters.defMax) {
                searchParams.def_max = parseInt(filters.defMax);
            }
            if (filters.archetype) {
                searchParams.archetype = filters.archetype;
            }
            if (filters.banlist) {
                searchParams.banlist = filters.banlist;
            }
            if (filters.cardset) {
                searchParams.cardset = filters.cardset;
            }
            if (filters.rarity) {
                searchParams.rarity = filters.rarity;
            }
            if (filters.description.trim()) {
                searchParams.description = filters.description.trim();
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
            atkMin: '',
            atkMax: '',
            defMin: '',
            defMax: '',
            archetype: '',
            banlist: '',
            cardset: '',
            rarity: '',
            description: '',
        });
        setSearchResults([]);
        setHasSearched(false);
        setError(null);
    };

    const handleCardSelect = (card: Card) => {
        setSelectedCard(card);
        setQuantity(1);
    };

    const handleViewDetails = (card: Card) => {
        setDetailCard(card);
        setShowDetailModal(true);
    };

    const handleCloseDetailModal = () => {
        setShowDetailModal(false);
        setDetailCard(null);
    };

    const handleOpenBulkAdd = () => {
        setShowBulkAddModal(true);
    };

    const handleCloseBulkAdd = () => {
        setShowBulkAddModal(false);
    };

    const handleBulkAdd = async (cardEntries: { cardId: number; quantity: number }[]) => {
        for (const entry of cardEntries) {
            await onAddToBinder(entry.cardId, entry.quantity);
        }
        setShowBulkAddModal(false);
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
        'Fusion Monster', 'Synchro Monster', 'XYZ Monster', 'Link Monster', 'Ritual Monster',
        'Pendulum Effect Monster', 'Pendulum Normal Monster'
    ];

    // Attribute options
    const attributes = [
        'DARK', 'LIGHT', 'FIRE', 'WATER', 'EARTH', 'WIND', 'DIVINE'
    ];

    // Race options (comprehensive list)
    const races = [
        'Dragon', 'Spellcaster', 'Warrior', 'Beast', 'Machine', 'Fiend',
        'Zombie', 'Aqua', 'Insect', 'Plant', 'Rock', 'Thunder', 'Psychic',
        'Beast-Warrior', 'Winged Beast', 'Pyro', 'Dinosaur', 'Reptile',
        'Sea Serpent', 'Divine-Beast', 'Creator God', 'Wyrm', 'Cyberse'
    ];

    // Banlist status options
    const banlistOptions = [
        'Forbidden', 'Limited', 'Semi-Limited'
    ];

    // Rarity options
    const rarityOptions = [
        'Common', 'Rare', 'Super Rare', 'Ultra Rare', 'Secret Rare',
        'Ghost Rare', 'Ultimate Rare', 'Parallel Rare', 'Gold Rare',
        'Prismatic Secret Rare', 'Collector\'s Rare', 'Starlight Rare'
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
            <div className="space-y-6">
                {/* Basic Filters */}
                <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Basic Filters</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

                        {/* Description Search */}
                        <div>
                            <label htmlFor="card-description" className="block text-sm font-medium text-gray-700 mb-2">
                                Description
                            </label>
                            <input
                                id="card-description"
                                type="text"
                                value={filters.description}
                                onChange={(e) => handleFilterChange('description', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Search in card text..."
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
                    </div>
                </div>

                {/* Advanced Filters */}
                <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Advanced Filters</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* ATK Range */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                ATK Range
                            </label>
                            <div className="flex space-x-2">
                                <input
                                    type="number"
                                    value={filters.atkMin}
                                    onChange={(e) => handleFilterChange('atkMin', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Min ATK"
                                />
                                <input
                                    type="number"
                                    value={filters.atkMax}
                                    onChange={(e) => handleFilterChange('atkMax', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Max ATK"
                                />
                            </div>
                        </div>

                        {/* DEF Range */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                DEF Range
                            </label>
                            <div className="flex space-x-2">
                                <input
                                    type="number"
                                    value={filters.defMin}
                                    onChange={(e) => handleFilterChange('defMin', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Min DEF"
                                />
                                <input
                                    type="number"
                                    value={filters.defMax}
                                    onChange={(e) => handleFilterChange('defMax', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Max DEF"
                                />
                            </div>
                        </div>

                        {/* Archetype */}
                        <div>
                            <label htmlFor="card-archetype" className="block text-sm font-medium text-gray-700 mb-2">
                                Archetype
                            </label>
                            <input
                                id="card-archetype"
                                type="text"
                                value={filters.archetype}
                                onChange={(e) => handleFilterChange('archetype', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="e.g., Blue-Eyes, Dark Magician"
                            />
                        </div>

                        {/* Banlist Status */}
                        <div>
                            <label htmlFor="card-banlist" className="block text-sm font-medium text-gray-700 mb-2">
                                Banlist Status
                            </label>
                            <select
                                id="card-banlist"
                                value={filters.banlist}
                                onChange={(e) => handleFilterChange('banlist', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">All Cards</option>
                                {banlistOptions.map(status => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                        </div>

                        {/* Card Set */}
                        <div>
                            <label htmlFor="card-set" className="block text-sm font-medium text-gray-700 mb-2">
                                Card Set
                            </label>
                            <input
                                id="card-set"
                                type="text"
                                value={filters.cardset}
                                onChange={(e) => handleFilterChange('cardset', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="e.g., LOB, MRD, SDP"
                            />
                        </div>

                        {/* Rarity */}
                        <div>
                            <label htmlFor="card-rarity" className="block text-sm font-medium text-gray-700 mb-2">
                                Rarity
                            </label>
                            <select
                                id="card-rarity"
                                value={filters.rarity}
                                onChange={(e) => handleFilterChange('rarity', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">All Rarities</option>
                                {rarityOptions.map(rarity => (
                                    <option key={rarity} value={rarity}>{rarity}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Clear Filters */}
                <div className="flex justify-end">
                    <button
                        onClick={handleClearFilters}
                        className="px-6 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                        Clear All Filters
                    </button>
                </div>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="text-center py-8 mt-6">
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
                <div className={`border rounded-md p-4 mt-6 ${searchResults.length > 0
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
                <div className="mt-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900">
                            Search Results ({searchResults.length})
                        </h3>
                        {searchResults.length > 0 && selectedBinder && (
                            <button
                                onClick={handleOpenBulkAdd}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center space-x-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                <span>Bulk Add Cards</span>
                            </button>
                        )}
                    </div>

                    {searchResults.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-600">No cards found matching your search criteria.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {searchResults.map((card) => (
                                <div
                                    key={card.id}
                                    className="border rounded-lg p-4 hover:shadow-lg transition-shadow bg-white"
                                >
                                    {/* Card Image */}
                                    <div className="relative mb-3">
                                        {card.card_images && card.card_images[0] ? (
                                            <div className="relative group">
                                                <img
                                                    src={card.card_images[0].image_url_small}
                                                    alt={card.name}
                                                    className="w-full h-40 object-contain rounded-md cursor-pointer"
                                                    loading="lazy"
                                                    onClick={() => handleViewDetails(card)}
                                                />
                                                {/* Image overlay on hover */}
                                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-md flex items-center justify-center">
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="w-full h-40 bg-gray-200 rounded-md flex items-center justify-center">
                                                <span className="text-gray-500 text-sm">No Image</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Card Info */}
                                    <div className="space-y-2">
                                        <h4 className="font-medium text-gray-900 text-sm leading-tight line-clamp-2">
                                            {card.name}
                                        </h4>

                                        <div className="text-xs text-gray-600 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span>Type:</span>
                                                <span className="font-medium">{card.type}</span>
                                            </div>
                                            {card.race && (
                                                <div className="flex items-center justify-between">
                                                    <span>Race:</span>
                                                    <span className="font-medium">{card.race}</span>
                                                </div>
                                            )}
                                            {card.attribute && (
                                                <div className="flex items-center justify-between">
                                                    <span>Attribute:</span>
                                                    <span className="font-medium">{card.attribute}</span>
                                                </div>
                                            )}
                                            {card.level && (
                                                <div className="flex items-center justify-between">
                                                    <span>Level:</span>
                                                    <span className="font-medium">{card.level}</span>
                                                </div>
                                            )}
                                            {(card.atk !== undefined || card.def !== undefined) && (
                                                <div className="flex items-center justify-between">
                                                    <span>ATK/DEF:</span>
                                                    <span className="font-medium">
                                                        {card.atk !== undefined ? card.atk : '?'}/
                                                        {card.def !== undefined ? card.def : '?'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Binder Status */}
                                        {isCardInBinder(card.id) && (
                                            <div className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded">
                                                In binder (×{getCardQuantityInBinder(card.id)})
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="flex space-x-2 pt-2">
                                            <button
                                                onClick={() => handleViewDetails(card)}
                                                className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-200 text-xs font-medium transition-colors"
                                            >
                                                View Details
                                            </button>
                                            {selectedBinder && (
                                                <button
                                                    onClick={() => handleCardSelect(card)}
                                                    className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 text-xs font-medium transition-colors"
                                                    disabled={!selectedBinder}
                                                >
                                                    Add to Binder
                                                </button>
                                            )}
                                        </div>
                                    </div>
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

            {/* Card Detail Modal */}
            <CardDetailModal
                card={detailCard}
                isOpen={showDetailModal}
                onClose={handleCloseDetailModal}
                onAddToBinder={onAddToBinder}
                isCardInBinder={detailCard ? isCardInBinder(detailCard.id) : false}
                cardQuantityInBinder={detailCard ? getCardQuantityInBinder(detailCard.id) : 0}
                selectedBinder={selectedBinder}
            />

            {/* Bulk Add Modal */}
            <BulkAddModal
                cards={searchResults}
                selectedBinder={selectedBinder}
                isOpen={showBulkAddModal}
                onClose={handleCloseBulkAdd}
                onBulkAdd={handleBulkAdd}
                isAddingCards={isAddingCard}
            />
        </div>
    );
};

export default CardSearch;