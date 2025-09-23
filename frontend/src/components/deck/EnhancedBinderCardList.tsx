import React, { useState, useMemo } from 'react';
import type { Binder, BinderCard, DeckCard } from '../../types';
import BinderFilters from '../binder/BinderFilters';
import type { BinderFilterOptions, BinderSortOption } from '../binder/BinderFilters';
import CardContextMenu from '../common/CardContextMenu';
import CardGridView from '../common/CardGridView';
import CardListView from '../common/CardListView';
import CardTableView from '../common/CardTableView';
import ViewModeToggle from '../common/ViewModeToggle';
import type { ViewMode } from '../common/ViewModeToggle';

interface EnhancedBinderCardListProps {
    binder: Binder;
    onCardClick?: (cardId: number) => void;
    onAddToSection?: (cardId: number, section: 'main' | 'extra' | 'side', quantity?: number) => void;
    allowEditing?: boolean;
    title?: string;
    currentDeck?: { mainDeck: DeckCard[]; extraDeck: DeckCard[]; sideDeck: DeckCard[] };
}

const EnhancedBinderCardList: React.FC<EnhancedBinderCardListProps> = ({
    binder,
    onCardClick,
    onAddToSection,
    title = "Available Cards",
    currentDeck
}) => {
    // Filter and sort state
    const [filters, setFilters] = useState<BinderFilterOptions>({
        searchTerm: '',
        cardType: '',
        attribute: '',
        race: '',
        level: '',
        atkRange: { min: '', max: '' },
        defRange: { min: '', max: '' },
        rarity: '',
        setCode: '',
        tags: [],
    });

    const [sortOption, setSortOption] = useState<BinderSortOption>({
        field: 'name',
        direction: 'asc'
    });

    // View mode state
    const [viewMode, setViewMode] = useState<ViewMode>('grid');

    // Deck-specific filter options
    const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
    const [showOnlyUsableInDeck, setShowOnlyUsableInDeck] = useState(false);

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
        return card.quantity - usedInDeck;
    };

    // Transform binder cards to the format expected by filters
    const transformedCards = useMemo(() => {
        return binder.cards.map(card => ({
            cardId: card.cardId,
            card: card.card_details,
            quantity: card.quantity,
            binderCard: card
        }));
    }, [binder.cards]);

    // Apply filters and sorting
    const filteredAndSortedCards = useMemo(() => {
        let filtered = transformedCards.filter(({ card, binderCard }) => {
            // Basic availability filters
            if (showOnlyAvailable && getAvailableCopies(binderCard) <= 0) {
                return false;
            }

            if (showOnlyUsableInDeck && getAvailableCopies(binderCard) <= 0) {
                return false;
            }

            // Standard filters
            if (!card) return false;

            // Search term
            if (filters.searchTerm) {
                const searchLower = filters.searchTerm.toLowerCase();
                const matchesSearch = (
                    card.name.toLowerCase().includes(searchLower) ||
                    card.type.toLowerCase().includes(searchLower) ||
                    (card.race && card.race.toLowerCase().includes(searchLower)) ||
                    (card.attribute && card.attribute.toLowerCase().includes(searchLower)) ||
                    (card.archetype && card.archetype.toLowerCase().includes(searchLower)) ||
                    (card.desc && card.desc.toLowerCase().includes(searchLower)) ||
                    binderCard.setCode?.toLowerCase().includes(searchLower) ||
                    binderCard.rarity?.toLowerCase().includes(searchLower)
                );
                if (!matchesSearch) return false;
            }

            // Card type
            if (filters.cardType && card.type !== filters.cardType) {
                return false;
            }

            // Attribute
            if (filters.attribute && card.attribute !== filters.attribute) {
                return false;
            }

            // Race
            if (filters.race && card.race !== filters.race) {
                return false;
            }

            // Level
            if (filters.level && card.level?.toString() !== filters.level) {
                return false;
            }

            // ATK range
            if (filters.atkRange.min && card.atk !== null && card.atk !== undefined) {
                if (card.atk < parseInt(filters.atkRange.min)) return false;
            }
            if (filters.atkRange.max && card.atk !== null && card.atk !== undefined) {
                if (card.atk > parseInt(filters.atkRange.max)) return false;
            }

            // DEF range
            if (filters.defRange.min && card.def !== null && card.def !== undefined) {
                if (card.def < parseInt(filters.defRange.min)) return false;
            }
            if (filters.defRange.max && card.def !== null && card.def !== undefined) {
                if (card.def > parseInt(filters.defRange.max)) return false;
            }

            // Rarity
            if (filters.rarity) {
                const hasRarity = card.card_sets?.some(set => set.set_rarity === filters.rarity) ||
                    binderCard.rarity === filters.rarity;
                if (!hasRarity) return false;
            }

            // Set code
            if (filters.setCode) {
                const hasSetCode = card.card_sets?.some(set => set.set_code === filters.setCode) ||
                    binderCard.setCode === filters.setCode;
                if (!hasSetCode) return false;
            }

            // Tags
            if (filters.tags.length > 0) {
                const hasTag = filters.tags.every((tag: string) => binderCard.tags?.includes(tag));
                if (!hasTag) return false;
            }

            return true;
        });

        // Apply sorting
        filtered.sort((a, b) => {
            const direction = sortOption.direction === 'asc' ? 1 : -1;

            switch (sortOption.field) {
                case 'name':
                    return direction * (a.card?.name || '').localeCompare(b.card?.name || '');
                case 'type':
                    return direction * (a.card?.type || '').localeCompare(b.card?.type || '');
                case 'attribute':
                    return direction * (a.card?.attribute || '').localeCompare(b.card?.attribute || '');
                case 'level':
                    return direction * ((a.card?.level || 0) - (b.card?.level || 0));
                case 'atk':
                    return direction * ((a.card?.atk || 0) - (b.card?.atk || 0));
                case 'def':
                    return direction * ((a.card?.def || 0) - (b.card?.def || 0));
                case 'quantity':
                    return direction * (a.quantity - b.quantity);
                default:
                    return 0;
            }
        });

        return filtered;
    }, [transformedCards, filters, sortOption, showOnlyAvailable, showOnlyUsableInDeck, currentDeck]);

    const handleResetFilters = () => {
        setFilters({
            searchTerm: '',
            cardType: '',
            attribute: '',
            race: '',
            level: '',
            atkRange: { min: '', max: '' },
            defRange: { min: '', max: '' },
            rarity: '',
            setCode: '',
            tags: [],
        });
        setShowOnlyAvailable(false);
        setShowOnlyUsableInDeck(false);
    };

    // Transform cards for the new view components
    const transformedCardsForView = useMemo(() => {
        return filteredAndSortedCards.map(({ binderCard }) => ({
            cardId: binderCard.cardId,
            quantity: binderCard.quantity,
            card_details: binderCard.card_details,
            availableCopies: getAvailableCopies(binderCard),
            usedInDeck: getCardUsageInDeck(binderCard.cardId),
            setCode: binderCard.setCode,
            rarity: binderCard.rarity,
            tags: binderCard.tags
        }));
    }, [filteredAndSortedCards]);

    const totalCards = binder.cards.reduce((sum, card) => sum + card.quantity, 0);
    const uniqueCards = binder.cards.length;
    const filteredCount = filteredAndSortedCards.length;
    const availableCards = currentDeck ? binder.cards.filter(card => getAvailableCopies(card) > 0).length : uniqueCards;

    const handleCardClick = (cardId: number) => {
        if (onCardClick) {
            onCardClick(cardId);
        }
    };

    const handleCardRightClick = (e: React.MouseEvent, cardId: number) => {
        e.preventDefault();
        setContextMenu({
            isOpen: true,
            position: { x: e.clientX, y: e.clientY },
            cardId: cardId
        });
    };

    return (
        <div className="space-y-4">
            {/* Filters */}
            <BinderFilters
                cards={transformedCards}
                filters={filters}
                sortOption={sortOption}
                onFiltersChange={setFilters}
                onSortChange={setSortOption}
                onResetFilters={handleResetFilters}
                availableTags={[]} // Could be enhanced to show all available tags
            />

            {/* Deck-specific filters */}
            {currentDeck && (
                <div className="bg-white rounded-lg shadow-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Deck Building Filters</h4>
                    <div className="flex flex-wrap gap-3">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={showOnlyAvailable}
                                onChange={(e) => setShowOnlyAvailable(e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                                Show only available cards ({availableCards} cards)
                            </span>
                        </label>
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={showOnlyUsableInDeck}
                                onChange={(e) => setShowOnlyUsableInDeck(e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                                Hide cards already at limit (3 copies)
                            </span>
                        </label>
                    </div>
                </div>
            )}

            {/* Card List */}
            <div className="bg-white rounded-lg shadow-lg">
                <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                        <div className="text-sm text-gray-600">
                            {filteredCount} of {uniqueCards} unique ({totalCards} total)
                        </div>
                    </div>
                    
                    {/* View Mode Toggle */}
                    <div className="flex items-center justify-between">
                        <div>
                            {filteredCount !== uniqueCards && (
                                <div className="text-sm text-blue-600">
                                    Showing {filteredCount} filtered results
                                </div>
                            )}
                        </div>
                        <ViewModeToggle
                            currentMode={viewMode}
                            onModeChange={setViewMode}
                            availableModes={['grid', 'list', 'table']}
                        />
                    </div>
                </div>

                {/* Card Display based on view mode */}
                <div className={viewMode === 'table' ? '' : 'max-h-96 overflow-y-auto'}>
                    {transformedCardsForView.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <div className="text-4xl mb-2">📋</div>
                            <p>No cards found</p>
                            <p className="text-sm">Try adjusting your filters</p>
                        </div>
                    ) : (
                        <>
                            {viewMode === 'grid' && (
                                <CardGridView
                                    cards={transformedCardsForView}
                                    onCardClick={handleCardClick}
                                    onCardRightClick={handleCardRightClick}
                                    showDeckInfo={!!currentDeck}
                                    gridSize="md"
                                />
                            )}
                            {viewMode === 'list' && (
                                <div className="p-4">
                                    <CardListView
                                        cards={transformedCardsForView}
                                        onCardClick={handleCardClick}
                                        onCardRightClick={handleCardRightClick}
                                        showDeckInfo={!!currentDeck}
                                        showThumbnails={true}
                                    />
                                </div>
                            )}
                            {viewMode === 'table' && (
                                <CardTableView
                                    cards={transformedCardsForView}
                                    onCardClick={handleCardClick}
                                    onCardRightClick={handleCardRightClick}
                                    showDeckInfo={!!currentDeck}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Context Menu */}
            <CardContextMenu
                isOpen={contextMenu.isOpen}
                onClose={() => setContextMenu({ ...contextMenu, isOpen: false })}
                position={contextMenu.position}
                options={contextMenu.cardId ? [
                    {
                        label: 'Add to Main Deck',
                        onClick: () => onAddToSection?.(contextMenu.cardId!, 'main', 1),
                        disabled: !onAddToSection || getAvailableCopies(binder.cards.find(c => c.cardId === contextMenu.cardId)!) <= 0,
                        icon: '🎯'
                    },
                    {
                        label: 'Add to Extra Deck',
                        onClick: () => onAddToSection?.(contextMenu.cardId!, 'extra', 1),
                        disabled: !onAddToSection || getAvailableCopies(binder.cards.find(c => c.cardId === contextMenu.cardId)!) <= 0,
                        icon: '⭐'
                    },
                    {
                        label: 'Add to Side Deck',
                        onClick: () => onAddToSection?.(contextMenu.cardId!, 'side', 1),
                        disabled: !onAddToSection || getAvailableCopies(binder.cards.find(c => c.cardId === contextMenu.cardId)!) <= 0,
                        icon: '📋'
                    },
                ] : []}
            />
        </div>
    );
};

export default EnhancedBinderCardList;