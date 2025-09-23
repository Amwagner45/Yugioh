import React, { useState } from 'react';
import type { BinderCard } from '../../types';

interface CardTagManagerProps {
    binderCard: BinderCard;
    availableTags: string[];
    onUpdateTags: (cardId: number, tags: string[]) => void;
    onCreateTag?: (tag: string) => void;
}

const CardTagManager: React.FC<CardTagManagerProps> = ({
    binderCard,
    availableTags,
    onUpdateTags,
    onCreateTag,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [newTag, setNewTag] = useState('');
    const [isAddingTag, setIsAddingTag] = useState(false);

    const currentTags = binderCard.tags || [];

    const handleToggleTag = (tag: string) => {
        const updatedTags = currentTags.includes(tag)
            ? currentTags.filter(t => t !== tag)
            : [...currentTags, tag];

        onUpdateTags(binderCard.cardId, updatedTags);
    };

    const handleCreateNewTag = () => {
        const trimmedTag = newTag.trim();
        if (!trimmedTag) return;

        // Validate tag name (alphanumeric and hyphens only)
        if (!/^[a-zA-Z0-9-_]+$/.test(trimmedTag)) {
            alert('Tags can only contain letters, numbers, hyphens, and underscores.');
            return;
        }

        // Check if tag already exists
        if (availableTags.includes(trimmedTag) || currentTags.includes(trimmedTag)) {
            if (!currentTags.includes(trimmedTag)) {
                handleToggleTag(trimmedTag);
            }
            setNewTag('');
            setIsAddingTag(false);
            return;
        }

        // Create new tag
        const updatedTags = [...currentTags, trimmedTag];
        onUpdateTags(binderCard.cardId, updatedTags);

        if (onCreateTag) {
            onCreateTag(trimmedTag);
        }

        setNewTag('');
        setIsAddingTag(false);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleCreateNewTag();
        } else if (e.key === 'Escape') {
            setNewTag('');
            setIsAddingTag(false);
        }
    };

    return (
        <div className="relative">
            {/* Tag Display */}
            <div className="flex flex-wrap items-center gap-1 mb-2">
                {currentTags.map(tag => (
                    <span
                        key={tag}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                        {tag}
                        <button
                            onClick={() => handleToggleTag(tag)}
                            className="ml-1 hover:text-blue-600"
                            title="Remove tag"
                        >
                            ×
                        </button>
                    </span>
                ))}

                {/* Add Tag Button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    title="Manage tags"
                >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    {currentTags.length > 0 ? 'Edit' : 'Add'} Tags
                </button>
            </div>

            {/* Tag Management Modal */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                    <div className="space-y-3">
                        {/* Available Tags */}
                        {availableTags.length > 0 && (
                            <div>
                                <h4 className="text-sm font-medium text-gray-900 mb-2">Available Tags</h4>
                                <div className="flex flex-wrap gap-1">
                                    {availableTags.map(tag => {
                                        const isSelected = currentTags.includes(tag);
                                        return (
                                            <button
                                                key={tag}
                                                onClick={() => handleToggleTag(tag)}
                                                className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${isSelected
                                                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                                        : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {tag}
                                                {isSelected && <span className="ml-1">✓</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Create New Tag */}
                        <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Create New Tag</h4>
                            {isAddingTag ? (
                                <div className="flex space-x-2">
                                    <input
                                        type="text"
                                        value={newTag}
                                        onChange={(e) => setNewTag(e.target.value)}
                                        onKeyDown={handleKeyPress}
                                        placeholder="Enter tag name..."
                                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleCreateNewTag}
                                        disabled={!newTag.trim()}
                                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Add
                                    </button>
                                    <button
                                        onClick={() => {
                                            setNewTag('');
                                            setIsAddingTag(false);
                                        }}
                                        className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsAddingTag(true)}
                                    className="flex items-center space-x-1 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    <span>New Tag</span>
                                </button>
                            )}
                        </div>

                        {/* Close Button */}
                        <div className="pt-2 border-t border-gray-200">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-full px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CardTagManager;