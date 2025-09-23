import React, { useState } from 'react';
import type { Card, BanlistSection } from '../../types';

interface BanlistSectionsProps {
    sections: BanlistSection[];
    draggedCard: Card | null;
    onAddCard: (card: Card, sectionType: BanlistSection['type']) => void;
    onRemoveCard: (cardId: number) => void;
}

interface BanlistSectionCardProps {
    card: Card;
    onRemove: (cardId: number) => void;
    maxCopies: number;
}

const BanlistSectionCard: React.FC<BanlistSectionCardProps> = ({ card, onRemove, maxCopies }) => {
    if (!card || (card as any).error) {
        return (
            <div className="bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2">
                <div className="text-red-700 dark:text-red-300 text-sm">
                    {card?.name || `Card ID ${card?.id || 'unknown'} not found`}
                </div>
            </div>
        );
    }

    const cardImage = card.card_images?.[0];

    return (
        <div className="group bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-2 hover:shadow-md transition-shadow">
            <div className="flex items-start space-x-2">
                {/* Card Image */}
                {cardImage && (
                    <img
                        src={cardImage.image_url_small}
                        alt={card.name}
                        className="w-12 h-17 object-cover rounded border border-gray-300 dark:border-gray-500"
                    />
                )}

                {/* Card Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {card.name}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {card.type} • Max: {maxCopies}
                            </p>
                            {card.atk !== undefined && card.def !== undefined && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    ATK/{card.atk} DEF/{card.def}
                                </p>
                            )}
                        </div>

                        {/* Remove Button */}
                        <button
                            onClick={() => onRemove(card.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-opacity"
                            title="Remove card"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const BanlistSections: React.FC<BanlistSectionsProps> = ({
    sections,
    draggedCard,
    onAddCard,
    onRemoveCard
}) => {
    const [dragOverSection, setDragOverSection] = useState<string | null>(null);

    const handleDragOver = (e: React.DragEvent, sectionType: BanlistSection['type']) => {
        e.preventDefault();
        setDragOverSection(sectionType);
    };

    const handleDragLeave = () => {
        setDragOverSection(null);
    };

    const handleDrop = (e: React.DragEvent, section: BanlistSection) => {
        e.preventDefault();
        setDragOverSection(null);

        if (draggedCard) {
            onAddCard(draggedCard, section.type);
        }
    };

    return (
        <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {sections.map((section) => (
                    <div key={section.type} className="flex flex-col">
                        {/* Section Header */}
                        <div className={`${section.bgColor} ${section.borderColor} border rounded-t-lg p-4`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className={`text-lg font-semibold ${section.color}`}>
                                        {section.title}
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Max {section.maxCopies} {section.maxCopies === 1 ? 'copy' : 'copies'}
                                    </p>
                                </div>
                                <div className={`px-2 py-1 rounded text-sm font-medium ${section.color} ${section.bgColor}`}>
                                    {section.cards.length}
                                </div>
                            </div>
                        </div>

                        {/* Drop Zone */}
                        <div
                            className={`flex-1 min-h-96 border-l border-r border-b ${section.borderColor} ${dragOverSection === section.type
                                ? `${section.bgColor} border-dashed border-2`
                                : 'bg-white dark:bg-gray-800 border-solid'
                                } rounded-b-lg p-4 transition-colors`}
                            onDragOver={(e) => handleDragOver(e, section.type)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, section)}
                        >
                            {section.cards.length === 0 ? (
                                <div className="flex items-center justify-center h-32 text-gray-400 dark:text-gray-500">
                                    <div className="text-center">
                                        <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        <p className="text-sm">Drop cards here</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {section.cards.map((card) => (
                                        <BanlistSectionCard
                                            key={card.id}
                                            card={card}
                                            onRemove={onRemoveCard}
                                            maxCopies={section.maxCopies}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BanlistSections;