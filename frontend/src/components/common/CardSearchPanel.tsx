import React, { useState } from 'react';
import type { Card, CardSearchParams, ViewMode } from '../../types';

interface CardSearchPanelProps {
    searchResults: Card[];
    onSearch: (params: CardSearchParams) => void;
    isSearching: boolean;
    selectedCards: Set<number>;
    onCardSelect: (cardId: number, selected: boolean) => void;
    onCardDragStart: (card: Card) => void;
    onCardDragEnd: () => void;
    viewMode: ViewMode;
    showBinderFilter?: boolean;
}

interface SearchFilters {
    name: string;
    type: string;
    race: string;
    attribute: string;
    level: string;
}

const CardSearchPanel: React.FC<CardSearchPanelProps> = ({
    searchResults,
    onSearch,
    isSearching,
    selectedCards,
    onCardSelect,
    onCardDragStart,
    onCardDragEnd,
    viewMode,
    showBinderFilter = false
}) => {
    const [filters, setFilters] = useState<SearchFilters>({
        name: '',
        type: '',
        race: '',
        attribute: '',
        level: ''
    });

    const handleFilterChange = (key: keyof SearchFilters, value: string) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);

        // Build search params
        const searchParams: CardSearchParams = {};
        if (newFilters.name.trim()) searchParams.name = newFilters.name.trim();
        if (newFilters.type) searchParams.type = newFilters.type;
        if (newFilters.race) searchParams.race = newFilters.race;
        if (newFilters.attribute) searchParams.attribute = newFilters.attribute;
        if (newFilters.level) searchParams.level = parseInt(newFilters.level);

        onSearch(searchParams);
    };

    const clearFilters = () => {
        setFilters({
            name: '',
            type: '',
            race: '',
            attribute: '',
            level: ''
        });
        onSearch({});
    };

    return (
        <div className="flex flex-col h-full">
            {/* Search Filters */}
            <div className="p-4 space-y-3 border-b border-gray-200 dark:border-gray-700">
                <div>
                    <input
                        type="text"
                        placeholder="Search card name..."
                        value={filters.name}
                        onChange={(e) => handleFilterChange('name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white text-sm"
                    />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <select
                        value={filters.type}
                        onChange={(e) => handleFilterChange('type', e.target.value)}
                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                    >
                        <option value="">All Types</option>
                        <option value="Effect Monster">Effect Monster</option>
                        <option value="Normal Monster">Normal Monster</option>
                        <option value="Ritual Monster">Ritual Monster</option>
                        <option value="Fusion Monster">Fusion Monster</option>
                        <option value="Synchro Monster">Synchro Monster</option>
                        <option value="XYZ Monster">XYZ Monster</option>
                        <option value="Link Monster">Link Monster</option>
                        <option value="Spell Card">Spell Card</option>
                        <option value="Trap Card">Trap Card</option>
                    </select>

                    <select
                        value={filters.attribute}
                        onChange={(e) => handleFilterChange('attribute', e.target.value)}
                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                    >
                        <option value="">All Attributes</option>
                        <option value="DARK">DARK</option>
                        <option value="LIGHT">LIGHT</option>
                        <option value="EARTH">EARTH</option>
                        <option value="WATER">WATER</option>
                        <option value="FIRE">FIRE</option>
                        <option value="WIND">WIND</option>
                        <option value="DIVINE">DIVINE</option>
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <select
                        value={filters.race}
                        onChange={(e) => handleFilterChange('race', e.target.value)}
                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                    >
                        <option value="">All Races</option>
                        <option value="Dragon">Dragon</option>
                        <option value="Spellcaster">Spellcaster</option>
                        <option value="Warrior">Warrior</option>
                        <option value="Beast-Warrior">Beast-Warrior</option>
                        <option value="Beast">Beast</option>
                        <option value="Winged Beast">Winged Beast</option>
                        <option value="Fiend">Fiend</option>
                        <option value="Machine">Machine</option>
                        <option value="Aqua">Aqua</option>
                        <option value="Plant">Plant</option>
                        <option value="Insect">Insect</option>
                        <option value="Thunder">Thunder</option>
                        <option value="Rock">Rock</option>
                        <option value="Zombie">Zombie</option>
                        <option value="Reptile">Reptile</option>
                        <option value="Fish">Fish</option>
                        <option value="Sea Serpent">Sea Serpent</option>
                        <option value="Dinosaur">Dinosaur</option>
                        <option value="Fairy">Fairy</option>
                        <option value="Psychic">Psychic</option>
                    </select>

                    <select
                        value={filters.level}
                        onChange={(e) => handleFilterChange('level', e.target.value)}
                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                    >
                        <option value="">All Levels</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(level => (
                            <option key={level} value={level}>Level {level}</option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={clearFilters}
                    className="w-full px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                    Clear Filters
                </button>
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto">
                {isSearching ? (
                    <div className="flex items-center justify-center p-8">
                        <div className="text-center">
                            <svg className="animate-spin w-6 h-6 text-purple-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Searching...</p>
                        </div>
                    </div>
                ) : searchResults.length === 0 ? (
                    <div className="flex items-center justify-center p-8">
                        <div className="text-center">
                            <svg className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <p className="text-sm text-gray-600 dark:text-gray-400">No cards found</p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Try adjusting your search filters</p>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 space-y-2">
                        {searchResults.map((card) => (
                            <div
                                key={card.id}
                                draggable
                                onDragStart={() => onCardDragStart(card)}
                                onDragEnd={onCardDragEnd}
                                className="group cursor-move bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 hover:shadow-md transition-all"
                            >
                                <div className="flex items-start space-x-3">
                                    {/* Card Image */}
                                    {card.card_images?.[0] && (
                                        <img
                                            src={card.card_images[0].image_url_small}
                                            alt={card.name}
                                            className="w-12 h-17 object-cover rounded border border-gray-300 dark:border-gray-500"
                                        />
                                    )}

                                    {/* Card Info */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                            {card.name}
                                        </h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {card.type}
                                        </p>
                                        {card.race && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {card.race} • {card.attribute}
                                            </p>
                                        )}
                                        {card.atk !== undefined && card.def !== undefined && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                ATK/{card.atk} DEF/{card.def}
                                            </p>
                                        )}
                                    </div>

                                    {/* Drag indicator */}
                                    <div className="opacity-0 group-hover:opacity-100 text-gray-400 transition-opacity">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Results count */}
            {searchResults.length > 0 && (
                <div className="p-2 border-t border-gray-200 dark:border-gray-700 text-center text-xs text-gray-500 dark:text-gray-400">
                    {searchResults.length} cards found
                </div>
            )}
        </div>
    );
};

export default CardSearchPanel;