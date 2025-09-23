import React, { useState } from 'react';
import type { Banlist } from '../../types';

interface BanlistHeaderProps {
    banlist: Banlist;
    onUpdate: (updates: Partial<Banlist>) => void;
    onSave: () => Promise<void>;
    onImport: (file: File) => Promise<void>;
    onExport: () => Promise<void>;
    isSaving: boolean;
}

const BanlistHeader: React.FC<BanlistHeaderProps> = ({
    banlist,
    onUpdate,
    onSave,
    onImport,
    onExport,
    isSaving
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(banlist.name);
    const [editDescription, setEditDescription] = useState(banlist.description || '');

    const handleSaveEdit = () => {
        onUpdate({
            name: editName,
            description: editDescription
        });
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setEditName(banlist.name);
        setEditDescription(banlist.description || '');
        setIsEditing(false);
    };

    const handleImportClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.lflist.conf';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                onImport(file);
            }
        };
        input.click();
    };

    return (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    {isEditing ? (
                        <div className="space-y-2">
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="text-2xl font-bold bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none text-gray-900 dark:text-white"
                                placeholder="Banlist name"
                            />
                            <input
                                type="text"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                className="w-full bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none text-gray-600 dark:text-gray-300"
                                placeholder="Description (optional)"
                            />
                            <div className="flex space-x-2">
                                <button
                                    onClick={handleSaveEdit}
                                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                                >
                                    Save
                                </button>
                                <button
                                    onClick={handleCancelEdit}
                                    className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="flex items-center space-x-2">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {banlist.name}
                                </h1>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                    title="Edit banlist details"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </button>
                            </div>
                            {banlist.description && (
                                <p className="text-gray-600 dark:text-gray-300 mt-1">
                                    {banlist.description}
                                </p>
                            )}
                            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                                    {banlist.format_type}
                                </span>
                                {banlist.is_official && (
                                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                                        Official
                                    </span>
                                )}
                                {!banlist.is_active && (
                                    <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">
                                        Inactive
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2 ml-4">
                    <button
                        onClick={handleImportClick}
                        className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        title="Import from .lflist.conf file"
                    >
                        <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Import
                    </button>

                    <button
                        onClick={onExport}
                        disabled={!banlist.id}
                        className="px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        title="Export as .lflist.conf file"
                    >
                        <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 11l3 3m0 0l3-3m-3 3V8" />
                        </svg>
                        Export
                    </button>

                    <button
                        onClick={onSave}
                        disabled={isSaving}
                        className="px-4 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSaving ? (
                            <>
                                <svg className="animate-spin w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Saving...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                </svg>
                                Save
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BanlistHeader;