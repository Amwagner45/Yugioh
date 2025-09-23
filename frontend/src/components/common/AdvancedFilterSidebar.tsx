import React, { useState, useEffect, useMemo } from 'react';
import type { Card, Binder } from '../../types';

export interface AdvancedFilterOptions {
    searchTerm: string;
    cardTypes: string[];
    attributes: string[];
    races: string[];
    levels: number[];
    atkRange: { min: string; max: string };
    defRange: { min: string; max: string };
    rarities: string[];
    setCodes: string[];
    tags: string[];
    banListStatus: string[];
    archetype: string;
}

export interface QuickFilter {
    id: string;
    label: string;
    icon: string;
    filter: Partial<AdvancedFilterOptions>;
    isActive?: boolean;
}

interface AdvancedFilterSidebarProps {
    binders: Binder[];
    selectedBinderId?: string;
    onBinderChange?: (binderId: string) => void;
    cards: Array<{ cardId: number; card_details?: Card; quantity: number }>;
    filters: AdvancedFilterOptions;
    onFiltersChange: (filters: AdvancedFilterOptions) => void;
    onResetFilters: () => void;
    availableTags?: string[];
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
}

const AdvancedFilterSidebar: React.FC<AdvancedFilterSidebarProps> = ({
    binders,
    selectedBinderId,
    onBinderChange,
    cards,
    filters,
    onFiltersChange,
    onResetFilters,
    availableTags = [],
    isCollapsed = false,
    onToggleCollapse
}) => {
    const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeSection, setActiveSection] = useState<string | null>('search');

    // Extract unique values from cards for filter options
    const filterOptions = useMemo(() => {
        const types = new Set<string>();
        const attributes = new Set<string>();
        const races = new Set<string>();
        const levels = new Set<number>();
        const rarities = new Set<string>();
        const setCodes = new Set<string>();
        const archetypes = new Set<string>();

        cards.forEach(({ card_details }) => {
            if (card_details) {
                if (card_details.type) types.add(card_details.type);
                if (card_details.attribute) attributes.add(card_details.attribute);
                if (card_details.race) races.add(card_details.race);
                if (card_details.level) levels.add(card_details.level);
                if (card_details.archetype) archetypes.add(card_details.archetype);

                card_details.card_sets?.forEach(set => {
                    if (set.set_rarity) rarities.add(set.set_rarity);
                    if (set.set_code) setCodes.add(set.set_code);
                });
            }
        });

        return {
            types: Array.from(types).sort(),
            attributes: Array.from(attributes).sort(),
            races: Array.from(races).sort(),
            levels: Array.from(levels).sort((a, b) => a - b),
            rarities: Array.from(rarities).sort(),
            setCodes: Array.from(setCodes).sort(),
            archetypes: Array.from(archetypes).sort()
        };
    }, [cards]);

    // Quick filter presets
    const quickFilters: QuickFilter[] = [
        {
            id: 'monsters',
            label: 'Monsters',
            icon: '👹',
            filter: { cardTypes: ['Effect Monster', 'Normal Monster', 'Fusion Monster', 'Synchro Monster', 'Xyz Monster', 'Link Monster', 'Pendulum Effect Monster', 'Ritual Monster'] }
        },
        {
            id: 'spells',
            label: 'Spells',
            icon: '📜',
            filter: { cardTypes: ['Spell Card'] }
        },
        {
            id: 'traps',
            label: 'Traps',
            icon: '🪤',
            filter: { cardTypes: ['Trap Card'] }
        },
        {
            id: 'high-atk',
            label: 'High ATK',
            icon: '⚔️',
            filter: { atkRange: { min: '2500', max: '' } }
        },
        {
            id: 'low-level',
            label: 'Low Level',
            icon: '⭐',
            filter: { levels: [1, 2, 3, 4] }
        },
        {
            id: 'rare',
            label: 'Rare+',
            icon: '💎',
            filter: { rarities: ['Ultra Rare', 'Secret Rare', 'Ultimate Rare', 'Ghost Rare'] }
        }
    ];

    // Generate search suggestions
    useEffect(() => {
        if (filters.searchTerm.length >= 2) {
            const suggestions = cards
                .filter(({ card_details }) =>
                    card_details?.name.toLowerCase().includes(filters.searchTerm.toLowerCase())
                )
                .slice(0, 10)
                .map(({ card_details }) => card_details!.name);

            setSearchSuggestions(suggestions);
            setShowSuggestions(suggestions.length > 0);
        } else {
            setShowSuggestions(false);
        }
    }, [filters.searchTerm, cards]);

    const updateFilter = <K extends keyof AdvancedFilterOptions>(
        key: K,
        value: AdvancedFilterOptions[K]
    ) => {
        onFiltersChange({ ...filters, [key]: value });
    };

    const toggleArrayFilter = <K extends keyof AdvancedFilterOptions>(
        key: K,
        value: string | number,
        currentArray: (string | number)[]
    ) => {
        const newArray = currentArray.includes(value)
            ? currentArray.filter(item => item !== value)
            : [...currentArray, value];
        updateFilter(key, newArray as AdvancedFilterOptions[K]);
    };

    const getActiveFiltersCount = () => {
        let count = 0;
        if (filters.searchTerm.trim()) count++;
        if (filters.cardTypes.length) count++;
        if (filters.attributes.length) count++;
        if (filters.races.length) count++;
        if (filters.levels.length) count++;
        if (filters.atkRange.min || filters.atkRange.max) count++;
        if (filters.defRange.min || filters.defRange.max) count++;
        if (filters.rarities.length) count++;
        if (filters.setCodes.length) count++;
        if (filters.tags.length) count++;
        if (filters.banListStatus.length) count++;
        if (filters.archetype.trim()) count++;
        return count;
    };

    const CollapsibleSection: React.FC<{
        title: string;
        id: string;
        children: React.ReactNode;
        defaultOpen?: boolean;
    }> = ({ title, id, children, defaultOpen = false }) => {
        const isOpen = activeSection === id || defaultOpen;

        return (
            <div className="border-b border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => setActiveSection(isOpen ? null : id)}
                    className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                    <span className="font-medium text-gray-900 dark:text-white">{title}</span>
                    <svg
                        className={`w-4 h-4 transform transition-transform text-gray-600 dark:text-gray-300 ${isOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                {isOpen && (
                    <div className="px-4 pb-4">
                        {children}
                    </div>
                )}
            </div>
        );
    };

    if (isCollapsed) {
        return (
            <div className="w-12 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col items-center py-4">
                <button
                    onClick={onToggleCollapse}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Expand Filters"
                >
                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                {getActiveFiltersCount() > 0 && (
                    <div className="mt-2 bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                        {getActiveFiltersCount()}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filters & Search</h2>
                    <div className="flex items-center space-x-2">
                        {getActiveFiltersCount() > 0 && (
                            <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium px-2 py-1 rounded-full">
                                {getActiveFiltersCount()} active
                            </span>
                        )}
                        <button
                            onClick={onToggleCollapse}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            title="Collapse Filters"
                        >
                            <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Reset and Quick Actions */}
                <div className="flex space-x-2">
                    <button
                        onClick={onResetFilters}
                        className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        disabled={getActiveFiltersCount() === 0}
                    >
                        Clear All
                    </button>
                </div>
            </div>

            {/* Binder Selection */}
            {binders.length > 0 && (
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Collection
                    </label>
                    <select
                        value={selectedBinderId || ''}
                        onChange={(e) => onBinderChange?.(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                        <option value="">All Collections</option>
                        {binders.map((binder) => (
                            <option key={binder.id} value={binder.id}>
                                {binder.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Quick Filters */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Quick Filters</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                    {quickFilters.map((quickFilter) => {
                        const isActive = quickFilter.id === 'monsters' && filters.cardTypes.some(type => type.includes('Monster')) ||
                            quickFilter.id === 'spells' && filters.cardTypes.includes('Spell Card') ||
                            quickFilter.id === 'traps' && filters.cardTypes.includes('Trap Card') ||
                            quickFilter.id === 'high-atk' && filters.atkRange.min === '2500' ||
                            quickFilter.id === 'low-level' && filters.levels.some(level => level <= 4) ||
                            quickFilter.id === 'rare' && filters.rarities.some(rarity => ['Ultra Rare', 'Secret Rare', 'Ultimate Rare', 'Ghost Rare'].includes(rarity));

                        return (
                            <button
                                key={quickFilter.id}
                                onClick={() => {
                                    if (isActive) {
                                        onResetFilters();
                                    } else {
                                        onFiltersChange({ ...filters, ...quickFilter.filter });
                                    }
                                }}
                                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${isActive
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                <span className="mr-1">{quickFilter.icon}</span>
                                {quickFilter.label}
                                {isActive && (
                                    <span className="ml-1">×</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Scrollable Filter Sections */}
            <div className="flex-1 overflow-y-auto">
                {/* Search */}
                <CollapsibleSection title="Search" id="search" defaultOpen>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search card names..."
                            value={filters.searchTerm}
                            onChange={(e) => updateFilter('searchTerm', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                        />
                        {showSuggestions && (
                            <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-10 mt-1 max-h-48 overflow-y-auto">
                                {searchSuggestions.map((suggestion, index) => (
                                    <button
                                        key={index}
                                        onClick={() => {
                                            updateFilter('searchTerm', suggestion);
                                            setShowSuggestions(false);
                                        }}
                                        className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-600 border-b border-gray-100 dark:border-gray-600 last:border-b-0 dark:text-white"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Archetype Search */}
                    <div className="mt-3">
                        <input
                            type="text"
                            placeholder="Search archetype..."
                            value={filters.archetype}
                            onChange={(e) => updateFilter('archetype', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                        />
                    </div>
                </CollapsibleSection>

                {/* Card Types */}
                <CollapsibleSection title="Card Types" id="types">
                    <div className="space-y-2">
                        {filterOptions.types.map((type) => (
                            <label key={type} className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={filters.cardTypes.includes(type)}
                                    onChange={() => toggleArrayFilter('cardTypes', type, filters.cardTypes)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">{type}</span>
                            </label>
                        ))}
                    </div>
                </CollapsibleSection>

                {/* Attributes */}
                <CollapsibleSection title="Attributes" id="attributes">
                    <div className="space-y-2">
                        {filterOptions.attributes.map((attribute) => (
                            <label key={attribute} className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={filters.attributes.includes(attribute)}
                                    onChange={() => toggleArrayFilter('attributes', attribute, filters.attributes)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">{attribute}</span>
                            </label>
                        ))}
                    </div>
                </CollapsibleSection>

                {/* Races/Types */}
                <CollapsibleSection title="Monster Types" id="races">
                    <div className="space-y-2">
                        {filterOptions.races.map((race) => (
                            <label key={race} className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={filters.races.includes(race)}
                                    onChange={() => toggleArrayFilter('races', race, filters.races)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">{race}</span>
                            </label>
                        ))}
                    </div>
                </CollapsibleSection>

                {/* Levels */}
                <CollapsibleSection title="Levels" id="levels">
                    <div className="grid grid-cols-4 gap-2">
                        {filterOptions.levels.map((level) => (
                            <button
                                key={level}
                                onClick={() => toggleArrayFilter('levels', level, filters.levels)}
                                className={`px-2 py-1 rounded text-sm font-medium transition-colors ${filters.levels.includes(level)
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {level}
                            </button>
                        ))}
                    </div>
                </CollapsibleSection>

                {/* ATK/DEF Ranges */}
                <CollapsibleSection title="ATK/DEF" id="stats">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">ATK Range</label>
                            <div className="flex space-x-2">
                                <input
                                    type="number"
                                    placeholder="Min"
                                    value={filters.atkRange.min}
                                    onChange={(e) => updateFilter('atkRange', { ...filters.atkRange, min: e.target.value })}
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <input
                                    type="number"
                                    placeholder="Max"
                                    value={filters.atkRange.max}
                                    onChange={(e) => updateFilter('atkRange', { ...filters.atkRange, max: e.target.value })}
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">DEF Range</label>
                            <div className="flex space-x-2">
                                <input
                                    type="number"
                                    placeholder="Min"
                                    value={filters.defRange.min}
                                    onChange={(e) => updateFilter('defRange', { ...filters.defRange, min: e.target.value })}
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <input
                                    type="number"
                                    placeholder="Max"
                                    value={filters.defRange.max}
                                    onChange={(e) => updateFilter('defRange', { ...filters.defRange, max: e.target.value })}
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                </CollapsibleSection>

                {/* Rarities */}
                <CollapsibleSection title="Rarities" id="rarities">
                    <div className="space-y-2">
                        {filterOptions.rarities.map((rarity) => (
                            <label key={rarity} className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={filters.rarities.includes(rarity)}
                                    onChange={() => toggleArrayFilter('rarities', rarity, filters.rarities)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">{rarity}</span>
                            </label>
                        ))}
                    </div>
                </CollapsibleSection>
            </div>
        </div>
    );
};

export default AdvancedFilterSidebar;