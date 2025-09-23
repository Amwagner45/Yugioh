import React, { useState, useEffect } from 'react';
import DeckList from '../components/deck/DeckList';
import { storageService } from '../services/storage';

interface DeckManagementPageProps {
    onEditDeck: (deckId: string) => void;
    onCreateDeck: () => void;
}

const DeckManagementPage: React.FC<DeckManagementPageProps> = ({
    onEditDeck,
    onCreateDeck,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        loadAvailableTags();
    }, []);

    const loadAvailableTags = () => {
        const decks = storageService.getDecks();
        const allTags = new Set<string>();

        decks.forEach(deck => {
            if (deck.tags) {
                deck.tags.forEach(tag => allTags.add(tag));
            }
        });

        setAvailableTags(Array.from(allTags).sort());
    };

    const handleTagToggle = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    };

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedTags([]);
    };

    const hasActiveFilters = searchQuery.length > 0 || selectedTags.length > 0;

    return (
        <div className="min-h-screen bg-gray-100 py-8">
            <div className="max-w-7xl mx-auto px-4">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Deck Management</h1>
                    <p className="text-gray-600">
                        Organize, edit, and export your Yu-Gi-Oh deck collection.
                    </p>
                </div>

                {/* Search and Filter Controls */}
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Search Bar */}
                        <div className="flex-1">
                            <div className="relative">
                                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search decks by name, description, format, or notes..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Filter Controls */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${showFilters || selectedTags.length > 0
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                            >
                                <span className="flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                                    </svg>
                                    Filters
                                    {selectedTags.length > 0 && (
                                        <span className="bg-white text-purple-600 rounded-full px-2 py-1 text-xs font-bold">
                                            {selectedTags.length}
                                        </span>
                                    )}
                                </span>
                            </button>

                            {hasActiveFilters && (
                                <button
                                    onClick={clearFilters}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                                >
                                    Clear All
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Tag Filters */}
                    {showFilters && availableTags.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Filter by Tags:</h4>
                            <div className="flex flex-wrap gap-2">
                                {availableTags.map((tag) => (
                                    <button
                                        key={tag}
                                        onClick={() => handleTagToggle(tag)}
                                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${selectedTags.includes(tag)
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            }`}
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Active Filters Display */}
                    {hasActiveFilters && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex flex-wrap gap-2 items-center">
                                <span className="text-sm text-gray-600">Active filters:</span>

                                {searchQuery && (
                                    <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded">
                                        Search: "{searchQuery}"
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="text-blue-600 hover:text-blue-800"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </span>
                                )}

                                {selectedTags.map((tag) => (
                                    <span key={tag} className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 text-sm px-2 py-1 rounded">
                                        Tag: {tag}
                                        <button
                                            onClick={() => handleTagToggle(tag)}
                                            className="text-purple-600 hover:text-purple-800"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Deck List */}
                <DeckList
                    onEditDeck={onEditDeck}
                    onCreateDeck={onCreateDeck}
                    selectedTags={selectedTags}
                    searchQuery={searchQuery}
                />
            </div>
        </div>
    );
};

export default DeckManagementPage;