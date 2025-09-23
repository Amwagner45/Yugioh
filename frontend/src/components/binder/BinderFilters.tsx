import React, { useState, useEffect } from 'react';
import type { Card } from '../../types';

export interface BinderFilterOptions {
    searchTerm: string;
    cardType: string;
    attribute: string;
    race: string;
    level: string;
    atkRange: { min: string; max: string };
    defRange: { min: string; max: string };
    rarity: string;
    setCode: string;
    tags: string[];
}

export interface BinderSortOption {
    field: 'name' | 'type' | 'attribute' | 'level' | 'atk' | 'def' | 'rarity' | 'quantity' | 'dateAdded';
    direction: 'asc' | 'desc';
}

interface BinderFiltersProps {
    cards: Array<{ cardId: number; card?: Card; quantity: number }>;
    filters: BinderFilterOptions;
    sortOption: BinderSortOption;
    onFiltersChange: (filters: BinderFilterOptions) => void;
    onSortChange: (sort: BinderSortOption) => void;
    onResetFilters: () => void;
    availableTags?: string[];
}

const BinderFilters: React.FC<BinderFiltersProps> = ({
    cards,
    filters,
    sortOption,
    onFiltersChange,
    onSortChange,
    onResetFilters,
    availableTags = [],
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeFiltersCount, setActiveFiltersCount] = useState(0);

    // Count active filters
    useEffect(() => {
        let count = 0;
        if (filters.searchTerm.trim()) count++;
        if (filters.cardType) count++;
        if (filters.attribute) count++;
        if (filters.race) count++;
        if (filters.level) count++;
        if (filters.atkRange.min || filters.atkRange.max) count++;
        if (filters.defRange.min || filters.defRange.max) count++;
        if (filters.rarity) count++;
        if (filters.setCode) count++;
        if (filters.tags.length > 0) count++;
        setActiveFiltersCount(count);
    }, [filters]);

    // Get unique values from cards for filter options
    const getUniqueValues = (field: string) => {
        const values = new Set<string>();
        cards.forEach(({ card }) => {
            if (card && card[field as keyof Card]) {
                values.add(String(card[field as keyof Card]));
            }
        });
        return Array.from(values).sort();
    };

    const getUniqueRarities = () => {
        const rarities = new Set<string>();
        cards.forEach(({ card }) => {
            if (card?.card_sets) {
                card.card_sets.forEach(set => {
                    if (set.set_rarity) {
                        rarities.add(set.set_rarity);
                    }
                });
            }
        });
        return Array.from(rarities).sort();
    };

    const getUniqueSetCodes = () => {
        const setCodes = new Set<string>();
        cards.forEach(({ card }) => {
            if (card?.card_sets) {
                card.card_sets.forEach(set => {
                    if (set.set_code) {
                        setCodes.add(set.set_code);
                    }
                });
            }
        });
        return Array.from(setCodes).sort();
    };

    const handleFilterChange = (field: keyof BinderFilterOptions, value: any) => {
        onFiltersChange({ ...filters, [field]: value });
    };

    const handleRangeChange = (range: 'atkRange' | 'defRange', type: 'min' | 'max', value: string) => {
        onFiltersChange({
            ...filters,
            [range]: { ...filters[range], [type]: value }
        });
    };

    const handleTagToggle = (tag: string) => {
        const newTags = filters.tags.includes(tag)
            ? filters.tags.filter(t => t !== tag)
            : [...filters.tags, tag];
        handleFilterChange('tags', newTags);
    };

    const sortOptions = [
        { value: 'name-asc', label: 'Name (A-Z)', field: 'name' as const, direction: 'asc' as const },
        { value: 'name-desc', label: 'Name (Z-A)', field: 'name' as const, direction: 'desc' as const },
        { value: 'type-asc', label: 'Type (A-Z)', field: 'type' as const, direction: 'asc' as const },
        { value: 'level-desc', label: 'Level (High-Low)', field: 'level' as const, direction: 'desc' as const },
        { value: 'level-asc', label: 'Level (Low-High)', field: 'level' as const, direction: 'asc' as const },
        { value: 'atk-desc', label: 'ATK (High-Low)', field: 'atk' as const, direction: 'desc' as const },
        { value: 'atk-asc', label: 'ATK (Low-High)', field: 'atk' as const, direction: 'asc' as const },
        { value: 'quantity-desc', label: 'Quantity (High-Low)', field: 'quantity' as const, direction: 'desc' as const },
        { value: 'quantity-asc', label: 'Quantity (Low-High)', field: 'quantity' as const, direction: 'asc' as const },
    ];

    const currentSortValue = `${sortOption.field}-${sortOption.direction}`;

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                    <h3 className="text-lg font-medium text-gray-900">
                        Filters & Sorting
                    </h3>
                    {activeFiltersCount > 0 && (
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                            {activeFiltersCount} active filter{activeFiltersCount !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
                <div className="flex items-center space-x-3">
                    {activeFiltersCount > 0 && (
                        <button
                            onClick={onResetFilters}
                            className="text-sm text-gray-600 hover:text-gray-800 underline"
                        >
                            Clear All
                        </button>
                    )}
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center space-x-1 text-gray-600 hover:text-gray-800"
                    >
                        <span className="text-sm">
                            {isExpanded ? 'Hide Filters' : 'Show Filters'}
                        </span>
                        <svg
                            className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Quick Search and Sort (Always Visible) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                        Search Cards
                    </label>
                    <input
                        id="search"
                        type="text"
                        value={filters.searchTerm}
                        onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                        placeholder="Search by name or description..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-1">
                        Sort By
                    </label>
                    <select
                        id="sort"
                        value={currentSortValue}
                        onChange={(e) => {
                            const option = sortOptions.find(opt => opt.value === e.target.value);
                            if (option) {
                                onSortChange({ field: option.field, direction: option.direction });
                            }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        {sortOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Expanded Filters */}
            {isExpanded && (
                <div className="space-y-6 pt-4 border-t border-gray-200">
                    {/* Card Properties */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Card Properties</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label htmlFor="card-type" className="block text-sm font-medium text-gray-700 mb-1">
                                    Type
                                </label>
                                <select
                                    id="card-type"
                                    value={filters.cardType}
                                    onChange={(e) => handleFilterChange('cardType', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All Types</option>
                                    {getUniqueValues('type').map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="attribute" className="block text-sm font-medium text-gray-700 mb-1">
                                    Attribute
                                </label>
                                <select
                                    id="attribute"
                                    value={filters.attribute}
                                    onChange={(e) => handleFilterChange('attribute', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All Attributes</option>
                                    {getUniqueValues('attribute').map(attr => (
                                        <option key={attr} value={attr}>{attr}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="race" className="block text-sm font-medium text-gray-700 mb-1">
                                    Race/Type
                                </label>
                                <select
                                    id="race"
                                    value={filters.race}
                                    onChange={(e) => handleFilterChange('race', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All Races</option>
                                    {getUniqueValues('race').map(race => (
                                        <option key={race} value={race}>{race}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-1">
                                    Level
                                </label>
                                <select
                                    id="level"
                                    value={filters.level}
                                    onChange={(e) => handleFilterChange('level', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All Levels</option>
                                    {getUniqueValues('level').map(level => (
                                        <option key={level} value={level}>Level {level}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* ATK/DEF Ranges */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3">ATK/DEF Ranges</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    ATK Range
                                </label>
                                <div className="flex space-x-2">
                                    <input
                                        type="number"
                                        value={filters.atkRange.min}
                                        onChange={(e) => handleRangeChange('atkRange', 'min', e.target.value)}
                                        placeholder="Min ATK"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <input
                                        type="number"
                                        value={filters.atkRange.max}
                                        onChange={(e) => handleRangeChange('atkRange', 'max', e.target.value)}
                                        placeholder="Max ATK"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    DEF Range
                                </label>
                                <div className="flex space-x-2">
                                    <input
                                        type="number"
                                        value={filters.defRange.min}
                                        onChange={(e) => handleRangeChange('defRange', 'min', e.target.value)}
                                        placeholder="Min DEF"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <input
                                        type="number"
                                        value={filters.defRange.max}
                                        onChange={(e) => handleRangeChange('defRange', 'max', e.target.value)}
                                        placeholder="Max DEF"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Collection Properties */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Collection Properties</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label htmlFor="rarity" className="block text-sm font-medium text-gray-700 mb-1">
                                    Rarity
                                </label>
                                <select
                                    id="rarity"
                                    value={filters.rarity}
                                    onChange={(e) => handleFilterChange('rarity', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All Rarities</option>
                                    {getUniqueRarities().map(rarity => (
                                        <option key={rarity} value={rarity}>{rarity}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="set-code" className="block text-sm font-medium text-gray-700 mb-1">
                                    Set Code
                                </label>
                                <select
                                    id="set-code"
                                    value={filters.setCode}
                                    onChange={(e) => handleFilterChange('setCode', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All Sets</option>
                                    {getUniqueSetCodes().map(setCode => (
                                        <option key={setCode} value={setCode}>{setCode}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Tags (if available) */}
                    {availableTags.length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-3">Tags</h4>
                            <div className="flex flex-wrap gap-2">
                                {availableTags.map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => handleTagToggle(tag)}
                                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filters.tags.includes(tag)
                                                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                                : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                                            }`}
                                    >
                                        {tag}
                                        {filters.tags.includes(tag) && (
                                            <span className="ml-1">✓</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BinderFilters;