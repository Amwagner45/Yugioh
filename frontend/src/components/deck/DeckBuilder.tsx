import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { Deck, Binder, Card } from '../../types';
import DeckSection from './DeckSection';
import EnhancedBinderCardList from '../binder/EnhancedBinderCardList';
import CardDetailModal from '../common/CardDetailModal';
import api, { binderService, cardService } from '../../services/api';
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
    const location = useLocation();

    const [deck, setDeck] = useState<Deck | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [binder, setBinder] = useState<Binder | null>(null);
    const [availableBinders, setAvailableBinders] = useState<Binder[]>([]);
    const [selectedBinderId, setSelectedBinderId] = useState<string>(binderId || '');
    const [isLoading, setIsLoading] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
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

    // Card detail modal state
    const [selectedCard, setSelectedCard] = useState<Card | null>(null);
    const [isCardModalOpen, setIsCardModalOpen] = useState(false);

    useEffect(() => {
        loadBinders();
    }, []);

    useEffect(() => {
        // Load deck after binders are loaded so we can map binder_id to UUID
        if (deckId && availableBinders.length > 0) {
            loadDeck();
        } else if (!deckId) {
            // Initialize empty deck
            const emptyDeck = {
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
            };
            setDeck(emptyDeck);
            setHasUnsavedChanges(false);
        }
    }, [deckId, availableBinders]);

    useEffect(() => {
        if (selectedBinderId) {
            loadBinder();
        }
    }, [selectedBinderId]);

    const loadBinders = async () => {
        try {
            // Try loading from local storage first (for local binders)
            const localBinders = storageService.getBinders();

            if (localBinders && localBinders.length > 0) {
                console.log(`✅ Loaded ${localBinders.length} binders from local storage`);
                setAvailableBinders(localBinders);

                // If no binder is selected, prioritize favorite binder first, then first available binder
                if (!selectedBinderId && localBinders.length > 0) {
                    const favoriteBinder = localBinders.find(b => b.isFavorite === true);
                    if (favoriteBinder) {
                        setSelectedBinderId(favoriteBinder.id.toString());
                        console.log(`✅ Auto-selected favorite binder: ${favoriteBinder.name}`);
                    } else {
                        setSelectedBinderId(localBinders[0].id.toString());
                        console.log(`✅ Auto-selected first available binder: ${localBinders[0].name}`);
                    }
                }
                return;
            }

            // Fallback to API if no local binders found
            console.log('🔍 No local binders found, trying backend API...');
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
                setHasUnsavedChanges(false); // Reset unsaved changes flag

                setDeckName(localDeck.name);
                setDeckDescription(localDeck.description || '');
                setDeckFormat(localDeck.format || '');
                setDeckNotes(localDeck.notes || '');
                setDeckTags(localDeck.tags || []);

                // For local decks, default to favorite binder first, then first available binder if none is selected
                if (!selectedBinderId && availableBinders.length > 0) {
                    const favoriteBinder = availableBinders.find(b => b.isFavorite === true);
                    if (favoriteBinder) {
                        const binderIdToUse = favoriteBinder.uuid || favoriteBinder.id.toString();
                        setSelectedBinderId(binderIdToUse);
                        setBinder(favoriteBinder);
                        console.log(`✅ Auto-selected favorite binder for deck: ${favoriteBinder.name}`);
                    } else {
                        const firstBinderId = availableBinders[0].uuid || availableBinders[0].id.toString();
                        setSelectedBinderId(firstBinderId);
                        setBinder(availableBinders[0]);
                        console.log(`✅ Auto-selected first available binder for deck: ${availableBinders[0].name}`);
                    }
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
            setHasUnsavedChanges(false);

            // Set form fields
            setDeckName(deckData.name);
            setDeckDescription(deckData.description || '');
            setDeckFormat(deckData.format || '');
            setDeckNotes(deckData.notes || '');
            setDeckTags(deckData.tags || []);
            setValidationErrors(deckData.validation_errors || []);

            // Set associated binder (convert binder_id to UUID)
            if (deckData.binder_id && availableBinders.length > 0) {
                const associatedBinder = availableBinders.find(b => b.id === deckData.binder_id || b.uuid === deckData.binder_id);
                if (associatedBinder) {
                    setSelectedBinderId(associatedBinder.uuid || associatedBinder.id.toString());
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
            // Try loading from local storage first
            const localBinder = storageService.getBinder(selectedBinderId);

            if (localBinder) {
                console.log(`✅ Loaded binder "${localBinder.name}" from local storage`);

                // Check if card details are already populated
                const hasCardDetails = localBinder.cards.some(card => card.card_details);

                if (!hasCardDetails && localBinder.cards.length > 0) {
                    console.log('🔍 Fetching card details for local binder cards...');
                    // Get unique card IDs
                    const cardIds = [...new Set(localBinder.cards.map(card => card.cardId))];

                    try {
                        // Fetch card details in batch
                        const cardResponse = await cardService.getCardsBatch(cardIds);
                        const cardDetailsMap = new Map(cardResponse.data.map((card: Card) => [card.id, card]));

                        // Populate card details
                        const enhancedBinder = {
                            ...localBinder,
                            cards: localBinder.cards.map(card => ({
                                ...card,
                                card_details: cardDetailsMap.get(card.cardId) as Card | undefined
                            }))
                        };

                        console.log(`✅ Enhanced ${cardResponse.data.length} cards with details`);
                        setBinder(enhancedBinder);
                        return;
                    } catch (error) {
                        console.error('Failed to fetch card details:', error);
                        // Still set the binder even if card details failed
                        setBinder(localBinder);
                        return;
                    }
                }

                setBinder(localBinder);
                return;
            }

            // Fallback to API if not found locally
            console.log('🔍 Binder not found locally, trying backend API...');
            const binderData = await binderService.getBinder(selectedBinderId, true);
            setBinder(binderData);
        } catch (error) {
            console.error('Failed to load binder:', error);
        }
    };

    // Mark changes as unsaved whenever deck or form fields are modified
    const markAsUnsaved = () => {
        setHasUnsavedChanges(true);
    };

    // Handle cancel with unsaved changes warning
    const handleCancel = () => {
        if (hasUnsavedChanges) {
            const confirmLeave = window.confirm(
                'You have unsaved changes. Are you sure you want to leave without saving?'
            );
            if (!confirmLeave) {
                return;
            }
        }
        if (onCancel) {
            onCancel();
        }
    };

    // Block navigation when there are unsaved changes
    useEffect(() => {
        const handlePopState = (e: PopStateEvent) => {
            if (hasUnsavedChanges) {
                const confirmLeave = window.confirm(
                    'You have unsaved changes. Are you sure you want to leave without saving?'
                );
                if (!confirmLeave) {
                    e.preventDefault();
                    // Push the current state back to prevent navigation
                    window.history.pushState(null, '', location.pathname);
                    return;
                }
            }
        };

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave without saving?';
                return 'You have unsaved changes. Are you sure you want to leave without saving?';
            }
        };

        // Intercept all link clicks to check for unsaved changes
        const handleLinkClick = (e: MouseEvent) => {
            if (!hasUnsavedChanges) return;

            const target = e.target as HTMLElement;
            const link = target.closest('a');

            if (link && (link.href.startsWith('http') || link.href.includes('#') || link.getAttribute('href')?.startsWith('/'))) {
                const confirmLeave = window.confirm(
                    'You have unsaved changes. Are you sure you want to leave without saving?'
                );
                if (!confirmLeave) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            }
        };

        if (hasUnsavedChanges) {
            // Prevent browser back/forward navigation
            window.history.pushState(null, '', location.pathname);
            window.addEventListener('popstate', handlePopState);

            // Prevent page unload/refresh
            window.addEventListener('beforeunload', handleBeforeUnload);

            // Intercept link clicks
            document.addEventListener('click', handleLinkClick, true);
        }

        return () => {
            window.removeEventListener('popstate', handlePopState);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('click', handleLinkClick, true);
        };
    }, [hasUnsavedChanges, location.pathname]);

    // Helper function to save deck cards to backend
    const saveDeckCardsToBackend = async (deckId: string, currentDeck: Deck) => {
        if (!currentDeck) return;

        try {
            // Get the current state of the deck from the backend to compare
            const response = await api.get(`/api/decks/${deckId}`);
            const backendDeck = response.data;

            // Convert backend deck format to our format
            const backendMainDeck = backendDeck.main_deck.map((card: any) => ({
                cardId: card.card_id,
                quantity: card.quantity
            }));
            const backendExtraDeck = backendDeck.extra_deck.map((card: any) => ({
                cardId: card.card_id,
                quantity: card.quantity
            }));
            const backendSideDeck = backendDeck.side_deck.map((card: any) => ({
                cardId: card.card_id,
                quantity: card.quantity
            }));

            // Helper function to sync a section
            const syncSection = async (currentCards: any[], backendCards: any[], section: 'main' | 'extra' | 'side') => {
                // Create maps for easier comparison
                const currentMap = new Map(currentCards.map(card => [card.cardId, card.quantity]));
                const backendMap = new Map(backendCards.map(card => [card.cardId, card.quantity]));

                // Remove cards that are no longer in current deck
                for (const [cardId, quantity] of backendMap) {
                    if (!currentMap.has(cardId)) {
                        // Remove all copies
                        await api.delete(`/api/decks/${deckId}/cards/${cardId}`, {
                            params: { section, quantity }
                        });
                    }
                }

                // Add or update cards from current deck
                for (const [cardId, currentQuantity] of currentMap) {
                    const backendQuantity = backendMap.get(cardId) || 0;
                    const difference = currentQuantity - backendQuantity;

                    if (difference > 0) {
                        // Add more copies
                        await api.post(`/api/decks/${deckId}/cards`, null, {
                            params: { card_id: cardId, section, quantity: difference }
                        });
                    } else if (difference < 0) {
                        // Remove some copies
                        await api.delete(`/api/decks/${deckId}/cards/${cardId}`, {
                            params: { section, quantity: Math.abs(difference) }
                        });
                    }
                    // If difference === 0, no change needed
                }
            };

            // Sync all three sections
            await syncSection(currentDeck.mainDeck, backendMainDeck, 'main');
            await syncSection(currentDeck.extraDeck, backendExtraDeck, 'extra');
            await syncSection(currentDeck.sideDeck, backendSideDeck, 'side');
        } catch (error) {
            console.error('Failed to save deck cards to backend:', error);
            throw error;
        }
    };

    // Helper function to add all cards to a new deck
    const addAllCardsToNewDeck = async (deckId: string, currentDeck: Deck) => {
        if (!currentDeck) return;

        try {
            // Add all cards from current deck state
            const allCards = [
                ...currentDeck.mainDeck.map(card => ({ ...card, section: 'main' })),
                ...currentDeck.extraDeck.map(card => ({ ...card, section: 'extra' })),
                ...currentDeck.sideDeck.map(card => ({ ...card, section: 'side' }))
            ];

            for (const card of allCards) {
                if (card.quantity > 0) {
                    await api.post(`/api/decks/${deckId}/cards`, null, {
                        params: {
                            card_id: card.cardId,
                            section: card.section,
                            quantity: card.quantity
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Failed to add cards to new deck:', error);
            throw error;
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
                setHasUnsavedChanges(false); // Reset unsaved changes flag

                if (onSave) {
                    onSave(updatedDeck);
                }

                console.log('Deck saved to local storage:', updatedDeck);
                return updatedDeck;
            }

            // Save to backend API for server-side decks
            console.log('🌐 Saving deck to backend API');
            // Find the selected binder's integer ID
            const selectedBinder = availableBinders.find(b => (b.uuid || b.id.toString()) === selectedBinderId);
            const binderIntegerId = selectedBinder ? (typeof selectedBinder.id === 'string' ? parseInt(selectedBinder.id) : selectedBinder.id) : null;

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
                // Update existing deck
                response = await api.put(`/api/decks/${deckId}`, deckData);

                // Now save the current card state to the backend
                await saveDeckCardsToBackend(deckId, deck);
            } else {
                // Create new deck
                response = await api.post('/api/decks/', deckData);
                const newDeckId = response.data.uuid;

                // For new decks, just add all the current cards (no need to compare)
                await addAllCardsToNewDeck(newDeckId, deck);
            }

            const savedDeck: Deck = {
                id: response.data.uuid,
                name: response.data.name,
                description: response.data.description || '',
                format: response.data.format || '',
                mainDeck: deck.mainDeck, // Use current deck state instead of response
                extraDeck: deck.extraDeck, // Use current deck state instead of response
                sideDeck: deck.sideDeck, // Use current deck state instead of response
                tags: response.data.tags || [],
                notes: response.data.notes || '',
                createdAt: new Date(response.data.created_at),
                modifiedAt: new Date(response.data.updated_at)
            };

            setDeck(savedDeck);
            setHasUnsavedChanges(false); // Reset unsaved changes flag

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
            // Just update the deck state temporarily without saving
            console.log('Adding card to deck temporarily (no save)');

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

            // Update the deck state and mark as unsaved
            setDeck(updatedDeck);
            markAsUnsaved();

            console.log('Card added to deck temporarily');
        } catch (error) {
            console.error('Failed to add card to deck:', error);
            alert('Failed to add card to deck. Please try again.');
        }
    };

    const handleRemoveCardFromDeck = async (cardId: number, section: 'main' | 'extra' | 'side', quantity: number = 1) => {
        if (!deck?.id) return;

        try {
            // Just update the deck state temporarily without saving
            console.log('Removing card from deck temporarily (no save)');

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

            // Update the deck state and mark as unsaved
            setDeck(updatedDeck);
            markAsUnsaved();

            console.log('Card removed from deck temporarily');
        } catch (error) {
            console.error('Failed to remove card from deck:', error);
        }
    };

    const handleMoveCardBetweenSections = async (cardId: number, fromSection: 'main' | 'extra' | 'side', toSection: 'main' | 'extra' | 'side', quantity: number = 1) => {
        if (!deck?.id || fromSection === toSection) return;

        try {
            // First remove from source section
            await handleRemoveCardFromDeck(cardId, fromSection, quantity);

            // Then add to target section
            await handleAddCardToDeck(cardId, toSection, quantity);
        } catch (error) {
            console.error('Failed to move card between sections:', error);
            alert('Failed to move card between sections. Please try again.');

            // On error, reload deck to ensure consistency
            await loadDeck();
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

    // Card detail modal handlers
    const handleCardPreview = (cardId: number) => {
        const binderCard = binder?.cards?.find(card => card.cardId === cardId);
        if (binderCard?.card_details) {
            setSelectedCard(binderCard.card_details);
            setIsCardModalOpen(true);
        }
    };

    const handleCloseCardModal = () => {
        setIsCardModalOpen(false);
        setSelectedCard(null);
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
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
            <div className="w-full py-4">
                {/* Header - More compact */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-4 mx-4">
                    <div className="flex items-center justify-between mb-3">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            {deckId ? 'Edit Deck' : 'Create New Deck'}
                            {hasUnsavedChanges && (
                                <span className="text-orange-500 text-lg">●</span>
                            )}
                        </h1>
                        <div className="flex space-x-2">
                            <button
                                onClick={handleExportDeck}
                                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                disabled={!deck || (!deck.id && !deckName)}
                            >
                                Export
                            </button>
                            <button
                                onClick={handleSaveDeck}
                                className={`px-3 py-1.5 text-sm rounded transition-colors ${hasUnsavedChanges
                                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Save'}
                            </button>
                            {onCancel && (
                                <button
                                    onClick={handleCancel}
                                    className="px-3 py-1.5 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Compact Deck Form */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Deck Name *
                            </label>
                            <input
                                type="text"
                                value={deckName}
                                onChange={(e) => {
                                    setDeckName(e.target.value);
                                    markAsUnsaved();
                                }}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Enter deck name"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Format
                            </label>
                            <select
                                value={deckFormat}
                                onChange={(e) => {
                                    setDeckFormat(e.target.value);
                                    markAsUnsaved();
                                }}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Associated Binder
                            </label>
                            <select
                                value={selectedBinderId}
                                onChange={(e) => {
                                    setSelectedBinderId(e.target.value);
                                    markAsUnsaved();
                                }}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                <option value="">Select binder</option>
                                {availableBinders
                                    .sort((a, b) => {
                                        // Sort favorite binder first
                                        if (a.isFavorite && !b.isFavorite) return -1;
                                        if (!a.isFavorite && b.isFavorite) return 1;
                                        return a.name.localeCompare(b.name);
                                    })
                                    .map((binder) => (
                                        <option key={binder.uuid || binder.id} value={binder.uuid || binder.id}>
                                            {binder.isFavorite ? '⭐ ' : ''}{binder.name}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Description
                            </label>
                            <input
                                type="text"
                                value={deckDescription}
                                onChange={(e) => {
                                    setDeckDescription(e.target.value);
                                    markAsUnsaved();
                                }}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Enter deck description"
                            />
                        </div>
                    </div>

                    {/* Validation Errors - Compact */}
                    {validationErrors.length > 0 && (
                        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                            <h3 className="text-xs font-medium text-red-800 dark:text-red-400 mb-1">Validation Errors:</h3>
                            <ul className="text-xs text-red-700 dark:text-red-300 space-y-0.5">
                                {validationErrors.map((error, index) => (
                                    <li key={index}>• {error}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Main Content - FaBrary Style Layout */}
                <div className="flex gap-4 min-h-[800px] mx-4">
                    {/* Left Sidebar - Available Cards (25% width with full screen) */}
                    <div className="w-1/4 min-w-[320px] max-w-[450px] flex-shrink-0">
                        {binder && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg h-full overflow-hidden">
                                <EnhancedBinderCardList
                                    binder={binder}
                                    onCardClick={handleCardPreview}
                                    onAddToSection={handleAddCardToDeck}
                                    showQuantities={true}
                                    title="Available Cards"
                                    currentDeck={deck}
                                    compact={true}
                                    onRemoveFromDeck={handleRemoveCardFromDeck}
                                />
                            </div>
                        )}
                    </div>

                    {/* Main Content Area - Deck Sections (80% width) */}
                    <div className="flex-1 min-w-0">
                        {/* Deck Sections in a more prominent layout */}
                        <div className="space-y-3">
                            {/* Main Deck - Most prominent, auto height */}
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
                                <DeckSection
                                    title="Main Deck"
                                    cards={deck.mainDeck}
                                    onAddCard={(cardId: number, quantity: number) => handleAddCardToDeck(cardId, 'main', quantity)}
                                    onRemoveCard={(cardId: number, quantity: number) => handleRemoveCardFromDeck(cardId, 'main', quantity)}
                                    onCardClick={handleCardPreview}
                                    maxCards={60}
                                    minCards={40}
                                    sectionType="main"
                                    binderCards={binder?.cards || []}
                                    enhanced={true}
                                    onMoveCard={handleMoveCardBetweenSections}
                                    onAddToSpecificSection={handleAddCardToDeck}
                                    allDeckCards={{
                                        mainDeck: deck.mainDeck,
                                        extraDeck: deck.extraDeck,
                                        sideDeck: deck.sideDeck
                                    }}
                                />
                            </div>

                            {/* Extra Deck and Side Deck - Side by side, auto height */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
                                    <DeckSection
                                        title="Extra Deck"
                                        cards={deck.extraDeck}
                                        onAddCard={(cardId: number, quantity: number) => handleAddCardToDeck(cardId, 'extra', quantity)}
                                        onRemoveCard={(cardId: number, quantity: number) => handleRemoveCardFromDeck(cardId, 'extra', quantity)}
                                        onCardClick={handleCardPreview}
                                        maxCards={15}
                                        minCards={0}
                                        sectionType="extra"
                                        binderCards={binder?.cards || []}
                                        enhanced={true}
                                        onMoveCard={handleMoveCardBetweenSections}
                                        onAddToSpecificSection={handleAddCardToDeck}
                                        allDeckCards={{
                                            mainDeck: deck.mainDeck,
                                            extraDeck: deck.extraDeck,
                                            sideDeck: deck.sideDeck
                                        }}
                                    />
                                </div>

                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
                                    <DeckSection
                                        title="Side Deck"
                                        cards={deck.sideDeck}
                                        onAddCard={(cardId: number, quantity: number) => handleAddCardToDeck(cardId, 'side', quantity)}
                                        onRemoveCard={(cardId: number, quantity: number) => handleRemoveCardFromDeck(cardId, 'side', quantity)}
                                        onCardClick={handleCardPreview}
                                        maxCards={15}
                                        minCards={0}
                                        sectionType="side"
                                        binderCards={binder?.cards || []}
                                        enhanced={true}
                                        onMoveCard={handleMoveCardBetweenSections}
                                        onAddToSpecificSection={handleAddCardToDeck}
                                        allDeckCards={{
                                            mainDeck: deck.mainDeck,
                                            extraDeck: deck.extraDeck,
                                            sideDeck: deck.sideDeck
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Deck Statistics Section - Hidden for now */}
                            {/* 
                            <div className="bg-white rounded-lg shadow-lg">
                                <div className="p-3">
                                    <DeckStatistics
                                        deck={deck}
                                        binderCards={binder?.cards || []}
                                    />
                                </div>
                            </div>
                            */}
                        </div>
                    </div>
                </div>
            </div>

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

            {/* Card Detail Modal */}
            <CardDetailModal
                card={selectedCard}
                isOpen={isCardModalOpen}
                onClose={handleCloseCardModal}
            />
        </div>
    );
};

export default DeckBuilder;