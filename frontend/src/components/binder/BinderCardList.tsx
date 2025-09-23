import React, { useState } from 'react';
import type { Binder, BinderCard, DeckCard } from '../../types';
import AdvancedFilterSidebar, { type AdvancedFilterOptions } from '../common/AdvancedFilterSidebar';
import QuickFilterChips from '../common/QuickFilterChips';
import AdvancedSearchModal from '../common/AdvancedSearchModal';
import FilterPresetManager from '../common/FilterPresetManager';
import ViewModeToggle, { type ViewMode } from '../common/ViewModeToggle';
import CardGridView from '../common/CardGridView';
import CardListView from '../common/CardListView';
import CardTableView from '../common/CardTableView';

interface BinderCardListProps {
    binder: Binder;
    onCardClick?: (cardId: number) => void;
    showQuantities?: boolean;
    allowEditing?: boolean;
    title?: string;
    currentDeck?: { mainDeck: DeckCard[]; extraDeck: DeckCard[]; sideDeck: DeckCard[] };
}

import React, { useState } from 'react';
import type { Binder, BinderCard, DeckCard } from '../../types';
import AdvancedFilterSidebar, { type AdvancedFilterOptions } from '../common/AdvancedFilterSidebar';
import QuickFilterChips from '../common/QuickFilterChips';
import AdvancedSearchModal from '../common/AdvancedSearchModal';
import FilterPresetManager from '../common/FilterPresetManager';
import ViewModeToggle, { type ViewMode } from '../common/ViewModeToggle';
import CardGridView from '../common/CardGridView';
import CardListView from '../common/CardListView';
import CardTableView from '../common/CardTableView';

interface BinderCardListProps {
    binder: Binder;
    onCardClick?: (cardId: number) => void;
    showQuantities?: boolean;
    allowEditing?: boolean;
    title?: string;
    currentDeck?: { mainDeck: DeckCard[]; extraDeck: DeckCard[]; sideDeck: DeckCard[] };
}

