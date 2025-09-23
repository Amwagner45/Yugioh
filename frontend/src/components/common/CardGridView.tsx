import React, { useState } from 'react';
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
    disableZoom?: boolean;
    gapSize?: 'sm' | 'md' | 'lg';
    compactPadding?: boolean;
    allowOverlap?: boolean;
    // For deck sections - allows cards to be dragged back to binder
    isDeckSection?: boolean;
    sectionType?: 'main' | 'extra' | 'side';
    // For banlist violation checking
    getCardRestriction?: (cardId: number) => { restriction: string; maxCopies: number; isViolation: boolean };
}

const CardGridView: React.FC<CardGridViewProps> = ({
    cards,
    onCardClick,
    onCardRightClick,
    showDeckInfo = false,
    gridSize = 'md',
    className = '',
    disableZoom = false,
    gapSize = 'md',
    compactPadding = false,
    allowOverlap = false,
    isDeckSection = false,
    sectionType,
    getCardRestriction
}) => {
    // State for tooltip management
    const [tooltip, setTooltip] = useState<{
        visible: boolean;
        cardName: string;
        x: number;
        y: number;
    }>({
        visible: false,
        cardName: '',
        x: 0,
        y: 0
    });

    // Tooltip event handlers
    const handleMouseEnter = (e: React.MouseEvent, cardName: string) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltip({
            visible: true,
            cardName: cardName,
            x: rect.left + rect.width / 2,
            y: rect.bottom + 8 // 8px below the card
        });
    };

    const handleMouseLeave = () => {
        setTooltip(prev => ({ ...prev, visible: false }));
    };

    const gridClasses = {
        sm: 'grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-15 xl:grid-cols-18',
        md: 'grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-15',
        lg: 'grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-15 xl:grid-cols-20'
    };

    const gapClasses = {
        sm: 'gap-1',
        md: 'gap-2',
        lg: 'gap-3'
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

    const actualGapClass = gapClasses[gapSize];

    if (allowOverlap) {
        // Special overlapping layout
        return (
            <div className={`flex flex-wrap ${compactPadding ? 'p-2' : 'p-4'} ${className}`} style={{ gap: '0.25rem' }}>
                {cards.map((cardData, index) => {
                    const isAvailable = (cardData.availableCopies ?? cardData.quantity) > 0;
                    const hasCard = !!cardData.card_details;
                    const cardRestriction = getCardRestriction ? getCardRestriction(cardData.cardId) : null;
                    const isViolation = cardRestriction?.isViolation || false;

                    return (
                        <div
                            key={`${cardData.cardId}-${index}`}
                            className={`relative group transition-all duration-200 ${hasCard
                                ? isAvailable
                                    ? 'hover:scale-105 hover:z-[100]'
                                    : 'opacity-60'
                                : 'opacity-40'
                                }`}
                            style={{
                                marginRight: index < cards.length - 1 ? '-0.5rem' : '0',
                                zIndex: index
                            }}
                            draggable={isAvailable && hasCard}
                            onMouseEnter={hasCard ? (e) => handleMouseEnter(e, cardData.card_details!.name) : undefined}
                            onMouseLeave={hasCard ? handleMouseLeave : undefined}
                            onDragStart={(e) => {
                                if (!isAvailable || !hasCard) {
                                    e.preventDefault();
                                    return;
                                }
                                const dragData = {
                                    cardId: cardData.cardId,
                                    type: isDeckSection ? 'deck-card' : 'binder-card',
                                    sectionType: isDeckSection ? sectionType : undefined
                                };
                                e.dataTransfer.setData('application/json', JSON.stringify(dragData));
                                e.dataTransfer.effectAllowed = isDeckSection ? 'move' : 'copy';
                            }}
                        >
                            {/* Card Image */}
                            {hasCard ? (
                                <>
                                    <CardImage
                                        card={cardData.card_details!}
                                        size={imageSize}
                                        quantity={cardData.quantity}
                                        showZoom={!disableZoom}
                                        onClick={isAvailable && onCardClick ? () => onCardClick(cardData.cardId) : undefined}
                                        onRightClick={onCardRightClick ? (e) => onCardRightClick(e, cardData.cardId) : undefined}
                                        className={`${isAvailable && onCardClick
                                            ? 'cursor-pointer'
                                            : isAvailable
                                                ? 'cursor-default'
                                                : 'cursor-not-allowed'
                                            }`}
                                    />

                                    {/* Banlist Violation Indicator */}
                                    {isViolation && (
                                        <div className="absolute -top-1 -right-1 z-50">
                                            <div
                                                className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white"
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
                                        </div>
                                    )}
                                </>
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

                        </div>
                    );
                })}
            </div>
        );
    }

    return (
        <>
            <div className={`grid ${gridClasses[gridSize]} ${actualGapClass} ${compactPadding ? 'p-2' : 'p-4'} ${className}`}>
                {cards.map((cardData, index) => {
                    const isAvailable = (cardData.availableCopies ?? cardData.quantity) > 0;
                    const hasCard = !!cardData.card_details;
                    const cardRestriction = getCardRestriction ? getCardRestriction(cardData.cardId) : null;
                    const isViolation = cardRestriction?.isViolation || false;

                    return (
                        <div
                            key={`${cardData.cardId}-${index}`}
                            className={`relative group transition-all duration-200 ${hasCard
                                ? isAvailable
                                    ? 'hover:scale-105 hover:z-[100]'
                                    : 'opacity-60'
                                : 'opacity-40'
                                }`}
                            draggable={isAvailable && hasCard}
                            onMouseEnter={hasCard ? (e) => handleMouseEnter(e, cardData.card_details!.name) : undefined}
                            onMouseLeave={hasCard ? handleMouseLeave : undefined}
                            onDragStart={(e) => {
                                if (!isAvailable || !hasCard) {
                                    e.preventDefault();
                                    return;
                                }
                                const dragData = {
                                    cardId: cardData.cardId,
                                    type: isDeckSection ? 'deck-card' : 'binder-card',
                                    sectionType: isDeckSection ? sectionType : undefined
                                };
                                e.dataTransfer.setData('application/json', JSON.stringify(dragData));
                                e.dataTransfer.effectAllowed = isDeckSection ? 'move' : 'copy';
                            }}

                        >
                            {/* Card Image */}
                            {hasCard ? (
                                <>
                                    <CardImage
                                        card={cardData.card_details!}
                                        size={imageSize}
                                        quantity={cardData.quantity}
                                        showZoom={!disableZoom}
                                        onClick={isAvailable && onCardClick ? () => {
                                            onCardClick(cardData.cardId);
                                        } : undefined}
                                        onRightClick={onCardRightClick ? (e) => {
                                            onCardRightClick(e, cardData.cardId);
                                        } : undefined}
                                        className={`${isAvailable && onCardClick
                                            ? 'cursor-pointer'
                                            : isAvailable
                                                ? 'cursor-default'
                                                : 'cursor-not-allowed'
                                            }`}
                                    />

                                    {/* Banlist Violation Indicator */}
                                    {isViolation && (
                                        <div className="absolute -top-1 -right-1 z-50">
                                            <div
                                                className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white"
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
                                        </div>
                                    )}
                                </>
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

                        </div>
                    );
                })}
            </div>

            {/* Global tooltip positioned relative to viewport */}
            {tooltip.visible && (
                <div
                    className="fixed bg-black text-white text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap z-[9999] transform -translate-x-1/2"
                    style={{
                        left: `${tooltip.x}px`,
                        top: `${tooltip.y}px`
                    }}
                >
                    {tooltip.cardName}
                </div>
            )}
        </>
    );
};

export default CardGridView;