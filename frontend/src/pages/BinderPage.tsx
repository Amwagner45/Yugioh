import React, { useState, useEffect, useMemo } from 'react';
import { storageService } from '../services/storage';
import { binderService } from '../services/api';
import BinderForm from '../components/binder/BinderForm';
import BinderList from '../components/binder/BinderList';
import CardSearch from '../components/binder/CardSearch';
import SetBrowser from '../components/binder/SetBrowser';
import CardQuantityManager from '../components/binder/CardQuantityManager';
import BinderFilters from '../components/binder/BinderFilters';
import BinderStats from '../components/binder/BinderStats';
import BinderExportImport from '../components/binder/BinderExportImport';
import { DeleteBinderConfirm } from '../components/common/ConfirmDialog';
import {
    filterAndSortBinderCards,
    getDefaultBinderFilters,
    getDefaultBinderSort
} from '../utils/binderFiltering';
import type { Binder, BinderCard, Card } from '../types';
import type { BinderFilterOptions, BinderSortOption } from '../components/binder/BinderFilters';

type ViewMode = 'list' | 'create' | 'edit' | 'view' | 'search';
type SearchTab = 'search' | 'sets';

const BinderPage: React.FC = () => {
    const [binders, setBinders] = useState<Binder[]>([]);
    const [currentView, setCurrentView] = useState<ViewMode>('list');
    const [searchTab, setSearchTab] = useState<SearchTab>('search');
    const [selectedBinder, setSelectedBinder] = useState<Binder | null>(null);
    const [editingBinder, setEditingBinder] = useState<Binder | null>(null);
    const [deletingBinder, setDeletingBinder] = useState<Binder | null>(null);
    const [showExportImport, setShowExportImport] = useState(false);

    // Loading states
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isAddingCard, setIsAddingCard] = useState(false);

    // Card data cache
    const [cardCache, setCardCache] = useState<Map<number, Card>>(new Map());

    // Error handling
    const [error, setError] = useState<string | null>(null);

    // Filtering and sorting state
    const [binderFilters, setBinderFilters] = useState<BinderFilterOptions>(getDefaultBinderFilters());
    const [binderSort, setBinderSort] = useState<BinderSortOption>(getDefaultBinderSort());

    // Load binders on component mount
    useEffect(() => {
        loadBinders();
    }, []);

    // Compute filtered and sorted cards for the selected binder
    const filteredAndSortedCards = useMemo(() => {
        if (!selectedBinder) return [];

        const cardsWithData = selectedBinder.cards.map(binderCard => ({
            ...binderCard,
            card: cardCache.get(binderCard.cardId),
        }));

        return filterAndSortBinderCards(cardsWithData, binderFilters, binderSort);
    }, [selectedBinder, cardCache, binderFilters, binderSort]);

    // Get available tags from all cards in the binder
    const availableTags = useMemo(() => {
        if (!selectedBinder) return [];

        const tags = new Set<string>();
        selectedBinder.cards.forEach(binderCard => {
            if (binderCard.tags) {
                binderCard.tags.forEach(tag => tags.add(tag));
            }
        });

        return Array.from(tags).sort();
    }, [selectedBinder]);

    const handleBinderFiltersChange = (filters: BinderFilterOptions) => {
        setBinderFilters(filters);
    };

    const handleBinderSortChange = (sort: BinderSortOption) => {
        setBinderSort(sort);
    };

    const handleResetBinderFilters = () => {
        setBinderFilters(getDefaultBinderFilters());
        setBinderSort(getDefaultBinderSort());
    };

    const handleUpdateCardTags = async (cardId: number, tags: string[]) => {
        if (!selectedBinder) return;

        try {
            setError(null);

            const updatedBinder = { ...selectedBinder };
            const cardIndex = updatedBinder.cards.findIndex(c => c.cardId === cardId);

            if (cardIndex >= 0) {
                updatedBinder.cards[cardIndex] = {
                    ...updatedBinder.cards[cardIndex],
                    tags: tags.length > 0 ? tags : undefined,
                };

                updatedBinder.modifiedAt = new Date();

                storageService.saveBinder(updatedBinder);
                setBinders(prev => prev.map(b => b.id === updatedBinder.id ? updatedBinder : b));
                setSelectedBinder(updatedBinder);
            }
        } catch (err) {
            setError('Failed to update card tags');
            console.error('Error updating card tags:', err);
        }
    };

    const handleCreateTag = (tag: string) => {
        // Tag creation is handled automatically when a new tag is added to a card
        // This callback could be used for additional logic like tag validation or tracking
        console.log('New tag created:', tag);
    };

    const handleUpdateCardSetInfo = async (cardId: number, setCode?: string, rarity?: string) => {
        if (!selectedBinder) return;

        try {
            setError(null);

            const updatedBinder = { ...selectedBinder };
            const cardIndex = updatedBinder.cards.findIndex(c => c.cardId === cardId);

            if (cardIndex >= 0) {
                updatedBinder.cards[cardIndex] = {
                    ...updatedBinder.cards[cardIndex],
                    setCode: setCode,
                    rarity: rarity,
                };

                updatedBinder.modifiedAt = new Date();

                storageService.saveBinder(updatedBinder);
                setBinders(prev => prev.map(b => b.id === updatedBinder.id ? updatedBinder : b));
                setSelectedBinder(updatedBinder);
            }
        } catch (err) {
            setError('Failed to update card set/rarity information');
            console.error('Error updating card set/rarity:', err);
        }
    };

    const handleImportBinder = async (importedBinder: Binder) => {
        try {
            setError(null);

            // Create the imported binder via backend API for automatic CSV export
            const binderData = {
                name: importedBinder.name,
                description: importedBinder.description || `Imported binder with ${importedBinder.cards.length} cards`,
                tags: importedBinder.tags || [],
                is_default: importedBinder.is_default || false
            };

            const response = await binderService.createBinder(binderData);

            if (response.error) {
                throw new Error(response.error);
            }

            // Map the API response to frontend format
            const newBinder: Binder = {
                ...response,
                id: response.uuid || response.id,
                createdAt: new Date(response.created_at),
                modifiedAt: new Date(response.updated_at),
                cards: [] // Start with empty cards, will be populated below
            };

            // Add all the imported cards to the binder via API
            const binderUuid = response.uuid || response.id;
            let successfulCards = 0;

            for (const card of importedBinder.cards) {
                try {
                    await binderService.addCard(
                        binderUuid,
                        card.cardId,
                        card.quantity,
                        card.setCode,
                        card.rarity,
                        card.condition,
                        card.edition,
                        card.notes
                    );
                    successfulCards++;
                } catch (cardError) {
                    console.warn(`Failed to add card ${card.cardId} to binder:`, cardError);
                }
            }

            // Update local state with the new binder (cards will be loaded when viewing)
            setBinders(prev => [...prev, newBinder]);

            // Close the modal and show success message
            setShowExportImport(false);
            alert(`Successfully imported binder "${newBinder.name}" with ${successfulCards}/${importedBinder.cards.length} cards and exported as CSV.`);

            console.log('Successfully imported and exported binder:', newBinder.name, `${successfulCards}/${importedBinder.cards.length} cards`);
        } catch (err) {
            console.error('Error importing binder via API:', err);
            // Fallback to local storage if API fails
            try {
                storageService.saveBinder(importedBinder);
                setBinders(prev => [...prev, importedBinder]);
                setShowExportImport(false);
                alert(`Successfully imported binder "${importedBinder.name}" with ${importedBinder.cards.length} cards (saved locally).`);
                console.log('Imported binder to local storage as fallback');
            } catch (storageErr) {
                setError('Failed to save imported binder');
                console.error('Error saving imported binder:', storageErr);
            }
        }
    };

    const loadBinders = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Load binders from backend API (primary source)
            const apiBinders = await binderService.getBinders();
            console.log('Raw API binders:', apiBinders);

            // Map API response to frontend Binder format
            const mappedBinders = apiBinders.map((binder: any) => ({
                ...binder,
                id: binder.uuid || binder.id, // Use uuid as id for API binders
                createdAt: new Date(binder.created_at),
                modifiedAt: new Date(binder.updated_at),
                cards: binder.cards || []
            }));

            setBinders(mappedBinders);
            console.log(`Loaded ${mappedBinders.length} binders from backend API`);
        } catch (err) {
            console.error('Failed to load binders from API:', err);
            // Fall back to local storage if API fails
            try {
                const savedBinders = storageService.getBinders();
                setBinders(savedBinders);
                console.log(`Loaded ${savedBinders.length} binders from local storage as fallback`);
            } catch (storageErr) {
                console.error('Failed to load from local storage:', storageErr);
                setError('Failed to load binders');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const generateId = () => {
        return `binder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    };

    const handleCreateBinder = async (binderData: Omit<Binder, 'id' | 'cards' | 'createdAt' | 'modifiedAt'>) => {
        try {
            setIsSubmitting(true);
            setError(null);

            // Create binder via backend API
            const response = await binderService.createBinder(binderData);

            if (response.error) {
                throw new Error(response.error);
            }

            // The API returns the created binder with all fields populated
            const newBinder: Binder = {
                ...response,
                id: response.uuid || response.id, // Use uuid as id for consistency
                createdAt: new Date(response.created_at),
                modifiedAt: new Date(response.updated_at),
                cards: response.cards || []
            };

            // Add to local state and return to list view
            setBinders(prev => [...prev, newBinder]);
            setCurrentView('list');

            console.log('Successfully created binder:', newBinder.name);
        } catch (err) {
            console.error('Error creating binder:', err);
            // Fallback to local storage if API fails
            try {
                const newBinder: Binder = {
                    ...binderData,
                    id: generateId(),
                    cards: [],
                    createdAt: new Date(),
                    modifiedAt: new Date(),
                };

                storageService.saveBinder(newBinder);
                setBinders(prev => [...prev, newBinder]);
                setCurrentView('list');
                console.log('Created binder in local storage as fallback');
            } catch (storageErr) {
                setError('Failed to create binder');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateBinder = async (binderData: Omit<Binder, 'id' | 'cards' | 'createdAt' | 'modifiedAt'>) => {
        if (!editingBinder) return;

        try {
            setIsSubmitting(true);
            setError(null);

            // Get the UUID for the API call (use uuid if available, otherwise use id)
            const binderUuid = editingBinder.uuid || editingBinder.id;

            // Update binder via backend API
            const response = await binderService.updateBinder(binderUuid, binderData);

            if (response.error) {
                throw new Error(response.error);
            }

            // The API returns the updated binder
            const updatedBinder: Binder = {
                ...response,
                id: response.uuid || response.id, // Use uuid as id for consistency
                createdAt: new Date(response.created_at),
                modifiedAt: new Date(response.updated_at),
                cards: response.cards || editingBinder.cards || []
            };

            // Update local state
            setBinders(prev => prev.map(b => b.id === editingBinder.id ? updatedBinder : b));

            // Update selected binder if it's the same one
            if (selectedBinder?.id === editingBinder.id) {
                setSelectedBinder(updatedBinder);
            }

            setEditingBinder(null);
            setCurrentView('list');
            console.log('Successfully updated binder:', updatedBinder.name);
        } catch (err) {
            console.error('Error updating binder:', err);
            // Fallback to local storage if API fails
            try {
                const updatedBinder: Binder = {
                    ...editingBinder,
                    ...binderData,
                    modifiedAt: new Date(),
                };

                storageService.saveBinder(updatedBinder);
                setBinders(prev => prev.map(b => b.id === updatedBinder.id ? updatedBinder : b));

                // Update selected binder if it's the same one
                if (selectedBinder?.id === updatedBinder.id) {
                    setSelectedBinder(updatedBinder);
                }

                setEditingBinder(null);
                setCurrentView('list');
                console.log('Updated binder in local storage as fallback');
            } catch (storageErr) {
                setError('Failed to update binder');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteBinder = async () => {
        if (!deletingBinder) return;

        try {
            setIsDeleting(true);
            setError(null);

            // Get the UUID for the API call (use uuid if available, otherwise use id)
            const binderUuid = deletingBinder.uuid || deletingBinder.id;

            // Delete binder via backend API
            const response = await binderService.deleteBinder(binderUuid);

            if (response.error) {
                throw new Error(response.error);
            }

            // Update local state
            setBinders(prev => prev.filter(b => b.id !== deletingBinder.id));

            // Clear selection if deleted binder was selected
            if (selectedBinder?.id === deletingBinder.id) {
                setSelectedBinder(null);
                setCurrentView('list');
            }

            setDeletingBinder(null);
            console.log('Successfully deleted binder:', deletingBinder.name);
        } catch (err) {
            console.error('Error deleting binder:', err);
            // Fallback to local storage if API fails
            try {
                storageService.deleteBinder(deletingBinder.id);
                setBinders(prev => prev.filter(b => b.id !== deletingBinder.id));

                // Clear selection if deleted binder was selected
                if (selectedBinder?.id === deletingBinder.id) {
                    setSelectedBinder(null);
                    setCurrentView('list');
                }

                setDeletingBinder(null);
                console.log('Deleted binder from local storage as fallback');
            } catch (storageErr) {
                setError('Failed to delete binder');
            }
        } finally {
            setIsDeleting(false);
        }
    };

    const handleViewBinder = (binder: Binder) => {
        setSelectedBinder(binder);
        setCurrentView('view');
    };

    const handleEditBinder = (binder: Binder) => {
        setEditingBinder(binder);
        setCurrentView('edit');
    };

    const handleDeleteBinderRequest = (binder: Binder) => {
        setDeletingBinder(binder);
    };

    const handleSetFavorite = async (binder: Binder) => {
        try {
            setError(null);
            storageService.setFavoriteBinder(binder.id);
            setBinders(prev => prev.map(b => ({
                ...b,
                isFavorite: b.id === binder.id
            })));

            // Update selected binder if it's the same one
            if (selectedBinder?.id === binder.id) {
                setSelectedBinder({ ...selectedBinder, isFavorite: true });
            }
        } catch (err) {
            setError('Failed to set favorite binder');
            console.error('Error setting favorite binder:', err);
        }
    };

    const handleRemoveFavorite = async (binder: Binder) => {
        try {
            setError(null);
            storageService.removeFavoriteBinder(binder.id);
            setBinders(prev => prev.map(b => ({
                ...b,
                isFavorite: false
            })));

            // Update selected binder if it's the same one
            if (selectedBinder?.id === binder.id) {
                setSelectedBinder({ ...selectedBinder, isFavorite: false });
            }
        } catch (err) {
            setError('Failed to remove favorite binder');
            console.error('Error removing favorite binder:', err);
        }
    };

    const handleAddCardToBinder = async (cardId: number, quantity: number) => {
        if (!selectedBinder) return;

        try {
            setIsAddingCard(true);
            setError(null);

            const updatedBinder = { ...selectedBinder };
            const existingCardIndex = updatedBinder.cards.findIndex(c => c.cardId === cardId);

            if (existingCardIndex >= 0) {
                // Update existing card quantity
                updatedBinder.cards[existingCardIndex].quantity += quantity;
            } else {
                // Add new card
                const newBinderCard: BinderCard = {
                    cardId,
                    quantity,
                };
                updatedBinder.cards.push(newBinderCard);
            }

            updatedBinder.modifiedAt = new Date();

            storageService.saveBinder(updatedBinder);
            setBinders(prev => prev.map(b => b.id === updatedBinder.id ? updatedBinder : b));
            setSelectedBinder(updatedBinder);
        } catch (err) {
            setError('Failed to add card to binder');
            console.error('Error adding card to binder:', err);
        } finally {
            setIsAddingCard(false);
        }
    };

    const handleUpdateCardQuantity = async (cardId: number, newQuantity: number) => {
        if (!selectedBinder) return;

        try {
            setError(null);

            const updatedBinder = { ...selectedBinder };
            const cardIndex = updatedBinder.cards.findIndex(c => c.cardId === cardId);

            if (cardIndex >= 0) {
                if (newQuantity <= 0) {
                    // Remove card if quantity is 0 or less
                    updatedBinder.cards.splice(cardIndex, 1);
                } else {
                    // Update quantity
                    updatedBinder.cards[cardIndex].quantity = newQuantity;
                }

                updatedBinder.modifiedAt = new Date();

                storageService.saveBinder(updatedBinder);
                setBinders(prev => prev.map(b => b.id === updatedBinder.id ? updatedBinder : b));
                setSelectedBinder(updatedBinder);
            }
        } catch (err) {
            setError('Failed to update card quantity');
            console.error('Error updating card quantity:', err);
        }
    };

    const handleRemoveCardFromBinder = async (cardId: number) => {
        if (!selectedBinder) return;

        try {
            setError(null);

            const updatedBinder = { ...selectedBinder };
            updatedBinder.cards = updatedBinder.cards.filter(c => c.cardId !== cardId);
            updatedBinder.modifiedAt = new Date();

            storageService.saveBinder(updatedBinder);
            setBinders(prev => prev.map(b => b.id === updatedBinder.id ? updatedBinder : b));
            setSelectedBinder(updatedBinder);
        } catch (err) {
            setError('Failed to remove card from binder');
            console.error('Error removing card from binder:', err);
        }
    };

    // Load card details from backend database cache for cards in viewed binder
    useEffect(() => {
        if (selectedBinder && currentView === 'view') {
            const loadCardDetailsFromCache = async () => {
                console.log('selectedBinder.cards structure check:', selectedBinder.cards.slice(0, 3));

                const cardIdsNeeded = selectedBinder.cards
                    .map(bc => {
                        console.log('Processing binder card:', bc, 'cardId type:', typeof bc.cardId);
                        // Ensure cardId is a number
                        return typeof bc.cardId === 'string' ? parseInt(bc.cardId, 10) : bc.cardId;
                    })
                    .filter(cardId => !cardCache.has(cardId) && !isNaN(cardId));

                if (cardIdsNeeded.length > 0) {
                    console.log(`Loading ${cardIdsNeeded.length} cards from cache...`);
                    console.log('First 10 card IDs:', cardIdsNeeded.slice(0, 10));

                    try {
                        console.log('About to call batch API with card IDs:', cardIdsNeeded.slice(0, 10));
                        console.log('Card IDs data type check:', cardIdsNeeded.map(id => typeof id));

                        // Use the batch endpoint to get all cards at once from database cache
                        const response = await fetch('http://localhost:8000/api/cards/batch', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(cardIdsNeeded),
                        });

                        console.log('Batch API response status:', response.status);

                        if (!response.ok) {
                            const errorText = await response.text();
                            console.error('Batch API error response:', errorText);
                        }

                        if (response.ok) {
                            const result = await response.json();
                            console.log('Batch API result:', result);

                            if (result.data && result.data.length > 0) {
                                const newCardCache = new Map(cardCache);
                                result.data.forEach((card: any) => {
                                    newCardCache.set(card.id, card);
                                });
                                setCardCache(newCardCache);

                                console.log(`Successfully loaded ${result.data.length} cards from cache`);
                                if (result.missing_cards && result.missing_cards.length > 0) {
                                    console.warn(`${result.missing_cards.length} cards not found in cache:`, result.missing_cards.slice(0, 10));
                                }
                            } else {
                                console.warn('No card data returned from batch endpoint');
                            }
                        } else {
                            const errorText = await response.text();
                            console.error('Batch API failed:', response.status, errorText);
                        }
                    } catch (err) {
                        console.error('Error loading cards from cache:', err);
                    }
                } else {
                    console.log('All cards already in cache');
                }
            };

            loadCardDetailsFromCache();
        }
    }, [selectedBinder, currentView]);

    const renderHeader = () => (
        <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        {currentView === 'list' && 'My Binders'}
                        {currentView === 'create' && 'Create New Binder'}
                        {currentView === 'edit' && `Edit ${editingBinder?.name}`}
                        {currentView === 'view' && selectedBinder?.name}
                        {currentView === 'search' && 'Add Cards to Binder'}
                    </h1>
                    <p className="text-gray-600">
                        {currentView === 'list' && 'Manage your Yu-Gi-Oh! card collection'}
                        {currentView === 'create' && 'Create a new binder to organize your cards'}
                        {currentView === 'edit' && 'Update your binder information'}
                        {currentView === 'view' && `Viewing cards in ${selectedBinder?.name}`}
                        {currentView === 'search' && `Adding cards to ${selectedBinder?.name}`}
                    </p>
                    {currentView === 'list' && binders.length > 0 && (
                        <div className="mt-2">
                            {(() => {
                                const favoriteBinder = binders.find(b => b.isFavorite === true);
                                if (favoriteBinder) {
                                    return (
                                        <p className="text-sm text-yellow-600 flex items-center">
                                            <svg className="w-4 h-4 mr-1 fill-current" viewBox="0 0 24 24">
                                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                            </svg>
                                            Favorite binder: <strong className="ml-1">{favoriteBinder.name}</strong> (will be auto-selected in deck builder)
                                        </p>
                                    );
                                } else {
                                    return (
                                        <p className="text-sm text-gray-500">
                                            No favorite binder set. Click the star icon on any binder to set it as your favorite.
                                        </p>
                                    );
                                }
                            })()}
                        </div>
                    )}
                </div>

                <div className="flex space-x-3">
                    {currentView !== 'list' && (
                        <button
                            onClick={() => {
                                setCurrentView('list');
                                setSelectedBinder(null);
                                setEditingBinder(null);
                            }}
                            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                        >
                            Back to List
                        </button>
                    )}

                    {currentView === 'list' && (
                        <>
                            <button
                                onClick={() => setShowExportImport(true)}
                                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                Import Binder
                            </button>
                            <button
                                onClick={() => setCurrentView('create')}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                Create Binder
                            </button>
                        </>
                    )}

                    {currentView === 'view' && selectedBinder && (
                        <>
                            <button
                                onClick={() => setCurrentView('search')}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                                Add Cards
                            </button>
                            <button
                                onClick={() => setShowExportImport(true)}
                                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                Export/Import
                            </button>
                            <button
                                onClick={() => handleEditBinder(selectedBinder)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                Edit Binder
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                    <div className="flex">
                        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">Error</h3>
                            <p className="text-sm text-red-700 mt-1">{error}</p>
                        </div>
                        <button
                            onClick={() => setError(null)}
                            className="ml-auto pl-3"
                        >
                            <svg className="w-5 h-5 text-red-400 hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8 transition-colors">
            <div className="max-w-6xl mx-auto px-4">
                {renderHeader()}

                {/* Main Content */}
                {currentView === 'list' && (
                    <BinderList
                        binders={binders}
                        onViewBinder={handleViewBinder}
                        onEditBinder={handleEditBinder}
                        onDeleteBinder={handleDeleteBinderRequest}
                        onSetFavorite={handleSetFavorite}
                        onRemoveFavorite={handleRemoveFavorite}
                        isLoading={isLoading}
                    />
                )}

                {currentView === 'create' && (
                    <BinderForm
                        onSubmit={handleCreateBinder}
                        onCancel={() => setCurrentView('list')}
                        isSubmitting={isSubmitting}
                    />
                )}

                {currentView === 'edit' && editingBinder && (
                    <BinderForm
                        binder={editingBinder}
                        onSubmit={handleUpdateBinder}
                        onCancel={() => {
                            setEditingBinder(null);
                            setCurrentView('list');
                        }}
                        isSubmitting={isSubmitting}
                    />
                )}

                {currentView === 'view' && selectedBinder && (
                    <div className="space-y-6">
                        {/* Binder Stats */}
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Binder Overview</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-blue-50 rounded-lg p-4">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {selectedBinder.cards.reduce((total, card) => total + card.quantity, 0)}
                                    </div>
                                    <div className="text-sm text-gray-600">Total Cards</div>
                                </div>
                                <div className="bg-green-50 rounded-lg p-4">
                                    <div className="text-2xl font-bold text-green-600">
                                        {selectedBinder.cards.length}
                                    </div>
                                    <div className="text-sm text-gray-600">Unique Cards</div>
                                </div>
                                <div className="bg-purple-50 rounded-lg p-4">
                                    <div className="text-2xl font-bold text-purple-600">
                                        {filteredAndSortedCards.length}
                                    </div>
                                    <div className="text-sm text-gray-600">Filtered Results</div>
                                </div>
                            </div>
                        </div>

                        {/* Detailed Statistics */}
                        <BinderStats
                            binderCards={selectedBinder.cards}
                            cardCache={cardCache}
                            binderName={selectedBinder.name}
                        />

                        {/* Filters and Sorting */}
                        <BinderFilters
                            cards={selectedBinder.cards.map(bc => ({
                                cardId: bc.cardId,
                                card: cardCache.get(bc.cardId),
                                quantity: bc.quantity
                            }))}
                            filters={binderFilters}
                            sortOption={binderSort}
                            onFiltersChange={handleBinderFiltersChange}
                            onSortChange={handleBinderSortChange}
                            onResetFilters={handleResetBinderFilters}
                            availableTags={availableTags}
                        />

                        {/* Cards in Binder */}
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Cards in Binder</h2>
                            {selectedBinder.cards.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-600 mb-4">No cards in this binder yet.</p>
                                    <button
                                        onClick={() => setCurrentView('search')}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                    >
                                        Add Your First Card
                                    </button>
                                </div>
                            ) : filteredAndSortedCards.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-600 mb-4">No cards match your current filters.</p>
                                    <button
                                        onClick={handleResetBinderFilters}
                                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                                    >
                                        Clear Filters
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredAndSortedCards.map((filteredCard) => (
                                        <CardQuantityManager
                                            key={filteredCard.cardId}
                                            binderCard={filteredCard}
                                            card={filteredCard.card}
                                            onUpdateQuantity={handleUpdateCardQuantity}
                                            onRemoveCard={handleRemoveCardFromBinder}
                                            onUpdateTags={handleUpdateCardTags}
                                            onUpdateSetInfo={handleUpdateCardSetInfo}
                                            availableTags={availableTags}
                                            onCreateTag={handleCreateTag}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {currentView === 'search' && (
                    <div className="space-y-6">
                        {/* Search Tabs */}
                        <div className="bg-white rounded-lg shadow-lg">
                            <div className="border-b border-gray-200">
                                <nav className="flex space-x-8 px-6" aria-label="Tabs">
                                    <button
                                        onClick={() => setSearchTab('search')}
                                        className={`py-4 px-1 border-b-2 font-medium text-sm ${searchTab === 'search'
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }`}
                                    >
                                        Search Cards
                                    </button>
                                    <button
                                        onClick={() => setSearchTab('sets')}
                                        className={`py-4 px-1 border-b-2 font-medium text-sm ${searchTab === 'sets'
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }`}
                                    >
                                        Browse by Set
                                    </button>
                                </nav>
                            </div>
                        </div>

                        {/* Tab Content */}
                        {searchTab === 'search' && (
                            <CardSearch
                                selectedBinder={selectedBinder}
                                onAddToBinder={handleAddCardToBinder}
                                isAddingCard={isAddingCard}
                            />
                        )}

                        {searchTab === 'sets' && (
                            <SetBrowser
                                selectedBinder={selectedBinder}
                                onAddToBinder={handleAddCardToBinder}
                                isAddingCard={isAddingCard}
                            />
                        )}
                    </div>
                )}

                {/* Delete Confirmation Dialog */}
                <DeleteBinderConfirm
                    binder={deletingBinder}
                    isOpen={!!deletingBinder}
                    onConfirm={handleDeleteBinder}
                    onCancel={() => setDeletingBinder(null)}
                    isDeleting={isDeleting}
                />

                {/* Export/Import Modal */}
                {showExportImport && (selectedBinder || currentView === 'list') && (
                    <BinderExportImport
                        binder={selectedBinder || {
                            id: 'temp',
                            name: 'All Binders',
                            cards: [],
                            createdAt: new Date(),
                            modifiedAt: new Date()
                        }}
                        cardCache={cardCache}
                        onImportBinder={handleImportBinder}
                        onClose={() => setShowExportImport(false)}
                    />
                )}
            </div>
        </div>
    );
};

export default BinderPage;
