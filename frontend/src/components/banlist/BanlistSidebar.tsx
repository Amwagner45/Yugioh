import React from 'react';
import type { Banlist } from '../../types';
import { banlistService } from '../../services/banlistService';

interface BanlistSidebarProps {
    banlist: Banlist;
    onNavigateBack: () => void;
}

const BanlistSidebar: React.FC<BanlistSidebarProps> = ({
    banlist,
    onNavigateBack
}) => {
    const stats = banlistService.getBanlistStats(banlist);

    return (
        <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Banlist Info
                    </h3>
                    <button
                        onClick={onNavigateBack}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
                        title="Back to banlist manager"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Statistics */}
            <div className="p-4 space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                        Statistics
                    </h4>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-300">Total Cards:</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {stats.totalCards}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-red-600 dark:text-red-400">Forbidden:</span>
                            <span className="text-sm font-medium text-red-700 dark:text-red-300">
                                {stats.forbiddenCount}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-yellow-600 dark:text-yellow-400">Limited:</span>
                            <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                                {stats.limitedCount}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-orange-600 dark:text-orange-400">Semi-Limited:</span>
                            <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                                {stats.semiLimitedCount}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-green-600 dark:text-green-400">Whitelist:</span>
                            <span className="text-sm font-medium text-green-700 dark:text-green-300">
                                {stats.whitelistCount}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Banlist Details */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                        Details
                    </h4>
                    <div className="space-y-2">
                        <div>
                            <span className="text-sm text-gray-600 dark:text-gray-300">Format:</span>
                            <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                                {banlist.format_type}
                            </span>
                        </div>
                        <div>
                            <span className="text-sm text-gray-600 dark:text-gray-300">Status:</span>
                            <span className={`ml-2 text-sm font-medium ${
                                banlist.is_active 
                                    ? 'text-green-600 dark:text-green-400' 
                                    : 'text-red-600 dark:text-red-400'
                            }`}>
                                {banlist.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <div>
                            <span className="text-sm text-gray-600 dark:text-gray-300">Type:</span>
                            <span className={`ml-2 text-sm font-medium ${
                                banlist.is_official 
                                    ? 'text-blue-600 dark:text-blue-400' 
                                    : 'text-gray-600 dark:text-gray-400'
                            }`}>
                                {banlist.is_official ? 'Official' : 'Custom'}
                            </span>
                        </div>
                        {banlist.start_date && (
                            <div>
                                <span className="text-sm text-gray-600 dark:text-gray-300">Start Date:</span>
                                <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                                    {new Date(banlist.start_date).toLocaleDateString()}
                                </span>
                            </div>
                        )}
                        {banlist.end_date && (
                            <div>
                                <span className="text-sm text-gray-600 dark:text-gray-300">End Date:</span>
                                <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                                    {new Date(banlist.end_date).toLocaleDateString()}
                                </span>
                            </div>
                        )}
                        <div>
                            <span className="text-sm text-gray-600 dark:text-gray-300">Created:</span>
                            <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                                {new Date(banlist.created_at).toLocaleDateString()}
                            </span>
                        </div>
                        <div>
                            <span className="text-sm text-gray-600 dark:text-gray-300">Updated:</span>
                            <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                                {new Date(banlist.updated_at).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Help */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                        How to Use
                    </h4>
                    <div className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                        <p>• Search for cards in the left panel</p>
                        <p>• Drag cards to the appropriate restriction section</p>
                        <p>• Forbidden: 0 copies allowed</p>
                        <p>• Limited: 1 copy allowed</p>
                        <p>• Semi-Limited: 2 copies allowed</p>
                        <p>• Whitelist: 3 copies allowed (explicit)</p>
                        <p>• Save your banlist to persist changes</p>
                        <p>• Export to .lflist.conf format</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BanlistSidebar;