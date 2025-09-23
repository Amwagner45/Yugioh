import React, { useMemo } from 'react';
import type { Card, BinderCard } from '../../types';

interface BinderStatsProps {
    binderCards: BinderCard[];
    cardCache: Map<number, Card>;
    binderName: string;
}

interface CardTypeStats {
    [type: string]: {
        count: number;
        quantity: number;
        percentage: number;
    };
}

interface RarityStats {
    [rarity: string]: {
        count: number;
        quantity: number;
        percentage: number;
    };
}

interface SetStats {
    [setCode: string]: {
        setName: string;
        count: number;
        quantity: number;
        percentage: number;
    };
}

interface AttributeStats {
    [attribute: string]: {
        count: number;
        quantity: number;
        percentage: number;
    };
}

interface LevelStats {
    [level: string]: {
        count: number;
        quantity: number;
        percentage: number;
    };
}

const BinderStats: React.FC<BinderStatsProps> = ({
    binderCards,
    cardCache,
    binderName,
}) => {
    const stats = useMemo(() => {
        const totalCards = binderCards.reduce((sum, bc) => sum + bc.quantity, 0);
        const uniqueCards = binderCards.length;

        // Card Type Distribution
        const typeStats: CardTypeStats = {};
        const rarityStats: RarityStats = {};
        const setStats: SetStats = {};
        const attributeStats: AttributeStats = {};
        const levelStats: LevelStats = {};

        let loadedCards = 0;

        binderCards.forEach(binderCard => {
            const card = cardCache.get(binderCard.cardId);
            if (!card) return;

            loadedCards++;

            // Type stats
            const type = card.type || 'Unknown';
            if (!typeStats[type]) {
                typeStats[type] = { count: 0, quantity: 0, percentage: 0 };
            }
            typeStats[type].count += 1;
            typeStats[type].quantity += binderCard.quantity;

            // Attribute stats (for monsters)
            if (card.attribute) {
                const attribute = card.attribute;
                if (!attributeStats[attribute]) {
                    attributeStats[attribute] = { count: 0, quantity: 0, percentage: 0 };
                }
                attributeStats[attribute].count += 1;
                attributeStats[attribute].quantity += binderCard.quantity;
            }

            // Level stats (for monsters)
            if (card.level !== undefined) {
                const level = `Level ${card.level}`;
                if (!levelStats[level]) {
                    levelStats[level] = { count: 0, quantity: 0, percentage: 0 };
                }
                levelStats[level].count += 1;
                levelStats[level].quantity += binderCard.quantity;
            }

            // Rarity and Set stats - use specific rarity/set from binder card
            if (binderCard.rarity) {
                const rarity = binderCard.rarity;
                if (!rarityStats[rarity]) {
                    rarityStats[rarity] = { count: 0, quantity: 0, percentage: 0 };
                }
                rarityStats[rarity].count += 1;
                rarityStats[rarity].quantity += binderCard.quantity;
            } else if (card.card_sets && card.card_sets.length > 0) {
                // Fallback to first available rarity if no specific rarity set
                const rarity = card.card_sets[0].set_rarity;
                if (rarity && !rarityStats[rarity]) {
                    rarityStats[rarity] = { count: 0, quantity: 0, percentage: 0 };
                }
                if (rarity) {
                    rarityStats[rarity].count += 1;
                    rarityStats[rarity].quantity += binderCard.quantity;
                }
            }

            if (binderCard.setCode) {
                const setCode = binderCard.setCode;
                if (!setStats[setCode]) {
                    const setName = card.card_sets?.find(s => s.set_code === setCode)?.set_name || setCode;
                    setStats[setCode] = { setName, count: 0, quantity: 0, percentage: 0 };
                }
                setStats[setCode].count += 1;
                setStats[setCode].quantity += binderCard.quantity;
            } else if (card.card_sets && card.card_sets.length > 0) {
                // Fallback to first available set if no specific set code set
                const setCode = card.card_sets[0].set_code;
                if (setCode && !setStats[setCode]) {
                    const setName = card.card_sets[0].set_name;
                    setStats[setCode] = { setName, count: 0, quantity: 0, percentage: 0 };
                }
                if (setCode) {
                    setStats[setCode].count += 1;
                    setStats[setCode].quantity += binderCard.quantity;
                }
            }
        });

        // Calculate percentages
        Object.values(typeStats).forEach(stat => {
            stat.percentage = totalCards > 0 ? (stat.quantity / totalCards) * 100 : 0;
        });

        Object.values(rarityStats).forEach(stat => {
            stat.percentage = totalCards > 0 ? (stat.quantity / totalCards) * 100 : 0;
        });

        Object.values(setStats).forEach(stat => {
            stat.percentage = totalCards > 0 ? (stat.quantity / totalCards) * 100 : 0;
        });

        Object.values(attributeStats).forEach(stat => {
            stat.percentage = totalCards > 0 ? (stat.quantity / totalCards) * 100 : 0;
        });

        Object.values(levelStats).forEach(stat => {
            stat.percentage = totalCards > 0 ? (stat.quantity / totalCards) * 100 : 0;
        });

        // Sort by quantity (descending)
        const sortedTypes = Object.entries(typeStats).sort((a, b) => b[1].quantity - a[1].quantity);
        const sortedRarities = Object.entries(rarityStats).sort((a, b) => b[1].quantity - a[1].quantity);
        const sortedSets = Object.entries(setStats).sort((a, b) => b[1].quantity - a[1].quantity);
        const sortedAttributes = Object.entries(attributeStats).sort((a, b) => b[1].quantity - a[1].quantity);
        const sortedLevels = Object.entries(levelStats).sort((a, b) => {
            // Sort levels numerically
            const levelA = parseInt(a[0].replace('Level ', ''));
            const levelB = parseInt(b[0].replace('Level ', ''));
            return levelA - levelB;
        });

        return {
            totalCards,
            uniqueCards,
            loadedCards,
            completionPercentage: uniqueCards > 0 ? (loadedCards / uniqueCards) * 100 : 0,
            sortedTypes,
            sortedRarities,
            sortedSets,
            sortedAttributes,
            sortedLevels,
        };
    }, [binderCards, cardCache]);

    const StatBar: React.FC<{ label: string; value: number; percentage: number; color: string }> = ({
        label,
        value,
        percentage,
        color,
    }) => (
        <div className="mb-2">
            <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">{label}</span>
                <span className="text-gray-600">{value} ({percentage.toFixed(1)}%)</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                    className={`h-2 rounded-full ${color}`}
                    style={{ width: `${Math.max(percentage, 2)}%` }}
                />
            </div>
        </div>
    );

    const StatCard: React.FC<{
        title: string;
        value: number | string;
        subtitle?: string;
        color: string;
        icon: React.ReactNode;
    }> = ({ title, value, subtitle, color, icon }) => (
        <div className={`${color} rounded-lg p-4`}>
            <div className="flex items-center">
                <div className="flex-shrink-0">{icon}</div>
                <div className="ml-3">
                    <div className="text-2xl font-bold text-gray-900">{value}</div>
                    <div className="text-sm text-gray-600">{title}</div>
                    {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
                </div>
            </div>
        </div>
    );

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {binderName} - Collection Statistics
            </h2>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                    title="Total Cards"
                    value={stats.totalCards}
                    color="bg-blue-50"
                    icon={
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    }
                />

                <StatCard
                    title="Unique Cards"
                    value={stats.uniqueCards}
                    color="bg-green-50"
                    icon={
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    }
                />

                <StatCard
                    title="Data Loaded"
                    value={`${stats.loadedCards}/${stats.uniqueCards}`}
                    subtitle={`${stats.completionPercentage.toFixed(1)}% complete`}
                    color="bg-purple-50"
                    icon={
                        <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    }
                />

                <StatCard
                    title="Average per Card"
                    value={stats.uniqueCards > 0 ? (stats.totalCards / stats.uniqueCards).toFixed(1) : '0'}
                    color="bg-yellow-50"
                    icon={
                        <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                        </svg>
                    }
                />
            </div>

            {stats.loadedCards === 0 ? (
                <div className="text-center py-8">
                    <div className="text-gray-500 mb-4">
                        <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <p className="text-gray-600">
                        Card data is still loading. Statistics will appear as cards are loaded.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Card Types */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Card Types</h3>
                        <div className="space-y-2">
                            {stats.sortedTypes.slice(0, 8).map(([type, data]) => (
                                <StatBar
                                    key={type}
                                    label={type}
                                    value={data.quantity}
                                    percentage={data.percentage}
                                    color="bg-blue-500"
                                />
                            ))}
                        </div>
                    </div>

                    {/* Rarities */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Rarities</h3>
                        <div className="space-y-2">
                            {stats.sortedRarities.slice(0, 8).map(([rarity, data]) => (
                                <StatBar
                                    key={rarity}
                                    label={rarity}
                                    value={data.quantity}
                                    percentage={data.percentage}
                                    color="bg-purple-500"
                                />
                            ))}
                        </div>
                    </div>

                    {/* Attributes */}
                    {stats.sortedAttributes.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Attributes</h3>
                            <div className="space-y-2">
                                {stats.sortedAttributes.map(([attribute, data]) => (
                                    <StatBar
                                        key={attribute}
                                        label={attribute}
                                        value={data.quantity}
                                        percentage={data.percentage}
                                        color="bg-green-500"
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Levels */}
                    {stats.sortedLevels.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Levels</h3>
                            <div className="space-y-2">
                                {stats.sortedLevels.map(([level, data]) => (
                                    <StatBar
                                        key={level}
                                        label={level}
                                        value={data.quantity}
                                        percentage={data.percentage}
                                        color="bg-yellow-500"
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Top Sets */}
                    {stats.sortedSets.length > 0 && (
                        <div className="lg:col-span-2">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Sets</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {stats.sortedSets.slice(0, 10).map(([setCode, data]) => (
                                    <StatBar
                                        key={setCode}
                                        label={`${setCode} - ${data.setName.substring(0, 30)}${data.setName.length > 30 ? '...' : ''}`}
                                        value={data.quantity}
                                        percentage={data.percentage}
                                        color="bg-red-500"
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BinderStats;