import React, { useState } from 'react';
import CardImage from './CardImage';
import type { Card } from '../../types';

interface CardTableViewProps {
    cards: Array<{
        cardId: number;
        quantity: number;
        card_details?: Card;
        availableCopies?: number;
        usedInDeck?: number;
        setCode?: string;
        rarity?: string;
        tags?: string[];
    }>;
    onCardClick?: (cardId: number) => void;
    onCardRightClick?: (e: React.MouseEvent, cardId: number) => void;
    showDeckInfo?: boolean;
    className?: string;
}

type SortField = 'name' | 'type' | 'attribute' | 'level' | 'atk' | 'def' | 'quantity' | 'rarity';
type SortDirection = 'asc' | 'desc';

const CardTableView: React.FC<CardTableViewProps> = ({
    cards,
    onCardClick,
    onCardRightClick,
    showDeckInfo = false,
    className = ''
}) => {
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const sortedCards = [...cards].sort((a, b) => {
        const direction = sortDirection === 'asc' ? 1 : -1;
        const cardA = a.card_details;
        const cardB = b.card_details;

        switch (sortField) {
            case 'name':
                return direction * (cardA?.name || '').localeCompare(cardB?.name || '');
            case 'type':
                return direction * (cardA?.type || '').localeCompare(cardB?.type || '');
            case 'attribute':
                return direction * (cardA?.attribute || '').localeCompare(cardB?.attribute || '');
            case 'level':
                return direction * ((cardA?.level || 0) - (cardB?.level || 0));
            case 'atk':
                return direction * ((cardA?.atk || 0) - (cardB?.atk || 0));
            case 'def':
                return direction * ((cardA?.def || 0) - (cardB?.def || 0));
            case 'quantity':
                return direction * (a.quantity - b.quantity);
            case 'rarity':
                return direction * (a.rarity || '').localeCompare(b.rarity || '');
            default:
                return 0;
        }
    });

    const SortHeader: React.FC<{ field: SortField; children: React.ReactNode }> = ({ field, children }) => (
        <th
            className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50 select-none"
            onClick={() => handleSort(field)}
        >
            <div className="flex items-center space-x-1">
                <span>{children}</span>
                {sortField === field && (
                    <span className="text-blue-600">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                )}
            </div>
        </th>
    );

    if (cards.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4">📋</div>
                <p className="text-xl">No cards to display</p>
                <p className="text-sm">Add some cards to get started</p>
            </div>
        );
    }

    return (
        <div className={`bg-white rounded-lg shadow overflow-hidden ${className}`}>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Image
                            </th>
                            <SortHeader field="name">Name</SortHeader>
                            <SortHeader field="type">Type</SortHeader>
                            <SortHeader field="attribute">Attribute</SortHeader>
                            <SortHeader field="level">Level</SortHeader>
                            <SortHeader field="atk">ATK</SortHeader>
                            <SortHeader field="def">DEF</SortHeader>
                            <SortHeader field="rarity">Rarity</SortHeader>
                            <SortHeader field="quantity">Qty</SortHeader>
                            {showDeckInfo && (
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Deck Status
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {sortedCards.map((cardData, index) => {
                            const isAvailable = (cardData.availableCopies ?? cardData.quantity) > 0;
                            const hasCard = !!cardData.card_details;
                            const card = cardData.card_details;

                            return (
                                <tr
                                    key={`${cardData.cardId}-${index}`}
                                    className={`transition-colors ${
                                        hasCard
                                            ? isAvailable
                                                ? 'hover:bg-blue-50 cursor-pointer'
                                                : 'bg-red-50 cursor-not-allowed opacity-75'
                                            : 'bg-gray-50 opacity-60'
                                    }`}
                                    onClick={isAvailable && onCardClick ? () => onCardClick(cardData.cardId) : undefined}
                                    onContextMenu={onCardRightClick ? (e) => onCardRightClick(e, cardData.cardId) : undefined}
                                >
                                    {/* Image */}
                                    <td className="px-3 py-2 whitespace-nowrap">
                                        {hasCard ? (
                                            <CardImage
                                                card={card!}
                                                size="xs"
                                                showZoom={false}
                                            />
                                        ) : (
                                            <div className="w-8 h-12 bg-gray-200 rounded border flex items-center justify-center">
                                                <span className="text-xs text-gray-500">?</span>
                                            </div>
                                        )}
                                    </td>

                                    {/* Name */}
                                    <td className="px-3 py-2 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {hasCard ? card!.name : `Card ID: ${cardData.cardId}`}
                                        </div>
                                    </td>

                                    {/* Type */}
                                    <td className="px-3 py-2 whitespace-nowrap">
                                        <div className="text-sm text-gray-600">
                                            {hasCard ? card!.type : '-'}
                                        </div>
                                    </td>

                                    {/* Attribute */}
                                    <td className="px-3 py-2 whitespace-nowrap">
                                        <div className="text-sm text-gray-600">
                                            {hasCard ? (card!.attribute || '-') : '-'}
                                        </div>
                                    </td>

                                    {/* Level */}
                                    <td className="px-3 py-2 whitespace-nowrap">
                                        <div className="text-sm text-gray-600">
                                            {hasCard ? (card!.level || '-') : '-'}
                                        </div>
                                    </td>

                                    {/* ATK */}
                                    <td className="px-3 py-2 whitespace-nowrap">
                                        <div className="text-sm text-gray-600">
                                            {hasCard ? (card!.atk !== null ? card!.atk : '-') : '-'}
                                        </div>
                                    </td>

                                    {/* DEF */}
                                    <td className="px-3 py-2 whitespace-nowrap">
                                        <div className="text-sm text-gray-600">
                                            {hasCard ? (card!.def !== null ? card!.def : '-') : '-'}
                                        </div>
                                    </td>

                                    {/* Rarity */}
                                    <td className="px-3 py-2 whitespace-nowrap">
                                        <div className="text-xs text-gray-600">
                                            {cardData.rarity || '-'}
                                        </div>
                                    </td>

                                    {/* Quantity */}
                                    <td className="px-3 py-2 whitespace-nowrap">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {cardData.quantity}
                                        </span>
                                    </td>

                                    {/* Deck Status */}
                                    {showDeckInfo && (
                                        <td className="px-3 py-2 whitespace-nowrap">
                                            <div className="text-xs">
                                                {cardData.usedInDeck ? (
                                                    <>
                                                        <div className="text-orange-600 font-medium">
                                                            {cardData.usedInDeck} in deck
                                                        </div>
                                                        <div className={`font-medium ${isAvailable ? 'text-green-600' : 'text-red-600'}`}>
                                                            {cardData.availableCopies || 0} left
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-green-600 font-medium">
                                                        {cardData.availableCopies || cardData.quantity} available
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CardTableView;