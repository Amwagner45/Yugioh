import React, { useState } from 'react';
import type { Binder, BinderCard, DeckCard } from '../../types';
import AdvancedFilterSidebar, { type AdvancedFilterOptions } from '../common/AdvancedFilterSidebar';
import QuickFilterChips from '../common/QuickFilterChips';
import AdvancedSearchModal from '../common/AdvancedSearchModal';
import FilterPresetManager from '../common/FilterPresetManager';
import ViewModeToggle, { type ViewMode } from '../common/ViewModeToggle';
import CardDetailModal from '../common/CardDetailModal';
import EnhancedCardContextMenu from '../common/EnhancedCardContextMenu';
import { SORT_OPTIONS, type SortOption } from '../../utils/cardSorting';

interface EnhancedBinderCardListProps {
    binder: Binder;
    onCardClick?: (cardId: number) => void;
    onAddToSection?: (cardId: number, section: 'main' | 'extra' | 'side', quantity?: number) => void;
    showQuantities?: boolean;
    allowEditing?: boolean;
    title?: string;
    currentDeck?: { mainDeck: DeckCard[]; extraDeck: DeckCard[]; sideDeck: DeckCard[] };
    compact?: boolean; // For sidebar usage
    // For handling cards dropped from deck sections
    onRemoveFromDeck?: (cardId: number, section: 'main' | 'extra' | 'side', quantity?: number) => void;
}

