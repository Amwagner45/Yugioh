import React, { useState } from 'react';
import type { DeckCard } from '../../types';

interface DeckSectionProps {
    title: string;
    cards: DeckCard[];
    onAddCard: (cardId: number, quantity: number) => void;
    onRemoveCard: (cardId: number, quantity: number) => void;
    maxCards: number;
    minCards: number;
    sectionType: 'main' | 'extra' | 'side';
}

const DeckSection: React.FC<DeckSectionProps> = ({
    title,
    cards,
    onAddCard,
    onRemoveCard,
    maxCards,
    minCards,
    sectionType
}) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const totalCards = cards.reduce((sum, card) => sum + card.quantity, 0);
    const isValidCount = totalCards >= minCards && totalCards <= maxCards;

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            if (data.type === 'binder-card' && data.cardId) {
                onAddCard(data.cardId, 1);
            }
        } catch (error) {
            console.error('Invalid drag data:', error);
        }
    };

    const handleIncreaseQuantity = (cardId: number) => {
        const card = cards.find(c => c.cardId === cardId);
        if (card && card.quantity < 3) {
            onAddCard(cardId, 1);
        }
    };

    const handleDecreaseQuantity = (cardId: number) => {
        const card = cards.find(c => c.cardId === cardId);
        if (card && card.quantity > 0) {
            onRemoveCard(cardId, 1);
        }
    };

    const getCardCountColor = () => {
        if (totalCards < minCards) return 'text-red-600';
        if (totalCards > maxCards) return 'text-red-600';
        return 'text-green-600';
    };

    return (
        <div
            className={`bg-white rounded-lg shadow-lg transition-all ${isDragOver ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                    <div className={`text-sm font-medium ${getCardCountColor()}`}>
                        {totalCards}/{maxCards} cards
                        {minCards > 0 && ` (min: ${minCards})`}
                        {!isValidCount && (
                            <span className="ml-2 text-red-600">
                                {totalCards < minCards ? '⚠️ Too few' : '⚠️ Too many'}
                            </span>
                        )}
                    </div>
                </div>
                {isDragOver && (
                    <div className="mt-2 text-sm text-blue-600 font-medium">
                        Drop card here to add to {title}
                    </div>
                )}
            </div>

            <div className="p-4">
                {cards.length === 0 ? (
                    <div className={`text-center py-8 ${isDragOver ? 'text-blue-600' : 'text-gray-500'}`}>
                        <div className="text-4xl mb-2">📚</div>
                        <p>No cards in this section</p>
                        <p className="text-sm">
                            {isDragOver ? 'Drop a card here!' : 'Add cards from your binder to get started'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-2">
                        {cards.map((card) => (
                            <DeckCardItem
                                key={card.cardId}
                                card={card}
                                onIncrease={() => handleIncreaseQuantity(card.cardId)}
                                onDecrease={() => handleDecreaseQuantity(card.cardId)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

interface DeckCardItemProps {
    card: DeckCard;
    onIncrease: () => void;
    onDecrease: () => void;
}

const DeckCardItem: React.FC<DeckCardItemProps> = ({ card, onIncrease, onDecrease }) => {
    return (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
            <div className="flex-1">
                <div className="font-medium text-gray-900">
                    Card ID: {card.cardId}
                </div>
                <div className="text-sm text-gray-600">
                    Quantity: {card.quantity}
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <button
                    onClick={onDecrease}
                    className="w-8 h-8 flex items-center justify-center bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={card.quantity <= 0}
                >
                    −
                </button>

                <span className="w-8 text-center font-medium">{card.quantity}</span>

                <button
                    onClick={onIncrease}
                    className="w-8 h-8 flex items-center justify-center bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={card.quantity >= 3}
                >
                    +
                </button>
            </div>
        </div>
    );
};

export default DeckSection;