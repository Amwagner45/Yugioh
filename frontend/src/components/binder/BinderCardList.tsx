import React, { useState } from 'react';
import type { Binder, BinderCard, DeckCard } from '../../types';

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
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'type' | 'quantity'>('name');

    // Debug search term changes
    React.useEffect(() => {
        console.log('Search term changed to:', searchTerm);
        console.log('Binder has', binder.cards.length, 'cards');
        console.log('Cards with card_details:', binder.cards.filter(c => c.card_details).length);
    }, [searchTerm, binder.cards]);

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

    // Filter and sort cards
    const filteredCards = binder.cards
        .filter(card => {
            if (!searchTerm) return true;
            const cardDetails = card.card_details;
            if (!cardDetails) {
                console.log('Card missing card_details:', card.cardId);
                return false;
            }

            const searchLower = searchTerm.toLowerCase();
            const matches = (
                cardDetails.name.toLowerCase().includes(searchLower) ||
                cardDetails.type.toLowerCase().includes(searchLower) ||
                (cardDetails.race && cardDetails.race.toLowerCase().includes(searchLower)) ||
                (cardDetails.attribute && cardDetails.attribute.toLowerCase().includes(searchLower)) ||
                (cardDetails.archetype && cardDetails.archetype.toLowerCase().includes(searchLower)) ||
                card.setCode?.toLowerCase().includes(searchLower) ||
                card.rarity?.toLowerCase().includes(searchLower)
            );

            if (searchTerm && matches) {
                console.log('Card matches search:', cardDetails.name, 'for term:', searchTerm);
            }

            return matches;
        })
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

    // Debug filtered cards
    React.useEffect(() => {
        console.log('Filtered cards count:', filteredCards.length);
        if (searchTerm) {
            console.log('Search results for "' + searchTerm + '":', filteredCards.map(c => c.card_details?.name || c.cardId));
        }
    }, [filteredCards, searchTerm]);

    return (
        <div className="bg-white rounded-lg shadow-lg">
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                    <div className="text-sm text-gray-600">
                        {uniqueCards} unique ({totalCards} total)
                    </div>
                </div>

                {/* Search and Sort */}
                <div className="space-y-3">
                    <input
                        type="text"
                        placeholder="Search cards..."
                        value={searchTerm}
                        onChange={(e) => {
                            console.log('Search input changed to:', e.target.value);
                            setSearchTerm(e.target.value);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />

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

            <div className="max-h-96 overflow-y-auto">
                {filteredCards.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <div className="text-4xl mb-2">📋</div>
                        <p>No cards found</p>
                        {searchTerm && (
                            <p className="text-sm">Try adjusting your search terms</p>
                        )}
                    </div>
                ) : (
                    <div className="p-4 space-y-2">
                        {filteredCards.map((card, index) => (
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
                )}
            </div>
        </div>
    );
};

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
    const isFullyUsed = showDeckInfo && usedInDeck >= card.quantity;
    const cardDetails = card.card_details;

    // Debug card details
    React.useEffect(() => {
        if (cardDetails) {
            console.log('Card details for', cardDetails.name, {
                hasImages: !!cardDetails.card_images,
                imageCount: cardDetails.card_images?.length,
                firstImageUrl: cardDetails.card_images?.[0]?.image_url_small
            });
        } else {
            console.log('No card details for card ID:', card.cardId);
        }
    }, [cardDetails, card.cardId]);

    const handleDragStart = (e: React.DragEvent) => {
        console.log('Drag started for card:', cardDetails?.name || card.cardId, 'Available:', isAvailable);

        if (!isAvailable) {
            console.log('Preventing drag - card not available');
            e.preventDefault();
            return;
        }

        // Store card data for drop handler
        const dragData = {
            cardId: card.cardId,
            type: 'binder-card'
        };
        console.log('Setting drag data:', dragData);
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
                                console.log('Image failed to load:', cardDetails?.card_images?.[0]?.image_url_small);
                                // Fallback to main image if small image fails
                                if (cardDetails?.card_images?.[0]) {
                                    (e.target as HTMLImageElement).src = cardDetails.card_images[0].image_url;
                                }
                            }}
                            onLoad={() => {
                                console.log('Image loaded successfully:', cardDetails.name);
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
                        <span className="text-blue-600">Click to add to deck • Drag to specific section</span>
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

export default BinderCardList;