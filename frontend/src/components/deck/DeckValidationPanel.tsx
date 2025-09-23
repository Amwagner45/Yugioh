import React, { useState, useEffect } from 'react';
import { banListValidationService, type BanListValidationResult, type BanListFormat } from '../../services/banListValidation';
import type { Deck } from '../../types';

interface DeckValidationPanelProps {
    deck: Deck;
    onValidationChange?: (isValid: boolean) => void;
}

const DeckValidationPanel: React.FC<DeckValidationPanelProps> = ({
    deck,
    onValidationChange,
}) => {
    const [validationResult, setValidationResult] = useState<BanListValidationResult | null>(null);
    const [selectedFormat, setSelectedFormat] = useState<keyof BanListFormat>('tcg');
    const [isValidating, setIsValidating] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    const availableFormats = banListValidationService.getAvailableFormats();

    useEffect(() => {
        validateDeck();
    }, [deck, selectedFormat]);

    useEffect(() => {
        if (validationResult && onValidationChange) {
            onValidationChange(validationResult.isValid);
        }
    }, [validationResult, onValidationChange]);

    const validateDeck = async () => {
        setIsValidating(true);
        try {
            const result = await banListValidationService.validateDeckComprehensive(deck, selectedFormat);
            setValidationResult(result);
        } catch (error) {
            console.error('Validation error:', error);
            setValidationResult({
                isValid: false,
                errors: [`Validation failed: ${error}`],
                warnings: [],
                forbiddenCards: [],
                limitViolations: [],
                semiLimitViolations: [],
            });
        } finally {
            setIsValidating(false);
        }
    };

    const getValidationIcon = () => {
        if (isValidating) {
            return (
                <svg className="animate-spin w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
            );
        }

        if (!validationResult) {
            return null;
        }

        if (validationResult.isValid) {
            return (
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            );
        } else {
            return (
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            );
        }
    };

    const getStatusText = () => {
        if (isValidating) return 'Validating...';
        if (!validationResult) return 'Not validated';
        return validationResult.isValid ? 'Valid' : 'Invalid';
    };

    const getStatusColor = () => {
        if (isValidating) return 'text-blue-600';
        if (!validationResult) return 'text-gray-600';
        return validationResult.isValid ? 'text-green-600' : 'text-red-600';
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    {getValidationIcon()}
                    <h3 className="text-lg font-medium text-gray-900">Deck Validation</h3>
                    <span className={`text-sm font-medium ${getStatusColor()}`}>
                        {getStatusText()}
                    </span>
                </div>

                <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                    {showDetails ? 'Hide Details' : 'Show Details'}
                </button>
            </div>

            {/* Format Selection */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ban List Format:
                </label>
                <select
                    value={selectedFormat}
                    onChange={(e) => setSelectedFormat(e.target.value as keyof BanListFormat)}
                    className="block w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-sm"
                >
                    {availableFormats.map((format) => (
                        <option key={format.key} value={format.key}>
                            {format.name} - {format.description}
                        </option>
                    ))}
                </select>
            </div>

            {/* Validation Summary */}
            {validationResult && (
                <div className="space-y-3">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 bg-gray-50 rounded-lg">
                        <div className="text-center">
                            <div className="text-lg font-semibold text-gray-900">
                                {deck.mainDeck.reduce((sum, card) => sum + card.quantity, 0)}
                            </div>
                            <div className="text-xs text-gray-600">Main Deck</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-semibold text-gray-900">
                                {deck.extraDeck.reduce((sum, card) => sum + card.quantity, 0)}
                            </div>
                            <div className="text-xs text-gray-600">Extra Deck</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-semibold text-gray-900">
                                {deck.sideDeck.reduce((sum, card) => sum + card.quantity, 0)}
                            </div>
                            <div className="text-xs text-gray-600">Side Deck</div>
                        </div>
                        <div className="text-center">
                            <div className={`text-lg font-semibold ${validationResult.isValid ? 'text-green-600' : 'text-red-600'}`}>
                                {validationResult.errors.length}
                            </div>
                            <div className="text-xs text-gray-600">Errors</div>
                        </div>
                    </div>

                    {/* Error Summary */}
                    {validationResult.errors.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <h4 className="text-sm font-medium text-red-800 mb-2">
                                Validation Errors ({validationResult.errors.length})
                            </h4>
                            {showDetails ? (
                                <ul className="space-y-1">
                                    {validationResult.errors.map((error, index) => (
                                        <li key={index} className="text-sm text-red-700 flex items-start gap-2">
                                            <span className="w-1 h-1 bg-red-600 rounded-full mt-2 flex-shrink-0"></span>
                                            {error}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-red-700">
                                    {validationResult.errors.slice(0, 2).join(', ')}
                                    {validationResult.errors.length > 2 && ` and ${validationResult.errors.length - 2} more...`}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Warning Summary */}
                    {validationResult.warnings.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <h4 className="text-sm font-medium text-yellow-800 mb-2">
                                Warnings ({validationResult.warnings.length})
                            </h4>
                            {showDetails ? (
                                <ul className="space-y-1">
                                    {validationResult.warnings.map((warning, index) => (
                                        <li key={index} className="text-sm text-yellow-700 flex items-start gap-2">
                                            <span className="w-1 h-1 bg-yellow-600 rounded-full mt-2 flex-shrink-0"></span>
                                            {warning}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-yellow-700">
                                    {validationResult.warnings.slice(0, 2).join(', ')}
                                    {validationResult.warnings.length > 2 && ` and ${validationResult.warnings.length - 2} more...`}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Success Message */}
                    {validationResult.isValid && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-sm font-medium text-green-800">
                                    Deck is valid for {selectedFormat.toUpperCase()} format!
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Detailed Ban List Violations */}
                    {showDetails && (
                        <div className="space-y-3">
                            {validationResult.forbiddenCards.length > 0 && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                    <h4 className="text-sm font-medium text-red-800 mb-2">
                                        Forbidden Cards ({validationResult.forbiddenCards.length})
                                    </h4>
                                    <div className="space-y-1">
                                        {validationResult.forbiddenCards.map((card, index) => (
                                            <div key={index} className="text-sm text-red-700">
                                                Card ID {card.cardId} (Quantity: {card.quantity})
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {validationResult.limitViolations.length > 0 && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                    <h4 className="text-sm font-medium text-yellow-800 mb-2">
                                        Limited Card Violations ({validationResult.limitViolations.length})
                                    </h4>
                                    <div className="space-y-1">
                                        {validationResult.limitViolations.map((card, index) => (
                                            <div key={index} className="text-sm text-yellow-700">
                                                Card ID {card.cardId} (Quantity: {card.quantity}, Limit: 1)
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {validationResult.semiLimitViolations.length > 0 && (
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                    <h4 className="text-sm font-medium text-orange-800 mb-2">
                                        Semi-Limited Card Violations ({validationResult.semiLimitViolations.length})
                                    </h4>
                                    <div className="space-y-1">
                                        {validationResult.semiLimitViolations.map((card, index) => (
                                            <div key={index} className="text-sm text-orange-700">
                                                Card ID {card.cardId} (Quantity: {card.quantity}, Limit: 2)
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Refresh Button */}
                    <div className="pt-2 border-t border-gray-200">
                        <button
                            onClick={validateDeck}
                            disabled={isValidating}
                            className="text-sm text-purple-600 hover:text-purple-800 disabled:text-gray-400 transition-colors"
                        >
                            Refresh Validation
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeckValidationPanel;