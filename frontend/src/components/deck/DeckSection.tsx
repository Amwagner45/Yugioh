import React, { useState } from 'react';
import CardGridView from '../common/CardGridView';
import CardListView from '../common/CardListView';
import ViewModeToggle from '../common/ViewModeToggle';
import type { ViewMode } from '../common/ViewModeToggle';
import type { DeckCard, BinderCard } from '../../types';

interface DeckSectionProps {
    title: string;
    cards: DeckCard[];
    onAddCard: (cardId: number, quantity: number) => void;
    onRemoveCard: (cardId: number, quantity: number) => void;
    onCardClick?: (cardId: number) => void;
    maxCards: number;
    minCards: number;
    sectionType: 'main' | 'extra' | 'side';
    binderCards?: BinderCard[];
}

const DeckSection: React.FC<DeckSectionProps> = ({
    title,
    cards,
    onAddCard,
    onRemoveCard,
    onCardClick,
    maxCards,
    minCards,
    sectionType,
    binderCards = []
}) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('grid');

    const totalCards = cards.reduce((sum, card) => sum + card.quantity, 0);
    const isValidCount = totalCards >= minCards && totalCards <= maxCards;

    // Transform deck cards to include card details
    const cardsWithDetails = cards.map(deckCard => {
        const binderCard = binderCards.find(bc => bc.cardId === deckCard.cardId);
        return {
            cardId: deckCard.cardId,
            quantity: deckCard.quantity,
            card_details: binderCard?.card_details
        };
    });

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        if (!isDragOver) {
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
        e.dataTransfer.dropEffect = 'copy';
        setIsDragOver(true);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        try {
            const dataString = e.dataTransfer.getData('application/json');
            const data = JSON.parse(dataString);

            if (data.type === 'binder-card' && data.cardId) {
                onAddCard(data.cardId, 1);
            }
        } catch (error) {
            console.error('Invalid drag data:', error);
        }
    };

    const handleCardClick = (cardId: number) => {
        if (onCardClick) {
            onCardClick(cardId);
        } else {
            onAddCard(cardId, 1);
        }
    };

    const handleCardRightClick = (e: React.MouseEvent, cardId: number) => {
        e.preventDefault();
        onRemoveCard(cardId, 1);
    };

    const getCardCountColor = () => {
        if (totalCards < minCards) return 'text-red-600';
        if (totalCards > maxCards) return 'text-red-600';
        return 'text-green-600';
    };

    const getSectionColor = () => {
        switch (sectionType) {
            case 'main': return 'border-blue-500 bg-blue-50';
            case 'extra': return 'border-purple-500 bg-purple-50';
            case 'side': return 'border-green-500 bg-green-50';
            default: return 'border-gray-500 bg-gray-50';
        }
    };

    return (
        <div
            className={`bg-white rounded-lg shadow-lg transition-all border-2 ${isDragOver ? `ring-4 ring-opacity-50 ${getSectionColor()}` : 'border-gray-200'
                }`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                        <span className={`w-3 h-3 rounded-full mr-2 ${sectionType === 'main' ? 'bg-blue-500' :
                            sectionType === 'extra' ? 'bg-purple-500' : 'bg-green-500'
                            }`}></span>
                        {title}
                    </h2>
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

                {/* View Mode Toggle */}
                <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                        {cards.length} unique cards
                    </div>
                    <ViewModeToggle
                        currentMode={viewMode}
                        onModeChange={setViewMode}
                        availableModes={['grid', 'list']}
                    />
                </div>

                {isDragOver && (
                    <div className="mt-3 text-sm text-blue-600 font-medium text-center">
                        <div className="flex items-center justify-center space-x-2">
                            <span>📎</span>
                            <span>Drop card here to add to {title}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="min-h-[200px]">
                {cards.length === 0 ? (
                    <div className={`text-center py-12 ${isDragOver ? 'text-blue-600' : 'text-gray-500'}`}>
                        <div className="text-6xl mb-4">
                            {sectionType === 'main' ? '🎯' :
                                sectionType === 'extra' ? '⭐' : '📋'}
                        </div>
                        <p className="text-lg font-medium">No cards in {title}</p>
                        <p className="text-sm">
                            {isDragOver
                                ? 'Drop a card here!'
                                : 'Drag cards from your binder or click to add'
                            }
                        </p>
                    </div>
                ) : (
                    <div className="p-4">
                        {viewMode === 'grid' ? (
                            <CardGridView
                                cards={cardsWithDetails}
                                onCardClick={handleCardClick}
                                onCardRightClick={handleCardRightClick}
                                gridSize="sm"
                                disableZoom={true}
                            />
                        ) : (
                            <CardListView
                                cards={cardsWithDetails}
                                onCardClick={handleCardClick}
                                onCardRightClick={handleCardRightClick}
                                showThumbnails={true}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeckSection;