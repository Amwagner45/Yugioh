import React, { useState, useEffect } from 'react';
import { cardService } from '../../services/api';
import CardDetailModal from '../common/CardDetailModal';
import BulkAddModal from './BulkAddModal';
import type { Card, Binder, CardSearchResponse } from '../../types';

interface SetBrowserProps {
    selectedBinder: Binder | null;
    onAddToBinder: (cardId: number, quantity: number) => void;
    isAddingCard?: boolean;
}

interface SetInfo {
    set_code: string;
    set_name: string;
    tcg_date?: string;
    ocg_date?: string;
    card_count?: number;
}

// Chronological list of Yu-Gi-Oh sets for progression series
const PROGRESSION_SETS: SetInfo[] = [
    { set_code: 'LOB', set_name: 'Legend of Blue Eyes White Dragon', tcg_date: '2002-03-08' },
    { set_code: 'MRD', set_name: 'Metal Raiders', tcg_date: '2002-06-26' },
    { set_code: 'SDP', set_name: 'Starter Deck: Pegasus', tcg_date: '2002-10-20' },
    { set_code: 'SDK', set_name: 'Starter Deck: Kaiba', tcg_date: '2002-03-29' },
    { set_code: 'SDY', set_name: 'Starter Deck: Yugi', tcg_date: '2002-03-29' },
    { set_code: 'MRL', set_name: 'Magic Ruler', tcg_date: '2002-09-16' },
    { set_code: 'PSV', set_name: 'Pharaoh\'s Servant', tcg_date: '2002-12-16' },
    { set_code: 'LON', set_name: 'Labyrinth of Nightmare', tcg_date: '2003-03-21' },
    { set_code: 'LOD', set_name: 'Legacy of Darkness', tcg_date: '2003-06-06' },
    { set_code: 'PGD', set_name: 'Pharaonic Guardian', tcg_date: '2003-08-08' },
    { set_code: 'MFC', set_name: 'Magician\'s Force', tcg_date: '2003-10-10' },
    { set_code: 'DCR', set_name: 'Dark Crisis', tcg_date: '2004-01-19' },
    { set_code: 'IOC', set_name: 'Invasion of Chaos', tcg_date: '2004-03-01' },
    { set_code: 'AST', set_name: 'Ancient Sanctuary', tcg_date: '2004-06-01' },
    { set_code: 'SOD', set_name: 'Soul of the Duelist', tcg_date: '2004-10-01' },
    { set_code: 'RDS', set_name: 'Rise of Destiny', tcg_date: '2005-01-01' },
    { set_code: 'FET', set_name: 'Flaming Eternity', tcg_date: '2005-03-01' },
    { set_code: 'TLM', set_name: 'The Lost Millennium', tcg_date: '2005-06-01' },
    { set_code: 'CRV', set_name: 'Cybernetic Revolution', tcg_date: '2005-08-17' },
    { set_code: 'EEN', set_name: 'Elemental Energy', tcg_date: '2005-11-16' },
    // Add more sets as needed...
];

