import React, { useState } from 'react';
import type { BinderCard, Card } from '../../types';

interface CardSetRarityManagerProps {
    binderCard: BinderCard;
    card?: Card;
    onUpdateSetInfo: (cardId: number, setCode?: string, rarity?: string) => void;
}

const CardSetRarityManager: React.FC<CardSetRarityManagerProps> = ({
    binderCard,
    card,
    onUpdateSetInfo,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedSetCode, setSelectedSetCode] = useState(binderCard.setCode || '');
    const [selectedRarity, setSelectedRarity] = useState(binderCard.rarity || '');

    const availableSets = card?.card_sets || [];

    // Get available rarities for the selected set
    const getAvailableRarities = (setCode: string): string[] => {
        if (!setCode || !card?.card_sets) return [];

        const setInfo = card.card_sets.find(set => set.set_code === setCode);
        if (setInfo) {
            return [setInfo.set_rarity];
        }

        // If no specific set found, return all unique rarities for this card
        const allRarities = new Set<string>();
        card.card_sets.forEach(set => {
            if (set.set_rarity) {
                allRarities.add(set.set_rarity);
            }
        });
        return Array.from(allRarities);
    };

    const handleSetChange = (setCode: string) => {
        setSelectedSetCode(setCode);

        // Auto-select rarity if there's only one for this set
        const availableRarities = getAvailableRarities(setCode);
        if (availableRarities.length === 1) {
            setSelectedRarity(availableRarities[0]);
        } else if (!availableRarities.includes(selectedRarity)) {
            setSelectedRarity('');
        }
    };

    const handleSave = () => {
        onUpdateSetInfo(
            binderCard.cardId,
            selectedSetCode || undefined,
            selectedRarity || undefined
        );
        setIsOpen(false);
    };

    const handleReset = () => {
        setSelectedSetCode(binderCard.setCode || '');
        setSelectedRarity(binderCard.rarity || '');
    };

    const handleCancel = () => {
        handleReset();
        setIsOpen(false);
    };

    const getCurrentSetInfo = (): { setName?: string; setCode?: string; rarity?: string } => {
        if (!binderCard.setCode) return {};

        const setInfo = card?.card_sets?.find(set => set.set_code === binderCard.setCode);
        return {
            setName: setInfo?.set_name,
            setCode: binderCard.setCode,
            rarity: binderCard.rarity,
        };
    };

    const currentSetInfo = getCurrentSetInfo();

    return (
        <div className="relative">
            {/* Current Set/Rarity Display */}
            <div className="mb-2">
                {currentSetInfo.setCode ? (
                    <div className="flex items-center justify-between">
                        <div className="text-sm">
                            <div className="text-gray-700 font-medium">
                                {currentSetInfo.setCode}
                                {currentSetInfo.rarity && (
                                    <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                                        {currentSetInfo.rarity}
                                    </span>
                                )}
                            </div>
                            {currentSetInfo.setName && (
                                <div className="text-gray-500 text-xs truncate">
                                    {currentSetInfo.setName}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                            Edit
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="flex items-center text-sm text-gray-500 hover:text-gray-700 border border-dashed border-gray-300 rounded-md px-3 py-2 w-full"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Set specific set/rarity
                    </button>
                )}
            </div>

            {/* Set/Rarity Management Modal */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium text-gray-900">Set & Rarity Information</h4>

                        {/* Set Selection */}
                        <div>
                            <label htmlFor="set-select" className="block text-xs font-medium text-gray-700 mb-1">
                                Set
                            </label>
                            <select
                                id="set-select"
                                value={selectedSetCode}
                                onChange={(e) => handleSetChange(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">No specific set</option>
                                {availableSets.map((set) => (
                                    <option key={set.set_code} value={set.set_code}>
                                        {set.set_code} - {set.set_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Rarity Selection */}
                        <div>
                            <label htmlFor="rarity-select" className="block text-xs font-medium text-gray-700 mb-1">
                                Rarity
                            </label>
                            <select
                                id="rarity-select"
                                value={selectedRarity}
                                onChange={(e) => setSelectedRarity(e.target.value)}
                                disabled={!selectedSetCode}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option value="">No specific rarity</option>
                                {selectedSetCode && getAvailableRarities(selectedSetCode).map((rarity) => (
                                    <option key={rarity} value={rarity}>
                                        {rarity}
                                    </option>
                                ))}
                            </select>
                            {!selectedSetCode && (
                                <p className="text-xs text-gray-500 mt-1">
                                    Select a set first to choose rarity
                                </p>
                            )}
                        </div>

                        {/* Price Info (if available) */}
                        {selectedSetCode && card?.card_sets && (
                            <div>
                                {(() => {
                                    const setInfo = card.card_sets.find(set => set.set_code === selectedSetCode);
                                    if (setInfo?.set_price) {
                                        return (
                                            <div className="text-xs text-gray-600 bg-gray-50 rounded-md p-2">
                                                <span className="font-medium">Price: </span>
                                                ${setInfo.set_price}
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex justify-end space-x-2 pt-2 border-t border-gray-200">
                            <button
                                onClick={handleReset}
                                className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800 border border-gray-300 rounded"
                            >
                                Reset
                            </button>
                            <button
                                onClick={handleCancel}
                                className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800 border border-gray-300 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-3 py-1 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CardSetRarityManager;