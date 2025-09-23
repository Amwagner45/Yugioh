import React from 'react';
import type { Binder } from '../../types';

interface BinderListProps {
    binders: Binder[];
    onViewBinder: (binder: Binder) => void;
    onEditBinder: (binder: Binder) => void;
    onDeleteBinder: (binder: Binder) => void;
    onSetFavorite: (binder: Binder) => void;
    onRemoveFavorite: (binder: Binder) => void;
    isLoading?: boolean;
}

interface BinderCardProps {
    binder: Binder;
    onView: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onSetFavorite: () => void;
    onRemoveFavorite: () => void;
}

const BinderCard: React.FC<BinderCardProps> = ({
    binder,
    onView,
    onEdit,
    onDelete,
    onSetFavorite,
    onRemoveFavorite,
}) => {
    const cardCount = binder.cards.reduce((total, card) => total + card.quantity, 0);
    const uniqueCardCount = binder.cards.length;

    return (
        <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6 relative">
            {/* Favorite indicator */}
            {binder.isFavorite && (
                <div className="absolute top-3 right-3 text-yellow-400" title="Favorite Binder">
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1 pr-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {binder.name}
                        {binder.isFavorite && (
                            <span className="ml-2 text-yellow-500 text-sm font-normal">(Favorite)</span>
                        )}
                    </h3>
                    {binder.description && (
                        <p className="text-gray-600 text-sm line-clamp-2">
                            {binder.description}
                        </p>
                    )}
                </div>

                {/* Action Dropdown */}
                <div className="flex items-center space-x-2">
                    {/* Favorite toggle button */}
                    <button
                        onClick={binder.isFavorite ? onRemoveFavorite : onSetFavorite}
                        className={`p-2 rounded-full transition-colors ${binder.isFavorite
                                ? 'text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50'
                                : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
                            }`}
                        title={binder.isFavorite ? "Remove from favorites" : "Set as favorite"}
                    >
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                    </button>

                    <button
                        onClick={onView}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                        title="View binder"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    </button>

                    <button
                        onClick={onEdit}
                        className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors"
                        title="Edit binder"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>

                    <button
                        onClick={onDelete}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        title="Delete binder"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-blue-600">{cardCount}</div>
                    <div className="text-sm text-gray-600">Total Cards</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-green-600">{uniqueCardCount}</div>
                    <div className="text-sm text-gray-600">Unique Cards</div>
                </div>
            </div>

            {/* Tags */}
            {binder.tags && binder.tags.length > 0 && (
                <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                        {binder.tags.slice(0, 3).map((tag) => (
                            <span
                                key={tag}
                                className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                            >
                                {tag}
                            </span>
                        ))}
                        {binder.tags.length > 3 && (
                            <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                                +{binder.tags.length - 3} more
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="flex justify-between items-center text-sm text-gray-500 border-t pt-3">
                <div>
                    Created {new Date(binder.createdAt).toLocaleDateString()}
                </div>
                <div>
                    Modified {new Date(binder.modifiedAt).toLocaleDateString()}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-4 flex space-x-2">
                <button
                    onClick={onView}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                    View Cards
                </button>
                <button
                    onClick={onEdit}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                    Edit
                </button>
            </div>
        </div>
    );
};

const BinderList: React.FC<BinderListProps> = ({
    binders,
    onViewBinder,
    onEditBinder,
    onDeleteBinder,
    onSetFavorite,
    onRemoveFavorite,
    isLoading = false,
}) => {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, index) => (
                    <div key={index} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
                        <div className="h-6 bg-gray-200 rounded mb-4"></div>
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-gray-100 rounded-lg p-3">
                                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded"></div>
                            </div>
                            <div className="bg-gray-100 rounded-lg p-3">
                                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded"></div>
                            </div>
                        </div>
                        <div className="h-8 bg-gray-200 rounded"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (binders.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No binders yet</h3>
                <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                    Create your first binder to start organizing your Yu-Gi-Oh! card collection.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {binders.map((binder) => (
                <BinderCard
                    key={binder.id}
                    binder={binder}
                    onView={() => onViewBinder(binder)}
                    onEdit={() => onEditBinder(binder)}
                    onDelete={() => onDeleteBinder(binder)}
                    onSetFavorite={() => onSetFavorite(binder)}
                    onRemoveFavorite={() => onRemoveFavorite(binder)}
                />
            ))}
        </div>
    );
};

export default BinderList;