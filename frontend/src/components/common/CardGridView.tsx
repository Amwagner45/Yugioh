import React from 'react';
import CardImage from './CardImage';
import type { Card } from '../../types';

interface CardGridViewProps {
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
    gridSize?: 'sm' | 'md' | 'lg';
    className?: string;
}

const CardGridView: React.FC<CardGridViewProps> = ({
    cards,
    onCardClick,
    onCardRightClick,
    showDeckInfo = false,
    gridSize = 'md',
    className = ''
}) => {
    const gridClasses = {
        sm: 'grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-14',
        md: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10',
        lg: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
    };

    const imageSize = gridSize === 'sm' ? 'sm' : gridSize === 'lg' ? 'lg' : 'md';

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
        <div className={`grid ${gridClasses[gridSize]} gap-4 p-4 ${className}`}>
            {cards.map((cardData, index) => {
                const isAvailable = (cardData.availableCopies ?? cardData.quantity) > 0;
                const hasCard = !!cardData.card_details;

                return (
                    <div
                        key={`${cardData.cardId}-${index}`}
                        className={`relative group transition-all duration-200 ${
                            hasCard 
                                ? isAvailable 
                                    ? 'hover:scale-105 hover:z-10' 
                                    : 'opacity-60'
                                : 'opacity-40'
                        }`}
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
                        {/* Card Image */}
                        {hasCard ? (
                            <CardImage
                                card={cardData.card_details!}
                                size={imageSize}
                                quantity={cardData.quantity}
                                onClick={isAvailable && onCardClick ? () => onCardClick(cardData.cardId) : undefined}
                                onRightClick={onCardRightClick ? (e) => onCardRightClick(e, cardData.cardId) : undefined}
                                className={`${
                                    isAvailable && onCardClick 
                                        ? 'cursor-pointer' 
                                        : isAvailable 
                                            ? 'cursor-default' 
                                            : 'cursor-not-allowed'
                                }`}
                            />
                        ) : (
                            // Placeholder for cards without details
                            <div className={`${imageSize === 'sm' ? 'w-12 h-16' : imageSize === 'lg' ? 'w-32 h-48' : 'w-16 h-24'} bg-gray-200 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center`}>
                                <div className="text-center text-gray-500">
                                    <div className="text-xs">ID: {cardData.cardId}</div>
                                </div>
                            </div>
                        )}

                        {/* Deck Info Overlay */}
                        {showDeckInfo && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-80 text-white text-xs p-1 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                {cardData.usedInDeck ? (
                                    <div className="text-center">
                                        <div className="text-orange-300">{cardData.usedInDeck} in deck</div>
                                        <div className={`${isAvailable ? 'text-green-300' : 'text-red-300'}`}>
                                            {cardData.availableCopies || 0} left
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-green-300">
                                        {cardData.availableCopies || cardData.quantity} available
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Availability indicator */}
                        {!isAvailable && hasCard && (
                            <div className="absolute inset-0 bg-red-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                                <div className="bg-red-600 text-white text-xs px-2 py-1 rounded font-bold">
                                    UNAVAILABLE
                                </div>
                            </div>
                        )}

                        {/* Card name tooltip on hover */}
                        {hasCard && (
                            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none whitespace-nowrap">
                                {cardData.card_details!.name}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default CardGridView;