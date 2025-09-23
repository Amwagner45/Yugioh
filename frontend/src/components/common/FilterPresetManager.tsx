import React, { useState, useEffect } from 'react';
import type { AdvancedFilterOptions } from './AdvancedFilterSidebar';

interface FilterPreset {
    id: string;
    name: string;
    description?: string;
    filters: AdvancedFilterOptions;
    tags: string[];
    createdAt: Date;
    usageCount: number;
    isPublic: boolean;
    isFavorite: boolean;
}

interface FilterPresetManagerProps {
    isOpen: boolean;
    onClose: () => void;
    onApplyPreset: (filters: AdvancedFilterOptions) => void;
    currentFilters: AdvancedFilterOptions;
}

const FilterPresetManager: React.FC<FilterPresetManagerProps> = ({
    isOpen,
    onClose,
    onApplyPreset,
    currentFilters
}) => {
    const [presets, setPresets] = useState<FilterPreset[]>([]);
    const [filteredPresets, setFilteredPresets] = useState<FilterPreset[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTag, setSelectedTag] = useState<string>('');
    const [sortBy, setSortBy] = useState<'name' | 'created' | 'usage'>('name');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');
    const [newPresetDescription, setNewPresetDescription] = useState('');
    const [newPresetTags, setNewPresetTags] = useState<string[]>([]);
    const [newTagInput, setNewTagInput] = useState('');

    // Sample default presets
    const defaultPresets: FilterPreset[] = [
        {
            id: 'meta-monsters',
            name: 'Meta Monsters',
            description: 'High-level monsters commonly used in competitive play',
            filters: {
                ...currentFilters,
                cardTypes: ['Effect Monster', 'Synchro Monster', 'Xyz Monster', 'Link Monster'],
                levels: [4, 5, 6, 7, 8],
                searchTerm: ''
            },
            tags: ['competitive', 'monsters', 'meta'],
            createdAt: new Date('2024-01-01'),
            usageCount: 45,
            isPublic: true,
            isFavorite: false
        },
        {
            id: 'spell-trap-removal',
            name: 'Spell/Trap Removal',
            description: 'Cards that destroy or negate Spell/Trap cards',
            filters: {
                ...currentFilters,
                searchTerm: 'destroy spell',
                cardTypes: ['Spell Card', 'Trap Card', 'Effect Monster']
            },
            tags: ['removal', 'utility', 'staples'],
            createdAt: new Date('2024-01-15'),
            usageCount: 32,
            isPublic: true,
            isFavorite: true
        },
        {
            id: 'blue-eyes-support',
            name: 'Blue-Eyes Support',
            description: 'Cards that support Blue-Eyes White Dragon strategies',
            filters: {
                ...currentFilters,
                archetype: 'Blue-Eyes',
                searchTerm: '',
                attributes: ['LIGHT']
            },
            tags: ['archetype', 'blue-eyes', 'dragons'],
            createdAt: new Date('2024-02-01'),
            usageCount: 28,
            isPublic: true,
            isFavorite: false
        },
        {
            id: 'low-level-beatdown',
            name: 'Low-Level Beatdown',
            description: 'Strong low-level monsters for aggressive strategies',
            filters: {
                ...currentFilters,
                cardTypes: ['Normal Monster', 'Effect Monster'],
                levels: [1, 2, 3, 4],
                searchTerm: ''
            },
            tags: ['aggro', 'beatdown', 'low-level'],
            createdAt: new Date('2024-02-10'),
            usageCount: 18,
            isPublic: true,
            isFavorite: false
        }
    ];

    useEffect(() => {
        // Load presets from localStorage
        const savedPresets = localStorage.getItem('filter-presets');
        if (savedPresets) {
            try {
                const parsed = JSON.parse(savedPresets);
                setPresets([...defaultPresets, ...parsed]);
            } catch {
                setPresets(defaultPresets);
            }
        } else {
            setPresets(defaultPresets);
        }
    }, []);

    useEffect(() => {
        // Filter and sort presets
        let filtered = presets.filter(preset => {
            const matchesSearch = preset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                preset.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                preset.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesTag = !selectedTag || preset.tags.includes(selectedTag);

            return matchesSearch && matchesTag;
        });

        // Sort presets
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'created':
                    return b.createdAt.getTime() - a.createdAt.getTime();
                case 'usage':
                    return b.usageCount - a.usageCount;
                default:
                    return 0;
            }
        });

        // Favorites first
        filtered.sort((a, b) => {
            if (a.isFavorite && !b.isFavorite) return -1;
            if (!a.isFavorite && b.isFavorite) return 1;
            return 0;
        });

        setFilteredPresets(filtered);
    }, [presets, searchTerm, selectedTag, sortBy]);

    const getAllTags = (): string[] => {
        const tags = new Set<string>();
        presets.forEach(preset => {
            preset.tags.forEach(tag => tags.add(tag));
        });
        return Array.from(tags).sort();
    };

    const savePreset = () => {
        if (!newPresetName.trim()) return;

        const newPreset: FilterPreset = {
            id: `preset-${Date.now()}`,
            name: newPresetName.trim(),
            description: newPresetDescription.trim() || undefined,
            filters: currentFilters,
            tags: newPresetTags,
            createdAt: new Date(),
            usageCount: 0,
            isPublic: false,
            isFavorite: false
        };

        const updatedPresets = [...presets, newPreset];
        setPresets(updatedPresets);

        // Save to localStorage (excluding default presets)
        const userPresets = updatedPresets.filter(p => !defaultPresets.some(dp => dp.id === p.id));
        localStorage.setItem('filter-presets', JSON.stringify(userPresets));

        // Reset form
        setNewPresetName('');
        setNewPresetDescription('');
        setNewPresetTags([]);
        setShowCreateForm(false);
    };

    const deletePreset = (presetId: string) => {
        // Don't allow deleting default presets
        if (defaultPresets.some(p => p.id === presetId)) return;

        const updatedPresets = presets.filter(p => p.id !== presetId);
        setPresets(updatedPresets);

        const userPresets = updatedPresets.filter(p => !defaultPresets.some(dp => dp.id === p.id));
        localStorage.setItem('filter-presets', JSON.stringify(userPresets));
    };

    const toggleFavorite = (presetId: string) => {
        const updatedPresets = presets.map(p =>
            p.id === presetId ? { ...p, isFavorite: !p.isFavorite } : p
        );
        setPresets(updatedPresets);

        const userPresets = updatedPresets.filter(p => !defaultPresets.some(dp => dp.id === p.id));
        localStorage.setItem('filter-presets', JSON.stringify(userPresets));
    };

    const applyPreset = (preset: FilterPreset) => {
        // Increment usage count
        const updatedPresets = presets.map(p =>
            p.id === preset.id ? { ...p, usageCount: p.usageCount + 1 } : p
        );
        setPresets(updatedPresets);

        const userPresets = updatedPresets.filter(p => !defaultPresets.some(dp => dp.id === p.id));
        localStorage.setItem('filter-presets', JSON.stringify(userPresets));

        onApplyPreset(preset.filters);
        onClose();
    };

    const addTag = () => {
        if (newTagInput.trim() && !newPresetTags.includes(newTagInput.trim())) {
            setNewPresetTags([...newPresetTags, newTagInput.trim()]);
            setNewTagInput('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setNewPresetTags(newPresetTags.filter(tag => tag !== tagToRemove));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Filter Presets</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Controls */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                        {/* Search */}
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="Search presets..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                            />
                        </div>

                        {/* Tag Filter */}
                        <select
                            value={selectedTag}
                            onChange={(e) => setSelectedTag(e.target.value)}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="">All Tags</option>
                            {getAllTags().map(tag => (
                                <option key={tag} value={tag}>{tag}</option>
                            ))}
                        </select>

                        {/* Sort */}
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="name">Name</option>
                            <option value="created">Date Created</option>
                            <option value="usage">Usage Count</option>
                        </select>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-between">
                        <button
                            onClick={() => setShowCreateForm(!showCreateForm)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
                        >
                            {showCreateForm ? 'Cancel' : 'Save Current Filters'}
                        </button>

                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {filteredPresets.length} of {presets.length} presets
                        </span>
                    </div>
                </div>

                {/* Create Form */}
                {showCreateForm && (
                    <div className="p-6 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Save New Preset</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Preset Name *
                                </label>
                                <input
                                    type="text"
                                    value={newPresetName}
                                    onChange={(e) => setNewPresetName(e.target.value)}
                                    placeholder="e.g., My Favorite Dragons"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={newPresetDescription}
                                    onChange={(e) => setNewPresetDescription(e.target.value)}
                                    placeholder="Optional description of this filter combination..."
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tags
                                </label>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={newTagInput}
                                        onChange={(e) => setNewTagInput(e.target.value)}
                                        placeholder="Add tag..."
                                        onKeyPress={(e) => e.key === 'Enter' && addTag()}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <button
                                        onClick={addTag}
                                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                                    >
                                        Add
                                    </button>
                                </div>

                                {newPresetTags.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {newPresetTags.map(tag => (
                                            <span
                                                key={tag}
                                                className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                                            >
                                                {tag}
                                                <button
                                                    onClick={() => removeTag(tag)}
                                                    className="ml-1 text-blue-600 hover:text-blue-800"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setShowCreateForm(false)}
                                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={savePreset}
                                    disabled={!newPresetName.trim()}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Save Preset
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Presets List */}
                <div className="p-6 overflow-y-auto max-h-96">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredPresets.map(preset => (
                            <div
                                key={preset.id}
                                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center space-x-2">
                                        <h3 className="font-medium text-gray-900">{preset.name}</h3>
                                        {preset.isFavorite && (
                                            <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                            </svg>
                                        )}
                                        {preset.isPublic && (
                                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                                Public
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex space-x-1">
                                        <button
                                            onClick={() => toggleFavorite(preset.id)}
                                            className="p-1 text-gray-400 hover:text-yellow-500 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill={preset.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                            </svg>
                                        </button>

                                        {!defaultPresets.some(p => p.id === preset.id) && (
                                            <button
                                                onClick={() => deletePreset(preset.id)}
                                                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {preset.description && (
                                    <p className="text-sm text-gray-600 mb-3">{preset.description}</p>
                                )}

                                <div className="flex flex-wrap gap-1 mb-3">
                                    {preset.tags.map(tag => (
                                        <span
                                            key={tag}
                                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="text-xs text-gray-500">
                                        Used {preset.usageCount} times
                                    </div>

                                    <button
                                        onClick={() => applyPreset(preset)}
                                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredPresets.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-gray-500">No presets found matching your criteria.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FilterPresetManager;