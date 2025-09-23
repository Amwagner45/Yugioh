import React, { useState } from 'react';
import DeckBuilder from '../components/deck/DeckBuilder';
import type { Deck } from '../types';

const DeckBuilderPage: React.FC = () => {
    const [currentDeck, setCurrentDeck] = useState<Deck | null>(null);
    const [showBuilder, setShowBuilder] = useState(false);

    const handleCreateNewDeck = () => {
        setCurrentDeck(null);
        setShowBuilder(true);
    };

    const handleSaveDeck = (deck: Deck) => {
        setCurrentDeck(deck);
        // Could navigate to deck list or stay in builder
    };

    const handleCancel = () => {
        setShowBuilder(false);
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

    return (
        <div className="min-h-screen bg-gray-100 py-8">
            <div className="max-w-6xl mx-auto px-4">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Deck Builder</h1>
                    <p className="text-gray-600">
                        Create competitive decks using cards from your binder collection.
                    </p>
                </div>

                {/* Quick Start */}
                <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                    <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Ready to Build Decks!</h2>
                    <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                        Build competitive decks using only the cards you own in your binders.
                        The deck builder ensures you can only use cards from your collection.
                    </p>

                    <button
                        onClick={handleCreateNewDeck}
                        className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium"
                    >
                        Create New Deck
                    </button>

                    <div className="mt-6 space-y-2 text-left max-w-md mx-auto">
                        <div className="flex items-center text-gray-700">
                            <div className="w-2 h-2 bg-purple-600 rounded-full mr-3"></div>
                            Build from binder constraints
                        </div>
                        <div className="flex items-center text-gray-700">
                            <div className="w-2 h-2 bg-purple-600 rounded-full mr-3"></div>
                            Main/Extra/Side deck management
                        </div>
                        <div className="flex items-center text-gray-700">
                            <div className="w-2 h-2 bg-purple-600 rounded-full mr-3"></div>
                            Automatic deck validation
                        </div>
                        <div className="flex items-center text-gray-700">
                            <div className="w-2 h-2 bg-purple-600 rounded-full mr-3"></div>
                            Real-time deck statistics
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeckBuilderPage;
