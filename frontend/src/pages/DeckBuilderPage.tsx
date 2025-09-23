import React, { useState } from 'react';
import DeckBuilder from '../components/deck/DeckBuilder';
import DeckManagementPage from './DeckManagementPage';
import type { Deck } from '../types';

const DeckBuilderPage: React.FC = () => {
    const [currentDeck, setCurrentDeck] = useState<Deck | null>(null);
    const [showBuilder, setShowBuilder] = useState(false);
    const [showManagement, setShowManagement] = useState(true);

    const handleCreateNewDeck = () => {
        setCurrentDeck(null);
        setShowBuilder(true);
        setShowManagement(false);
    };

    const handleEditDeck = (deckId: string) => {
        // Pass the deck ID to the builder so it can load the specific deck
        const deckToEdit = { id: deckId } as Deck;
        setCurrentDeck(deckToEdit);
        setShowBuilder(true);
        setShowManagement(false);
    };

    const handleSaveDeck = (deck: Deck) => {
        setCurrentDeck(deck);
        setShowBuilder(false);
        setShowManagement(true);
    };

    const handleCancel = () => {
        setShowBuilder(false);
        setShowManagement(true);
        setCurrentDeck(null);
    };

    if (showBuilder) {
        return (
            <DeckBuilder
                deckId={currentDeck?.id}
                onSave={handleSaveDeck}
                onCancel={handleCancel}
            />
        );
    }

    if (showManagement) {
        return (
            <DeckManagementPage
                onEditDeck={handleEditDeck}
                onCreateDeck={handleCreateNewDeck}
            />
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8 transition-colors">
            <div className="max-w-6xl mx-auto px-4">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Deck Builder</h1>
                    <p className="text-gray-600">
                        Create competitive decks using cards from your binder collection.
                    </p>
                </div>

                {/* Quick Start */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
                    <div className="bg-purple-100 dark:bg-purple-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Ready to Build Decks!</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
                        Build competitive decks using only the cards you own in your binders.
                        The deck builder ensures you can only use cards from your collection.
                    </p>

                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={handleCreateNewDeck}
                            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium"
                        >
                            Create New Deck
                        </button>
                        <button
                            onClick={() => setShowManagement(true)}
                            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                        >
                            Manage Existing Decks
                        </button>
                    </div>

                    <div className="mt-6 space-y-2 text-left max-w-md mx-auto">
                        <div className="flex items-center text-gray-700 dark:text-gray-300">
                            <div className="w-2 h-2 bg-purple-600 rounded-full mr-3"></div>
                            Build from binder constraints
                        </div>
                        <div className="flex items-center text-gray-700 dark:text-gray-300">
                            <div className="w-2 h-2 bg-purple-600 rounded-full mr-3"></div>
                            Main/Extra/Side deck management
                        </div>
                        <div className="flex items-center text-gray-700 dark:text-gray-300">
                            <div className="w-2 h-2 bg-purple-600 rounded-full mr-3"></div>
                            Automatic deck validation
                        </div>
                        <div className="flex items-center text-gray-700 dark:text-gray-300">
                            <div className="w-2 h-2 bg-purple-600 rounded-full mr-3"></div>
                            Real-time deck statistics
                        </div>
                        <div className="flex items-center text-gray-700 dark:text-gray-300">
                            <div className="w-2 h-2 bg-purple-600 rounded-full mr-3"></div>
                            Import/Export .ydk files
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeckBuilderPage;
