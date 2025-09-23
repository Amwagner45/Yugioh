import React, { useState, useEffect } from 'react';
import type { Deck, Binder } from '../../types';
import DeckSection from './DeckSection';
import BinderCardList from '../binder/BinderCardList';
import api from '../../services/api';

interface DeckBuilderProps {
    deckId?: string;
    binderId?: string;
    onSave?: (deck: Deck) => void;
    onCancel?: () => void;
}

const DeckBuilder: React.FC<DeckBuilderProps> = ({
    deckId,
    binderId,
    onSave,
    onCancel
}) => {
    const [deck, setDeck] = useState<Deck | null>(null);
    const [binder, setBinder] = useState<Binder | null>(null);
    const [availableBinders, setAvailableBinders] = useState<Binder[]>([]);
    const [selectedBinderId, setSelectedBinderId] = useState<string>(binderId || '');
    const [isLoading, setIsLoading] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [deckStats, setDeckStats] = useState<any>(null);

    // Form fields for deck metadata
    const [deckName, setDeckName] = useState('');
    const [deckDescription, setDeckDescription] = useState('');
    const [deckFormat, setDeckFormat] = useState('');
    const [deckNotes, setDeckNotes] = useState('');
    const [deckTags, setDeckTags] = useState<string[]>([]);

    useEffect(() => {
        loadBinders();
        if (deckId) {
            loadDeck();
        } else {
            // Initialize empty deck
            setDeck({
                id: '',
                name: '',
                description: '',
                format: '',
                mainDeck: [],
                extraDeck: [],
                sideDeck: [],
                tags: [],
                notes: '',
                createdAt: new Date(),
                modifiedAt: new Date()
            });
        }
    }, [deckId]);

    useEffect(() => {
        if (selectedBinderId) {
            loadBinder();
        }
    }, [selectedBinderId]);

    const loadBinders = async () => {
        try {
            const response = await api.get('/binders');
            setAvailableBinders(response.data);

            // If no binder is selected, use the first available binder
            if (!selectedBinderId && response.data.length > 0) {
                setSelectedBinderId(response.data[0].id);
            }
        } catch (error) {
            console.error('Failed to load binders:', error);
        }
    };

    const loadDeck = async () => {
        if (!deckId) return;

        setIsLoading(true);
        try {
            const response = await api.get(`/decks/${deckId}`);
            const deckData = response.data;

            setDeck({
                id: deckData.uuid,
                name: deckData.name,
                description: deckData.description || '',
                format: deckData.format || '',
                mainDeck: deckData.main_deck.map((card: any) => ({
                    cardId: card.card_id,
                    quantity: card.quantity
                })),
                extraDeck: deckData.extra_deck.map((card: any) => ({
                    cardId: card.card_id,
                    quantity: card.quantity
                })),
                sideDeck: deckData.side_deck.map((card: any) => ({
                    cardId: card.card_id,
                    quantity: card.quantity
                })),
                tags: deckData.tags || [],
                notes: deckData.notes || '',
                createdAt: new Date(deckData.created_at),
                modifiedAt: new Date(deckData.updated_at)
            });

            // Set form fields
            setDeckName(deckData.name);
            setDeckDescription(deckData.description || '');
            setDeckFormat(deckData.format || '');
            setDeckNotes(deckData.notes || '');
            setDeckTags(deckData.tags || []);
            setValidationErrors(deckData.validation_errors || []);

            // Set associated binder
            if (deckData.binder_id) {
                setSelectedBinderId(deckData.binder_id.toString());
            }
        } catch (error) {
            console.error('Failed to load deck:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadBinder = async () => {
        if (!selectedBinderId) return;

        try {
            const response = await api.get(`/binders/${selectedBinderId}`);
            setBinder(response.data);
        } catch (error) {
            console.error('Failed to load binder:', error);
        }
    };

    const handleSaveDeck = async () => {
        if (!deck) return;

        setIsLoading(true);
        try {
            const deckData = {
                name: deckName,
                description: deckDescription,
                format: deckFormat,
                binder_id: selectedBinderId ? parseInt(selectedBinderId) : null,
                tags: deckTags,
                notes: deckNotes
            };

            let response;
            if (deckId) {
                response = await api.put(`/decks/${deckId}`, deckData);
            } else {
                response = await api.post('/decks', deckData);
            }

            const savedDeck: Deck = {
                id: response.data.uuid,
                name: response.data.name,
                description: response.data.description || '',
                format: response.data.format || '',
                mainDeck: response.data.main_deck.map((card: any) => ({
                    cardId: card.card_id,
                    quantity: card.quantity
                })),
                extraDeck: response.data.extra_deck.map((card: any) => ({
                    cardId: card.card_id,
                    quantity: card.quantity
                })),
                sideDeck: response.data.side_deck.map((card: any) => ({
                    cardId: card.card_id,
                    quantity: card.quantity
                })),
                tags: response.data.tags || [],
                notes: response.data.notes || '',
                createdAt: new Date(response.data.created_at),
                modifiedAt: new Date(response.data.updated_at)
            };

            setDeck(savedDeck);
            if (onSave) {
                onSave(savedDeck);
            }
        } catch (error) {
            console.error('Failed to save deck:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleValidateDeck = async () => {
        if (!deck?.id) return;

        try {
            const response = await api.post(`/decks/${deck.id}/validate`);
            setValidationErrors(response.data.validation_errors || []);
            setDeckStats(response.data.statistics || null);
        } catch (error) {
            console.error('Failed to validate deck:', error);
        }
    };

    const handleAddCardToDeck = async (cardId: number, section: 'main' | 'extra' | 'side', quantity: number = 1) => {
        if (!deck?.id || !binder) return;

        // Check if card is available in binder
        const binderCard = binder.cards.find(card => card.cardId === cardId);
        if (!binderCard) {
            alert('This card is not available in your binder!');
            return;
        }

        // Calculate how many copies are already in the deck (across all sections)
        const currentDeckCards = [...deck.mainDeck, ...deck.extraDeck, ...deck.sideDeck];
        const totalInDeck = currentDeckCards
            .filter(card => card.cardId === cardId)
            .reduce((sum, card) => sum + card.quantity, 0);

        // Check if adding this quantity would exceed available copies
        if (totalInDeck + quantity > binderCard.quantity) {
            const available = binderCard.quantity - totalInDeck;
            if (available <= 0) {
                alert('You have already used all copies of this card in your deck!');
                return;
            } else {
                alert(`You can only add ${available} more copy(ies) of this card (${binderCard.quantity} owned, ${totalInDeck} already in deck)`);
                return;
            }
        }

        // Check Yu-Gi-Oh card limit (max 3 copies total across all sections)
        if (totalInDeck + quantity > 3) {
            const canAdd = Math.max(0, 3 - totalInDeck);
            if (canAdd <= 0) {
                alert('Maximum 3 copies of any card allowed in a deck!');
                return;
            } else {
                alert(`You can only add ${canAdd} more copy(ies) of this card (Yu-Gi-Oh rule: max 3 total)`);
                return;
            }
        }

        try {
            await api.post(`/decks/${deck.id}/cards`, null, {
                params: {
                    card_id: cardId,
                    section: section,
                    quantity: quantity
                }
            });

            // Reload deck to get updated card list
            await loadDeck();
        } catch (error) {
            console.error('Failed to add card to deck:', error);
            alert('Failed to add card to deck. Please try again.');
        }
    };

    const handleRemoveCardFromDeck = async (cardId: number, section: 'main' | 'extra' | 'side', quantity: number = 1) => {
        if (!deck?.id) return;

        try {
            await api.delete(`/decks/${deck.id}/cards/${cardId}`, {
                params: {
                    section: section,
                    quantity: quantity
                }
            });

            // Reload deck to get updated card list
            await loadDeck();
        } catch (error) {
            console.error('Failed to remove card from deck:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!deck) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">Failed to load deck</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-3xl font-bold text-gray-900">
                            {deckId ? 'Edit Deck' : 'Create New Deck'}
                        </h1>
                        <div className="flex space-x-3">
                            <button
                                onClick={handleValidateDeck}
                                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                                disabled={!deck?.id}
                            >
                                Validate Deck
                            </button>
                            <button
                                onClick={handleSaveDeck}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Saving...' : 'Save Deck'}
                            </button>
                            {onCancel && (
                                <button
                                    onClick={onCancel}
                                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Deck Form */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Deck Name *
                            </label>
                            <input
                                type="text"
                                value={deckName}
                                onChange={(e) => setDeckName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter deck name"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Format
                            </label>
                            <select
                                value={deckFormat}
                                onChange={(e) => setDeckFormat(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Select format</option>
                                <option value="TCG">TCG</option>
                                <option value="OCG">OCG</option>
                                <option value="Goat">Goat Format</option>
                                <option value="Edison">Edison Format</option>
                                <option value="Custom">Custom</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Associated Binder
                            </label>
                            <select
                                value={selectedBinderId}
                                onChange={(e) => setSelectedBinderId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Select binder</option>
                                {availableBinders.map((binder) => (
                                    <option key={binder.id} value={binder.id}>
                                        {binder.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Description
                            </label>
                            <input
                                type="text"
                                value={deckDescription}
                                onChange={(e) => setDeckDescription(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter deck description"
                            />
                        </div>
                    </div>

                    {/* Validation Errors */}
                    {validationErrors.length > 0 && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <h3 className="text-sm font-medium text-red-800 mb-2">Validation Errors:</h3>
                            <ul className="text-sm text-red-700 space-y-1">
                                {validationErrors.map((error, index) => (
                                    <li key={index}>• {error}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Deck Statistics */}
                    {deckStats && (
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <h3 className="text-sm font-medium text-blue-800 mb-2">Deck Statistics:</h3>
                            <div className="grid grid-cols-3 gap-4 text-sm text-blue-700">
                                <div>Main Deck: {deckStats.main_deck_count}/40-60</div>
                                <div>Extra Deck: {deckStats.extra_deck_count}/15</div>
                                <div>Side Deck: {deckStats.side_deck_count}/15</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Deck Sections */}
                    <div className="lg:col-span-2 space-y-6">
                        <DeckSection
                            title="Main Deck"
                            cards={deck.mainDeck}
                            onAddCard={(cardId: number, quantity: number) => handleAddCardToDeck(cardId, 'main', quantity)}
                            onRemoveCard={(cardId: number, quantity: number) => handleRemoveCardFromDeck(cardId, 'main', quantity)}
                            maxCards={60}
                            minCards={40}
                            sectionType="main"
                        />

                        <DeckSection
                            title="Extra Deck"
                            cards={deck.extraDeck}
                            onAddCard={(cardId: number, quantity: number) => handleAddCardToDeck(cardId, 'extra', quantity)}
                            onRemoveCard={(cardId: number, quantity: number) => handleRemoveCardFromDeck(cardId, 'extra', quantity)}
                            maxCards={15}
                            minCards={0}
                            sectionType="extra"
                        />

                        <DeckSection
                            title="Side Deck"
                            cards={deck.sideDeck}
                            onAddCard={(cardId: number, quantity: number) => handleAddCardToDeck(cardId, 'side', quantity)}
                            onRemoveCard={(cardId: number, quantity: number) => handleRemoveCardFromDeck(cardId, 'side', quantity)}
                            maxCards={15}
                            minCards={0}
                            sectionType="side"
                        />
                    </div>

                    {/* Binder Card List */}
                    <div className="lg:col-span-1">
                        {binder && (
                            <BinderCardList
                                binder={binder}
                                onCardClick={(cardId: number) => handleAddCardToDeck(cardId, 'main', 1)}
                                showQuantities={true}
                                title="Available Cards"
                                currentDeck={deck}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeckBuilder;