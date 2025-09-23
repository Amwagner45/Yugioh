import React from 'react';
import CardImage from './CardImage';
import type { Card } from '../../types';

interface CardListViewProps {
    cards: Array<{
        cardId: number;
        quantity: number;
        card_details?: Card;
        availableCopies?: number;
        usedInDeck?: number;
    }>;
    onCardClick?: (cardId: number) => void;
    onCardRightClick?: (e: React.MouseEvent, cardId: number) => void;
    showDeckInfo?: boolean;
    showThumbnails?: boolean;
    className?: string;
    getCardRestriction?: (cardId: number) => { restriction: string; maxCopies: number; isViolation: boolean };
}

const CardListView: React.FC<CardListViewProps> = ({
    cards,
    onCardClick,
    onCardRightClick,
    showDeckInfo = false,
    showThumbnails = true,
    className = '',
    getCardRestriction
}) => {
    if (cards.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4">📋</div>
                <p className="text-xl">No cards to display</p>
                <p className="text-sm">Add some cards to get started</p>
            </div>
        );
    }

    return (
        <div className={`space-y-1 ${className}`}>
            {cards.map((cardData, index) => {
                const isAvailable = (cardData.availableCopies ?? cardData.quantity) > 0;
                const hasCard = !!cardData.card_details;
                const card = cardData.card_details;
                const cardRestriction = getCardRestriction ? getCardRestriction(cardData.cardId) : null;
                const isViolation = cardRestriction?.isViolation || false;

                return (
                    <div
                        key={`${cardData.cardId}-${index}`}
                        className={`flex items-center space-x-3 p-2 rounded-lg border transition-all ${hasCard
                            ? isAvailable
                                ? 'bg-white border-gray-200 hover:bg-blue-50 hover:border-blue-300 cursor-pointer'
                                : 'bg-red-50 border-red-200 cursor-not-allowed opacity-75'
                            : 'bg-gray-50 border-gray-200 opacity-60'
                            }`}
                        onClick={isAvailable && onCardClick ? () => onCardClick(cardData.cardId) : undefined}
                        onContextMenu={onCardRightClick ? (e) => onCardRightClick(e, cardData.cardId) : undefined}
                        draggable={isAvailable && hasCard}
                        onDragStart={(e) => {
                            if (!isAvailable || !hasCard) {
                                e.preventDefault();
                                return;
                            }
                            const dragData = {
                                cardId: cardData.cardId,
                                type: 'binder-card'
                            };
                            e.dataTransfer.setData('application/json', JSON.stringify(dragData));
                            e.dataTransfer.effectAllowed = 'copy';
                        }}
                    >
                        {/* Thumbnail */}
                        {showThumbnails && hasCard && (
                            <div className="flex-shrink-0">
                                <CardImage
                                    card={card!}
                                    size="xs"
                                    showZoom={false}
                                />
                            </div>
                        )}

                        {/* Card Info */}
                        <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                                {hasCard ? card!.name : `Card ID: ${cardData.cardId}`}
                            </div>

                            {hasCard && (
                                <div className="text-sm text-gray-600">
                                    {card!.type}
                                    {card!.race && card!.race !== card!.type && ` • ${card!.race}`}
                                    {card!.attribute && ` • ${card!.attribute}`}
                                </div>
                            )}

                            {hasCard && (card!.atk !== null || card!.def !== null) && (
                                <div className="text-sm text-gray-500">
                                    {card!.atk !== null && `ATK: ${card!.atk}`}
                                    {card!.def !== null && ` DEF: ${card!.def}`}
                                    {card!.level && ` • Level: ${card!.level}`}
                                </div>
                            )}
                        </div>

                        {/* Quantity Indicator */}
                        <div className="flex-shrink-0 flex items-center space-x-2">
                            {/* Banlist Violation Indicator */}
                            {isViolation && (
                                <div
                                    className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center shadow-lg border border-white"
                                    title={`Banlist Violation: ${cardRestriction?.restriction} (max ${cardRestriction?.maxCopies})`}
                                >
                                    <svg
                                        className="w-4 h-4 text-white font-bold"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM10 18a8 8 0 100-16 8 8 0 000 16z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </div>
                            )}

                            <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded-full">
                                {cardData.quantity}
                            </span>

                            {/* Deck Info */}
                            {showDeckInfo && (
                                <div className="text-xs text-right">
                                    {cardData.usedInDeck ? (
                                        <>
                                            <div className="text-orange-600 font-medium">
                                                {cardData.usedInDeck} in deck
                                            </div>
                                            <div className={`font-medium ${isAvailable ? 'text-green-600' : 'text-red-600'}`}>
                                                {cardData.availableCopies || 0} left
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-green-600 font-medium">
                                            {cardData.availableCopies || cardData.quantity} available
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Status Indicators */}
                            <div className="flex flex-col items-center space-y-1">
                                {isAvailable ? (
                                    <div className="w-3 h-3 bg-green-500 rounded-full" title="Available" />
                                ) : (
                                    <div className="w-3 h-3 bg-red-500 rounded-full" title="Unavailable" />
                                )}

                                {onCardClick && isAvailable && (
                                    <div className="text-gray-400 text-xs">
                                        🎯
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default CardListView;