import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import { cardService } from '../services/api';
import BinderForm from '../components/binder/BinderForm';
import BinderList from '../components/binder/BinderList';
import CardSearch from '../components/binder/CardSearch';
import SetBrowser from '../components/binder/SetBrowser';
import CardQuantityManager from '../components/binder/CardQuantityManager';
import { DeleteBinderConfirm } from '../components/common/ConfirmDialog';
import type { Binder, BinderCard, Card } from '../types';

type ViewMode = 'list' | 'create' | 'edit' | 'view' | 'search';
type SearchTab = 'search' | 'sets';

const BinderPage: React.FC = () => {
    const [binders, setBinders] = useState<Binder[]>([]);
    const [currentView, setCurrentView] = useState<ViewMode>('list');
    const [searchTab, setSearchTab] = useState<SearchTab>('search');
    const [selectedBinder, setSelectedBinder] = useState<Binder | null>(null);
    const [editingBinder, setEditingBinder] = useState<Binder | null>(null);
    const [deletingBinder, setDeletingBinder] = useState<Binder | null>(null);

    // Loading states
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isAddingCard, setIsAddingCard] = useState(false);

    // Card data cache
    const [cardCache, setCardCache] = useState<Map<number, Card>>(new Map());

    // Error handling
    const [error, setError] = useState<string | null>(null);

    // Load binders on component mount
    useEffect(() => {
        loadBinders();
    }, []);

    const loadBinders = async () => {
        try {
            setIsLoading(true);
            const savedBinders = storageService.getBinders();
            setBinders(savedBinders);
        } catch (err) {
            setError('Failed to load binders');
            console.error('Error loading binders:', err);
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
        } catch (err) {
            setError('Failed to create binder');
            console.error('Error creating binder:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateBinder = async (binderData: Omit<Binder, 'id' | 'cards' | 'createdAt' | 'modifiedAt'>) => {
        if (!editingBinder) return;

        try {
            setIsSubmitting(true);
            setError(null);

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
        } catch (err) {
            setError('Failed to update binder');
            console.error('Error updating binder:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteBinder = async () => {
        if (!deletingBinder) return;

        try {
            setIsDeleting(true);
            setError(null);

            storageService.deleteBinder(deletingBinder.id);
            setBinders(prev => prev.filter(b => b.id !== deletingBinder.id));

            // Clear selection if deleted binder was selected
            if (selectedBinder?.id === deletingBinder.id) {
                setSelectedBinder(null);
                setCurrentView('list');
            }

            setDeletingBinder(null);
        } catch (err) {
            setError('Failed to delete binder');
            console.error('Error deleting binder:', err);
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

    const handleAddCardToBinder = async (cardId: number, quantity: number) => {
        if (!selectedBinder) return;

        try {
            setIsAddingCard(true);
            setError(null);

            // Load card details if not cached
            if (!cardCache.has(cardId)) {
                const card = await cardService.getCardById(cardId);
                if (card) {
                    setCardCache(prev => new Map(prev.set(cardId, card)));
                }
            }

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

    // Load card details for cards in viewed binder
    useEffect(() => {
        if (selectedBinder && currentView === 'view') {
            const loadCardDetails = async () => {
                const uncachedCardIds = selectedBinder.cards
                    .map(bc => bc.cardId)
                    .filter(cardId => !cardCache.has(cardId));

                if (uncachedCardIds.length > 0) {
                    // Load cards in batches to avoid overwhelming the API
                    for (const cardId of uncachedCardIds) {
                        try {
                            const card = await cardService.getCardById(cardId);
                            if (card) {
                                setCardCache(prev => new Map(prev.set(cardId, card)));
                            }
                        } catch (err) {
                            console.error(`Failed to load card ${cardId}:`, err);
                        }
                    }
                }
            };

            loadCardDetails();
        }
    }, [selectedBinder, currentView, cardCache]);

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
                        <button
                            onClick={() => setCurrentView('create')}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            Create Binder
                        </button>
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
        <div className="min-h-screen bg-gray-100 py-8">
            <div className="max-w-6xl mx-auto px-4">
                {renderHeader()}

                {/* Main Content */}
                {currentView === 'list' && (
                    <BinderList
                        binders={binders}
                        onViewBinder={handleViewBinder}
                        onEditBinder={handleEditBinder}
                        onDeleteBinder={handleDeleteBinderRequest}
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
                                        {selectedBinder.tags?.length || 0}
                                    </div>
                                    <div className="text-sm text-gray-600">Tags</div>
                                </div>
                            </div>
                        </div>

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
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {selectedBinder.cards.map((binderCard) => (
                                        <CardQuantityManager
                                            key={binderCard.cardId}
                                            binderCard={binderCard}
                                            card={cardCache.get(binderCard.cardId)}
                                            onUpdateQuantity={handleUpdateCardQuantity}
                                            onRemoveCard={handleRemoveCardFromBinder}
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
            </div>
        </div>
    );
};

export default BinderPage;
