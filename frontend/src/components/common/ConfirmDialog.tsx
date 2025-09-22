import React from 'react';
import type { Binder } from '../../types';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmButtonClass?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isProcessing?: boolean;
}

interface DeleteBinderConfirmProps {
    binder: Binder | null;
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    isDeleting?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmButtonClass = 'bg-red-600 hover:bg-red-700 text-white',
    onConfirm,
    onCancel,
    isProcessing = false,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                {/* Header */}
                <div className="flex items-center mb-4">
                    <div className="flex-shrink-0">
                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h3 className="ml-3 text-lg font-medium text-gray-900">
                        {title}
                    </h3>
                </div>

                {/* Message */}
                <div className="mb-6">
                    <p className="text-gray-600">{message}</p>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onCancel}
                        disabled={isProcessing}
                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isProcessing}
                        className={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center ${confirmButtonClass}`}
                    >
                        {isProcessing && (
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        )}
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

const DeleteBinderConfirm: React.FC<DeleteBinderConfirmProps> = ({
    binder,
    isOpen,
    onConfirm,
    onCancel,
    isDeleting = false,
}) => {
    if (!binder) return null;

    const cardCount = binder.cards.reduce((total, card) => total + card.quantity, 0);
    const uniqueCardCount = binder.cards.length;

    const title = 'Delete Binder';
    const message = `Are you sure you want to delete "${binder.name}"? This action cannot be undone.${cardCount > 0
            ? ` This binder contains ${cardCount} card${cardCount !== 1 ? 's' : ''} (${uniqueCardCount} unique) that will be permanently removed.`
            : ''
        }`;

    return (
        <ConfirmDialog
            isOpen={isOpen}
            title={title}
            message={message}
            confirmText={isDeleting ? 'Deleting...' : 'Delete Binder'}
            cancelText="Cancel"
            confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
            onConfirm={onConfirm}
            onCancel={onCancel}
            isProcessing={isDeleting}
        />
    );
};

export { ConfirmDialog, DeleteBinderConfirm };