import React, { useState } from 'react';
import type { Card } from '../../types';

interface CardImageProps {
    card: Card;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    quantity?: number;
    showZoom?: boolean;
    className?: string;
    onClick?: () => void;
    onRightClick?: (e: React.MouseEvent) => void;
}

const sizeClasses = {
    xs: 'w-8 h-12',     // 32x48px
    sm: 'w-12 h-16',    // 48x64px  
    md: 'w-16 h-24',    // 64x96px
    lg: 'w-32 h-48',    // 128x192px (close to 200x300px requirement)
    xl: 'w-48 h-72'     // 192x288px (larger for main display)
};

const CardImage: React.FC<CardImageProps> = ({
    card,
    size = 'md',
    quantity,
    showZoom = true,
    className = '',
    onClick,
    onRightClick
}) => {
    const [isZoomed, setIsZoomed] = useState(false);
    const [imageError, setImageError] = useState(false);

    const cardImage = card.card_images?.[0];

    if (!cardImage) {
        return (
            <div className={`${sizeClasses[size]} ${className} bg-gray-200 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center`}>
                <div className="text-center text-gray-500">
                    <div className="text-xs">No Image</div>
                    <div className="text-[10px] truncate px-1">{card.name}</div>
                </div>
            </div>
        );
    }

    const handleImageError = () => {
        setImageError(true);
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        if (e.button === 0) {
            // Left click only
            e.stopPropagation();

            // Only auto-zoom if we don't have a right-click handler AND showZoom is enabled
            if (showZoom && !onRightClick) {
                setIsZoomed(true);
            }

            // Only call onClick if this is actually a left click
            onClick?.();
        } else if (e.button === 2) {
            // Right click only
            e.preventDefault();
            e.stopPropagation();

            // Don't call onClick for right clicks
            onRightClick?.(e);
            return; // Early return to prevent any other handling
        }
    };

    // Create stacked effect for quantities > 1
    const stackOffset = quantity && quantity > 1 ? 'shadow-lg' : '';
    const stackStyle = quantity && quantity > 1 ? {
        position: 'relative' as const,
    } : {};

    return (
        <>
            <div
                className={`relative ${sizeClasses[size]} ${className} ${stackOffset}`}
                style={stackStyle}
                onMouseUp={handleMouseUp}
                onContextMenu={(e) => {
                    e.preventDefault();
                    if (onRightClick) {
                        onRightClick(e);
                    }
                }}
                onMouseDown={(e) => {
                    if (e.button === 2) { // Right click
                        e.preventDefault();
                        e.stopPropagation();
                        if (onRightClick) {
                            onRightClick(e);
                        }
                    }
                }}
            >
                {/* Stack effect for multiple quantities */}
                {quantity && quantity > 1 && (
                    <>
                        <div className="absolute top-1 left-1 w-full h-full bg-gray-300 rounded-lg -z-10"></div>
                        {quantity > 2 && (
                            <div className="absolute top-2 left-2 w-full h-full bg-gray-400 rounded-lg -z-20"></div>
                        )}
                    </>
                )}

                {/* Main card image */}
                <img
                    src={imageError ? cardImage.image_url : cardImage.image_url_small}
                    alt={card.name}
                    className={`w-full h-full object-cover rounded-lg border border-gray-300 transition-all duration-200 ${onClick ? 'cursor-pointer hover:border-blue-400 hover:shadow-md' : ''
                        }`}
                    onError={handleImageError}
                    loading="lazy"
                    onMouseUp={(e) => {
                        if (e.button === 2) {
                            e.preventDefault();
                            e.stopPropagation();
                            onRightClick?.(e);
                        }
                    }}
                    onContextMenu={(e) => {
                        e.preventDefault();
                    }}
                />

                {/* Quantity indicator overlay - Top left inside card */}
                {quantity && quantity > 1 && (
                    <div className="absolute top-1 left-1 bg-orange-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-white shadow-sm">
                        {quantity > 99 ? '99+' : quantity}
                    </div>
                )}

                {/* Hover zoom indicator */}
                {showZoom && onClick && (
                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-opacity duration-200 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                )}
            </div>

            {/* Zoom Modal */}
            {isZoomed && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
                    onClick={() => setIsZoomed(false)}
                >
                    <div className="relative max-w-4xl max-h-full">
                        <img
                            src={cardImage.image_url}
                            alt={card.name}
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />

                        {/* Close button */}
                        <button
                            onClick={() => setIsZoomed(false)}
                            className="absolute top-4 right-4 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full p-2 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Card info overlay */}
                        <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-70 text-white p-4 rounded-lg">
                            <h3 className="font-bold text-lg mb-2">{card.name}</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <div><strong>Type:</strong> {card.type}</div>
                                    {card.race && <div><strong>Race:</strong> {card.race}</div>}
                                    {card.attribute && <div><strong>Attribute:</strong> {card.attribute}</div>}
                                </div>
                                <div>
                                    {card.level && <div><strong>Level:</strong> {card.level}</div>}
                                    {card.atk !== null && <div><strong>ATK:</strong> {card.atk}</div>}
                                    {card.def !== null && <div><strong>DEF:</strong> {card.def}</div>}
                                </div>
                            </div>
                            {card.desc && (
                                <div className="mt-2 text-xs max-h-20 overflow-y-auto">
                                    <strong>Description:</strong> {card.desc}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CardImage;