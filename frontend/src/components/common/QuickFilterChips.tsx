import React, { useState } from 'react';
import type { AdvancedFilterOptions } from './AdvancedFilterSidebar';

interface FilterChip {
    id: string;
    label: string;
    value: string;
    type: 'cardType' | 'attribute' | 'race' | 'level' | 'rarity' | 'custom';
    removable?: boolean;
}

interface QuickFilterChipsProps {
    filters: AdvancedFilterOptions;
    onFiltersChange: (filters: AdvancedFilterOptions) => void;
    onSaveFilter?: (name: string, filters: AdvancedFilterOptions) => void;
    savedFilters?: Array<{ name: string; filters: AdvancedFilterOptions }>;
}

const QuickFilterChips: React.FC<QuickFilterChipsProps> = ({
    filters,
    onFiltersChange,
    onSaveFilter,
    savedFilters = []
}) => {
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [filterName, setFilterName] = useState('');

    // Generate active filter chips
    const getActiveChips = (): FilterChip[] => {
        const chips: FilterChip[] = [];

        // Search term
        if (filters.searchTerm.trim()) {
            chips.push({
                id: 'search',
                label: `"${filters.searchTerm}"`,
                value: filters.searchTerm,
                type: 'custom',
                removable: true
            });
        }

        // Card types
        filters.cardTypes.forEach(type => {
            chips.push({
                id: `type-${type}`,
                label: type.replace(' Card', '').replace(' Monster', ''),
                value: type,
                type: 'cardType',
                removable: true
            });
        });

        // Attributes
        filters.attributes.forEach(attribute => {
            chips.push({
                id: `attr-${attribute}`,
                label: attribute,
                value: attribute,
                type: 'attribute',
                removable: true
            });
        });

        // Races
        filters.races.forEach(race => {
            chips.push({
                id: `race-${race}`,
                label: race,
                value: race,
                type: 'race',
                removable: true
            });
        });

        // Levels
        if (filters.levels.length > 0) {
            const levelText = filters.levels.length === 1
                ? `Level ${filters.levels[0]}`
                : `Levels ${filters.levels.sort((a, b) => a - b).join(', ')}`;
            chips.push({
                id: 'levels',
                label: levelText,
                value: filters.levels.join(','),
                type: 'level',
                removable: true
            });
        }

        // ATK Range
        if (filters.atkRange.min || filters.atkRange.max) {
            const min = filters.atkRange.min || '0';
            const max = filters.atkRange.max || '∞';
            chips.push({
                id: 'atk',
                label: `ATK: ${min}-${max}`,
                value: `${min}-${max}`,
                type: 'custom',
                removable: true
            });
        }

        // DEF Range
        if (filters.defRange.min || filters.defRange.max) {
            const min = filters.defRange.min || '0';
            const max = filters.defRange.max || '∞';
            chips.push({
                id: 'def',
                label: `DEF: ${min}-${max}`,
                value: `${min}-${max}`,
                type: 'custom',
                removable: true
            });
        }

        // Rarities
        filters.rarities.forEach(rarity => {
            chips.push({
                id: `rarity-${rarity}`,
                label: rarity.replace(' Rare', ''),
                value: rarity,
                type: 'rarity',
                removable: true
            });
        });

        // Archetype
        if (filters.archetype.trim()) {
            chips.push({
                id: 'archetype',
                label: `Archetype: ${filters.archetype}`,
                value: filters.archetype,
                type: 'custom',
                removable: true
            });
        }

        return chips;
    };

    const removeFilter = (chip: FilterChip) => {
        const newFilters = { ...filters };

        switch (chip.type) {
            case 'cardType':
                newFilters.cardTypes = newFilters.cardTypes.filter(t => t !== chip.value);
                break;
            case 'attribute':
                newFilters.attributes = newFilters.attributes.filter(a => a !== chip.value);
                break;
            case 'race':
                newFilters.races = newFilters.races.filter(r => r !== chip.value);
                break;
            case 'level':
                newFilters.levels = [];
                break;
            case 'rarity':
                newFilters.rarities = newFilters.rarities.filter(r => r !== chip.value);
                break;
            case 'custom':
                if (chip.id === 'search') {
                    newFilters.searchTerm = '';
                } else if (chip.id === 'atk') {
                    newFilters.atkRange = { min: '', max: '' };
                } else if (chip.id === 'def') {
                    newFilters.defRange = { min: '', max: '' };
                } else if (chip.id === 'archetype') {
                    newFilters.archetype = '';
                }
                break;
        }

        onFiltersChange(newFilters);
    };

    const saveCurrentFilter = () => {
        if (filterName.trim() && onSaveFilter) {
            onSaveFilter(filterName.trim(), filters);
            setFilterName('');
            setShowSaveModal(false);
        }
    };

    const applySavedFilter = (savedFilter: { name: string; filters: AdvancedFilterOptions }) => {
        onFiltersChange(savedFilter.filters);
    };

    const activeChips = getActiveChips();
    const hasActiveFilters = activeChips.length > 0;

    const getChipColor = (type: FilterChip['type']) => {
        switch (type) {
            case 'cardType': return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700';
            case 'attribute': return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700';
            case 'race': return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-700';
            case 'level': return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700';
            case 'rarity': return 'bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200 border-pink-200 dark:border-pink-700';
            case 'custom': return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600';
            default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600';
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Active Filters</h3>
                <div className="flex items-center space-x-2">
                    {hasActiveFilters && onSaveFilter && (
                        <button
                            onClick={() => setShowSaveModal(true)}
                            className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
                        >
                            Save Filter
                        </button>
                    )}
                    {hasActiveFilters && (
                        <button
                            onClick={() => onFiltersChange({
                                searchTerm: '',
                                cardTypes: [],
                                attributes: [],
                                races: [],
                                levels: [],
                                atkRange: { min: '', max: '' },
                                defRange: { min: '', max: '' },
                                rarities: [],
                                setCodes: [],
                                tags: [],
                                banListStatus: [],
                                archetype: ''
                            })}
                            className="text-xs px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600 transition-colors"
                        >
                            Clear All
                        </button>
                    )}
                </div>
            </div>

            {/* Active Filter Chips */}
            <div className="flex flex-wrap gap-2 mb-3">
                {activeChips.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400 italic">No filters applied</div>
                ) : (
                    activeChips.map((chip) => (
                        <div
                            key={chip.id}
                            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getChipColor(chip.type)}`}
                        >
                            <span>{chip.label}</span>
                            {chip.removable && (
                                <button
                                    onClick={() => removeFilter(chip)}
                                    className="ml-2 hover:bg-black hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10 rounded-full p-1 transition-colors"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Saved Filters */}
            {savedFilters.length > 0 && (
                <div>
                    <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Saved Filters</h4>
                    <div className="flex flex-wrap gap-2">
                        {savedFilters.map((savedFilter, index) => (
                            <button
                                key={index}
                                onClick={() => applySavedFilter(savedFilter)}
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
                            >
                                <span>📁</span>
                                <span className="ml-1">{savedFilter.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Save Filter Modal */}
            {showSaveModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold mb-4 dark:text-white">Save Filter</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Filter Name
                            </label>
                            <input
                                type="text"
                                value={filterName}
                                onChange={(e) => setFilterName(e.target.value)}
                                placeholder="e.g., Blue-Eyes Deck Cards"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                autoFocus
                            />
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => {
                                    setShowSaveModal(false);
                                    setFilterName('');
                                }}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveCurrentFilter}
                                disabled={!filterName.trim()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuickFilterChips;