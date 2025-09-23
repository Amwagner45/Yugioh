import React, { useRef, useEffect } from 'react';
import type { Card } from '../../types';

interface ContextMenuOption {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    icon?: string;
    group?: 'add' | 'move' | 'remove' | 'action' | 'quantity';
    dividerAfter?: boolean;
}

interface EnhancedCardContextMenuProps {
    isOpen: boolean;
    onClose: () => void;
    position: { x: number; y: number };
    cardId: number;
    cardDetails?: Card;
    currentLocation?: 'binder' | 'main' | 'extra' | 'side';
    quantityInLocation?: number;
    quantityInBinder?: number;
    quantityInMain?: number;
    quantityInExtra?: number;
    quantityInSide?: number;
    availableCopies?: number;
    onAddToSection?: (cardId: number, section: 'main' | 'extra' | 'side', quantity?: number) => void;
    onMoveToSection?: (cardId: number, fromSection: 'main' | 'extra' | 'side', toSection: 'main' | 'extra' | 'side', quantity?: number) => void;
    onRemoveFromSection?: (cardId: number, section: 'main' | 'extra' | 'side', quantity?: number) => void;
    onCardPreview?: (cardId: number) => void;
}

const EnhancedCardContextMenu: React.FC<EnhancedCardContextMenuProps> = ({
    isOpen,
    onClose,
    position,
    cardId,
    cardDetails,
    currentLocation = 'binder',
    quantityInLocation = 0,
    quantityInBinder = 0,
    quantityInMain = 0,
    quantityInExtra = 0,
    quantityInSide = 0,
    availableCopies = 0,
    onAddToSection,
    onMoveToSection,
    onRemoveFromSection,
    onCardPreview
}) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Helper function to determine if card can be added to specific deck type
    const canAddToSection = (section: 'main' | 'extra' | 'side'): boolean => {
        if (!cardDetails || !onAddToSection) return false;

        // Check if there are available copies in binder
        if (availableCopies <= 0) return false;

        // Check card type restrictions for Extra Deck
        if (section === 'extra') {
            const extraDeckTypes = ['Fusion Monster', 'Synchro Monster', 'XYZ Monster', 'Link Monster'];
            return extraDeckTypes.includes(cardDetails.type);
        }

        // Main and Side deck can accept most card types except Extra Deck monsters
        if (section === 'main' || section === 'side') {
            const extraDeckTypes = ['Fusion Monster', 'Synchro Monster', 'XYZ Monster', 'Link Monster'];
            return !extraDeckTypes.includes(cardDetails.type);
        }

        return true;
    };

    // Helper function to determine if card can be moved between sections
    const canMoveToSection = (toSection: 'main' | 'extra' | 'side'): boolean => {
        if (!cardDetails || !onMoveToSection || currentLocation === 'binder') return false;
        if (currentLocation === toSection) return false;

        // Check card type restrictions for Extra Deck
        if (toSection === 'extra') {
            const extraDeckTypes = ['Fusion Monster', 'Synchro Monster', 'XYZ Monster', 'Link Monster'];
            return extraDeckTypes.includes(cardDetails.type);
        }

        // Main and Side deck can accept most card types except Extra Deck monsters
        if (toSection === 'main' || toSection === 'side') {
            const extraDeckTypes = ['Fusion Monster', 'Synchro Monster', 'XYZ Monster', 'Link Monster'];
            return !extraDeckTypes.includes(cardDetails.type);
        }

        return true;
    };

    // Helper function to check if we can remove from current section
    const canRemoveFromSection = (): boolean => {
        return currentLocation !== 'binder' && quantityInLocation > 0 && !!onRemoveFromSection;
    };

    // Build options array based on context
    const buildOptions = (): ContextMenuOption[] => {
        const options: ContextMenuOption[] = [];

        // Card Preview - Always available
        if (onCardPreview) {
            options.push({
                label: 'See Card Preview',
                onClick: () => onCardPreview(cardId),
                icon: '🔍',
                group: 'action'
            });
        }

        // Add section - shows when card is in binder or can be added to other sections
        if (currentLocation === 'binder' || currentLocation !== 'main') {
            const canAdd = canAddToSection('main');
            const label = currentLocation === 'binder'
                ? `Add to Main Deck${quantityInMain > 0 ? ` (${quantityInMain})` : ''}`
                : `Add to Main Deck${quantityInMain > 0 ? ` (${quantityInMain})` : ''} (copy)`;
            options.push({
                label,
                onClick: () => onAddToSection?.(cardId, 'main', 1),
                disabled: !canAdd,
                icon: '🎯',
                group: 'add'
            });
        }

        if (currentLocation === 'binder' || currentLocation !== 'extra') {
            const canAdd = canAddToSection('extra');
            const label = currentLocation === 'binder'
                ? `Add to Extra Deck${quantityInExtra > 0 ? ` (${quantityInExtra})` : ''}`
                : `Add to Extra Deck${quantityInExtra > 0 ? ` (${quantityInExtra})` : ''} (copy)`;
            options.push({
                label,
                onClick: () => onAddToSection?.(cardId, 'extra', 1),
                disabled: !canAdd,
                icon: '⭐',
                group: 'add'
            });
        }

        if (currentLocation === 'binder' || currentLocation !== 'side') {
            const canAdd = canAddToSection('side');
            const label = currentLocation === 'binder'
                ? `Add to Side Deck${quantityInSide > 0 ? ` (${quantityInSide})` : ''}`
                : `Add to Side Deck${quantityInSide > 0 ? ` (${quantityInSide})` : ''} (copy)`;
            options.push({
                label,
                onClick: () => onAddToSection?.(cardId, 'side', 1),
                disabled: !canAdd,
                icon: '📋',
                group: 'add',
                dividerAfter: true
            });
        }

        // Move section - only if currently in a deck section (moves card, doesn't copy)
        if (currentLocation !== 'binder') {
            if (currentLocation !== 'main' && canMoveToSection('main')) {
                options.push({
                    label: 'Move to Main Deck (remove from here)',
                    onClick: () => onMoveToSection?.(cardId, currentLocation as 'extra' | 'side', 'main', 1),
                    icon: '↗️',
                    group: 'move'
                });
            }

            if (currentLocation !== 'extra' && canMoveToSection('extra')) {
                options.push({
                    label: 'Move to Extra Deck (remove from here)',
                    onClick: () => onMoveToSection?.(cardId, currentLocation as 'main' | 'side', 'extra', 1),
                    icon: '↗️',
                    group: 'move'
                });
            }

            if (currentLocation !== 'side' && canMoveToSection('side')) {
                options.push({
                    label: 'Move to Side Deck (remove from here)',
                    onClick: () => onMoveToSection?.(cardId, currentLocation as 'main' | 'extra', 'side', 1),
                    icon: '↗️',
                    group: 'move',
                    dividerAfter: true
                });
            }
        }

        // Remove section - only if currently in a deck section
        if (canRemoveFromSection()) {
            const sectionName = currentLocation === 'main' ? 'Main Deck' :
                currentLocation === 'extra' ? 'Extra Deck' : 'Side Deck';
            options.push({
                label: `Remove from ${sectionName}`,
                onClick: () => onRemoveFromSection?.(cardId, currentLocation as 'main' | 'extra' | 'side', 1),
                icon: '❌',
                group: 'remove',
                dividerAfter: true
            });
        }

        // Quantity management
        if (currentLocation !== 'binder' && quantityInLocation > 0) {
            options.push({
                label: 'Add 1 more copy',
                onClick: () => {
                    if (currentLocation === 'main') onAddToSection?.(cardId, 'main', 1);
                    else if (currentLocation === 'extra') onAddToSection?.(cardId, 'extra', 1);
                    else if (currentLocation === 'side') onAddToSection?.(cardId, 'side', 1);
                },
                disabled: availableCopies <= 0,
                icon: '➕',
                group: 'quantity'
            });
        } else if (currentLocation === 'binder' && availableCopies > 0) {
            // For binder cards, show add 1 more for sections they can be added to
            if (canAddToSection('main')) {
                options.push({
                    label: 'Add 1 more to Main',
                    onClick: () => onAddToSection?.(cardId, 'main', 1),
                    disabled: availableCopies <= 0,
                    icon: '➕',
                    group: 'quantity'
                });
            }
            if (canAddToSection('extra')) {
                options.push({
                    label: 'Add 1 more to Extra',
                    onClick: () => onAddToSection?.(cardId, 'extra', 1),
                    disabled: availableCopies <= 0,
                    icon: '➕',
                    group: 'quantity'
                });
            }
            if (canAddToSection('side')) {
                options.push({
                    label: 'Add 1 more to Side',
                    onClick: () => onAddToSection?.(cardId, 'side', 1),
                    disabled: availableCopies <= 0,
                    icon: '➕',
                    group: 'quantity'
                });
            }
        }

        if (currentLocation !== 'binder' && quantityInLocation > 1) {
            options.push({
                label: 'Remove 1 copy',
                onClick: () => onRemoveFromSection?.(cardId, currentLocation as 'main' | 'extra' | 'side', 1),
                icon: '➖',
                group: 'quantity'
            });
        }

        return options;
    };

    const options = buildOptions();

    // Adjust menu position to prevent going off-screen
    const adjustedPosition = { ...position };
    const menuHeight = options.length * 36 + 16; // Approximate height
    const menuWidth = 240;

    if (position.y + menuHeight > window.innerHeight) {
        adjustedPosition.y = Math.max(10, window.innerHeight - menuHeight);
    }
    if (position.x + menuWidth > window.innerWidth) {
        adjustedPosition.x = Math.max(10, window.innerWidth - menuWidth);
    }

    return (
        <div
            ref={menuRef}
            className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[240px]"
            style={{
                left: adjustedPosition.x,
                top: adjustedPosition.y,
            }}
        >
            {options.map((option, index) => (
                <React.Fragment key={index}>
                    <button
                        onClick={() => {
                            if (!option.disabled) {
                                option.onClick();
                                onClose();
                            }
                        }}
                        disabled={option.disabled}
                        className={`w-full text-left px-4 py-2 text-sm flex items-center space-x-2 ${option.disabled
                                ? 'text-gray-400 cursor-not-allowed bg-gray-50'
                                : 'text-gray-700 hover:bg-blue-50 cursor-pointer'
                            } ${option.group === 'add' ? 'border-l-2 border-l-green-400' :
                                option.group === 'move' ? 'border-l-2 border-l-blue-400' :
                                    option.group === 'remove' ? 'border-l-2 border-l-red-400' :
                                        option.group === 'quantity' ? 'border-l-2 border-l-yellow-400' :
                                            ''
                            }`}
                    >
                        {option.icon && (
                            <span className="text-base flex-shrink-0">{option.icon}</span>
                        )}
                        <span className="flex-1">{option.label}</span>
                        {option.disabled && (
                            <span className="text-xs text-gray-400 flex-shrink-0">
                                {availableCopies === 0 ? 'No copies' : 'Invalid'}
                            </span>
                        )}
                    </button>
                    {option.dividerAfter && index < options.length - 1 && (
                        <div className="border-t border-gray-200 my-1" />
                    )}
                </React.Fragment>
            ))}

            {/* Info footer */}
            <div className="border-t border-gray-200 mt-1 px-4 py-2 text-xs text-gray-500 bg-gray-50">
                <div className="flex justify-between">
                    <span>In Binder: {quantityInBinder}</span>
                    <span>Available: {availableCopies}</span>
                </div>
                {(quantityInMain > 0 || quantityInExtra > 0 || quantityInSide > 0) && (
                    <div className="flex justify-between mt-1">
                        {quantityInMain > 0 && <span>Main: {quantityInMain}</span>}
                        {quantityInExtra > 0 && <span>Extra: {quantityInExtra}</span>}
                        {quantityInSide > 0 && <span>Side: {quantityInSide}</span>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EnhancedCardContextMenu;