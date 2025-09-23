import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { banlistService } from '../services/banlistService';
import type { Banlist } from '../types';

const BanlistManagerPage: React.FC = () => {
    const navigate = useNavigate();
    
    const [banlists, setBanlists] = useState<Banlist[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [formatFilter, setFormatFilter] = useState('');
    const [showInactive, setShowInactive] = useState(false);

    useEffect(() => {
        loadBanlists();
    }, [showInactive]);

    const loadBanlists = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await banlistService.getAll(showInactive);
            setBanlists(response.banlists);
        } catch (err) {
            setError('Failed to load banlists');
            console.error('Error loading banlists:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteBanlist = async (banlistId: string) => {
        if (!confirm('Are you sure you want to delete this banlist?')) {
            return;
        }

        try {
            await banlistService.delete(banlistId);
            setBanlists(banlists.filter(b => b.id !== banlistId));
        } catch (err) {
            console.error('Error deleting banlist:', err);
            alert('Failed to delete banlist');
        }
    };

    const handleDuplicateBanlist = async (banlistId: string) => {
        try {
            const duplicated = await banlistService.duplicate(banlistId);
            setBanlists([duplicated, ...banlists]);
        } catch (err) {
            console.error('Error duplicating banlist:', err);
            alert('Failed to duplicate banlist');
        }
    };

    const handleImportFile = async (file: File) => {
        try {
            const result = await banlistService.importFromFile(file);
            setBanlists([result.banlist, ...banlists]);
        } catch (err) {
            console.error('Error importing banlist:', err);
            alert('Failed to import banlist file');
        }
    };

    const handleFileUpload = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.lflist.conf';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                handleImportFile(file);
            }
        };
        input.click();
    };

    const filteredBanlists = banlists.filter(banlist => {
        const matchesSearch = banlist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (banlist.description || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFormat = !formatFilter || banlist.format_type === formatFilter;
        return matchesSearch && matchesFormat;
    });

    const formatTypes = [...new Set(banlists.map(b => b.format_type))].sort();

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <svg className="animate-spin w-8 h-8 text-purple-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <p className="text-lg text-gray-600 dark:text-gray-400">Loading banlists...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-red-800 dark:text-red-200">Error</h3>
                    <p className="text-red-600 dark:text-red-400 mt-1">{error}</p>
                    <button
                        onClick={loadBanlists}
                        className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Banlist Manager
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Create, edit, and manage Yu-Gi-Oh banlists for your formats
                </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <button
                    onClick={() => navigate('/banlist-builder')}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create New Banlist
                </button>

                <button
                    onClick={handleFileUpload}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Import from File
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Search
                        </label>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by name or description..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Format
                        </label>
                        <select
                            value={formatFilter}
                            onChange={(e) => setFormatFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="">All Formats</option>
                            {formatTypes.map(format => (
                                <option key={format} value={format}>{format}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-end">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={showInactive}
                                onChange={(e) => setShowInactive(e.target.checked)}
                                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                Show inactive
                            </span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Banlists Grid */}
            {filteredBanlists.length === 0 ? (
                <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                        No banlists found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Create your first banlist or import one from a .lflist.conf file
                    </p>
                    <button
                        onClick={() => navigate('/banlist-builder')}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                        Create New Banlist
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredBanlists.map((banlist) => {
                        const stats = banlistService.getBanlistStats(banlist);
                        
                        return (
                            <div
                                key={banlist.id}
                                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                                            {banlist.name}
                                        </h3>
                                        {banlist.description && (
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                                {banlist.description}
                                            </p>
                                        )}
                                    </div>
                                    
                                    {/* Actions dropdown */}
                                    <div className="relative ml-2">
                                        <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                                    <div className="bg-red-50 dark:bg-red-900/20 rounded p-2">
                                        <div className="text-red-600 dark:text-red-400 font-medium">
                                            {stats.forbiddenCount}
                                        </div>
                                        <div className="text-red-500 dark:text-red-400 text-xs">
                                            Forbidden
                                        </div>
                                    </div>
                                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded p-2">
                                        <div className="text-yellow-600 dark:text-yellow-400 font-medium">
                                            {stats.limitedCount}
                                        </div>
                                        <div className="text-yellow-500 dark:text-yellow-400 text-xs">
                                            Limited
                                        </div>
                                    </div>
                                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded p-2">
                                        <div className="text-orange-600 dark:text-orange-400 font-medium">
                                            {stats.semiLimitedCount}
                                        </div>
                                        <div className="text-orange-500 dark:text-orange-400 text-xs">
                                            Semi-Limited
                                        </div>
                                    </div>
                                    <div className="bg-green-50 dark:bg-green-900/20 rounded p-2">
                                        <div className="text-green-600 dark:text-green-400 font-medium">
                                            {stats.whitelistCount}
                                        </div>
                                        <div className="text-green-500 dark:text-green-400 text-xs">
                                            Whitelist
                                        </div>
                                    </div>
                                </div>

                                {/* Meta */}
                                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4">
                                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                                        {banlist.format_type}
                                    </span>
                                    <span>
                                        {new Date(banlist.updated_at).toLocaleDateString()}
                                    </span>
                                </div>

                                {/* Status badges */}
                                <div className="flex items-center gap-2 mb-4">
                                    {banlist.is_official && (
                                        <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                                            Official
                                        </span>
                                    )}
                                    {!banlist.is_active && (
                                        <span className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">
                                            Inactive
                                        </span>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => navigate(`/banlist-builder/${banlist.id}`)}
                                        className="flex-1 px-3 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDuplicateBanlist(banlist.id)}
                                        className="px-3 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                                        title="Duplicate"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={async () => {
                                            try {
                                                await banlistService.downloadExport(
                                                    banlist.id,
                                                    `${banlist.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.lflist.conf`
                                                );
                                            } catch (err) {
                                                console.error('Export error:', err);
                                            }
                                        }}
                                        className="px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                        title="Export"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 11l3 3m0 0l3-3m-3 3V8" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handleDeleteBanlist(banlist.id)}
                                        className="px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                        title="Delete"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default BanlistManagerPage;