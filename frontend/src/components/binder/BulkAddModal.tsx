import React, { useState } from 'react';
import type { Card, Binder } from '../../types';

interface BulkAddModalProps {
    cards: Card[];
    selectedBinder: Binder | null;
    isOpen: boolean;
    onClose: () => void;
    onBulkAdd: (cardEntries: { cardId: number; quantity: number }[]) => void;
    isAddingCards?: boolean;
}

interface CardEntry {
    card: Card;
    quantity: number;
    selected: boolean;
}

const BulkAddModal: React.FC<BulkAddModalProps> = ({
    cards,
    selectedBinder,
    isOpen,
    onClose,
    onBulkAdd,
    isAddingCards = false,
}) => {
    const [cardEntries, setCardEntries] = useState<CardEntry[]>([]);
    const [selectAll, setSelectAll] = useState(false);
    const [defaultQuantity, setDefaultQuantity] = useState(1);

    // Initialize card entries when modal opens
    React.useEffect(() => {
        if (isOpen && cards.length > 0) {
            const entries = cards.map(card => ({
                card,
                quantity: defaultQuantity,
                selected: false,
            }));
            setCardEntries(entries);
            setSelectAll(false);
        }
    }, [isOpen, cards, defaultQuantity]);

    const handleSelectAll = (checked: boolean) => {
        setSelectAll(checked);
        setCardEntries(prev => prev.map(entry => ({
            ...entry,
            selected: checked,
        })));
    };

    const handleCardSelect = (index: number, selected: boolean) => {
        setCardEntries(prev => {
            const newEntries = [...prev];
            newEntries[index] = { ...newEntries[index], selected };
            return newEntries;
        });

        // Update select all state
        const updatedEntries = [...cardEntries];
        updatedEntries[index] = { ...updatedEntries[index], selected };
        setSelectAll(updatedEntries.every(entry => entry.selected));
    };

    const handleQuantityChange = (index: number, quantity: number) => {
        setCardEntries(prev => {
            const newEntries = [...prev];
            newEntries[index] = { ...newEntries[index], quantity: Math.max(1, quantity) };
            return newEntries;
        });
    };

    const handleApplyDefaultQuantity = () => {
        setCardEntries(prev => prev.map(entry => ({
            ...entry,
            quantity: defaultQuantity,
        })));
    };

    const handleBulkAdd = () => {
        const selectedEntries = cardEntries
            .filter(entry => entry.selected)
            .map(entry => ({
                cardId: entry.card.id,
                quantity: entry.quantity,
            }));

        if (selectedEntries.length > 0) {
            onBulkAdd(selectedEntries);
        }
    };

    const selectedCount = cardEntries.filter(entry => entry.selected).length;
    const totalCards = cardEntries.reduce((sum, entry) =>
        entry.selected ? sum + entry.quantity : sum, 0
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Bulk Add Cards</h2>
                        {selectedBinder && (
                            <p className="text-gray-600 mt-1">
                                Adding to: {selectedBinder.name}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                        disabled={isAddingCards}
                    >
                        ×
                    </button>
                </div>

                {/* Controls */}
                <div className="p-6 border-b border-gray-200 bg-gray-50">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Select All */}
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={selectAll}
                                onChange={(e) => handleSelectAll(e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                disabled={isAddingCards}
                            />
                            <span className="ml-2 text-sm font-medium text-gray-700">
                                Select All ({cards.length} cards)
                            </span>
                        </label>

                        {/* Default Quantity */}
                        <div className="flex items-center space-x-2">
                            <label htmlFor="default-quantity" className="text-sm font-medium text-gray-700">
                                Default Quantity:
                            </label>
                            <input
                                id="default-quantity"
                                type="number"
                                min="1"
                                max="99"
                                value={defaultQuantity}
                                onChange={(e) => setDefaultQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-16 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={isAddingCards}
                            />
                            <button
                                onClick={handleApplyDefaultQuantity}
                                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                                disabled={isAddingCards}
                            >
                                Apply to All
                            </button>
                        </div>

                        {/* Selection Summary */}
                        {selectedCount > 0 && (
                            <div className="text-sm text-blue-600 font-medium">
                                {selectedCount} cards selected ({totalCards} total items)
                            </div>
                        )}
                    </div>
                </div>

                {/* Card List */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {cardEntries.map((entry, index) => (
                            <div
                                key={entry.card.id}
                                className={`border rounded-lg p-4 transition-all ${entry.selected
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                {/* Card Selection */}
                                <div className="flex items-start space-x-3 mb-3">
                                    <input
                                        type="checkbox"
                                        checked={entry.selected}
                                        onChange={(e) => handleCardSelect(index, e.target.checked)}
                                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        disabled={isAddingCards}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-gray-900 text-sm leading-tight line-clamp-2">
                                            {entry.card.name}
                                        </h4>
                                    </div>
                                </div>

                                {/* Card Image */}
                                {entry.card.card_images && entry.card.card_images[0] && (
                                    <img
                                        src={entry.card.card_images[0].image_url_small}
                                        alt={entry.card.name}
                                        className="w-full h-24 object-contain mb-3 rounded"
                                        loading="lazy"
                                    />
                                )}

                                {/* Card Info */}
                                <div className="text-xs text-gray-600 space-y-1 mb-3">
                                    <div className="flex justify-between">
                                        <span>Type:</span>
                                        <span className="font-medium">{entry.card.type}</span>
                                    </div>
                                    {entry.card.race && (
                                        <div className="flex justify-between">
                                            <span>Race:</span>
                                            <span className="font-medium">{entry.card.race}</span>
                                        </div>
                                    )}
                                    {entry.card.attribute && (
                                        <div className="flex justify-between">
                                            <span>Attribute:</span>
                                            <span className="font-medium">{entry.card.attribute}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Quantity Input */}
                                <div className="space-y-2">
                                    <label className="block text-xs font-medium text-gray-700">
                                        Quantity
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="99"
                                        value={entry.quantity}
                                        onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 1)}
                                        className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        disabled={isAddingCards || !entry.selected}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {cardEntries.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-gray-600">No cards available for bulk add.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <div className="text-sm text-gray-600">
                        {selectedCount > 0 ? (
                            `${selectedCount} cards selected (${totalCards} total items)`
                        ) : (
                            'No cards selected'
                        )}
                    </div>
                    <div className="flex space-x-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                            disabled={isAddingCards}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleBulkAdd}
                            disabled={isAddingCards || selectedCount === 0 || !selectedBinder}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
                        >
                            {isAddingCards && (
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            )}
                            Add Selected Cards
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkAddModal;