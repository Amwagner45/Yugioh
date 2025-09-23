import React, { useState, useMemo } from 'react';
import type { Binder, BinderCard, DeckCard } from '../../types';
import BinderFilters from '../binder/BinderFilters';
import type { BinderFilterOptions, BinderSortOption } from '../binder/BinderFilters';
import CardContextMenu from '../common/CardContextMenu';

interface EnhancedBinderCardListProps {
    binder: Binder;
    onCardClick?: (cardId: number) => void;
    onAddToSection?: (cardId: number, section: 'main' | 'extra' | 'side', quantity?: number) => void;
    showQuantities?: boolean;
    allowEditing?: boolean;
    title?: string;
    currentDeck?: { mainDeck: DeckCard[]; extraDeck: DeckCard[]; sideDeck: DeckCard[] };
}

const EnhancedBinderCardList: React.FC<EnhancedBinderCardListProps> = ({
    binder,
    onCardClick,
    onAddToSection,
    showQuantities = true,
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

    const totalCards = binder.cards.reduce((sum, card) => sum + card.quantity, 0);
    const uniqueCards = binder.cards.length;
    const filteredCount = filteredAndSortedCards.length;
    const availableCards = currentDeck ? binder.cards.filter(card => getAvailableCopies(card) > 0).length : uniqueCards;

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
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                        <div className="text-sm text-gray-600">
                            {filteredCount} of {uniqueCards} unique ({totalCards} total)
                        </div>
                    </div>
                    {filteredCount !== uniqueCards && (
                        <div className="text-sm text-blue-600">
                            Showing {filteredCount} filtered results
                        </div>
                    )}
                </div>

                <div className="max-h-96 overflow-y-auto">
                    {filteredAndSortedCards.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <div className="text-4xl mb-2">📋</div>
                            <p>No cards found</p>
                            <p className="text-sm">Try adjusting your filters</p>
                        </div>
                    ) : (
                        <div className="p-4 space-y-2">
                            {filteredAndSortedCards.map(({ binderCard }, index) => (
                                <BinderCardItem
                                    key={`${binderCard.cardId}-${binderCard.setCode || 'noset'}-${binderCard.rarity || 'norarity'}-${index}`}
                                    card={binderCard}
                                    onClick={onCardClick ? () => onCardClick(binderCard.cardId) : undefined}
                                    onContextMenu={(e, cardId) => {
                                        e.preventDefault();
                                        setContextMenu({
                                            isOpen: true,
                                            position: { x: e.clientX, y: e.clientY },
                                            cardId: cardId
                                        });
                                    }}
                                    showQuantity={showQuantities}
                                    availableCopies={getAvailableCopies(binderCard)}
                                    usedInDeck={getCardUsageInDeck(binderCard.cardId)}
                                    showDeckInfo={!!currentDeck}
                                />
                            ))}
                        </div>
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

interface BinderCardItemProps {
    card: BinderCard;
    onClick?: () => void;
    onContextMenu?: (e: React.MouseEvent, cardId: number) => void;
    showQuantity?: boolean;
    availableCopies?: number;
    usedInDeck?: number;
    showDeckInfo?: boolean;
}

const BinderCardItem: React.FC<BinderCardItemProps> = ({
    card,
    onClick,
    onContextMenu,
    showQuantity = true,
    availableCopies = 0,
    usedInDeck = 0,
    showDeckInfo = false
}) => {
    const isAvailable = availableCopies > 0;
    const isFullyUsed = showDeckInfo && usedInDeck >= card.quantity;
    const cardDetails = card.card_details;

    const handleDragStart = (e: React.DragEvent) => {
        if (!isAvailable) {
            e.preventDefault();
            return;
        }

        // Store card data for drop handler
        const dragData = {
            cardId: card.cardId,
            type: 'binder-card'
        };
        e.dataTransfer.setData('application/json', JSON.stringify(dragData));
        e.dataTransfer.effectAllowed = 'copy';
    };

    return (
        <div
            className={`p-3 rounded-lg border transition-colors ${onClick
                ? isAvailable
                    ? 'bg-gray-50 border-gray-200 hover:bg-blue-50 hover:border-blue-300 cursor-pointer'
                    : 'bg-red-50 border-red-200 cursor-not-allowed opacity-75'
                : 'bg-gray-50 border-gray-200'
                }`}
            onClick={isAvailable ? onClick : undefined}
            onContextMenu={(e) => onContextMenu?.(e, card.cardId)}
            draggable={isAvailable}
            onDragStart={handleDragStart}
            style={{ cursor: isAvailable ? (onClick ? 'pointer' : 'grab') : 'not-allowed' }}
        >
            <div className="flex items-center space-x-3">
                {/* Card Image */}
                {cardDetails?.card_images?.[0] && (
                    <div className="flex-shrink-0">
                        <img
                            src={cardDetails.card_images[0].image_url_small}
                            alt={cardDetails.name}
                            className="w-12 h-16 object-cover rounded border"
                            onError={(e) => {
                                // Fallback to main image if small image fails
                                if (cardDetails?.card_images?.[0]) {
                                    (e.target as HTMLImageElement).src = cardDetails.card_images[0].image_url;
                                }
                            }}
                        />
                    </div>
                )}

                {/* Card Info */}
                <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                        {cardDetails ? cardDetails.name : `Card ID: ${card.cardId}`}
                    </div>

                    {cardDetails && (
                        <div className="text-sm text-gray-600">
                            {cardDetails.type}
                            {cardDetails.race && cardDetails.race !== cardDetails.type && ` • ${cardDetails.race}`}
                            {cardDetails.attribute && ` • ${cardDetails.attribute}`}
                        </div>
                    )}

                    {cardDetails && (cardDetails.atk !== null || cardDetails.def !== null) && (
                        <div className="text-sm text-gray-600">
                            {cardDetails.atk !== null && `ATK: ${cardDetails.atk}`}
                            {cardDetails.def !== null && ` DEF: ${cardDetails.def}`}
                            {cardDetails.level && ` • Level: ${cardDetails.level}`}
                        </div>
                    )}

                    {card.setCode && (
                        <div className="text-xs text-gray-500">
                            {card.setCode}
                            {card.rarity && ` • ${card.rarity}`}
                            {card.condition && card.condition !== 'Near Mint' && ` • ${card.condition}`}
                        </div>
                    )}

                    {card.notes && (
                        <div className="text-xs text-gray-500 italic truncate">
                            {card.notes}
                        </div>
                    )}
                </div>

                {/* Quantity and Status */}
                <div className="flex-shrink-0 text-right">
                    {showQuantity && (
                        <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded-full">
                            {card.quantity}
                        </span>
                    )}

                    {showDeckInfo && (
                        <div className="text-xs mt-1">
                            {usedInDeck > 0 && (
                                <div className="text-orange-600 font-medium">
                                    {usedInDeck} in deck
                                </div>
                            )}
                            <div className={`font-medium ${isAvailable ? 'text-green-600' : 'text-red-600'}`}>
                                {availableCopies} available
                            </div>
                        </div>
                    )}

                    {isAvailable && (
                        <div className="text-gray-400 text-xs mt-1">
                            🎯 Drag
                        </div>
                    )}
                </div>
            </div>

            {onClick && (
                <div className="mt-2 text-xs">
                    {isAvailable ? (
                        <span className="text-blue-600">
                            Click to add to main deck • Right-click for options • Drag to specific section
                        </span>
                    ) : (
                        <span className="text-red-600">
                            {isFullyUsed ? 'All copies already in deck' : 'No copies available'}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

export default EnhancedBinderCardList;