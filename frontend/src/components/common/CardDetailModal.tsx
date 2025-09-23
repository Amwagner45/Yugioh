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
    // Deck management props
    quantityInMain?: number;
    quantityInExtra?: number;
    quantityInSide?: number;
    availableCopies?: number;
    onAddToSection?: (cardId: number, section: 'main' | 'extra' | 'side', quantity?: number) => void;
    onMoveToSection?: (cardId: number, fromSection: 'main' | 'extra' | 'side', toSection: 'main' | 'extra' | 'side', quantity?: number) => void;
    onRemoveFromSection?: (cardId: number, section: 'main' | 'extra' | 'side', quantity?: number) => void;
}

const CardDetailModal: React.FC<CardDetailModalProps> = ({
    card,
    isOpen,
    onClose,
    onAddToBinder,
    isCardInBinder = false,
    cardQuantityInBinder = 0,
    selectedBinder,
    // Deck management props
    quantityInMain = 0,
    quantityInExtra = 0,
    quantityInSide = 0,
    availableCopies = 0,
    onAddToSection,
    onMoveToSection,
    onRemoveFromSection,
}) => {
    const [quantity, setQuantity] = React.useState(1);

    if (!isOpen || !card) return null;

    // Helper function to determine if card can be added to specific deck type
    const canAddToSection = (section: 'main' | 'extra' | 'side'): boolean => {
        if (!card || !onAddToSection) return false;

        // Check if there are available copies in binder
        if (availableCopies <= 0) return false;

        // Check card type restrictions for Extra Deck
        if (section === 'extra') {
            const extraDeckTypes = ['Fusion Monster', 'Synchro Monster', 'XYZ Monster', 'Link Monster'];
            return extraDeckTypes.includes(card.type);
        }

        // Main and Side deck can accept most card types except Extra Deck monsters
        if (section === 'main' || section === 'side') {
            const extraDeckTypes = ['Fusion Monster', 'Synchro Monster', 'XYZ Monster', 'Link Monster'];
            return !extraDeckTypes.includes(card.type);
        }

        return true;
    };

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

                            {/* Card Quantities & Deck Actions */}
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-3">Card Quantities</h3>
                                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">In Binder:</span>
                                            <span className="font-semibold text-blue-600">×{cardQuantityInBinder}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Available:</span>
                                            <span className="font-semibold text-green-600">×{availableCopies}</span>
                                        </div>
                                        {quantityInMain > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Main Deck:</span>
                                                <span className="font-semibold text-red-600">×{quantityInMain}</span>
                                            </div>
                                        )}
                                        {quantityInExtra > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Extra Deck:</span>
                                                <span className="font-semibold text-purple-600">×{quantityInExtra}</span>
                                            </div>
                                        )}
                                        {quantityInSide > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Side Deck:</span>
                                                <span className="font-semibold text-orange-600">×{quantityInSide}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Deck Actions */}
                                {onAddToSection && (
                                    <div>
                                        <h4 className="text-md font-medium text-gray-900 mb-3">Deck Actions</h4>
                                        <div className="space-y-2">
                                            {/* Add to Main Deck */}
                                            <button
                                                onClick={() => onAddToSection(card.id, 'main', 1)}
                                                disabled={!canAddToSection('main')}
                                                className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${canAddToSection('main')
                                                        ? 'border-green-200 bg-green-50 hover:bg-green-100 text-green-800'
                                                        : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                                                    }`}
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <span className="text-lg">🎯</span>
                                                    <div className="flex-1">
                                                        <div className="font-medium">
                                                            Add to Main Deck
                                                            {quantityInMain > 0 && (
                                                                <span className="ml-2 text-sm font-normal">
                                                                    (currently ×{quantityInMain})
                                                                </span>
                                                            )}
                                                        </div>
                                                        {!canAddToSection('main') && (
                                                            <div className="text-xs text-gray-500">
                                                                {availableCopies === 0 ? 'No available copies' : 'Cannot add to main deck'}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>

                                            {/* Add to Extra Deck */}
                                            <button
                                                onClick={() => onAddToSection(card.id, 'extra', 1)}
                                                disabled={!canAddToSection('extra')}
                                                className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${canAddToSection('extra')
                                                        ? 'border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-800'
                                                        : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                                                    }`}
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <span className="text-lg">⭐</span>
                                                    <div className="flex-1">
                                                        <div className="font-medium">
                                                            Add to Extra Deck
                                                            {quantityInExtra > 0 && (
                                                                <span className="ml-2 text-sm font-normal">
                                                                    (currently ×{quantityInExtra})
                                                                </span>
                                                            )}
                                                        </div>
                                                        {!canAddToSection('extra') && (
                                                            <div className="text-xs text-gray-500">
                                                                {availableCopies === 0 ? 'No available copies' : 'Not an Extra Deck monster'}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>

                                            {/* Add to Side Deck */}
                                            <button
                                                onClick={() => onAddToSection(card.id, 'side', 1)}
                                                disabled={!canAddToSection('side')}
                                                className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${canAddToSection('side')
                                                        ? 'border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-800'
                                                        : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                                                    }`}
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <span className="text-lg">📋</span>
                                                    <div className="flex-1">
                                                        <div className="font-medium">
                                                            Add to Side Deck
                                                            {quantityInSide > 0 && (
                                                                <span className="ml-2 text-sm font-normal">
                                                                    (currently ×{quantityInSide})
                                                                </span>
                                                            )}
                                                        </div>
                                                        {!canAddToSection('side') && (
                                                            <div className="text-xs text-gray-500">
                                                                {availableCopies === 0 ? 'No available copies' : 'Cannot add to side deck'}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
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