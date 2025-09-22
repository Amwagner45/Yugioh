import React, { useState } from 'react';
import type { BinderCard, Card } from '../../types';

interface CardQuantityManagerProps {
    binderCard: BinderCard;
    card?: Card; // Optional card details for display
    onUpdateQuantity: (cardId: number, newQuantity: number) => void;
    onRemoveCard: (cardId: number) => void;
    isUpdating?: boolean;
}

interface QuantityInputProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    disabled?: boolean;
}

const QuantityInput: React.FC<QuantityInputProps> = ({
    value,
    onChange,
    min = 1,
    max = 99,
    disabled = false,
}) => {
    const [inputValue, setInputValue] = useState(value.toString());

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        
        const numValue = parseInt(newValue);
        if (!isNaN(numValue) && numValue >= min && numValue <= max) {
            onChange(numValue);
        }
    };

    const handleInputBlur = () => {
        // Ensure input shows the actual value on blur
        setInputValue(value.toString());
    };

    const handleIncrement = () => {
        if (value < max) {
            const newValue = value + 1;
            setInputValue(newValue.toString());
            onChange(newValue);
        }
    };

    const handleDecrement = () => {
        if (value > min) {
            const newValue = value - 1;
            setInputValue(newValue.toString());
            onChange(newValue);
        }
    };

    return (
        <div className="flex items-center space-x-1">
            <button
                onClick={handleDecrement}
                disabled={disabled || value <= min}
                className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-l-md transition-colors"
                title="Decrease quantity"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
            </button>
            
            <input
                type="number"
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                min={min}
                max={max}
                disabled={disabled}
                className="w-16 h-8 text-center border-t border-b border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            
            <button
                onClick={handleIncrement}
                disabled={disabled || value >= max}
                className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-r-md transition-colors"
                title="Increase quantity"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            </button>
        </div>
    );
};

const CardQuantityManager: React.FC<CardQuantityManagerProps> = ({
    binderCard,
    card,
    onUpdateQuantity,
    onRemoveCard,
    isUpdating = false,
}) => {
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

    const handleQuantityChange = (newQuantity: number) => {
        if (newQuantity !== binderCard.quantity) {
            onUpdateQuantity(binderCard.cardId, newQuantity);
        }
    };

    const handleRemoveConfirm = () => {
        onRemoveCard(binderCard.cardId);
        setShowRemoveConfirm(false);
    };

    const handleQuickSet = (quantity: number) => {
        if (quantity !== binderCard.quantity) {
            onUpdateQuantity(binderCard.cardId, quantity);
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            {/* Card Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    {card ? (
                        <div>
                            <h4 className="font-medium text-gray-900 mb-1">{card.name}</h4>
                            <div className="text-sm text-gray-600 space-y-1">
                                <div>Type: {card.type}</div>
                                {card.race && <div>Race: {card.race}</div>}
                                {card.attribute && <div>Attribute: {card.attribute}</div>}
                            </div>
                        </div>
                    ) : (
                        <div>
                            <h4 className="font-medium text-gray-900 mb-1">Card ID: {binderCard.cardId}</h4>
                            <div className="text-sm text-gray-500">Loading card details...</div>
                        </div>
                    )}
                </div>

                {/* Card Image */}
                {card?.card_images?.[0] && (
                    <img
                        src={card.card_images[0].image_url_small}
                        alt={card.name}
                        className="w-16 h-20 object-contain ml-3"
                        loading="lazy"
                    />
                )}
            </div>

            {/* Additional Card Info */}
            {binderCard.setCode && (
                <div className="text-sm text-gray-600 mb-2">
                    Set: {binderCard.setCode}
                    {binderCard.rarity && <span className="ml-2">({binderCard.rarity})</span>}
                </div>
            )}

            {binderCard.condition && (
                <div className="text-sm text-gray-600 mb-2">
                    Condition: {binderCard.condition}
                </div>
            )}

            {binderCard.notes && (
                <div className="text-sm text-gray-600 mb-3 italic">
                    Notes: {binderCard.notes}
                </div>
            )}

            {/* Quantity Management */}
            <div className="border-t pt-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-700">Quantity:</span>
                        <QuantityInput
                            value={binderCard.quantity}
                            onChange={handleQuantityChange}
                            disabled={isUpdating}
                        />
                    </div>

                    {/* Quick Set Buttons */}
                    <div className="flex items-center space-x-1">
                        <span className="text-xs text-gray-500 mr-2">Quick:</span>
                        {[1, 2, 3, 5, 10].map((qty) => (
                            <button
                                key={qty}
                                onClick={() => handleQuickSet(qty)}
                                disabled={isUpdating}
                                className={`px-2 py-1 text-xs rounded border transition-colors ${
                                    binderCard.quantity === qty
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {qty}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center mt-3 pt-3 border-t">
                    <div className="text-sm text-gray-500">
                        Total value: {binderCard.quantity} card{binderCard.quantity !== 1 ? 's' : ''}
                    </div>

                    <div className="flex space-x-2">
                        {/* Remove Card Button */}
                        {!showRemoveConfirm ? (
                            <button
                                onClick={() => setShowRemoveConfirm(true)}
                                disabled={isUpdating}
                                className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Remove
                            </button>
                        ) : (
                            <div className="flex space-x-1">
                                <button
                                    onClick={() => setShowRemoveConfirm(false)}
                                    disabled={isUpdating}
                                    className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 border border-gray-300 rounded"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRemoveConfirm}
                                    disabled={isUpdating}
                                    className="px-2 py-1 text-xs text-white bg-red-600 hover:bg-red-700 rounded"
                                >
                                    Confirm
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Loading Indicator */}
                {isUpdating && (
                    <div className="mt-2 flex items-center text-sm text-blue-600">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Updating...
                    </div>
                )}
            </div>
        </div>
    );
};

export default CardQuantityManager;