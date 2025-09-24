import React, { useState } from 'react';
import CardGridView from '../common/CardGridView';
import CardListView from '../common/CardListView';
import ViewModeToggle from '../common/ViewModeToggle';
import EnhancedCardContextMenu from '../common/EnhancedCardContextMenu';
import { DECK_SORT_OPTIONS, type DeckSortOption } from '../../utils/deckSorting';
import type { ViewMode } from '../common/ViewModeToggle';
import type { DeckCard, BinderCard, Banlist } from '../../types';

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
    onMoveCard?: (cardId: number, fromSection: 'main' | 'extra' | 'side', toSection: 'main' | 'extra' | 'side', quantity?: number) => void;
    onAddToSpecificSection?: (cardId: number, section: 'main' | 'extra' | 'side', quantity?: number) => void;
    allDeckCards?: { mainDeck: DeckCard[]; extraDeck: DeckCard[]; sideDeck: DeckCard[] };
    getCardRestriction?: (cardId: number) => { restriction: string; maxCopies: number; isViolation: boolean };
    currentBanlist?: Banlist | null;
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
    enhanced = false,
    onMoveCard,
    onAddToSpecificSection,
    allDeckCards,
    getCardRestriction,
    currentBanlist
}) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [sortBy, setSortBy] = useState<DeckSortOption>('type-rank-name');
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [contextMenu, setContextMenu] = useState<{
        isOpen: boolean;
        position: { x: number; y: number };
        cardId: number | null;
    }>({
        isOpen: false,
        position: { x: 0, y: 0 },
        cardId: null
    });

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = () => {
            if (showSortDropdown) {
                setShowSortDropdown(false);
            }
        };

        if (showSortDropdown) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [showSortDropdown]);

    const totalCards = cards.reduce((sum, card) => sum + card.quantity, 0);
    const isValidCount = totalCards >= minCards && totalCards <= maxCards;

    // Helper functions for context menu
    const getCardQuantities = (cardId: number) => {
        const binderCard = binderCards.find(bc => bc.cardId === cardId);
        const quantityInBinder = binderCard?.quantity || 0;

        const quantityInMain = allDeckCards?.mainDeck.find(c => c.cardId === cardId)?.quantity || 0;
        const quantityInExtra = allDeckCards?.extraDeck.find(c => c.cardId === cardId)?.quantity || 0;
        const quantityInSide = allDeckCards?.sideDeck.find(c => c.cardId === cardId)?.quantity || 0;

        const totalUsed = quantityInMain + quantityInExtra + quantityInSide;
        const availableFromBinder = Math.max(0, quantityInBinder - totalUsed);

        // Apply Yu-Gi-Oh 3-copy rule: can't exceed 3 total copies in deck
        const remainingUnder3CopyRule = Math.max(0, 3 - totalUsed);

        // Return the minimum of available from binder and what's allowed by 3-copy rule
        const availableCopies = Math.min(availableFromBinder, remainingUnder3CopyRule);

        return {
            quantityInBinder,
            quantityInMain,
            quantityInExtra,
            quantityInSide,
            availableCopies
        };
    };

    const getCardDetails = (cardId: number) => {
        return binderCards.find(bc => bc.cardId === cardId)?.card_details;
    };

    const getCurrentSectionQuantity = (cardId: number) => {
        return cards.find(c => c.cardId === cardId)?.quantity || 0;
    };

    // Transform deck cards to include card details and apply sorting
    const cardsWithDetails = cards.map(deckCard => {
        const binderCard = binderCards.find(bc => bc.cardId === deckCard.cardId);
        return {
            cardId: deckCard.cardId,
            quantity: deckCard.quantity,
            card_details: binderCard?.card_details
        };
    });

    // Apply sorting
    const sortedCards = DECK_SORT_OPTIONS[sortBy].sortFunction(cardsWithDetails);

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
        e.stopPropagation();
        setContextMenu({
            isOpen: true,
            position: { x: e.clientX, y: e.clientY },
            cardId
        });
    };

    const handleAddToSection = (cardId: number, section: 'main' | 'extra' | 'side', quantity: number = 1) => {
        if (section === sectionType) {
            // Adding to current section
            onAddCard(cardId, quantity);
        } else if (onAddToSpecificSection) {
            // Adding to different section
            onAddToSpecificSection(cardId, section, quantity);
        } else {
            // Fallback: just add to current section
            onAddCard(cardId, quantity);
        }
    };

    const handleMoveToSection = (cardId: number, fromSection: 'main' | 'extra' | 'side', toSection: 'main' | 'extra' | 'side', quantity: number = 1) => {
        if (onMoveCard) {
            onMoveCard(cardId, fromSection, toSection, quantity);
        } else {
            // Fallback: remove from current section and add to target section
            onRemoveCard(cardId, quantity);
            if (onAddToSpecificSection) {
                onAddToSpecificSection(cardId, toSection, quantity);
            }
        }
    };

    const handleRemoveFromSection = (cardId: number, section: 'main' | 'extra' | 'side', quantity: number = 1) => {
        if (section === sectionType) {
            // Removing from current section
            onRemoveCard(cardId, quantity);
        }
        // Note: We can't remove from other sections from this component
    };

    const handleCardPreview = (cardId: number) => {
        if (onCardClick) {
            onCardClick(cardId);
        }
    };

    const getSectionColor = () => {
        switch (sectionType) {
            case 'main': return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
            case 'extra': return 'border-purple-500 bg-purple-50 dark:bg-purple-900/20';
            case 'side': return 'border-green-500 bg-green-50 dark:bg-green-900/20';
            default: return 'border-gray-500 bg-gray-50 dark:bg-gray-900/20';
        }
    };

    return (
        <div
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg transition-all border-2 ${enhanced ? 'flex flex-col h-full overflow-hidden' : ''} ${isDragOver ? `ring-4 ring-opacity-50 ${getSectionColor()}` : 'border-gray-200 dark:border-gray-700'
                }`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onContextMenu={(e) => {
                e.preventDefault();
            }}
        >
            {/* Minimal Header - FaBrary Style */}
            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${sectionType === 'main' ? 'bg-blue-500' :
                            sectionType === 'extra' ? 'bg-purple-500' : 'bg-green-500'
                            }`}></span>
                        <h2 className="text-sm font-medium text-gray-900 dark:text-white">
                            {title} ({totalCards}/{maxCards})
                        </h2>
                        {!isValidCount && (
                            <span className="text-xs text-red-600">
                                {totalCards < minCards ? '⚠️' : '⚠️'}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center space-x-2">
                        {/* Sort Button */}
                        {cards.length > 1 && (
                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowSortDropdown(!showSortDropdown);
                                    }}
                                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 border border-gray-300 rounded hover:bg-gray-200 transition-colors flex items-center space-x-1"
                                    title="Sort cards"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                    </svg>
                                    <span>Sort</span>
                                </button>

                                {/* Sort Dropdown */}
                                {showSortDropdown && (
                                    <div
                                        className="absolute right-0 top-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-[200px]"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="py-1">
                                            {Object.entries(DECK_SORT_OPTIONS).map(([key, option]) => (
                                                <button
                                                    key={key}
                                                    onClick={() => {
                                                        setSortBy(key as DeckSortOption);
                                                        setShowSortDropdown(false);
                                                    }}
                                                    className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-100 transition-colors ${sortBy === key ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                                                        }`}
                                                    title={option.description}
                                                >
                                                    {option.label}
                                                    {sortBy === key && (
                                                        <span className="float-right text-blue-600">✓</span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

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
                                cards={sortedCards}
                                onCardClick={handleCardClick}
                                onCardRightClick={handleCardRightClick}
                                gridSize={enhanced ? "lg" : "sm"}
                                gapSize={enhanced ? "sm" : "md"}
                                compactPadding={enhanced}
                                allowOverlap={enhanced}
                                disableZoom={true}
                                isDeckSection={true}
                                sectionType={sectionType}
                                getCardRestriction={getCardRestriction}
                                currentBanlist={currentBanlist}
                            />
                        ) : (
                            <CardListView
                                cards={sortedCards}
                                onCardClick={handleCardClick}
                                onCardRightClick={handleCardRightClick}
                                showThumbnails={true}
                                getCardRestriction={getCardRestriction}
                                currentBanlist={currentBanlist}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Enhanced Context Menu */}
            {contextMenu.cardId && (
                <EnhancedCardContextMenu
                    isOpen={contextMenu.isOpen}
                    onClose={() => setContextMenu({ ...contextMenu, isOpen: false })}
                    position={contextMenu.position}
                    cardId={contextMenu.cardId}
                    cardDetails={getCardDetails(contextMenu.cardId)}
                    currentLocation={sectionType}
                    quantityInLocation={getCurrentSectionQuantity(contextMenu.cardId)}
                    quantityInBinder={getCardQuantities(contextMenu.cardId).quantityInBinder}
                    quantityInMain={getCardQuantities(contextMenu.cardId).quantityInMain}
                    quantityInExtra={getCardQuantities(contextMenu.cardId).quantityInExtra}
                    quantityInSide={getCardQuantities(contextMenu.cardId).quantityInSide}
                    availableCopies={getCardQuantities(contextMenu.cardId).availableCopies}
                    onAddToSection={handleAddToSection}
                    onMoveToSection={handleMoveToSection}
                    onRemoveFromSection={handleRemoveFromSection}
                    onCardPreview={handleCardPreview}
                />
            )}
        </div>
    );
};

export default DeckSection;