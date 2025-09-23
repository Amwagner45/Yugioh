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
            // Note: In a real implementation, you'd want to join with card details
            return card.cardId.toString().includes(searchTerm.toLowerCase());
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'quantity':
                    return b.quantity - a.quantity;
                case 'name':
                default:
                    return a.cardId - b.cardId; // Fallback sort by ID
            }
        });

    const totalCards = binder.cards.reduce((sum, card) => sum + card.quantity, 0);
    const uniqueCards = binder.cards.length;

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
                        onChange={(e) => setSearchTerm(e.target.value)}
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
                        {filteredCards.map((card) => (
                            <BinderCardItem
                                key={`${card.cardId}-${card.setCode}-${card.rarity}`}
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

    const handleDragStart = (e: React.DragEvent) => {
        if (!isAvailable) {
            e.preventDefault();
            return;
        }

        // Store card data for drop handler
        e.dataTransfer.setData('application/json', JSON.stringify({
            cardId: card.cardId,
            type: 'binder-card'
        }));
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
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <div className="font-medium text-gray-900">
                        Card ID: {card.cardId}
                    </div>
                    {card.setCode && (
                        <div className="text-sm text-gray-600">
                            Set: {card.setCode}
                            {card.rarity && ` (${card.rarity})`}
                        </div>
                    )}
                    {card.condition && card.condition !== 'Near Mint' && (
                        <div className="text-sm text-gray-500">
                            Condition: {card.condition}
                        </div>
                    )}
                    {card.notes && (
                        <div className="text-sm text-gray-500 italic">
                            {card.notes}
                        </div>
                    )}
                </div>

                <div className="flex items-center space-x-2">
                    {showQuantity && (
                        <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded-full">
                            {card.quantity}
                        </span>
                    )}

                    {showDeckInfo && (
                        <div className="text-right text-xs">
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
                        <div className="text-gray-400 text-xs">
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