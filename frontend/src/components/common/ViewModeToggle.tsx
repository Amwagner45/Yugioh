import React from 'react';

export type ViewMode = 'grid' | 'list' | 'stacked' | 'table';

interface ViewModeToggleProps {
    currentMode: ViewMode;
    onModeChange: (mode: ViewMode) => void;
    availableModes?: ViewMode[];
}

const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
    currentMode,
    onModeChange,
    availableModes = ['grid', 'list', 'stacked', 'table']
}) => {
    const modes = [
        {
            key: 'grid' as ViewMode,
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
            ),
            label: 'Grid',
            description: 'Large card images in rows'
        },
        {
            key: 'list' as ViewMode,
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
            ),
            label: 'List',
            description: 'Compact text-based listing'
        },
        {
            key: 'stacked' as ViewMode,
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
            ),
            label: 'Stacked',
            description: 'Grouped cards with quantity stacks'
        },
        {
            key: 'table' as ViewMode,
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 10h18M3 14h18m-9-4v8m-7 0V4a1 1 0 011-1h16a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1V6z" />
                </svg>
            ),
            label: 'Table',
            description: 'Spreadsheet-style for advanced sorting'
        }
    ].filter(mode => availableModes.includes(mode.key));

    return (
        <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {modes.map((mode) => (
                <button
                    key={mode.key}
                    onClick={() => onModeChange(mode.key)}
                    className={`p-2 rounded-md transition-colors ${currentMode === mode.key
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                    title={`${mode.label}: ${mode.description}`}
                >
                    {mode.icon}
                </button>
            ))}
        </div>
    );
};

export default ViewModeToggle;