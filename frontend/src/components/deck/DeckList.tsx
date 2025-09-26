import React, { useState, useEffect } from 'react';
import { importExportService } from '../../services/importExport';
import { storageService } from '../../services/storage';
import { deckService } from '../../services/api';
import { ConfirmDialog } from '../common/ConfirmDialog';
import type { Deck } from '../../types';

interface DeckListProps {
    onEditDeck: (deckId: string) => void;
    onCreateDeck: () => void;
    selectedTags?: string[];
    searchQuery?: string;
}

const DeckList: React.FC<DeckListProps> = ({
    onEditDeck,
    onCreateDeck,
    selectedTags = [],
    searchQuery = '',
}) => {
    const [decks, setDecks] = useState<Deck[]>([]);
    const [filteredDecks, setFilteredDecks] = useState<Deck[]>([]);
    const [sortBy, setSortBy] = useState<'name' | 'created' | 'modified' | 'format'>('modified');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; deckId: string; deckName: string }>({
        show: false,
        deckId: '',
        deckName: '',
    });
    const [importModal, setImportModal] = useState(false);
    const [exportModal, setExportModal] = useState<{ show: boolean; deck: Deck | null }>({
        show: false,
        deck: null,
    });

    useEffect(() => {
        loadDecks();
    }, []);

    useEffect(() => {
        filterAndSortDecks();
    }, [decks, selectedTags, searchQuery, sortBy, sortOrder]);

    const loadDecks = async () => {
        try {
            // Load decks from backend API (primary source)
            const apiDecks = await deckService.getDecks();

            if (apiDecks.error) {
                throw new Error(apiDecks.error);
            }

            // Map API response to frontend Deck format
            const mappedDecks = apiDecks.map((deck: any) => ({
                ...deck,
                id: deck.uuid || deck.id, // Use uuid as id for consistency
                createdAt: new Date(deck.created_at),
                modifiedAt: new Date(deck.updated_at),
                mainDeck: deck.main_deck || [],
                extraDeck: deck.extra_deck || [],
                sideDeck: deck.side_deck || []
            }));

            setDecks(mappedDecks);
            console.log(`Loaded ${mappedDecks.length} decks from backend API`);
        } catch (error) {
            console.error('Failed to load decks from API, falling back to local storage:', error);
            // Fallback to local storage if API fails
            try {
                const allDecks = storageService.getDecks();
                setDecks(allDecks);
                console.log(`Loaded ${allDecks.length} decks from local storage as fallback`);
            } catch (storageError) {
                console.error('Failed to load from local storage:', storageError);
            }
        }
    };

    const filterAndSortDecks = () => {
        let filtered = [...decks];

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(deck =>
                deck.name.toLowerCase().includes(query) ||
                (deck.description && deck.description.toLowerCase().includes(query)) ||
                (deck.format && deck.format.toLowerCase().includes(query)) ||
                (deck.notes && deck.notes.toLowerCase().includes(query))
            );
        }

        // Filter by tags
        if (selectedTags.length > 0) {
            filtered = filtered.filter(deck =>
                deck.tags && selectedTags.some(tag => deck.tags!.includes(tag))
            );
        }

        // Sort decks
        filtered.sort((a, b) => {
            let aValue: any, bValue: any;

            switch (sortBy) {
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 'created':
                    aValue = new Date(a.createdAt).getTime();
                    bValue = new Date(b.createdAt).getTime();
                    break;
                case 'modified':
                    aValue = new Date(a.modifiedAt).getTime();
                    bValue = new Date(b.modifiedAt).getTime();
                    break;
                case 'format':
                    aValue = a.format || '';
                    bValue = b.format || '';
                    break;
                default:
                    return 0;
            }

            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        setFilteredDecks(filtered);
    };

    const handleDeleteDeck = (deckId: string, deckName: string) => {
        setDeleteConfirm({ show: true, deckId, deckName });
    };

    const confirmDelete = async () => {
        try {
            // Find the deck to get its UUID
            const deck = decks.find(d => d.id === deleteConfirm.deckId);
            if (!deck) {
                throw new Error('Deck not found');
            }

            // Use uuid if available, otherwise use id
            const deckUuid = (deck as any).uuid || deck.id;

            // Delete deck via backend API
            const response = await deckService.deleteDeck(deckUuid);

            if (response.error) {
                throw new Error(response.error);
            }

            console.log('Successfully deleted deck:', deck.name);
        } catch (error) {
            console.error('Failed to delete deck from API, falling back to local storage:', error);
            // Fallback to local storage if API fails
            try {
                storageService.deleteDeck(deleteConfirm.deckId);
                console.log('Deleted deck from local storage as fallback');
            } catch (storageError) {
                console.error('Failed to delete from local storage:', storageError);
                // TODO: Show error message to user
            }
        }

        // Reload decks and close dialog
        loadDecks();
        setDeleteConfirm({ show: false, deckId: '', deckName: '' });
    };

    const handleCloneDeck = (deck: Deck) => {
        const clonedDeck: Deck = {
            ...deck,
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: `${deck.name} (Copy)`,
            createdAt: new Date(),
            modifiedAt: new Date(),
        };
        storageService.saveDeck(clonedDeck);
        loadDecks();
    };

    const handleExportDeck = (deck: Deck) => {
        setExportModal({ show: true, deck });
    };

    const handleImportDeck = () => {
        setImportModal(true);
    };

    const performExport = (format: 'json' | 'ydk' | 'txt' | 'csv') => {
        if (!exportModal.deck) return;

        try {
            const content = importExportService.exportDeck(exportModal.deck.id, { format });
            const extension = format === 'json' ? 'json' : format === 'ydk' ? 'ydk' : format === 'txt' ? 'txt' : 'csv';
            const filename = `${exportModal.deck.name.replace(/[^a-z0-9]/gi, '_')}.${extension}`;

            importExportService.downloadFile(content as string, filename);
            setExportModal({ show: false, deck: null });
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed: ' + error);
        }
    };

    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const content = await importExportService.readFile(file);
            const extension = file.name.split('.').pop()?.toLowerCase();

            let format = 'txt';
            if (extension === 'ydk') format = 'ydk';
            else if (extension === 'json') format = 'json';
            else if (extension === 'csv') format = 'csv';

            const result = await importExportService.importDeck(content, format);

            if (result.success) {
                loadDecks();
                alert(`Successfully imported ${result.imported.decks} deck(s)`);
            } else {
                alert(`Import failed: ${result.errors.join(', ')}`);
            }
        } catch (error) {
            alert('Import failed: ' + error);
        }

        setImportModal(false);
        event.target.value = ''; // Reset file input
    };

    const getDeckStats = (deck: Deck) => {
        const mainCount = deck.mainDeck.reduce((sum, card) => sum + card.quantity, 0);
        const extraCount = deck.extraDeck.reduce((sum, card) => sum + card.quantity, 0);
        const sideCount = deck.sideDeck.reduce((sum, card) => sum + card.quantity, 0);
        return { mainCount, extraCount, sideCount };
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex gap-2">
                    <button
                        onClick={onCreateDeck}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-medium"
                    >
                        Create New Deck
                    </button>
                    <button
                        onClick={handleImportDeck}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                        Import Deck
                    </button>
                </div>

                {/* Sort Controls */}
                <div className="flex gap-2">
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                        <option value="modified">Last Modified</option>
                        <option value="created">Date Created</option>
                        <option value="name">Name</option>
                        <option value="format">Format</option>
                    </select>
                    <button
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
                    >
                        {sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                </div>
            </div>

            {/* Deck Grid */}
            {filteredDecks.length === 0 ? (
                <div className="text-center py-12">
                    <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No decks found</h3>
                    <p className="text-gray-600 mb-4">
                        {searchQuery || selectedTags.length > 0
                            ? 'No decks match your current filters.'
                            : 'Create your first deck to get started.'}
                    </p>
                    {(!searchQuery && selectedTags.length === 0) && (
                        <button
                            onClick={onCreateDeck}
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                        >
                            Create New Deck
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredDecks.map((deck) => {
                        const stats = getDeckStats(deck);
                        return (
                            <div key={deck.id} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
                                {/* Deck Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{deck.name}</h3>
                                        {deck.format && (
                                            <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                                {deck.format}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => onEditDeck(deck.id)}
                                            className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded"
                                            title="Edit Deck"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleExportDeck(deck)}
                                            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded"
                                            title="Export Deck"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleCloneDeck(deck)}
                                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                                            title="Clone Deck"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteDeck(deck.id, deck.name)}
                                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                                            title="Delete Deck"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Description */}
                                {deck.description && (
                                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{deck.description}</p>
                                )}

                                {/* Deck Stats */}
                                <div className="grid grid-cols-3 gap-2 mb-4">
                                    <div className="text-center">
                                        <div className="text-lg font-semibold text-gray-900">{stats.mainCount}</div>
                                        <div className="text-xs text-gray-500">Main</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-lg font-semibold text-gray-900">{stats.extraCount}</div>
                                        <div className="text-xs text-gray-500">Extra</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-lg font-semibold text-gray-900">{stats.sideCount}</div>
                                        <div className="text-xs text-gray-500">Side</div>
                                    </div>
                                </div>

                                {/* Tags */}
                                {deck.tags && deck.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-4">
                                        {deck.tags.slice(0, 3).map((tag) => (
                                            <span
                                                key={tag}
                                                className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                        {deck.tags.length > 3 && (
                                            <span className="inline-block text-gray-500 text-xs px-2 py-1">
                                                +{deck.tags.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Footer */}
                                <div className="text-xs text-gray-500 border-t pt-3">
                                    <div>Modified: {formatDate(deck.modifiedAt)}</div>
                                    <div>Created: {formatDate(deck.createdAt)}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Import Modal */}
            {importModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold mb-4">Import Deck</h3>
                        <p className="text-gray-600 mb-4">
                            Select a deck file to import. Supported formats: .ydk, .json, .txt, .csv
                        </p>
                        <input
                            type="file"
                            accept=".ydk,.json,.txt,.csv"
                            onChange={handleFileImport}
                            className="w-full mb-4"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => setImportModal(false)}
                                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Export Modal */}
            {exportModal.show && exportModal.deck && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold mb-4">Export Deck: {exportModal.deck.name}</h3>
                        <p className="text-gray-600 mb-4">Choose export format:</p>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            <button
                                onClick={() => performExport('ydk')}
                                className="p-3 border border-gray-300 rounded hover:bg-gray-50 text-left"
                            >
                                <div className="font-medium">.ydk</div>
                                <div className="text-sm text-gray-600">YGOPro format</div>
                            </button>
                            <button
                                onClick={() => performExport('json')}
                                className="p-3 border border-gray-300 rounded hover:bg-gray-50 text-left"
                            >
                                <div className="font-medium">.json</div>
                                <div className="text-sm text-gray-600">Full data backup</div>
                            </button>
                            <button
                                onClick={() => performExport('txt')}
                                className="p-3 border border-gray-300 rounded hover:bg-gray-50 text-left"
                            >
                                <div className="font-medium">.txt</div>
                                <div className="text-sm text-gray-600">Text deck list</div>
                            </button>
                            <button
                                onClick={() => performExport('csv')}
                                className="p-3 border border-gray-300 rounded hover:bg-gray-50 text-left"
                            >
                                <div className="font-medium">.csv</div>
                                <div className="text-sm text-gray-600">Spreadsheet format</div>
                            </button>
                        </div>
                        <button
                            onClick={() => setExportModal({ show: false, deck: null })}
                            className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={deleteConfirm.show}
                title="Delete Deck"
                message={`Are you sure you want to delete "${deleteConfirm.deckName}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteConfirm({ show: false, deckId: '', deckName: '' })}
                confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
            />
        </div>
    );
};

export default DeckList;