const BinderCardList: React.FC<BinderCardListProps> = ({
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
        rarity: '',
        setCode: '',
        minAttack: '',
        maxAttack: '',
        minDefense: '',
        maxDefense: '',
        onlyAvailable: false,
        selectedBinders: [],
        banListStatus: '',
        tags: [],
        customFilters: []
    });

    // Legacy sorting for backwards compatibility
    const [sortBy, setSortBy] = useState<'name' | 'type' | 'quantity'>('name');

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
        const availableFromBinder = card.quantity - usedInDeck;

        // Apply Yu-Gi-Oh 3-copy rule: can't exceed 3 total copies in deck
        const remainingUnder3CopyRule = Math.max(0, 3 - usedInDeck);

        // Return the minimum of available from binder and what's allowed by 3-copy rule
        return Math.min(availableFromBinder, remainingUnder3CopyRule);
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

            // Rarity
            if (filterOptions.rarity && card.rarity) {
                if (card.rarity !== filterOptions.rarity) return false;
            }

            // Set code
            if (filterOptions.setCode && card.setCode) {
                if (!card.setCode.toLowerCase().includes(filterOptions.setCode.toLowerCase())) return false;
            }

            // ATK range
            if (filterOptions.minAttack && cardDetails.atk !== null) {
                if (cardDetails.atk < parseInt(filterOptions.minAttack)) return false;
            }
            if (filterOptions.maxAttack && cardDetails.atk !== null) {
                if (cardDetails.atk > parseInt(filterOptions.maxAttack)) return false;
            }

            // DEF range
            if (filterOptions.minDefense && cardDetails.def !== null) {
                if (cardDetails.def < parseInt(filterOptions.minDefense)) return false;
            }
            if (filterOptions.maxDefense && cardDetails.def !== null) {
                if (cardDetails.def > parseInt(filterOptions.maxDefense)) return false;
            }

            // Only available for deck building
            if (filterOptions.onlyAvailable && currentDeck) {
                if (getAvailableCopies(card) <= 0) return false;
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

    const totalCards = binder.cards.reduce((sum, card) => sum + card.quantity, 0);
    const uniqueCards = binder.cards.length;
    const filteredTotal = filteredCards.reduce((sum, card) => sum + card.quantity, 0);

    // Handle filter updates
    const handleFilterChange = (newFilters: AdvancedFilterOptions) => {
        setFilters(newFilters);
    };

    // Handle quick filter application
    const handleQuickFilter = (filterName: string, isActive: boolean) => {
        switch (filterName) {
            case 'only-available':
                setFilters(prev => ({ ...prev, onlyAvailable: isActive }));
                break;
            case 'monsters':
                setFilters(prev => ({
                    ...prev,
                    cardTypes: isActive
                        ? ['Normal Monster', 'Effect Monster', 'Fusion Monster', 'Synchro Monster', 'Xyz Monster', 'Link Monster']
                        : []
                }));
                break;
            case 'spells':
                setFilters(prev => ({
                    ...prev,
                    cardTypes: isActive ? ['Spell Card'] : []
                }));
                break;
            case 'traps':
                setFilters(prev => ({
                    ...prev,
                    cardTypes: isActive ? ['Trap Card'] : []
                }));
                break;
        }
    };

    // Clear all filters
    const clearFilters = () => {
        setFilters({
            searchTerm: '',
            cardTypes: [],
            attributes: [],
            levels: [],
            races: [],
            archetype: '',
            rarity: '',
            setCode: '',
            minAttack: '',
            maxAttack: '',
            minDefense: '',
            maxDefense: '',
            onlyAvailable: false,
            selectedBinders: [],
            banListStatus: '',
            tags: [],
            customFilters: []
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
        if (filters.rarity) count++;
        if (filters.setCode) count++;
        if (filters.minAttack || filters.maxAttack) count++;
        if (filters.minDefense || filters.maxDefense) count++;
        if (filters.onlyAvailable) count++;
        if (filters.banListStatus) count++;
        if (filters.tags.length > 0) count++;
        return count;
    };

    // Prepare cards for display components
    const cardsForDisplay = filteredCards.map(card => ({
        id: card.cardId,
        name: card.card_details?.name || `Card ${card.cardId}`,
        type: card.card_details?.type || '',
        race: card.card_details?.race,
        attribute: card.card_details?.attribute,
        level: card.card_details?.level,
        atk: card.card_details?.atk,
        def: card.card_details?.def,
        imageUrl: card.card_details?.card_images?.[0]?.image_url_small || card.card_details?.card_images?.[0]?.image_url,
        quantity: card.quantity,
        availableCopies: getAvailableCopies(card),
        usedInDeck: getCardUsageInDeck(card.cardId),
        setCode: card.setCode,
        rarity: card.rarity,
        condition: card.condition,
        notes: card.notes,
        onClick: onCardClick ? () => onCardClick(card.cardId) : undefined,
        isAvailable: getAvailableCopies(card) > 0
    }));

    return (
        <div className="bg-white rounded-lg shadow-lg h-full flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                    <div className="text-sm text-gray-600">
                        {filteredCards.length} of {uniqueCards} unique ({filteredTotal} of {totalCards} total)
                    </div>
                </div>

                {/* Top Controls */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
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
                    <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
                </div>

                {/* Quick Filter Chips */}
                <QuickFilterChips
                    onFilterToggle={handleQuickFilter}
                    onClearAll={clearFilters}
                    activeFilters={getActiveFilterCount()}
                />

                {/* Basic Search for backwards compatibility */}
                <div className="mt-4">
                    <input
                        type="text"
                        placeholder="Search cards..."
                        value={filters.searchTerm}
                        onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Advanced Filter Sidebar */}
                {showAdvancedFilters && (
                    <div className="flex-shrink-0 w-80 border-r border-gray-200">
                        <AdvancedFilterSidebar
                            filters={filters}
                            onFiltersChange={handleFilterChange}
                            availableBinders={[binder]}
                        />
                    </div>
                )}

                {/* Card Display Area */}
                <div className="flex-1 overflow-hidden">
                    {filteredCards.length === 0 ? (
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
                        <div className="h-full">
                            {viewMode === 'grid' && (
                                <CardGridView
                                    cards={cardsForDisplay}
                                    showQuantities={showQuantities}
                                    showDeckInfo={!!currentDeck}
                                />
                            )}
                            {viewMode === 'list' && (
                                <CardListView
                                    cards={cardsForDisplay}
                                    showQuantities={showQuantities}
                                    showDeckInfo={!!currentDeck}
                                />
                            )}
                            {viewMode === 'table' && (
                                <CardTableView
                                    cards={cardsForDisplay}
                                    showQuantities={showQuantities}
                                    showDeckInfo={!!currentDeck}
                                />
                            )}
                            {viewMode === 'stacked' && (
                                <CardGridView
                                    cards={cardsForDisplay}
                                    showQuantities={showQuantities}
                                    showDeckInfo={!!currentDeck}
                                    variant="stacked"
                                />
                            )}
                        </div>
                    )}
                </div>
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

export default BinderCardList;

export default BinderCardList;