const EnhancedBinderCardList: React.FC<EnhancedBinderCardListProps> = ({
    binder,
    onCardClick,
    onAddToSection,
    showQuantities = true,
    title = "Cards",
    currentDeck,
    compact = false,
    onRemoveFromDeck
}) => {
    // View and display state
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
    const [showPresetManager, setShowPresetManager] = useState(false);
    const [gridSize, setGridSize] = useState<3 | 4 | 5>(compact ? 4 : 3);

    // Drag and drop state
    const [isDragOver, setIsDragOver] = useState(false);

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
    const [sortBy, setSortBy] = useState<SortOption>('type-rank-name');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [cardsPerPage] = useState(15); // 3 wide x 5 rows = 15 cards per page

    // Card detail modal state
    const [selectedCard, setSelectedCard] = useState<BinderCard | null>(null);
    const [showCardModal, setShowCardModal] = useState(false);

    // Context menu state
    const [contextMenu, setContextMenu] = useState<{
        isOpen: boolean;
        position: { x: number; y: number };
        cardId: number | null;
    }>({
        isOpen: false,
        position: { x: 0, y: 0 },
        cardId: null
    });

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

    // Helper functions for individual deck sections
    const getCardUsageInMain = (cardId: number) => {
        if (!currentDeck) return 0;
        return currentDeck.mainDeck
            .filter(card => card.cardId === cardId)
            .reduce((sum, card) => sum + card.quantity, 0);
    };

    const getCardUsageInExtra = (cardId: number) => {
        if (!currentDeck) return 0;
        return currentDeck.extraDeck
            .filter(card => card.cardId === cardId)
            .reduce((sum, card) => sum + card.quantity, 0);
    };

    const getCardUsageInSide = (cardId: number) => {
        if (!currentDeck) return 0;
        return currentDeck.sideDeck
            .filter(card => card.cardId === cardId)
            .reduce((sum, card) => sum + card.quantity, 0);
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
    const filteredCards = applyFilters(binder.cards, filters);

    // Apply sorting using the new sorting system
    const sortedCards = SORT_OPTIONS[sortBy].sortFunction(filteredCards);

    const uniqueCards = binder.cards.length;

    // Pagination calculations
    const totalPages = Math.ceil(sortedCards.length / cardsPerPage);
    const startIndex = (currentPage - 1) * cardsPerPage;
    const endIndex = startIndex + cardsPerPage;
    const currentPageCards = sortedCards.slice(startIndex, endIndex);

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

    // Handle card detail modal
    const handleCardClick = (card: BinderCard) => {
        setSelectedCard(card);
        setShowCardModal(true);
    };

    const handleCardRightClick = (e: React.MouseEvent, card: BinderCard) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({
            isOpen: true,
            position: { x: e.clientX, y: e.clientY },
            cardId: card.cardId
        });
    };

    const handleCloseModal = () => {
        setShowCardModal(false);
        setSelectedCard(null);
    };

    // Drag and drop handlers for receiving cards from deck sections
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        const types = e.dataTransfer.types;
        if (types.includes('application/json')) {
            e.dataTransfer.dropEffect = 'move';
            setIsDragOver(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        const relatedTarget = e.relatedTarget as Element;
        const currentTarget = e.currentTarget as Element;
        if (relatedTarget && currentTarget.contains(relatedTarget)) {
            return;
        }
        setIsDragOver(false);
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        try {
            const dataString = e.dataTransfer.getData('application/json');
            const data = JSON.parse(dataString);

            // Only handle cards dropped from deck sections
            if (data.type === 'deck-card' && data.cardId && data.sectionType && onRemoveFromDeck) {
                onRemoveFromDeck(data.cardId, data.sectionType, 1);
            }
        } catch (error) {
            console.error('Invalid drag data:', error);
        }
    };

    return (
        <div
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg h-full flex flex-col transition-all ${isDragOver ? 'ring-4 ring-blue-500 ring-opacity-50 bg-blue-50 dark:bg-blue-900/20' : ''}`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Header */}
            <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        {sortedCards.length} of {uniqueCards} cards
                    </div>
                </div>

                {/* Top Controls */}
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div className="flex items-center flex-wrap gap-2">
                        {/* Filter Toggle */}
                        <button
                            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                            className={`px-3 py-2 rounded-lg transition-colors flex items-center space-x-2 ${showAdvancedFilters || getActiveFilterCount() > 0
                                ? 'bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700'
                                : 'bg-gray-100 text-gray-700 border border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
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
                            className="px-3 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <span>Advanced</span>
                        </button>

                        {/* Presets */}
                        <button
                            onClick={() => setShowPresetManager(true)}
                            className="px-3 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
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

                    {/* View Controls */}
                    <div className="flex items-center space-x-2">
                        {/* Grid Size Controls */}
                        <div className="flex items-center space-x-1 border border-gray-300 dark:border-gray-600 rounded p-1 bg-white dark:bg-gray-700">
                            <button
                                onClick={() => setGridSize(3)}
                                className={`px-2 py-1 text-xs rounded ${gridSize === 3 ? 'bg-blue-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
                                title="3x3 Grid"
                            >
                                3×3
                            </button>
                            <button
                                onClick={() => setGridSize(4)}
                                className={`px-2 py-1 text-xs rounded ${gridSize === 4 ? 'bg-blue-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
                                title="4x4 Grid"
                            >
                                4×4
                            </button>
                            <button
                                onClick={() => setGridSize(5)}
                                className={`px-2 py-1 text-xs rounded ${gridSize === 5 ? 'bg-blue-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
                                title="5x5 Grid"
                            >
                                5×5
                            </button>
                        </div>

                        {/* View Mode Toggle */}
                        <ViewModeToggle
                            currentMode={viewMode}
                            onModeChange={setViewMode}
                        />
                    </div>
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
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    />
                </div>

                {/* Sort Options */}
                <div className="mt-3">
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                        {Object.entries(SORT_OPTIONS).map(([key, option]) => (
                            <option key={key} value={key} title={option.description}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="mt-4 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                        <div className="flex items-center justify-center space-x-2">
                            <button
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 text-sm dark:text-gray-300"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                <span>Prev</span>
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
                                            className={`w-7 h-7 rounded flex items-center justify-center text-sm ${currentPage === pageNum
                                                ? 'bg-blue-600 text-white dark:bg-blue-500'
                                                : 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
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
                                className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 text-sm dark:text-gray-300"
                            >
                                <span>Next</span>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}

                {/* Pagination Info */}
                {totalPages > 1 && (
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 text-center">
                        Page {currentPage} of {totalPages} • Showing {startIndex + 1}-{Math.min(endIndex, sortedCards.length)} of {sortedCards.length} cards
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

            {/* Drag overlay indicator */}
            {isDragOver && (
                <div className="flex-shrink-0 p-4 text-center bg-blue-100 border-b border-blue-200">
                    <div className="text-blue-600 font-medium">
                        Drop card here to remove from deck
                    </div>
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
                        {/* Card Grid - Dynamic grid size */}
                        <div className="flex-1 p-3 overflow-y-auto">
                            <div className={`grid gap-2 ${gridSize === 3 ? 'grid-cols-3' : gridSize === 4 ? 'grid-cols-4' : 'grid-cols-5'}`}>
                                {currentPageCards.map((card, index) => (
                                    <BinderCardItem
                                        key={`${card.cardId}-${card.setCode || 'noset'}-${card.rarity || 'norarity'}-${index}`}
                                        card={card}
                                        onClick={() => handleCardClick(card)}
                                        onRightClick={(e, card) => handleCardRightClick(e, card)}
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

            {/* Card Detail Modal */}
            {selectedCard && (
                <CardDetailModal
                    card={selectedCard.card_details ? {
                        id: selectedCard.cardId,
                        name: selectedCard.card_details.name,
                        type: selectedCard.card_details.type,
                        race: selectedCard.card_details.race,
                        attribute: selectedCard.card_details.attribute,
                        level: selectedCard.card_details.level,
                        atk: selectedCard.card_details.atk,
                        def: selectedCard.card_details.def,
                        scale: selectedCard.card_details.scale,
                        desc: selectedCard.card_details.desc,
                        card_sets: selectedCard.card_details.card_sets,
                        card_images: selectedCard.card_details.card_images,
                        banlist_info: selectedCard.card_details.banlist_info
                    } : null}
                    isOpen={showCardModal}
                    onClose={handleCloseModal}
                />
            )}

            {/* Enhanced Context Menu */}
            {contextMenu.cardId && (
                <EnhancedCardContextMenu
                    isOpen={contextMenu.isOpen}
                    onClose={() => setContextMenu({ ...contextMenu, isOpen: false })}
                    position={contextMenu.position}
                    cardId={contextMenu.cardId}
                    cardDetails={binder.cards.find(c => c.cardId === contextMenu.cardId)?.card_details}
                    currentLocation="binder"
                    quantityInLocation={0}
                    quantityInBinder={binder.cards.find(c => c.cardId === contextMenu.cardId)?.quantity || 0}
                    quantityInMain={contextMenu.cardId ? getCardUsageInMain(contextMenu.cardId) : 0}
                    quantityInExtra={contextMenu.cardId ? getCardUsageInExtra(contextMenu.cardId) : 0}
                    quantityInSide={contextMenu.cardId ? getCardUsageInSide(contextMenu.cardId) : 0}
                    availableCopies={binder.cards.find(c => c.cardId === contextMenu.cardId) ? getAvailableCopies(binder.cards.find(c => c.cardId === contextMenu.cardId)!) : 0}
                    onAddToSection={onAddToSection}
                    onCardPreview={onCardClick}
                />
            )}
        </div>
    );
};

// Individual card item component for display
interface BinderCardItemProps {
    card: BinderCard;
    onClick?: () => void; // Left click - show card details
    onRightClick?: (e: React.MouseEvent, card: BinderCard) => void; // Right click - context menu
    showQuantity?: boolean;
    availableCopies?: number;
    usedInDeck?: number;
    showDeckInfo?: boolean;
}

const BinderCardItem: React.FC<BinderCardItemProps> = ({
    card,
    onClick,
    onRightClick,
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

    const handleLeftClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (onClick) {
            onClick();
        }
    };

    const handleRightClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (onRightClick && isAvailable) {
            onRightClick(e, card);
        }
    };

    return (
        <div
            className={`relative bg-white rounded-lg border-2 transition-all duration-200 ${onClick || onRightClick
                ? 'border-gray-200 hover:border-blue-300 hover:shadow-lg cursor-pointer'
                : 'border-gray-200'
                }`}
            onClick={handleLeftClick}
            onContextMenu={handleRightClick}
            draggable={isAvailable}
            onDragStart={handleDragStart}
            style={{ cursor: 'pointer' }}
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
                <div className="absolute top-1 right-1">
                    <span className="bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full shadow-lg">
                        {card.quantity}
                    </span>
                </div>
            )}

            {/* Deck Usage Badge - Top Left */}
            {showDeckInfo && usedInDeck > 0 && (
                <div className="absolute top-1 left-1">
                    <span className="bg-orange-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full shadow-lg">
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