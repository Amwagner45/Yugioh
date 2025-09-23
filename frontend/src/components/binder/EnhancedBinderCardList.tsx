import React, { useState } from 'react';
import type { Binder, BinderCard, DeckCard } from '../../types';
import AdvancedFilterSidebar, { type AdvancedFilterOptions } from '../common/AdvancedFilterSidebar';
import QuickFilterChips from '../common/QuickFilterChips';
import AdvancedSearchModal from '../common/AdvancedSearchModal';
import FilterPresetManager from '../common/FilterPresetManager';
import ViewModeToggle, { type ViewMode } from '../common/ViewModeToggle';

interface EnhancedBinderCardListProps {
    binder: Binder;
    onCardClick?: (cardId: number) => void;
    showQuantities?: boolean;
    allowEditing?: boolean;
    title?: string;
    currentDeck?: { mainDeck: DeckCard[]; extraDeck: DeckCard[]; sideDeck: DeckCard[] };
}

const EnhancedBinderCardList: React.FC<EnhancedBinderCardListProps> = ({
    binder,
    onCardClick,
    showQuantities = true,
    title = "Cards",
    currentDeck
}) => {
    // View and display state
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
    const [showPresetManager, setShowPresetManager] = useState(false);

    // Filter state
    const [filters, setFilters] = useState<AdvancedFilterOptions>({
        searchTerm: '',
        cardTypes: [],
        attributes: [],
        levels: [],
        races: [],
        archetype: '',
        atkRange: { min: '', max: '' },
        defRange: { min: '', max: '' },
        rarities: [],
        setCodes: [],
        tags: [],
        banListStatus: []
    });

    // Legacy sorting for backwards compatibility
    const [sortBy, setSortBy] = useState<'name' | 'type' | 'quantity'>('name');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [cardsPerPage] = useState(15); // 3 wide x 5 rows = 15 cards per page

    // Helper function to get how many copies of a card are used in current deck
    const getCardUsageInDeck = (cardId: number) => {
        if (!currentDeck) return 0;
        const allDeckCards = [...currentDeck.mainDeck, ...currentDeck.extraDeck, ...currentDeck.sideDeck];
        return allDeckCards
            .filter(card => card.cardId === cardId)
            .reduce((sum, card) => sum + card.quantity, 0);
    };

    // Helper function to get available copies for deck building
    const getAvailableCopies = (card: BinderCard) => {
        if (!currentDeck) return card.quantity;
        const usedInDeck = getCardUsageInDeck(card.cardId);
        return card.quantity - usedInDeck;
    };

    // Apply filters to cards
    const applyFilters = (cards: BinderCard[], filterOptions: AdvancedFilterOptions): BinderCard[] => {
        return cards.filter(card => {
            const cardDetails = card.card_details;
            if (!cardDetails) return false;

            // Search term
            if (filterOptions.searchTerm) {
                const searchLower = filterOptions.searchTerm.toLowerCase();
                const matches = (
                    cardDetails.name.toLowerCase().includes(searchLower) ||
                    cardDetails.type.toLowerCase().includes(searchLower) ||
                    (cardDetails.race && cardDetails.race.toLowerCase().includes(searchLower)) ||
                    (cardDetails.attribute && cardDetails.attribute.toLowerCase().includes(searchLower)) ||
                    (cardDetails.archetype && cardDetails.archetype.toLowerCase().includes(searchLower)) ||
                    card.setCode?.toLowerCase().includes(searchLower) ||
                    card.rarity?.toLowerCase().includes(searchLower)
                );
                if (!matches) return false;
            }

            // Card types
            if (filterOptions.cardTypes.length > 0) {
                if (!filterOptions.cardTypes.includes(cardDetails.type)) return false;
            }

            // Attributes
            if (filterOptions.attributes.length > 0 && cardDetails.attribute) {
                if (!filterOptions.attributes.includes(cardDetails.attribute)) return false;
            }

            // Levels
            if (filterOptions.levels.length > 0 && cardDetails.level) {
                if (!filterOptions.levels.includes(cardDetails.level)) return false;
            }

            // Races
            if (filterOptions.races.length > 0 && cardDetails.race) {
                if (!filterOptions.races.includes(cardDetails.race)) return false;
            }

            // Archetype
            if (filterOptions.archetype && cardDetails.archetype) {
                if (!cardDetails.archetype.toLowerCase().includes(filterOptions.archetype.toLowerCase())) return false;
            }

            // Rarities
            if (filterOptions.rarities.length > 0 && card.rarity) {
                if (!filterOptions.rarities.includes(card.rarity)) return false;
            }

            // Set codes
            if (filterOptions.setCodes.length > 0 && card.setCode) {
                if (!filterOptions.setCodes.some(setCode =>
                    card.setCode?.toLowerCase().includes(setCode.toLowerCase())
                )) return false;
            }

            // ATK range
            if (filterOptions.atkRange.min && cardDetails.atk !== undefined && cardDetails.atk !== null) {
                if (cardDetails.atk < parseInt(filterOptions.atkRange.min)) return false;
            }
            if (filterOptions.atkRange.max && cardDetails.atk !== undefined && cardDetails.atk !== null) {
                if (cardDetails.atk > parseInt(filterOptions.atkRange.max)) return false;
            }

            // DEF range
            if (filterOptions.defRange.min && cardDetails.def !== undefined && cardDetails.def !== null) {
                if (cardDetails.def < parseInt(filterOptions.defRange.min)) return false;
            }
            if (filterOptions.defRange.max && cardDetails.def !== undefined && cardDetails.def !== null) {
                if (cardDetails.def > parseInt(filterOptions.defRange.max)) return false;
            }

            // Ban list status
            if (filterOptions.banListStatus.length > 0) {
                // This would need to be implemented based on your ban list data structure
                // For now, we'll skip this filter
            }

            // Tags
            if (filterOptions.tags.length > 0) {
                // This would need to be implemented based on your card tagging system
                // For now, we'll skip this filter
            }

            return true;
        });
    };

    // Filter and sort cards
    const filteredCards = applyFilters(binder.cards, filters)
        .sort((a, b) => {
            switch (sortBy) {
                case 'quantity':
                    return b.quantity - a.quantity;
                case 'type':
                    if (a.card_details && b.card_details) {
                        return a.card_details.type.localeCompare(b.card_details.type);
                    }
                    return 0;
                case 'name':
                default:
                    if (a.card_details && b.card_details) {
                        return a.card_details.name.localeCompare(b.card_details.name);
                    }
                    return a.cardId - b.cardId;
            }
        });

    const uniqueCards = binder.cards.length;

    // Pagination calculations
    const totalPages = Math.ceil(filteredCards.length / cardsPerPage);
    const startIndex = (currentPage - 1) * cardsPerPage;
    const endIndex = startIndex + cardsPerPage;
    const currentPageCards = filteredCards.slice(startIndex, endIndex);

    // Reset to page 1 when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [filters, sortBy]);

    // Handle filter updates
    const handleFilterChange = (newFilters: AdvancedFilterOptions) => {
        setFilters(newFilters);
    };    // Clear all filters
    const clearFilters = () => {
        setFilters({
            searchTerm: '',
            cardTypes: [],
            attributes: [],
            levels: [],
            races: [],
            archetype: '',
            atkRange: { min: '', max: '' },
            defRange: { min: '', max: '' },
            rarities: [],
            setCodes: [],
            tags: [],
            banListStatus: []
        });
    };

    // Get active filter count
    const getActiveFilterCount = () => {
        let count = 0;
        if (filters.searchTerm) count++;
        if (filters.cardTypes.length > 0) count++;
        if (filters.attributes.length > 0) count++;
        if (filters.levels.length > 0) count++;
        if (filters.races.length > 0) count++;
        if (filters.archetype) count++;
        if (filters.rarities.length > 0) count++;
        if (filters.setCodes.length > 0) count++;
        if (filters.atkRange.min || filters.atkRange.max) count++;
        if (filters.defRange.min || filters.defRange.max) count++;
        if (filters.banListStatus.length > 0) count++;
        if (filters.tags.length > 0) count++;
        return count;
    };

    return (
        <div className="bg-white rounded-lg shadow-lg h-full flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                    <div className="text-sm text-gray-600">
                        {filteredCards.length} of {uniqueCards} cards
                    </div>
                </div>

                {/* Top Controls */}
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div className="flex items-center flex-wrap gap-2">
                        {/* Filter Toggle */}
                        <button
                            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                            className={`px-3 py-2 rounded-lg transition-colors flex items-center space-x-2 ${showAdvancedFilters || getActiveFilterCount() > 0
                                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                : 'bg-gray-100 text-gray-700 border border-gray-300'
                                }`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                            <span>Filters</span>
                            {getActiveFilterCount() > 0 && (
                                <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                    {getActiveFilterCount()}
                                </span>
                            )}
                        </button>

                        {/* Advanced Search */}
                        <button
                            onClick={() => setShowAdvancedSearch(true)}
                            className="px-3 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <span>Advanced</span>
                        </button>

                        {/* Presets */}
                        <button
                            onClick={() => setShowPresetManager(true)}
                            className="px-3 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                            <span>Presets</span>
                        </button>

                        {/* Clear Filters */}
                        {getActiveFilterCount() > 0 && (
                            <button
                                onClick={clearFilters}
                                className="px-3 py-2 bg-red-100 text-red-700 border border-red-300 rounded-lg hover:bg-red-200 transition-colors text-sm"
                            >
                                Clear All
                            </button>
                        )}
                    </div>

                    {/* View Mode Toggle */}
                    <ViewModeToggle
                        currentMode={viewMode}
                        onModeChange={setViewMode}
                    />
                </div>

                {/* Quick Filter Chips */}
                <QuickFilterChips
                    filters={filters}
                    onFiltersChange={handleFilterChange}
                />

                {/* Basic Search for backwards compatibility */}
                <div className="mt-4">
                    <input
                        type="text"
                        placeholder="Search cards..."
                        value={filters.searchTerm}
                        onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                    />
                </div>

                {/* Sort Options */}
                <div className="mt-3">
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'name' | 'type' | 'quantity')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="name">Sort by Name</option>
                        <option value="type">Sort by Type</option>
                        <option value="quantity">Sort by Quantity</option>
                    </select>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-sm"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <span>Previous</span>
                        </button>

                        <div className="flex items-center space-x-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${currentPage === pageNum
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-sm"
                        >
                            <span>Next</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Pagination Info */}
                {totalPages > 1 && (
                    <div className="mt-2 text-sm text-gray-600 text-center">
                        Page {currentPage} of {totalPages} • Showing {startIndex + 1}-{Math.min(endIndex, filteredCards.length)} of {filteredCards.length} cards
                    </div>
                )}
            </div>

            {/* Advanced Filter Sidebar */}
            {showAdvancedFilters && (
                <div className="flex-shrink-0 border-b border-gray-200">
                    <AdvancedFilterSidebar
                        binders={[binder]}
                        selectedBinderId={binder.id.toString()}
                        cards={binder.cards}
                        filters={filters}
                        onFiltersChange={handleFilterChange}
                        onResetFilters={clearFilters}
                    />
                </div>
            )}

            {/* Card Display Area */}
            <div className="flex-1 overflow-hidden">
                {currentPageCards.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                            <div className="text-4xl mb-2">📋</div>
                            <p>No cards found</p>
                            {getActiveFilterCount() > 0 ? (
                                <p className="text-sm">Try adjusting your filters</p>
                            ) : filters.searchTerm ? (
                                <p className="text-sm">Try adjusting your search terms</p>
                            ) : (
                                <p className="text-sm">This binder is empty</p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col">
                        {/* Card Grid - 3 wide FaBrary style */}
                        <div className="flex-1 p-4 overflow-y-auto">
                            <div className="grid grid-cols-3 gap-4">
                                {currentPageCards.map((card, index) => (
                                    <BinderCardItem
                                        key={`${card.cardId}-${card.setCode || 'noset'}-${card.rarity || 'norarity'}-${index}`}
                                        card={card}
                                        onClick={onCardClick ? () => onCardClick(card.cardId) : undefined}
                                        showQuantity={showQuantities}
                                        availableCopies={getAvailableCopies(card)}
                                        usedInDeck={getCardUsageInDeck(card.cardId)}
                                        showDeckInfo={!!currentDeck}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <AdvancedSearchModal
                isOpen={showAdvancedSearch}
                onClose={() => setShowAdvancedSearch(false)}
                onApplySearch={handleFilterChange}
                currentFilters={filters}
            />

            <FilterPresetManager
                isOpen={showPresetManager}
                onClose={() => setShowPresetManager(false)}
                onApplyPreset={handleFilterChange}
                currentFilters={filters}
            />
        </div>
    );
};

// Individual card item component for display
interface BinderCardItemProps {
    card: BinderCard;
    onClick?: () => void;
    showQuantity?: boolean;
    availableCopies?: number;
    usedInDeck?: number;
    showDeckInfo?: boolean;
}

const BinderCardItem: React.FC<BinderCardItemProps> = ({
    card,
    onClick,
    showQuantity = true,
    availableCopies = 0,
    usedInDeck = 0,
    showDeckInfo = false
}) => {
    const isAvailable = availableCopies > 0;
    const cardDetails = card.card_details;

    const handleDragStart = (e: React.DragEvent) => {
        if (!isAvailable) {
            e.preventDefault();
            return;
        }

        const dragData = {
            cardId: card.cardId,
            type: 'binder-card'
        };
        e.dataTransfer.setData('application/json', JSON.stringify(dragData));
        e.dataTransfer.effectAllowed = 'copy';
    };

    return (
        <div
            className={`relative bg-white rounded-lg border-2 transition-all duration-200 ${onClick
                ? isAvailable
                    ? 'border-gray-200 hover:border-blue-300 hover:shadow-lg cursor-pointer'
                    : 'border-red-200 cursor-not-allowed opacity-75'
                : 'border-gray-200'
                }`}
            onClick={isAvailable ? onClick : undefined}
            draggable={isAvailable}
            onDragStart={handleDragStart}
            style={{ cursor: isAvailable ? (onClick ? 'pointer' : 'grab') : 'not-allowed' }}
        >
            {/* Card Image */}
            {cardDetails?.card_images?.[0] && (
                <div className="aspect-[59/86] w-full">
                    <img
                        src={cardDetails.card_images[0].image_url_small || cardDetails.card_images[0].image_url}
                        alt={cardDetails.name}
                        className="w-full h-full object-cover rounded-lg"
                        onError={(e) => {
                            if (cardDetails?.card_images?.[0]) {
                                (e.target as HTMLImageElement).src = cardDetails.card_images[0].image_url;
                            }
                        }}
                    />
                </div>
            )}

            {/* Quantity Badge - Top Right */}
            {showQuantity && (
                <div className="absolute top-2 right-2">
                    <span className="bg-blue-600 text-white text-sm font-bold px-2 py-1 rounded-full shadow-lg">
                        {card.quantity}
                    </span>
                </div>
            )}

            {/* Deck Usage Badge - Top Left */}
            {showDeckInfo && usedInDeck > 0 && (
                <div className="absolute top-2 left-2">
                    <span className="bg-orange-600 text-white text-sm font-bold px-2 py-1 rounded-full shadow-lg">
                        {usedInDeck}
                    </span>
                </div>
            )}

            {/* Availability indicator for deck building */}
            {showDeckInfo && !isAvailable && (
                <div className="absolute inset-0 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <div className="bg-red-600 text-white px-2 py-1 rounded text-sm font-medium">
                        No copies available
                    </div>
                </div>
            )}
        </div>
    );
};

export default EnhancedBinderCardList;