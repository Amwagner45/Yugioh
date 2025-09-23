import React, { useState } from 'react';
import type { AdvancedFilterOptions } from './AdvancedFilterSidebar';

interface SearchQuery {
    field: 'name' | 'desc' | 'type' | 'attribute' | 'race' | 'archetype';
    operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'not_contains';
    value: string;
    boolean?: 'AND' | 'OR' | 'NOT';
}

interface AdvancedSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApplySearch: (filters: AdvancedFilterOptions) => void;
    currentFilters: AdvancedFilterOptions;
}

const AdvancedSearchModal: React.FC<AdvancedSearchModalProps> = ({
    isOpen,
    onClose,
    onApplySearch,
    currentFilters
}) => {
    const [queries, setQueries] = useState<SearchQuery[]>([
        { field: 'name', operator: 'contains', value: '' }
    ]);
    const [groupByArchetype, setGroupByArchetype] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    const fieldOptions = [
        { value: 'name', label: 'Card Name' },
        { value: 'desc', label: 'Card Text' },
        { value: 'type', label: 'Card Type' },
        { value: 'attribute', label: 'Attribute' },
        { value: 'race', label: 'Monster Type' },
        { value: 'archetype', label: 'Archetype' }
    ];

    const operatorOptions = [
        { value: 'contains', label: 'Contains' },
        { value: 'equals', label: 'Equals' },
        { value: 'startsWith', label: 'Starts With' },
        { value: 'endsWith', label: 'Ends With' },
        { value: 'not_contains', label: 'Does Not Contain' }
    ];

    const booleanOptions = [
        { value: 'AND', label: 'AND' },
        { value: 'OR', label: 'OR' },
        { value: 'NOT', label: 'NOT' }
    ];

    const addQuery = () => {
        setQueries([...queries, { field: 'name', operator: 'contains', value: '', boolean: 'AND' }]);
    };

    const removeQuery = (index: number) => {
        if (queries.length > 1) {
            setQueries(queries.filter((_, i) => i !== index));
        }
    };

    const updateQuery = (index: number, updates: Partial<SearchQuery>) => {
        const newQueries = [...queries];
        newQueries[index] = { ...newQueries[index], ...updates };
        setQueries(newQueries);
    };

    const generateSearchFilter = (): AdvancedFilterOptions => {
        // This is a simplified implementation
        // In a real application, you'd parse the complex boolean logic
        const hasNameSearch = queries.some(q => q.field === 'name' && q.value.trim());
        const hasArchetypeSearch = queries.some(q => q.field === 'archetype' && q.value.trim());

        let searchTerm = '';
        let archetype = '';

        if (hasNameSearch) {
            const nameQuery = queries.find(q => q.field === 'name' && q.value.trim());
            if (nameQuery) {
                searchTerm = nameQuery.value;
            }
        }

        if (hasArchetypeSearch) {
            const archetypeQuery = queries.find(q => q.field === 'archetype' && q.value.trim());
            if (archetypeQuery) {
                archetype = archetypeQuery.value;
            }
        }

        return {
            ...currentFilters,
            searchTerm,
            archetype
        };
    };

    const generatePreviewText = (): string => {
        const validQueries = queries.filter(q => q.value.trim());
        if (validQueries.length === 0) return 'No search criteria specified';

        const parts = validQueries.map((query, index) => {
            let text = '';
            if (index > 0 && query.boolean) {
                text += `${query.boolean} `;
            }
            text += `${fieldOptions.find(f => f.value === query.field)?.label} `;
            text += `${operatorOptions.find(o => o.value === query.operator)?.label.toLowerCase()} `;
            text += `"${query.value}"`;
            return text;
        });

        let preview = parts.join(' ');
        if (groupByArchetype) {
            preview += ' (grouped by archetype)';
        }
        return preview;
    };

    const applySearch = () => {
        const filters = generateSearchFilter();
        onApplySearch(filters);
        onClose();
    };

    const resetSearch = () => {
        setQueries([{ field: 'name', operator: 'contains', value: '' }]);
        setGroupByArchetype(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Advanced Search</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    <div className="mb-6">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Search Criteria</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Build complex search queries using boolean operators. Each condition will be evaluated in order.
                        </p>

                        {/* Query Builder */}
                        <div className="space-y-4">
                            {queries.map((query, index) => (
                                <div key={index} className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    {/* Boolean Operator */}
                                    {index > 0 && (
                                        <select
                                            value={query.boolean || 'AND'}
                                            onChange={(e) => updateQuery(index, { boolean: e.target.value as 'AND' | 'OR' | 'NOT' })}
                                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:text-white"
                                        >
                                            {booleanOptions.map(option => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    )}

                                    {/* Field */}
                                    <select
                                        value={query.field}
                                        onChange={(e) => updateQuery(index, { field: e.target.value as SearchQuery['field'] })}
                                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:text-white"
                                    >
                                        {fieldOptions.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>

                                    {/* Operator */}
                                    <select
                                        value={query.operator}
                                        onChange={(e) => updateQuery(index, { operator: e.target.value as SearchQuery['operator'] })}
                                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:text-white"
                                    >
                                        {operatorOptions.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>

                                    {/* Value */}
                                    <input
                                        type="text"
                                        value={query.value}
                                        onChange={(e) => updateQuery(index, { value: e.target.value })}
                                        placeholder="Search value..."
                                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:text-white dark:placeholder-gray-400"
                                    />

                                    {/* Remove Button */}
                                    {queries.length > 1 && (
                                        <button
                                            onClick={() => removeQuery(index)}
                                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Add Query Button */}
                        <button
                            onClick={addQuery}
                            className="mt-4 flex items-center space-x-2 px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Add Condition</span>
                        </button>
                    </div>

                    {/* Advanced Options */}
                    <div className="mb-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Display Options</h3>

                        <div className="space-y-3">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={groupByArchetype}
                                    onChange={(e) => setGroupByArchetype(e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">
                                    Group results by archetype/series
                                </span>
                            </label>

                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={showPreview}
                                    onChange={(e) => setShowPreview(e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">
                                    Show search preview
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Search Preview */}
                    {showPreview && (
                        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                            <h4 className="text-sm font-medium text-blue-900 mb-2">Search Preview</h4>
                            <p className="text-sm text-blue-800 font-mono">
                                {generatePreviewText()}
                            </p>
                        </div>
                    )}

                    {/* Quick Examples */}
                    <div className="mb-6">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Quick Examples</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-1">Find Blue-Eyes cards</h4>
                                <p className="text-xs text-gray-600 dark:text-gray-300">Name contains "Blue-Eyes" OR Archetype equals "Blue-Eyes"</p>
                            </div>
                            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-1">High ATK Dragons</h4>
                                <p className="text-xs text-gray-600 dark:text-gray-300">Monster Type equals "Dragon" AND ATK ≥ 2500</p>
                            </div>
                            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-1">Spell/Trap destruction</h4>
                                <p className="text-xs text-gray-600 dark:text-gray-300">Card Text contains "destroy" AND (Card Text contains "Spell" OR "Trap")</p>
                            </div>
                            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-1">Exclude certain types</h4>
                                <p className="text-xs text-gray-600 dark:text-gray-300">NOT Card Type equals "Token" AND NOT Name contains "Token"</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={resetSearch}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        Reset
                    </button>

                    <div className="flex space-x-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={applySearch}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
                        >
                            Apply Search
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdvancedSearchModal;