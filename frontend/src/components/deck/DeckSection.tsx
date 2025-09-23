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
    enhanced?: boolean; // For larger card display in FaBrary style
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
    binderCards = [],
    enhanced = false
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
            className={`bg-white rounded-lg shadow-lg transition-all border-2 ${enhanced ? 'flex flex-col h-full overflow-hidden' : ''} ${isDragOver ? `ring-4 ring-opacity-50 ${getSectionColor()}` : 'border-gray-200'
                }`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Minimal Header - FaBrary Style */}
            <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${sectionType === 'main' ? 'bg-blue-500' :
                            sectionType === 'extra' ? 'bg-purple-500' : 'bg-green-500'
                            }`}></span>
                        <h2 className="text-sm font-medium text-gray-900">
                            {title} ({totalCards}/{maxCards})
                        </h2>
                        {!isValidCount && (
                            <span className="text-xs text-red-600">
                                {totalCards < minCards ? '⚠️' : '⚠️'}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center space-x-2">
                        <ViewModeToggle
                            currentMode={viewMode}
                            onModeChange={setViewMode}
                            availableModes={['grid', 'list']}
                        />
                    </div>
                </div>

                {isDragOver && (
                    <div className="mt-2 text-xs text-blue-600 text-center">
                        Drop card here to add to {title}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className={`${enhanced ? 'flex-1' : 'min-h-[200px]'}`}>
                {cards.length === 0 ? (
                    <div className={`text-center py-8 ${isDragOver ? 'text-blue-600' : 'text-gray-500'}`}>
                        <div className="text-4xl mb-2">
                            {sectionType === 'main' ? '🎯' :
                                sectionType === 'extra' ? '⭐' : '📋'}
                        </div>
                        <p className="text-sm font-medium">No cards in {title}</p>
                        <p className="text-xs">
                            {isDragOver
                                ? 'Drop a card here!'
                                : 'Drag cards from your binder or click to add'
                            }
                        </p>
                    </div>
                ) : (
                    <div className="p-3">
                        {viewMode === 'grid' ? (
                            <CardGridView
                                cards={cardsWithDetails}
                                onCardClick={handleCardClick}
                                onCardRightClick={handleCardRightClick}
                                gridSize={enhanced ? "lg" : "sm"}
                                gapSize={enhanced ? "sm" : "md"}
                                compactPadding={enhanced}
                                allowOverlap={enhanced}
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