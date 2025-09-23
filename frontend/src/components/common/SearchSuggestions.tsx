import React, { useState, useEffect, useRef } from 'react';

interface SearchSuggestion {
    value: string;
    type: 'card' | 'archetype' | 'attribute' | 'type' | 'race';
    count?: number;
    icon?: string;
}

interface SearchSuggestionsProps {
    searchTerm: string;
    onSelectSuggestion: (suggestion: SearchSuggestion) => void;
    isVisible: boolean;
    maxSuggestions?: number;
    placeholder?: string;
    className?: string;
}

const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({
    searchTerm,
    onSelectSuggestion,
    isVisible,
    maxSuggestions = 8,
    className = ''
}) => {
    const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    // Sample data - in a real app, this would come from your card database
    const sampleData: SearchSuggestion[] = [
        // Popular cards
        { value: 'Blue-Eyes White Dragon', type: 'card', count: 156 },
        { value: 'Dark Magician', type: 'card', count: 142 },
        { value: 'Exodia the Forbidden One', type: 'card', count: 89 },
        { value: 'Red-Eyes Black Dragon', type: 'card', count: 134 },
        { value: 'Elemental HERO Sparkman', type: 'card', count: 67 },
        { value: 'Cyber Dragon', type: 'card', count: 78 },
        { value: 'Mystical Space Typhoon', type: 'card', count: 203 },
        { value: 'Mirror Force', type: 'card', count: 187 },
        { value: 'Pot of Greed', type: 'card', count: 156 },
        { value: 'Raigeki', type: 'card', count: 134 },

        // Archetypes
        { value: 'Blue-Eyes', type: 'archetype', count: 45 },
        { value: 'Dark Magician', type: 'archetype', count: 38 },
        { value: 'Elemental HERO', type: 'archetype', count: 67 },
        { value: 'Red-Eyes', type: 'archetype', count: 29 },
        { value: 'Cyber Dragon', type: 'archetype', count: 23 },
        { value: 'Blackwing', type: 'archetype', count: 42 },
        { value: 'Six Samurai', type: 'archetype', count: 31 },
        { value: 'Gladiator Beast', type: 'archetype', count: 26 },

        // Attributes
        { value: 'LIGHT', type: 'attribute', count: 892 },
        { value: 'DARK', type: 'attribute', count: 756 },
        { value: 'FIRE', type: 'attribute', count: 432 },
        { value: 'WATER', type: 'attribute', count: 378 },
        { value: 'EARTH', type: 'attribute', count: 423 },
        { value: 'WIND', type: 'attribute', count: 367 },
        { value: 'DIVINE', type: 'attribute', count: 12 },

        // Types
        { value: 'Effect Monster', type: 'type', count: 2341 },
        { value: 'Normal Monster', type: 'type', count: 567 },
        { value: 'Spell Card', type: 'type', count: 1234 },
        { value: 'Trap Card', type: 'type', count: 987 },
        { value: 'Fusion Monster', type: 'type', count: 456 },
        { value: 'Synchro Monster', type: 'type', count: 234 },
        { value: 'Xyz Monster', type: 'type', count: 189 },
        { value: 'Link Monster', type: 'type', count: 123 },

        // Races/Types
        { value: 'Dragon', type: 'race', count: 234 },
        { value: 'Warrior', type: 'race', count: 387 },
        { value: 'Spellcaster', type: 'race', count: 298 },
        { value: 'Machine', type: 'race', count: 267 },
        { value: 'Fiend', type: 'race', count: 245 },
        { value: 'Beast', type: 'race', count: 189 },
        { value: 'Fairy', type: 'race', count: 156 },
        { value: 'Zombie', type: 'race', count: 134 }
    ];

    useEffect(() => {
        if (!searchTerm.trim() || !isVisible) {
            setSuggestions([]);
            setSelectedIndex(-1);
            return;
        }

        const filtered = sampleData
            .filter(item =>
                item.value.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => {
                // Exact matches first
                const aExact = a.value.toLowerCase() === searchTerm.toLowerCase();
                const bExact = b.value.toLowerCase() === searchTerm.toLowerCase();
                if (aExact && !bExact) return -1;
                if (!aExact && bExact) return 1;

                // Starts with match
                const aStarts = a.value.toLowerCase().startsWith(searchTerm.toLowerCase());
                const bStarts = b.value.toLowerCase().startsWith(searchTerm.toLowerCase());
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;

                // Sort by popularity (count)
                return (b.count || 0) - (a.count || 0);
            })
            .slice(0, maxSuggestions);

        setSuggestions(filtered);
        setSelectedIndex(-1);
    }, [searchTerm, isVisible, maxSuggestions]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isVisible || suggestions.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev < suggestions.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev > 0 ? prev - 1 : suggestions.length - 1
                );
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
                    onSelectSuggestion(suggestions[selectedIndex]);
                }
                break;
            case 'Escape':
                setSelectedIndex(-1);
                break;
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'card':
                return '🃏';
            case 'archetype':
                return '🏛️';
            case 'attribute':
                return '⭐';
            case 'type':
                return '📋';
            case 'race':
                return '🦄';
            default:
                return '🔍';
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'card':
                return 'text-blue-600 bg-blue-50';
            case 'archetype':
                return 'text-purple-600 bg-purple-50';
            case 'attribute':
                return 'text-yellow-600 bg-yellow-50';
            case 'type':
                return 'text-green-600 bg-green-50';
            case 'race':
                return 'text-red-600 bg-red-50';
            default:
                return 'text-gray-600 bg-gray-50';
        }
    };

    if (!isVisible || suggestions.length === 0) {
        return null;
    }

    return (
        <div
            ref={suggestionsRef}
            className={`absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto ${className}`}
            onKeyDown={handleKeyDown}
        >
            {suggestions.map((suggestion, index) => (
                <div
                    key={`${suggestion.type}-${suggestion.value}`}
                    className={`px-4 py-3 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0 ${index === selectedIndex
                            ? 'bg-blue-50 border-blue-200'
                            : 'hover:bg-gray-50'
                        }`}
                    onClick={() => onSelectSuggestion(suggestion)}
                    onMouseEnter={() => setSelectedIndex(index)}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <span className="text-lg">{getTypeIcon(suggestion.type)}</span>
                            <div>
                                <div className="font-medium text-gray-900">
                                    {suggestion.value}
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(suggestion.type)}`}>
                                        {suggestion.type}
                                    </span>
                                    {suggestion.count && (
                                        <span className="text-xs text-gray-500">
                                            {suggestion.count} cards
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="text-gray-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </div>
                </div>
            ))}

            {suggestions.length === maxSuggestions && (
                <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-t border-gray-200">
                    Showing top {maxSuggestions} results. Type more to refine search.
                </div>
            )}
        </div>
    );
};

export default SearchSuggestions;