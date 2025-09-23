import React, { useState } from 'react';
import type { Binder, Card } from '../../types';
import { binderExportService, type ExportOptions, type ImportResult } from '../../services/binderExport';

interface BinderExportImportProps {
    binder: Binder;
    cardCache: Map<number, Card>;
    onImportBinder?: (binder: Binder) => void;
    onClose: () => void;
}

const BinderExportImport: React.FC<BinderExportImportProps> = ({
    binder,
    cardCache,
    onImportBinder,
    onClose,
}) => {
    const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
    const [exportOptions, setExportOptions] = useState<ExportOptions>({
        format: 'json',
        includeCardDetails: true,
        includeImages: false,
        includeNotes: true,
        includeTags: true,
        includeSetInfo: true,
    });
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [shareableLink, setShareableLink] = useState<string>('');

    const handleExport = async () => {
        try {
            setIsExporting(true);
            const exportData = await binderExportService.exportBinder(binder, cardCache, exportOptions);
            binderExportService.downloadExport(exportData);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    const handleGenerateShareLink = () => {
        try {
            const link = binderExportService.generateShareableLink(binder, cardCache);
            setShareableLink(link);
        } catch (error) {
            console.error('Share link generation failed:', error);
            alert('Failed to generate share link. Please try again.');
        }
    };

    const handleCopyShareLink = () => {
        if (shareableLink) {
            navigator.clipboard.writeText(shareableLink).then(() => {
                alert('Share link copied to clipboard!');
            }).catch(() => {
                alert('Failed to copy link. Please copy it manually.');
            });
        }
    };

    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setIsImporting(true);
            setImportResult(null);

            const result = await binderExportService.importBinder(file);
            setImportResult(result);

            if (result.success && result.binder && onImportBinder) {
                onImportBinder(result.binder);
            }
        } catch (error) {
            console.error('Import failed:', error);
            setImportResult({
                success: false,
                errors: ['Import failed: ' + (error instanceof Error ? error.message : 'Unknown error')],
                warnings: [],
            });
        } finally {
            setIsImporting(false);
            // Reset file input
            event.target.value = '';
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">
                        Export & Import
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-6">
                    <button
                        onClick={() => setActiveTab('export')}
                        className={`py-2 px-4 border-b-2 font-medium text-sm ${activeTab === 'export'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        Export Binder
                    </button>
                    <button
                        onClick={() => setActiveTab('import')}
                        className={`py-2 px-4 border-b-2 font-medium text-sm ${activeTab === 'import'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        Import Binder
                    </button>
                </div>

                {/* Export Tab */}
                {activeTab === 'export' && (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                Export "{binder.name}"
                            </h3>
                            <p className="text-gray-600 mb-4">
                                Export your binder to share with others or create a backup.
                            </p>
                        </div>

                        {/* Export Format */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Export Format
                            </label>
                            <select
                                value={exportOptions.format}
                                onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value as any }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="json">JSON (Recommended - Full data)</option>
                                <option value="csv">CSV (Spreadsheet compatible)</option>
                                <option value="txt">Text (Human readable)</option>
                            </select>
                        </div>

                        {/* Export Options */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                Include Additional Data
                            </label>
                            <div className="space-y-2">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={exportOptions.includeCardDetails}
                                        onChange={(e) => setExportOptions(prev => ({ ...prev, includeCardDetails: e.target.checked }))}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">Card details (type, ATK/DEF, etc.)</span>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={exportOptions.includeSetInfo}
                                        onChange={(e) => setExportOptions(prev => ({ ...prev, includeSetInfo: e.target.checked }))}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">Set and rarity information</span>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={exportOptions.includeTags}
                                        onChange={(e) => setExportOptions(prev => ({ ...prev, includeTags: e.target.checked }))}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">Custom tags</span>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={exportOptions.includeNotes}
                                        onChange={(e) => setExportOptions(prev => ({ ...prev, includeNotes: e.target.checked }))}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">Notes and comments</span>
                                </label>
                                {exportOptions.format === 'json' && (
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={exportOptions.includeImages}
                                            onChange={(e) => setExportOptions(prev => ({ ...prev, includeImages: e.target.checked }))}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">Card images (increases file size)</span>
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Export Buttons */}
                        <div className="flex space-x-3">
                            <button
                                onClick={handleExport}
                                disabled={isExporting}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {isExporting ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Exporting...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Download Export
                                    </>
                                )}
                            </button>

                            <button
                                onClick={handleGenerateShareLink}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                                </svg>
                                Generate Share Link
                            </button>
                        </div>

                        {/* Share Link */}
                        {shareableLink && (
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-gray-900 mb-2">Shareable Link</h4>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="text"
                                        value={shareableLink}
                                        readOnly
                                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white"
                                    />
                                    <button
                                        onClick={handleCopyShareLink}
                                        className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                                    >
                                        Copy
                                    </button>
                                </div>
                                <p className="text-xs text-gray-600 mt-2">
                                    Share this link with others to let them import your binder.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Import Tab */}
                {activeTab === 'import' && (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                Import Binder
                            </h3>
                            <p className="text-gray-600 mb-4">
                                Import a binder from a JSON or CSV file.
                            </p>
                        </div>

                        {/* File Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select File
                            </label>
                            <input
                                type="file"
                                accept=".json,.csv"
                                onChange={handleFileImport}
                                disabled={isImporting}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Supported formats: JSON, CSV
                            </p>
                        </div>

                        {/* Import Status */}
                        {isImporting && (
                            <div className="flex items-center justify-center py-4">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span className="text-blue-600">Importing binder...</span>
                            </div>
                        )}

                        {/* Import Results */}
                        {importResult && (
                            <div className={`border rounded-md p-4 ${importResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                                }`}>
                                <h4 className={`text-sm font-medium ${importResult.success ? 'text-green-800' : 'text-red-800'
                                    }`}>
                                    {importResult.success ? 'Import Successful!' : 'Import Failed'}
                                </h4>

                                {importResult.success && importResult.binder && (
                                    <div className="mt-2 text-sm text-green-700">
                                        <p>Successfully imported "{importResult.binder.name}"</p>
                                        <p>Cards: {importResult.binder.cards.length}</p>
                                    </div>
                                )}

                                {importResult.errors.length > 0 && (
                                    <div className="mt-2">
                                        <p className="text-sm font-medium text-red-800">Errors:</p>
                                        <ul className="text-sm text-red-700 list-disc list-inside">
                                            {importResult.errors.map((error, index) => (
                                                <li key={index}>{error}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {importResult.warnings.length > 0 && (
                                    <div className="mt-2">
                                        <p className="text-sm font-medium text-yellow-800">Warnings:</p>
                                        <ul className="text-sm text-yellow-700 list-disc list-inside">
                                            {importResult.warnings.map((warning, index) => (
                                                <li key={index}>{warning}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Import Instructions */}
                        <div className="bg-blue-50 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-blue-900 mb-2">Import Instructions</h4>
                            <div className="text-sm text-blue-800 space-y-1">
                                <p><strong>JSON:</strong> Full import with all data (recommended)</p>
                                <p><strong>CSV:</strong> Requires "Card ID" and "Quantity" columns. Optional: "Set", "Rarity", "Tags", "Notes"</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BinderExportImport;