const SetBrowser: React.FC<SetBrowserProps> = ({
    selectedBinder,
    onAddToBinder,
    isAddingCard = false,
}) => {
    const [selectedSetCode, setSelectedSetCode] = useState<string>('');
    const [setCards, setSetCards] = useState<Card[]>([]);
    const [setSearchResponse, setSetSearchResponse] = useState<CardSearchResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailCard, setDetailCard] = useState<Card | null>(null);
    const [showBulkAddModal, setShowBulkAddModal] = useState(false);

    // Load cards for selected set
    useEffect(() => {
        if (selectedSetCode) {
            loadSetCards(selectedSetCode);
        }
    }, [selectedSetCode]);

    const loadSetCards = async (setCode: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await cardService.searchCards({
                cardset: setCode,
                limit: 100, // Start with 100, but now we support more
            });

            setSetSearchResponse(response);

            if (response.error) {
                setError(response.error);
                setSetCards(response.data || []);
            } else {
                setSetCards(response.data || []);
            }
        } catch (err) {
            setError('Failed to load set cards. Please try again.');
            setSetCards([]);
            setSetSearchResponse(null);
        } finally {
            setIsLoading(false);
        }
    };

    const loadMoreCards = async () => {
        if (!selectedSetCode || !setSearchResponse?.total || setCards.length >= setSearchResponse.total) {
            return;
        }

        setIsLoading(true);

        try {
            const response = await cardService.searchCards({
                cardset: selectedSetCode,
                limit: 100,
                offset: setCards.length, // Load next batch
            });

            if (response.data) {
                setSetCards(prev => [...prev, ...response.data]);
                setSetSearchResponse(response);
            }
        } catch (err) {
            setError('Failed to load more cards. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleViewDetails = (card: Card) => {
        setDetailCard(card);
        setShowDetailModal(true);
    };

    const handleCloseDetailModal = () => {
        setShowDetailModal(false);
        setDetailCard(null);
    };

    const handleOpenBulkAdd = () => {
        setShowBulkAddModal(true);
    };

    const handleCloseBulkAdd = () => {
        setShowBulkAddModal(false);
    };

    const handleBulkAdd = async (cardEntries: { cardId: number; quantity: number }[]) => {
        for (const entry of cardEntries) {
            await onAddToBinder(entry.cardId, entry.quantity);
        }
        setShowBulkAddModal(false);
    };

    const isCardInBinder = (cardId: number) => {
        return selectedBinder?.cards.some(card => card.cardId === cardId);
    };

    const getCardQuantityInBinder = (cardId: number) => {
        const binderCard = selectedBinder?.cards.find(card => card.cardId === cardId);
        return binderCard?.quantity || 0;
    };

    const selectedSet = PROGRESSION_SETS.find(set => set.set_code === selectedSetCode);

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Browse Cards by Set</h2>
                <p className="text-gray-600">
                    Browse Yu-Gi-Oh sets in chronological order for progression series play
                </p>
                {selectedBinder && (
                    <p className="text-gray-600 mt-1">
                        Adding to: "{selectedBinder.name}"
                    </p>
                )}
            </div>

            {/* Set Selection */}
            <div className="mb-6">
                <label htmlFor="set-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Select Set
                </label>
                <select
                    id="set-select"
                    value={selectedSetCode}
                    onChange={(e) => setSelectedSetCode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="">Choose a set...</option>
                    {PROGRESSION_SETS.map((set) => (
                        <option key={set.set_code} value={set.set_code}>
                            {set.set_code} - {set.set_name} {set.tcg_date && `(${new Date(set.tcg_date).getFullYear()})`}
                        </option>
                    ))}
                </select>
            </div>

            {/* Set Information */}
            {selectedSet && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h3 className="text-lg font-medium text-blue-900 mb-2">
                        {selectedSet.set_name}
                    </h3>
                    <div className="text-sm text-blue-700 space-y-1">
                        <div>Set Code: <span className="font-medium">{selectedSet.set_code}</span></div>
                        {selectedSet.tcg_date && (
                            <div>TCG Release Date: <span className="font-medium">
                                {new Date(selectedSet.tcg_date).toLocaleDateString()}
                            </span></div>
                        )}
                        {setCards.length > 0 && (
                            <div>Cards Found: <span className="font-medium">{setSearchResponse?.total || setCards.length}</span></div>
                        )}
                    </div>
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="text-center py-8">
                    <div className="inline-flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Loading set cards...
                    </div>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className={`border rounded-md p-4 mb-6 ${setCards.length > 0
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-red-50 border-red-200'
                    }`}>
                    <div className="flex">
                        <svg className={`w-5 h-5 ${setCards.length > 0 ? 'text-yellow-400' : 'text-red-400'
                            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="ml-3">
                            <h3 className={`text-sm font-medium ${setCards.length > 0 ? 'text-yellow-800' : 'text-red-800'
                                }`}>
                                {setCards.length > 0 ? 'Warning' : 'Error'}
                            </h3>
                            <p className={`text-sm mt-1 ${setCards.length > 0 ? 'text-yellow-700' : 'text-red-700'
                                }`}>{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Set Cards */}
            {selectedSetCode && !isLoading && setCards.length > 0 && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900">
                            Cards in {selectedSet?.set_name} ({setCards.length})
                        </h3>
                        {setCards.length > 0 && selectedBinder && (
                            <button
                                onClick={handleOpenBulkAdd}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center space-x-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                <span>Bulk Add Set</span>
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {setCards.map((card) => (
                            <div
                                key={card.id}
                                className="border rounded-lg p-4 hover:shadow-lg transition-shadow bg-white"
                            >
                                {/* Card Image */}
                                <div className="relative mb-3">
                                    {card.card_images && card.card_images[0] ? (
                                        <div className="relative group">
                                            <img
                                                src={card.card_images[0].image_url_small}
                                                alt={card.name}
                                                className="w-full h-40 object-contain rounded-md cursor-pointer"
                                                loading="lazy"
                                                onClick={() => handleViewDetails(card)}
                                            />
                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-md flex items-center justify-center">
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-full h-40 bg-gray-200 rounded-md flex items-center justify-center">
                                            <span className="text-gray-500 text-sm">No Image</span>
                                        </div>
                                    )}
                                </div>

                                {/* Card Info */}
                                <div className="space-y-2">
                                    <h4 className="font-medium text-gray-900 text-sm leading-tight line-clamp-2">
                                        {card.name}
                                    </h4>

                                    <div className="text-xs text-gray-600 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span>Type:</span>
                                            <span className="font-medium">{card.type}</span>
                                        </div>
                                        {card.race && (
                                            <div className="flex items-center justify-between">
                                                <span>Race:</span>
                                                <span className="font-medium">{card.race}</span>
                                            </div>
                                        )}
                                        {card.attribute && (
                                            <div className="flex items-center justify-between">
                                                <span>Attribute:</span>
                                                <span className="font-medium">{card.attribute}</span>
                                            </div>
                                        )}
                                        {card.level && (
                                            <div className="flex items-center justify-between">
                                                <span>Level:</span>
                                                <span className="font-medium">{card.level}</span>
                                            </div>
                                        )}
                                        {(card.atk !== undefined || card.def !== undefined) && (
                                            <div className="flex items-center justify-between">
                                                <span>ATK/DEF:</span>
                                                <span className="font-medium">
                                                    {card.atk !== undefined ? card.atk : '?'}/
                                                    {card.def !== undefined ? card.def : '?'}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Rarity info from this set */}
                                    {card.card_sets && (
                                        (() => {
                                            const setInfo = card.card_sets.find(s => s.set_code === selectedSetCode);
                                            return setInfo && (
                                                <div className="text-xs text-purple-600 font-medium bg-purple-50 px-2 py-1 rounded">
                                                    {setInfo.set_rarity}
                                                </div>
                                            );
                                        })()
                                    )}

                                    {/* Binder Status */}
                                    {isCardInBinder(card.id) && (
                                        <div className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded">
                                            In binder (×{getCardQuantityInBinder(card.id)})
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex space-x-2 pt-2">
                                        <button
                                            onClick={() => handleViewDetails(card)}
                                            className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-200 text-xs font-medium transition-colors"
                                        >
                                            View Details
                                        </button>
                                        {selectedBinder && (
                                            <button
                                                onClick={() => onAddToBinder(card.id, 1)}
                                                className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 text-xs font-medium transition-colors"
                                                disabled={!selectedBinder || isAddingCard}
                                            >
                                                {isAddingCard ? 'Adding...' : 'Add to Binder'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Load More Button */}
                    {setSearchResponse && setSearchResponse.total && setCards.length < setSearchResponse.total && (
                        <div className="mt-6 text-center">
                            <button
                                onClick={() => loadMoreCards()}
                                disabled={isLoading}
                                className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
                            >
                                {isLoading ? 'Loading...' : `Load More (${setCards.length} of ${setSearchResponse.total})`}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* No results */}
            {selectedSetCode && !isLoading && setCards.length === 0 && !error && (
                <div className="text-center py-8">
                    <p className="text-gray-600">No cards found for the selected set.</p>
                </div>
            )}

            {/* Progression Series Info */}
            {!selectedSetCode && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                    <div className="mb-4">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Progression Series Format</h3>
                    <p className="text-gray-600 mb-4">
                        Browse Yu-Gi-Oh sets in chronological order. Perfect for progression series where players
                        open booster boxes in the order they were originally released.
                    </p>
                    <p className="text-sm text-gray-500">
                        Select a set above to view all cards available in that set.
                    </p>
                </div>
            )}

            {/* Card Detail Modal */}
            <CardDetailModal
                card={detailCard}
                isOpen={showDetailModal}
                onClose={handleCloseDetailModal}
                onAddToBinder={onAddToBinder}
                isCardInBinder={detailCard ? isCardInBinder(detailCard.id) : false}
                cardQuantityInBinder={detailCard ? getCardQuantityInBinder(detailCard.id) : 0}
                selectedBinder={selectedBinder}
            />

            {/* Bulk Add Modal */}
            <BulkAddModal
                cards={setCards}
                selectedBinder={selectedBinder}
                isOpen={showBulkAddModal}
                onClose={handleCloseBulkAdd}
                onBulkAdd={handleBulkAdd}
                isAddingCards={isAddingCard}
            />
        </div>
    );
};

export default SetBrowser;