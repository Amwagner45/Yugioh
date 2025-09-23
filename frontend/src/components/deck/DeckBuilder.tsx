import React, { useState, useEffect } from 'react';
import type { Deck, Binder } from '../../types';
import DeckSection from './DeckSection';
import DeckStatistics from './DeckStatistics';
import EnhancedBinderCardList from './EnhancedBinderCardList';
import api, { binderService, deckService } from '../../services/api';
import { storageService } from '../../services/storage';
import { importExportService } from '../../services/importExport';

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
    const [showCloneModal, setShowCloneModal] = useState(false);
    const [availableDecksForCloning, setAvailableDecksForCloning] = useState<any[]>([]);
    const [exportModal, setExportModal] = useState<{ show: boolean; deck: Deck | null }>({
        show: false,
        deck: null,
    });

    // Form fields for deck metadata
    const [deckName, setDeckName] = useState('');
    const [deckDescription, setDeckDescription] = useState('');
    const [deckFormat, setDeckFormat] = useState('');
    const [deckNotes, setDeckNotes] = useState('');
    const [deckTags, setDeckTags] = useState<string[]>([]);

    useEffect(() => {
        loadBinders();
    }, []);

    useEffect(() => {
        // Load deck after binders are loaded so we can map binder_id to UUID
        if (deckId && availableBinders.length > 0) {
            loadDeck();
        } else if (!deckId) {
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
    }, [deckId, availableBinders]);

    useEffect(() => {
        if (selectedBinderId) {
            loadBinder();
        }
    }, [selectedBinderId]);

    const loadBinders = async () => {
        try {
            const response = await api.get('/api/binders');
            setAvailableBinders(response.data);

            // If no binder is selected, use the first available binder
            if (!selectedBinderId && response.data.length > 0) {
                setSelectedBinderId(response.data[0].uuid);
            }
        } catch (error) {
            console.error('Failed to load binders:', error);
        }
    };

    const loadDeck = async () => {
        if (!deckId) {
            console.log('loadDeck: No deckId provided');
            return;
        }

        console.log('Loading deck:', deckId);
        setIsLoading(true);
        try {
            // First try to load from local storage (for imported decks)
            const localDeck = storageService.getDeck(deckId);
            if (localDeck) {
                console.log('✅ Deck loaded from local storage:', localDeck.name);
                setDeck(localDeck);
                setDeckName(localDeck.name);
                setDeckDescription(localDeck.description || '');
                setDeckFormat(localDeck.format || '');
                setDeckNotes(localDeck.notes || '');
                setDeckTags(localDeck.tags || []);

                // For local decks, default to the first available binder if none is selected
                if (!selectedBinderId && availableBinders.length > 0) {
                    setSelectedBinderId(availableBinders[0].id.toString());
                    setBinder(availableBinders[0]);
                }
                return;
            }

            // If not found in local storage, try the backend API
            console.log('🔍 Deck not found in local storage, trying backend API...');
            const response = await api.get(`/api/decks/${deckId}`);
            const deckData = response.data;
            console.log('✅ Deck data received from API:', deckData.name);

            const transformedDeck = {
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
            };

            console.log('Setting deck state:', transformedDeck);
            setDeck(transformedDeck);

            // Set form fields
            setDeckName(deckData.name);
            setDeckDescription(deckData.description || '');
            setDeckFormat(deckData.format || '');
            setDeckNotes(deckData.notes || '');
            setDeckTags(deckData.tags || []);
            setValidationErrors(deckData.validation_errors || []);

            // Set associated binder (convert binder_id to UUID)
            if (deckData.binder_id && availableBinders.length > 0) {
                const associatedBinder = availableBinders.find(b => b.id === deckData.binder_id);
                if (associatedBinder) {
                    setSelectedBinderId(associatedBinder.uuid);
                }
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
            const binderData = await binderService.getBinder(selectedBinderId, true);
            setBinder(binderData);
        } catch (error) {
            console.error('Failed to load binder:', error);
        }
    };

    const handleSaveDeck = async () => {
        if (!deck) return null;

        setIsLoading(true);
        try {
            // Check if this is a local storage deck (imported deck)
            const localDeck = storageService.getDeck(deckId || '');

            if (localDeck) {
                // Save to local storage for imported decks
                console.log('💾 Saving imported deck to local storage');
                const updatedDeck: Deck = {
                    ...deck,
                    name: deckName,
                    description: deckDescription,
                    format: deckFormat,
                    tags: deckTags,
                    notes: deckNotes,
                    modifiedAt: new Date()
                };

                storageService.saveDeck(updatedDeck);
                setDeck(updatedDeck);

                if (onSave) {
                    onSave(updatedDeck);
                }

                console.log('Deck saved to local storage:', updatedDeck);
                return updatedDeck;
            }

            // Save to backend API for server-side decks
            console.log('🌐 Saving deck to backend API');
            // Find the selected binder's integer ID
            const selectedBinder = availableBinders.find(b => b.uuid === selectedBinderId);
            const binderIntegerId = selectedBinder ? selectedBinder.id : null;

            const deckData = {
                name: deckName,
                description: deckDescription,
                format: deckFormat,
                binder_id: binderIntegerId,
                tags: deckTags,
                notes: deckNotes
            };

            let response;
            if (deckId) {
                response = await api.put(`/api/decks/${deckId}`, deckData);
            } else {
                response = await api.post('/api/decks/', deckData);
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

            return savedDeck;
        } catch (error) {
            console.error('Failed to save deck:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const handleValidateDeck = async () => {
        if (!deck?.id) return;

        try {
            const response = await api.post(`/api/decks/${deck.id}/validate`);
            setValidationErrors(response.data.validation_errors || []);
            setDeckStats(response.data.statistics || null);
        } catch (error) {
            console.error('Failed to validate deck:', error);
        }
    };

    const handleAddCardToDeck = async (cardId: number, section: 'main' | 'extra' | 'side', quantity: number = 1) => {
        console.log('handleAddCardToDeck called:', { cardId, section, quantity });

        if (!binder) {
            console.log('Missing binder:', { hasBinder: !!binder });
            return;
        }

        let currentDeck = deck;

        // If deck doesn't exist yet, create it first
        if (!currentDeck?.id) {
            console.log('No deck ID - creating deck first');
            try {
                // Set a default name if none exists
                if (!deckName.trim()) {
                    const timestamp = new Date().toLocaleString();
                    setDeckName(`New Deck - ${timestamp}`);
                    // Wait for state to update
                    await new Promise(resolve => setTimeout(resolve, 50));
                }

                const newDeck = await handleSaveDeck();

                if (!newDeck?.id) {
                    alert('Failed to create deck. Please try again.');
                    return;
                }

                currentDeck = newDeck;
                console.log('Deck created successfully with ID:', newDeck.id);
            } catch (error) {
                console.error('Failed to create deck:', error);
                alert('Failed to create deck. Please try again.');
                return;
            }
        }

        // Check if card is available in binder
        const binderCard = binder.cards.find(card => card.cardId === cardId);
        if (!binderCard) {
            alert('This card is not available in your binder!');
            return;
        }

        // Calculate how many copies are already in the deck (across all sections)
        const currentDeckCards = [...currentDeck.mainDeck, ...currentDeck.extraDeck, ...currentDeck.sideDeck];
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
            // Check if this is a local storage deck
            const isLocalDeck = storageService.getDeck(currentDeck.id);

            if (isLocalDeck) {
                // Handle local storage deck
                console.log('Updating local storage deck');

                // Optimistic update: Update the deck state locally
                const updatedDeck = { ...currentDeck };
                const targetSection = section === 'main' ? updatedDeck.mainDeck :
                    section === 'extra' ? updatedDeck.extraDeck :
                        updatedDeck.sideDeck;

                // Find existing card or create new entry
                const existingCardIndex = targetSection.findIndex(card => card.cardId === cardId);
                if (existingCardIndex >= 0) {
                    // Update existing card quantity
                    targetSection[existingCardIndex].quantity += quantity;
                } else {
                    // Add new card to section
                    targetSection.push({ cardId, quantity });
                }

                updatedDeck.modifiedAt = new Date();

                // Save to local storage
                storageService.saveDeck(updatedDeck);
                setDeck(updatedDeck);

                console.log('Local deck updated successfully');
                return;
            }

            // Handle backend API deck
            console.log('Making API call to add card to deck');
            const response = await api.post(`/api/decks/${currentDeck.id}/cards`, null, {
                params: {
                    card_id: cardId,
                    section: section,
                    quantity: quantity
                }
            });
            console.log('API response:', response.data);

            // Optimistic update: Update the deck state locally instead of reloading
            const updatedDeck = { ...currentDeck };
            const targetSection = section === 'main' ? updatedDeck.mainDeck :
                section === 'extra' ? updatedDeck.extraDeck :
                    updatedDeck.sideDeck;

            // Find existing card or create new entry
            const existingCardIndex = targetSection.findIndex(card => card.cardId === cardId);
            if (existingCardIndex >= 0) {
                // Update existing card quantity
                targetSection[existingCardIndex].quantity += quantity;
            } else {
                // Add new card to section
                targetSection.push({ cardId, quantity });
            }

            // Update the deck state
            setDeck(updatedDeck);
            console.log('Deck updated optimistically');
        } catch (error) {
            console.error('Failed to add card to deck:', error);
            alert('Failed to add card to deck. Please try again.');

            // On error, reload deck to ensure consistency
            console.log('Error occurred, reloading deck to ensure consistency...');
            await loadDeck();
        }
    };

    const handleRemoveCardFromDeck = async (cardId: number, section: 'main' | 'extra' | 'side', quantity: number = 1) => {
        if (!deck?.id) return;

        try {
            // Check if this is a local storage deck
            const isLocalDeck = storageService.getDeck(deck.id);

            if (isLocalDeck) {
                // Handle local storage deck
                console.log('Removing card from local storage deck');

                // Optimistic update: Update the deck state locally
                const updatedDeck = { ...deck };
                const targetSection = section === 'main' ? updatedDeck.mainDeck :
                    section === 'extra' ? updatedDeck.extraDeck :
                        updatedDeck.sideDeck;

                // Find existing card and update quantity
                const existingCardIndex = targetSection.findIndex(card => card.cardId === cardId);
                if (existingCardIndex >= 0) {
                    const currentCard = targetSection[existingCardIndex];
                    if (currentCard.quantity <= quantity) {
                        // Remove card entirely if quantity would be 0 or less
                        targetSection.splice(existingCardIndex, 1);
                    } else {
                        // Decrease quantity
                        currentCard.quantity -= quantity;
                    }
                }

                updatedDeck.modifiedAt = new Date();

                // Save to local storage
                storageService.saveDeck(updatedDeck);
                setDeck(updatedDeck);

                console.log('Card removed from local deck successfully');
                return;
            }

            // Handle backend API deck
            await api.delete(`/api/decks/${deck.id}/cards/${cardId}`, {
                params: {
                    section: section,
                    quantity: quantity
                }
            });

            // Optimistic update: Update the deck state locally instead of reloading
            const updatedDeck = { ...deck };
            const targetSection = section === 'main' ? updatedDeck.mainDeck :
                section === 'extra' ? updatedDeck.extraDeck :
                    updatedDeck.sideDeck;

            // Find existing card and update quantity
            const existingCardIndex = targetSection.findIndex(card => card.cardId === cardId);
            if (existingCardIndex >= 0) {
                const currentCard = targetSection[existingCardIndex];
                if (currentCard.quantity <= quantity) {
                    // Remove card entirely if quantity would be 0 or less
                    targetSection.splice(existingCardIndex, 1);
                } else {
                    // Decrease quantity
                    currentCard.quantity -= quantity;
                }
            }

            // Update the deck state
            setDeck(updatedDeck);
            console.log('Card removed optimistically');
        } catch (error) {
            console.error('Failed to remove card from deck:', error);

            // On error, reload deck to ensure consistency
            console.log('Error occurred, reloading deck to ensure consistency...');
            await loadDeck();
        }
    };

    const loadAvailableDecks = async () => {
        try {
            const decks = await deckService.getDecks();
            setAvailableDecksForCloning(decks.data || []);
        } catch (error) {
            console.error('Failed to load available decks:', error);
        }
    };

    const handleCloneDeck = async (sourceDeckId: string) => {
        try {
            // Load the source deck
            const response = await api.get(`/api/decks/${sourceDeckId}`);
            const sourceDeck = response.data;

            // Create a new deck based on the source
            const clonedDeck = {
                id: '',
                name: `${sourceDeck.name} (Copy)`,
                description: sourceDeck.description || '',
                format: sourceDeck.format || '',
                mainDeck: sourceDeck.main_deck.map((card: any) => ({
                    cardId: card.card_id,
                    quantity: card.quantity
                })),
                extraDeck: sourceDeck.extra_deck.map((card: any) => ({
                    cardId: card.card_id,
                    quantity: card.quantity
                })),
                sideDeck: sourceDeck.side_deck.map((card: any) => ({
                    cardId: card.card_id,
                    quantity: card.quantity
                })),
                tags: sourceDeck.tags || [],
                notes: sourceDeck.notes || '',
                createdAt: new Date(),
                modifiedAt: new Date()
            };

            // Set the cloned deck as current deck
            setDeck(clonedDeck);

            // Set form fields
            setDeckName(clonedDeck.name);
            setDeckDescription(clonedDeck.description);
            setDeckFormat(clonedDeck.format);
            setDeckNotes(clonedDeck.notes);
            setDeckTags(clonedDeck.tags);

            // Close the clone modal
            setShowCloneModal(false);

            console.log('Deck cloned successfully');
        } catch (error) {
            console.error('Failed to clone deck:', error);
            alert('Failed to clone deck. Please try again.');
        }
    };

    const handleExportDeck = () => {
        if (!deck || (!deck.id && !deckName)) {
            alert('Please save the deck first before exporting.');
            return;
        }
        
        // Create a temporary deck with current form values for export
        const deckToExport = {
            ...deck,
            name: deckName || deck.name,
            description: deckDescription || deck.description,
            format: deckFormat || deck.format,
            notes: deckNotes || deck.notes,
            tags: deckTags || deck.tags,
        };
        
        setExportModal({ show: true, deck: deckToExport });
    };

    const performExport = (format: 'json' | 'ydk' | 'txt' | 'csv') => {
        if (!exportModal.deck) return;

        try {
            // For unsaved decks, we need to save them to storage temporarily for export
            let deckToExport = exportModal.deck;
            
            if (!deckToExport.id) {
                // Create a temporary ID for export
                const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                deckToExport = { ...deckToExport, id: tempId };
                
                // Temporarily save to storage for export
                storageService.saveDeck(deckToExport);
            }
            
            const content = importExportService.exportDeck(deckToExport.id, { format });
            const extension = format === 'json' ? 'json' : format === 'ydk' ? 'ydk' : format === 'txt' ? 'txt' : 'csv';
            const filename = `${deckToExport.name.replace(/[^a-z0-9]/gi, '_')}.${extension}`;

            importExportService.downloadFile(content as string, filename);
            
            // Clean up temporary deck if it was created
            if (!exportModal.deck.id) {
                storageService.deleteDeck(deckToExport.id);
            }
            
            setExportModal({ show: false, deck: null });
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed: ' + error);
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
                                onClick={() => {
                                    setShowCloneModal(true);
                                    loadAvailableDecks();
                                }}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                disabled={isLoading}
                            >
                                Clone Deck
                            </button>
                            <button
                                onClick={handleValidateDeck}
                                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                                disabled={!deck?.id}
                            >
                                Validate Deck
                            </button>
                            <button
                                onClick={handleExportDeck}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                disabled={!deck || (!deck.id && !deckName)}
                            >
                                Export Deck
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
                                    <option key={binder.uuid} value={binder.uuid}>
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
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
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
                            binderCards={binder?.cards || []}
                        />

                        <DeckSection
                            title="Extra Deck"
                            cards={deck.extraDeck}
                            onAddCard={(cardId: number, quantity: number) => handleAddCardToDeck(cardId, 'extra', quantity)}
                            onRemoveCard={(cardId: number, quantity: number) => handleRemoveCardFromDeck(cardId, 'extra', quantity)}
                            maxCards={15}
                            minCards={0}
                            sectionType="extra"
                            binderCards={binder?.cards || []}
                        />

                        <DeckSection
                            title="Side Deck"
                            cards={deck.sideDeck}
                            onAddCard={(cardId: number, quantity: number) => handleAddCardToDeck(cardId, 'side', quantity)}
                            onRemoveCard={(cardId: number, quantity: number) => handleRemoveCardFromDeck(cardId, 'side', quantity)}
                            maxCards={15}
                            minCards={0}
                            sectionType="side"
                            binderCards={binder?.cards || []}
                        />
                    </div>

                    {/* Deck Statistics */}
                    <div className="lg:col-span-1">
                        <DeckStatistics
                            deck={deck}
                            binderCards={binder?.cards || []}
                        />
                    </div>

                    {/* Binder Card List */}
                    <div className="lg:col-span-1">
                        {binder && (
                            <EnhancedBinderCardList
                                binder={binder}
                                onCardClick={(cardId: number) => handleAddCardToDeck(cardId, 'main', 1)}
                                onAddToSection={(cardId: number, section: 'main' | 'extra' | 'side', quantity: number = 1) =>
                                    handleAddCardToDeck(cardId, section, quantity)
                                }
                                showQuantities={true}
                                title="Available Cards"
                                currentDeck={deck}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Clone Deck Modal */}
            {showCloneModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Clone Deck</h3>
                            <button
                                onClick={() => setShowCloneModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <p className="text-sm text-gray-600 mb-4">
                            Select a deck to clone. This will copy all cards and settings from the selected deck.
                        </p>

                        <div className="max-h-64 overflow-y-auto space-y-2">
                            {availableDecksForCloning.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <p>No decks available to clone</p>
                                </div>
                            ) : (
                                availableDecksForCloning.map((deck) => (
                                    <div
                                        key={deck.uuid}
                                        className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                                        onClick={() => handleCloneDeck(deck.uuid)}
                                    >
                                        <div className="font-medium text-gray-900">{deck.name}</div>
                                        {deck.description && (
                                            <div className="text-sm text-gray-600">{deck.description}</div>
                                        )}
                                        <div className="text-xs text-gray-500 mt-1">
                                            Format: {deck.format || 'Not specified'} •
                                            Modified: {new Date(deck.updated_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setShowCloneModal(false)}
                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Export Modal */}
            {exportModal.show && exportModal.deck && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold mb-4">Export Deck: {exportModal.deck.name}</h3>
                        <p className="text-gray-600 mb-4">Choose export format:</p>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            <button
                                onClick={() => performExport('ydk')}
                                className="p-3 border border-gray-300 rounded hover:bg-gray-50 text-left"
                            >
                                <div className="font-medium">.ydk</div>
                                <div className="text-sm text-gray-600">YGOPro format</div>
                            </button>
                            <button
                                onClick={() => performExport('json')}
                                className="p-3 border border-gray-300 rounded hover:bg-gray-50 text-left"
                            >
                                <div className="font-medium">.json</div>
                                <div className="text-sm text-gray-600">Full data backup</div>
                            </button>
                            <button
                                onClick={() => performExport('txt')}
                                className="p-3 border border-gray-300 rounded hover:bg-gray-50 text-left"
                            >
                                <div className="font-medium">.txt</div>
                                <div className="text-sm text-gray-600">Text deck list</div>
                            </button>
                            <button
                                onClick={() => performExport('csv')}
                                className="p-3 border border-gray-300 rounded hover:bg-gray-50 text-left"
                            >
                                <div className="font-medium">.csv</div>
                                <div className="text-sm text-gray-600">Spreadsheet format</div>
                            </button>
                        </div>
                        <button
                            onClick={() => setExportModal({ show: false, deck: null })}
                            className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeckBuilder;