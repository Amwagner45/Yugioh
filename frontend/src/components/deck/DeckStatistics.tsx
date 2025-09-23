import React from 'react';
import type { Deck, BinderCard } from '../../types';

interface DeckStatisticsProps {
    deck: Deck;
    binderCards: BinderCard[];
}

interface CardTypeStats {
    [key: string]: number;
}

interface LevelStats {
    [level: number]: number;
}

interface AttributeStats {
    [attribute: string]: number;
}

interface RaceStats {
    [race: string]: number;
}

interface AttackDefenseStats {
    avgAtk: number;
    maxAtk: number;
    minAtk: number;
    avgDef: number;
    maxDef: number;
    minDef: number;
    monsterCount: number;
}

const DeckStatistics: React.FC<DeckStatisticsProps> = ({ deck, binderCards }) => {
    // Helper function to get card details
    const getCardDetails = (cardId: number) => {
        return binderCards.find(bc => bc.cardId === cardId)?.card_details;
    };

    // Calculate deck size statistics
    const mainDeckSize = deck.mainDeck.reduce((sum, card) => sum + card.quantity, 0);
    const extraDeckSize = deck.extraDeck.reduce((sum, card) => sum + card.quantity, 0);
    const sideDeckSize = deck.sideDeck.reduce((sum, card) => sum + card.quantity, 0);
    const totalDeckSize = mainDeckSize + extraDeckSize + sideDeckSize;

    // Combine all deck cards for comprehensive statistics
    const allDeckCards = [...deck.mainDeck, ...deck.extraDeck, ...deck.sideDeck];

    // Calculate card type distribution
    const cardTypeStats: CardTypeStats = {};
    allDeckCards.forEach(deckCard => {
        const cardDetails = getCardDetails(deckCard.cardId);
        if (cardDetails?.type) {
            const type = cardDetails.type;
            cardTypeStats[type] = (cardTypeStats[type] || 0) + deckCard.quantity;
        }
    });

    // Calculate level distribution (for monsters only)
    const levelStats: LevelStats = {};
    allDeckCards.forEach(deckCard => {
        const cardDetails = getCardDetails(deckCard.cardId);
        if (cardDetails?.level) {
            const level = cardDetails.level;
            levelStats[level] = (levelStats[level] || 0) + deckCard.quantity;
        }
    });

    // Calculate attribute distribution
    const attributeStats: AttributeStats = {};
    allDeckCards.forEach(deckCard => {
        const cardDetails = getCardDetails(deckCard.cardId);
        if (cardDetails?.attribute) {
            const attribute = cardDetails.attribute;
            attributeStats[attribute] = (attributeStats[attribute] || 0) + deckCard.quantity;
        }
    });

    // Calculate race distribution
    const raceStats: RaceStats = {};
    allDeckCards.forEach(deckCard => {
        const cardDetails = getCardDetails(deckCard.cardId);
        if (cardDetails?.race) {
            const race = cardDetails.race;
            raceStats[race] = (raceStats[race] || 0) + deckCard.quantity;
        }
    });

    // Calculate ATK/DEF statistics
    const calculateAttackDefenseStats = (): AttackDefenseStats => {
        const monsterStats: number[] = [];
        const atkStats: number[] = [];
        const defStats: number[] = [];

        allDeckCards.forEach(deckCard => {
            const cardDetails = getCardDetails(deckCard.cardId);
            if (cardDetails && (cardDetails.atk !== null && cardDetails.atk !== undefined)) {
                for (let i = 0; i < deckCard.quantity; i++) {
                    monsterStats.push(1);
                    atkStats.push(cardDetails.atk);
                    if (cardDetails.def !== null && cardDetails.def !== undefined) {
                        defStats.push(cardDetails.def);
                    }
                }
            }
        });

        if (atkStats.length === 0) {
            return {
                avgAtk: 0, maxAtk: 0, minAtk: 0,
                avgDef: 0, maxDef: 0, minDef: 0,
                monsterCount: 0
            };
        }

        return {
            avgAtk: Math.round(atkStats.reduce((sum, atk) => sum + atk, 0) / atkStats.length),
            maxAtk: Math.max(...atkStats),
            minAtk: Math.min(...atkStats),
            avgDef: defStats.length > 0 ? Math.round(defStats.reduce((sum, def) => sum + def, 0) / defStats.length) : 0,
            maxDef: defStats.length > 0 ? Math.max(...defStats) : 0,
            minDef: defStats.length > 0 ? Math.min(...defStats) : 0,
            monsterCount: monsterStats.length
        };
    };

    const attackDefenseStats = calculateAttackDefenseStats();

    // Helper function to create stat bars
    const StatBar: React.FC<{ label: string; value: number; total: number; color: string }> = ({
        label, value, total, color
    }) => {
        const percentage = total > 0 ? (value / total) * 100 : 0;
        return (
            <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700 min-w-0 flex-1">{label}</span>
                <div className="flex items-center space-x-2">
                    <span className="text-gray-900 font-medium">{value}</span>
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                            className={`h-2 rounded-full ${color}`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Deck Statistics</h3>

            {/* Deck Size Overview */}
            <div className="mb-6">
                <h4 className="text-md font-medium text-gray-800 mb-3">Deck Size</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="text-sm text-blue-600 font-medium">Main Deck</div>
                        <div className="text-2xl font-bold text-blue-900">{mainDeckSize}</div>
                        <div className="text-xs text-blue-700">
                            {mainDeckSize < 40 ? `Need ${40 - mainDeckSize} more` :
                                mainDeckSize > 60 ? `${mainDeckSize - 60} over limit` :
                                    'Legal size'}
                        </div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                        <div className="text-sm text-purple-600 font-medium">Extra Deck</div>
                        <div className="text-2xl font-bold text-purple-900">{extraDeckSize}</div>
                        <div className="text-xs text-purple-700">
                            {extraDeckSize > 15 ? `${extraDeckSize - 15} over limit` : `${15 - extraDeckSize} remaining`}
                        </div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                        <div className="text-sm text-green-600 font-medium">Side Deck</div>
                        <div className="text-2xl font-bold text-green-900">{sideDeckSize}</div>
                        <div className="text-xs text-green-700">
                            {sideDeckSize > 15 ? `${sideDeckSize - 15} over limit` : `${15 - sideDeckSize} remaining`}
                        </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="text-sm text-gray-600 font-medium">Total Cards</div>
                        <div className="text-2xl font-bold text-gray-900">{totalDeckSize}</div>
                        <div className="text-xs text-gray-700">All sections</div>
                    </div>
                </div>
            </div>

            {/* Card Types */}
            {Object.keys(cardTypeStats).length > 0 && (
                <div className="mb-6">
                    <h4 className="text-md font-medium text-gray-800 mb-3">Card Types</h4>
                    <div className="space-y-2">
                        {Object.entries(cardTypeStats)
                            .sort(([, a], [, b]) => b - a)
                            .map(([type, count]) => (
                                <StatBar
                                    key={type}
                                    label={type}
                                    value={count}
                                    total={totalDeckSize}
                                    color="bg-blue-500"
                                />
                            ))}
                    </div>
                </div>
            )}

            {/* Monster Statistics */}
            {attackDefenseStats.monsterCount > 0 && (
                <div className="mb-6">
                    <h4 className="text-md font-medium text-gray-800 mb-3">Monster Statistics</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <div className="text-gray-600">Average ATK</div>
                            <div className="text-lg font-semibold text-gray-900">{attackDefenseStats.avgAtk}</div>
                        </div>
                        <div>
                            <div className="text-gray-600">Average DEF</div>
                            <div className="text-lg font-semibold text-gray-900">{attackDefenseStats.avgDef}</div>
                        </div>
                        <div>
                            <div className="text-gray-600">Max ATK</div>
                            <div className="text-lg font-semibold text-green-700">{attackDefenseStats.maxAtk}</div>
                        </div>
                        <div>
                            <div className="text-gray-600">Max DEF</div>
                            <div className="text-lg font-semibold text-green-700">{attackDefenseStats.maxDef}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Levels */}
            {Object.keys(levelStats).length > 0 && (
                <div className="mb-6">
                    <h4 className="text-md font-medium text-gray-800 mb-3">Level Distribution</h4>
                    <div className="space-y-2">
                        {Object.entries(levelStats)
                            .sort(([a], [b]) => parseInt(a) - parseInt(b))
                            .map(([level, count]) => (
                                <StatBar
                                    key={level}
                                    label={`Level ${level}`}
                                    value={count}
                                    total={attackDefenseStats.monsterCount}
                                    color="bg-yellow-500"
                                />
                            ))}
                    </div>
                </div>
            )}

            {/* Attributes */}
            {Object.keys(attributeStats).length > 0 && (
                <div className="mb-6">
                    <h4 className="text-md font-medium text-gray-800 mb-3">Attributes</h4>
                    <div className="space-y-2">
                        {Object.entries(attributeStats)
                            .sort(([, a], [, b]) => b - a)
                            .map(([attribute, count]) => (
                                <StatBar
                                    key={attribute}
                                    label={attribute}
                                    value={count}
                                    total={totalDeckSize}
                                    color="bg-red-500"
                                />
                            ))}
                    </div>
                </div>
            )}

            {/* Races/Types */}
            {Object.keys(raceStats).length > 0 && (
                <div className="mb-6">
                    <h4 className="text-md font-medium text-gray-800 mb-3">Monster Types</h4>
                    <div className="space-y-2">
                        {Object.entries(raceStats)
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 8) // Show top 8 to avoid cluttering
                            .map(([race, count]) => (
                                <StatBar
                                    key={race}
                                    label={race}
                                    value={count}
                                    total={totalDeckSize}
                                    color="bg-purple-500"
                                />
                            ))}
                        {Object.keys(raceStats).length > 8 && (
                            <div className="text-xs text-gray-500 mt-2">
                                ... and {Object.keys(raceStats).length - 8} more types
                            </div>
                        )}
                    </div>
                </div>
            )}

            {totalDeckSize === 0 && (
                <div className="text-center text-gray-500 py-8">
                    <div className="text-4xl mb-2">📊</div>
                    <p>Add cards to your deck to see statistics</p>
                </div>
            )}
        </div>
    );
};

export default DeckStatistics;