import React, { useRef, useEffect } from 'react';

interface ContextMenuOption {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    icon?: string;
}

interface CardContextMenuProps {
    isOpen: boolean;
    onClose: () => void;
    position: { x: number; y: number };
    options: ContextMenuOption[];
}

const CardContextMenu: React.FC<CardContextMenuProps> = ({
    isOpen,
    onClose,
    position,
    options
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

    return (
        <div
            ref={menuRef}
            className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[200px]"
            style={{
                left: position.x,
                top: position.y,
            }}
        >
            {options.map((option, index) => (
                <button
                    key={index}
                    onClick={() => {
                        if (!option.disabled) {
                            option.onClick();
                            onClose();
                        }
                    }}
                    disabled={option.disabled}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center space-x-2 ${option.disabled
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-gray-700 hover:bg-gray-100 cursor-pointer'
                        }`}
                >
                    {option.icon && (
                        <span className="text-base">{option.icon}</span>
                    )}
                    <span>{option.label}</span>
                </button>
            ))}
        </div>
    );
};

export default CardContextMenu;