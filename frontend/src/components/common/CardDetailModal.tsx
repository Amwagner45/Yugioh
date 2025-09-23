import React from 'react';
import type { Card } from '../../types';

interface CardDetailModalProps {
    card: Card | null;
    isOpen: boolean;
    onClose: () => void;
    onAddToBinder?: (cardId: number, quantity: number) => void;
    isCardInBinder?: boolean;
    cardQuantityInBinder?: number;
    selectedBinder?: any;
}

const CardDetailModal: React.FC<CardDetailModalProps> = ({
    card,
    isOpen,
    onClose,
    onAddToBinder,
    isCardInBinder = false,
    cardQuantityInBinder = 0,
    selectedBinder,
}) => {
    const [quantity, setQuantity] = React.useState(1);

    if (!isOpen || !card) return null;

    const handleAddToBinder = () => {
        if (onAddToBinder && selectedBinder) {
            onAddToBinder(card.id, quantity);
            onClose();
        }
    };

    const formatCardText = (text: string) => {
        // Format card text with proper line breaks and styling
        return text.split('\n').map((line, index) => (
            <span key={index}>
                {line}
                {index < text.split('\n').length - 1 && <br />}
            </span>
        ));
    };

    const getCardTypeColor = (type: string) => {
        if (type.includes('Monster')) {
            if (type.includes('Fusion')) return 'bg-purple-100 text-purple-800';
            if (type.includes('Synchro')) return 'bg-white text-gray-800 border border-gray-300';
            if (type.includes('XYZ') || type.includes('Xyz')) return 'bg-black text-white';
            if (type.includes('Link')) return 'bg-blue-100 text-blue-800';
            if (type.includes('Ritual')) return 'bg-blue-100 text-blue-800';
            return 'bg-yellow-100 text-yellow-800';
        }
        if (type.includes('Spell')) return 'bg-green-100 text-green-800';
        if (type.includes('Trap')) return 'bg-pink-100 text-pink-800';
        return 'bg-gray-100 text-gray-800';
    };

    const getAttributeIcon = (attribute: string) => {
        const icons: Record<string, string> = {
            'LIGHT': '☀️',
            'DARK': '🌙',
            'FIRE': '🔥',
            'WATER': '💧',
            'EARTH': '🌍',
            'WIND': '💨',
            'DIVINE': '✨',
        };
        return icons[attribute] || '⭐';
    };

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={handleBackdropClick}
        >
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-screen overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900">{card.name}</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Column - Card Image */}
                        <div className="space-y-4">
                            {card.card_images && card.card_images[0] && (
                                <div className="flex justify-center">
                                    <img
                                        src={card.card_images[0].image_url}
                                        alt={card.name}
                                        className="max-w-full h-auto rounded-lg shadow-lg"
                                        style={{ maxHeight: '600px' }}
                                    />
                                </div>
                            )}

                            {/* Quick Actions */}
                            {selectedBinder && onAddToBinder && (
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                                        Add to Binder
                                    </h3>
                                    <p className="text-sm text-gray-600 mb-3">
                                        Adding to: {selectedBinder.name}
                                    </p>

                                    {isCardInBinder && (
                                        <div className="mb-3 text-sm text-green-600 font-medium">
                                            Currently in binder: ×{cardQuantityInBinder}
                                        </div>
                                    )}

                                    <div className="flex items-center space-x-3">
                                        <div className="flex-1">
                                            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                                                Quantity
                                            </label>
                                            <input
                                                id="quantity"
                                                type="number"
                                                min="1"
                                                max="99"
                                                value={quantity}
                                                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <button
                                            onClick={handleAddToBinder}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            Add to Binder
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Column - Card Details */}
                        <div className="space-y-6">
                            {/* Basic Info */}
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-3">Card Information</h3>
                                <div className="space-y-3">
                                    {/* Card Type */}
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm font-medium text-gray-500">Type:</span>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCardTypeColor(card.type)}`}>
                                            {card.type}
                                        </span>
                                    </div>

                                    {/* Race */}
                                    {card.race && (
                                        <div className="flex items-center space-x-2">
                                            <span className="text-sm font-medium text-gray-500">Race:</span>
                                            <span className="text-sm text-gray-900">{card.race}</span>
                                        </div>
                                    )}

                                    {/* Attribute */}
                                    {card.attribute && (
                                        <div className="flex items-center space-x-2">
                                            <span className="text-sm font-medium text-gray-500">Attribute:</span>
                                            <span className="text-sm text-gray-900">
                                                {getAttributeIcon(card.attribute)} {card.attribute}
                                            </span>
                                        </div>
                                    )}

                                    {/* Level */}
                                    {card.level && (
                                        <div className="flex items-center space-x-2">
                                            <span className="text-sm font-medium text-gray-500">Level:</span>
                                            <span className="text-sm text-gray-900">
                                                {'⭐'.repeat(card.level)} ({card.level})
                                            </span>
                                        </div>
                                    )}

                                    {/* ATK/DEF */}
                                    {(card.atk !== undefined || card.def !== undefined) && (
                                        <div className="flex items-center space-x-4">
                                            {card.atk !== undefined && (
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-sm font-medium text-gray-500">ATK:</span>
                                                    <span className="text-sm font-bold text-red-600">{card.atk}</span>
                                                </div>
                                            )}
                                            {card.def !== undefined && (
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-sm font-medium text-gray-500">DEF:</span>
                                                    <span className="text-sm font-bold text-blue-600">{card.def}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Card Description */}
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-3">Description</h3>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-sm text-gray-700 leading-relaxed">
                                        {formatCardText(card.desc)}
                                    </p>
                                </div>
                            </div>

                            {/* Banlist Information */}
                            {card.banlist_info && (
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-3">Banlist Status</h3>
                                    <div className="space-y-2">
                                        {card.banlist_info.ban_tcg && (
                                            <div className="flex items-center space-x-2">
                                                <span className="text-sm font-medium text-gray-500">TCG:</span>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${card.banlist_info.ban_tcg === 'Forbidden' ? 'bg-red-100 text-red-800' :
                                                    card.banlist_info.ban_tcg === 'Limited' ? 'bg-yellow-100 text-yellow-800' :
                                                        card.banlist_info.ban_tcg === 'Semi-Limited' ? 'bg-orange-100 text-orange-800' :
                                                            'bg-green-100 text-green-800'
                                                    }`}>
                                                    {card.banlist_info.ban_tcg}
                                                </span>
                                            </div>
                                        )}
                                        {card.banlist_info.ban_ocg && (
                                            <div className="flex items-center space-x-2">
                                                <span className="text-sm font-medium text-gray-500">OCG:</span>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${card.banlist_info.ban_ocg === 'Forbidden' ? 'bg-red-100 text-red-800' :
                                                    card.banlist_info.ban_ocg === 'Limited' ? 'bg-yellow-100 text-yellow-800' :
                                                        card.banlist_info.ban_ocg === 'Semi-Limited' ? 'bg-orange-100 text-orange-800' :
                                                            'bg-green-100 text-green-800'
                                                    }`}>
                                                    {card.banlist_info.ban_ocg}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Card Sets */}
                            {card.card_sets && card.card_sets.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-3">Available Sets</h3>
                                    <div className="max-h-40 overflow-y-auto">
                                        <div className="space-y-2">
                                            {card.card_sets.slice(0, 10).map((set, index) => (
                                                <div key={index} className="bg-gray-50 rounded-lg p-3">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {set.set_name}
                                                            </div>
                                                            <div className="text-xs text-gray-600">
                                                                {set.set_code} • {set.set_rarity}
                                                            </div>
                                                        </div>
                                                        {set.set_price && (
                                                            <div className="text-sm font-medium text-green-600">
                                                                ${set.set_price}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {card.card_sets.length > 10 && (
                                                <div className="text-sm text-gray-500 text-center">
                                                    + {card.card_sets.length - 10} more sets
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CardDetailModal;