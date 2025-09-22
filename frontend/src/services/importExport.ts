import { storageService } from './storage';
import type { Binder, Deck, BinderCard, DeckCard } from '../types';

export interface ExportOptions {
    includeImages?: boolean;
    includeMetadata?: boolean;
    format: 'json' | 'csv' | 'ydk' | 'txt';
}

export interface ImportResult {
    success: boolean;
    imported: {
        binders?: number;
        decks?: number;
        cards?: number;
    };
    errors: string[];
    warnings: string[];
}

/**
 * Service for importing and exporting data in various formats
 */
export class ImportExportService {
    private static instance: ImportExportService;

    private constructor() { }

    public static getInstance(): ImportExportService {
        if (!ImportExportService.instance) {
            ImportExportService.instance = new ImportExportService();
        }
        return ImportExportService.instance;
    }

    // === Export Functions ===

    /**
     * Export a binder to specified format
     */
    public exportBinder(binderId: string, options: ExportOptions): string | Blob {
        const binder = storageService.getBinder(binderId);
        if (!binder) {
            throw new Error(`Binder ${binderId} not found`);
        }

        switch (options.format) {
            case 'json':
                return this.exportBinderAsJSON(binder, options);
            case 'csv':
                return this.exportBinderAsCSV(binder);
            case 'txt':
                return this.exportBinderAsText(binder);
            default:
                throw new Error(`Format ${options.format} not supported for binders`);
        }
    }

    /**
     * Export a deck to specified format
     */
    public exportDeck(deckId: string, options: ExportOptions): string | Blob {
        const deck = storageService.getDeck(deckId);
        if (!deck) {
            throw new Error(`Deck ${deckId} not found`);
        }

        switch (options.format) {
            case 'json':
                return this.exportDeckAsJSON(deck, options);
            case 'ydk':
                return this.exportDeckAsYDK(deck);
            case 'txt':
                return this.exportDeckAsText(deck);
            case 'csv':
                return this.exportDeckAsCSV(deck);
            default:
                throw new Error(`Format ${options.format} not supported for decks`);
        }
    }

    /**
     * Export all user data
     */
    public exportAllData(options: ExportOptions): string | Blob {
        const allData = {
            version: '1.0.0',
            exportDate: new Date().toISOString(),
            binders: storageService.getBinders(),
            decks: storageService.getDecks(),
            config: storageService.getConfig(),
        };

        if (options.format === 'json') {
            return JSON.stringify(allData, null, 2);
        } else {
            throw new Error('Full data export only supports JSON format');
        }
    }

    // === Import Functions ===

    /**
     * Import binder from file content
     */
    public async importBinder(content: string, format: string): Promise<ImportResult> {
        const result: ImportResult = {
            success: false,
            imported: {},
            errors: [],
            warnings: [],
        };

        try {
            switch (format.toLowerCase()) {
                case 'json':
                    return await this.importBinderFromJSON(content);
                case 'csv':
                    return await this.importBinderFromCSV(content);
                case 'txt':
                    return await this.importBinderFromText(content);
                default:
                    result.errors.push(`Unsupported format: ${format}`);
                    return result;
            }
        } catch (error) {
            result.errors.push(`Import failed: ${error}`);
            return result;
        }
    }

    /**
     * Import deck from file content
     */
    public async importDeck(content: string, format: string): Promise<ImportResult> {
        const result: ImportResult = {
            success: false,
            imported: {},
            errors: [],
            warnings: [],
        };

        try {
            switch (format.toLowerCase()) {
                case 'json':
                    return await this.importDeckFromJSON(content);
                case 'ydk':
                    return await this.importDeckFromYDK(content);
                case 'txt':
                    return await this.importDeckFromText(content);
                default:
                    result.errors.push(`Unsupported format: ${format}`);
                    return result;
            }
        } catch (error) {
            result.errors.push(`Import failed: ${error}`);
            return result;
        }
    }

    /**
     * Import full application data
     */
    public async importAllData(content: string): Promise<ImportResult> {
        const result: ImportResult = {
            success: false,
            imported: { binders: 0, decks: 0 },
            errors: [],
            warnings: [],
        };

        try {
            const data = JSON.parse(content);

            // Validate data structure
            if (!data.version || !data.binders || !data.decks) {
                result.errors.push('Invalid data format');
                return result;
            }

            // Import binders
            if (Array.isArray(data.binders)) {
                for (const binder of data.binders) {
                    try {
                        // Generate new ID to avoid conflicts
                        const importedBinder: Binder = {
                            ...binder,
                            id: this.generateId(),
                            createdAt: new Date(),
                            modifiedAt: new Date(),
                        };
                        storageService.saveBinder(importedBinder);
                        result.imported.binders!++;
                    } catch (error) {
                        result.warnings.push(`Failed to import binder ${binder.name}: ${error}`);
                    }
                }
            }

            // Import decks
            if (Array.isArray(data.decks)) {
                for (const deck of data.decks) {
                    try {
                        const importedDeck: Deck = {
                            ...deck,
                            id: this.generateId(),
                            createdAt: new Date(),
                            modifiedAt: new Date(),
                        };
                        storageService.saveDeck(importedDeck);
                        result.imported.decks!++;
                    } catch (error) {
                        result.warnings.push(`Failed to import deck ${deck.name}: ${error}`);
                    }
                }
            }

            result.success = result.errors.length === 0;
            return result;

        } catch (error) {
            result.errors.push(`Failed to parse import data: ${error}`);
            return result;
        }
    }

    // === Private Export Methods ===

    private exportBinderAsJSON(binder: Binder, options: ExportOptions): string {
        const exportData = {
            type: 'binder',
            version: '1.0.0',
            exportDate: new Date().toISOString(),
            data: options.includeMetadata ? binder : {
                name: binder.name,
                description: binder.description,
                cards: binder.cards,
            },
        };
        return JSON.stringify(exportData, null, 2);
    }

    private exportBinderAsCSV(binder: Binder): string {
        const headers = ['Card ID', 'Quantity', 'Set Code', 'Rarity', 'Condition', 'Notes'];
        const rows = [headers.join(',')];

        for (const card of binder.cards) {
            const row = [
                card.cardId,
                card.quantity,
                card.setCode || '',
                card.rarity || '',
                card.condition || '',
                `"${(card.notes || '').replace(/"/g, '""')}"`, // Escape quotes in CSV
            ];
            rows.push(row.join(','));
        }

        return rows.join('\n');
    }

    private exportBinderAsText(binder: Binder): string {
        const lines = [
            `Binder: ${binder.name}`,
            binder.description ? `Description: ${binder.description}` : '',
            `Exported: ${new Date().toLocaleString()}`,
            '',
            'Cards:',
        ];

        for (const card of binder.cards) {
            lines.push(`${card.quantity}x Card ID ${card.cardId}${card.setCode ? ` (${card.setCode})` : ''}`);
        }

        return lines.filter(line => line !== '').join('\n');
    }

    private exportDeckAsJSON(deck: Deck, options: ExportOptions): string {
        const exportData = {
            type: 'deck',
            version: '1.0.0',
            exportDate: new Date().toISOString(),
            data: options.includeMetadata ? deck : {
                name: deck.name,
                description: deck.description,
                format: deck.format,
                mainDeck: deck.mainDeck,
                extraDeck: deck.extraDeck,
                sideDeck: deck.sideDeck,
            },
        };
        return JSON.stringify(exportData, null, 2);
    }

    private exportDeckAsYDK(deck: Deck): string {
        const lines = ['#created by Yu-Gi-Oh Deck Builder'];

        // Main deck
        lines.push('#main');
        for (const card of deck.mainDeck) {
            for (let i = 0; i < card.quantity; i++) {
                lines.push(card.cardId.toString());
            }
        }

        // Extra deck
        lines.push('#extra');
        for (const card of deck.extraDeck) {
            for (let i = 0; i < card.quantity; i++) {
                lines.push(card.cardId.toString());
            }
        }

        // Side deck
        lines.push('!side');
        for (const card of deck.sideDeck) {
            for (let i = 0; i < card.quantity; i++) {
                lines.push(card.cardId.toString());
            }
        }

        return lines.join('\n');
    }

    private exportDeckAsText(deck: Deck): string {
        const lines = [
            `Deck: ${deck.name}`,
            deck.description ? `Description: ${deck.description}` : '',
            deck.format ? `Format: ${deck.format}` : '',
            `Exported: ${new Date().toLocaleString()}`,
            '',
        ];

        if (deck.mainDeck.length > 0) {
            lines.push('Main Deck:');
            for (const card of deck.mainDeck) {
                lines.push(`${card.quantity}x Card ID ${card.cardId}`);
            }
            lines.push('');
        }

        if (deck.extraDeck.length > 0) {
            lines.push('Extra Deck:');
            for (const card of deck.extraDeck) {
                lines.push(`${card.quantity}x Card ID ${card.cardId}`);
            }
            lines.push('');
        }

        if (deck.sideDeck.length > 0) {
            lines.push('Side Deck:');
            for (const card of deck.sideDeck) {
                lines.push(`${card.quantity}x Card ID ${card.cardId}`);
            }
        }

        return lines.filter(line => line !== '').join('\n');
    }

    private exportDeckAsCSV(deck: Deck): string {
        const headers = ['Section', 'Card ID', 'Quantity'];
        const rows = [headers.join(',')];

        // Add main deck cards
        for (const card of deck.mainDeck) {
            rows.push(['Main', card.cardId, card.quantity].join(','));
        }

        // Add extra deck cards
        for (const card of deck.extraDeck) {
            rows.push(['Extra', card.cardId, card.quantity].join(','));
        }

        // Add side deck cards
        for (const card of deck.sideDeck) {
            rows.push(['Side', card.cardId, card.quantity].join(','));
        }

        return rows.join('\n');
    }

    // === Private Import Methods ===

    private async importBinderFromJSON(content: string): Promise<ImportResult> {
        const result: ImportResult = {
            success: false,
            imported: { binders: 0 },
            errors: [],
            warnings: [],
        };

        try {
            const data = JSON.parse(content);

            if (data.type !== 'binder') {
                result.errors.push('Not a valid binder export file');
                return result;
            }

            const binderData = data.data;
            const binder: Binder = {
                id: this.generateId(),
                name: binderData.name || 'Imported Binder',
                description: binderData.description,
                cards: this.validateBinderCards(binderData.cards || []),
                createdAt: new Date(),
                modifiedAt: new Date(),
                tags: binderData.tags,
            };

            storageService.saveBinder(binder);
            result.imported.binders = 1;
            result.success = true;

            return result;
        } catch (error) {
            result.errors.push(`Failed to parse JSON: ${error}`);
            return result;
        }
    }

    private async importBinderFromCSV(content: string): Promise<ImportResult> {
        const result: ImportResult = {
            success: false,
            imported: { binders: 0 },
            errors: [],
            warnings: [],
        };

        try {
            const lines = content.trim().split('\n');
            if (lines.length < 2) {
                result.errors.push('CSV file must have at least a header and one data row');
                return result;
            }

            // Skip header row
            const cards: BinderCard[] = [];

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const columns = this.parseCSVLine(line);
                if (columns.length < 2) {
                    result.warnings.push(`Skipping invalid row ${i + 1}: insufficient columns`);
                    continue;
                }

                const cardId = parseInt(columns[0]);
                const quantity = parseInt(columns[1]);

                if (isNaN(cardId) || isNaN(quantity)) {
                    result.warnings.push(`Skipping invalid row ${i + 1}: invalid card ID or quantity`);
                    continue;
                }

                cards.push({
                    cardId,
                    quantity,
                    setCode: columns[2] || undefined,
                    rarity: columns[3] || undefined,
                    condition: columns[4] || undefined,
                    notes: columns[5] || undefined,
                });
            }

            if (cards.length === 0) {
                result.errors.push('No valid cards found in CSV file');
                return result;
            }

            const binder: Binder = {
                id: this.generateId(),
                name: 'Imported Binder (CSV)',
                cards,
                createdAt: new Date(),
                modifiedAt: new Date(),
            };

            storageService.saveBinder(binder);
            result.imported.binders = 1;
            result.imported.cards = cards.length;
            result.success = true;

            return result;
        } catch (error) {
            result.errors.push(`Failed to parse CSV: ${error}`);
            return result;
        }
    }

    private async importBinderFromText(content: string): Promise<ImportResult> {
        const result: ImportResult = {
            success: false,
            imported: { binders: 0 },
            errors: [],
            warnings: [],
        };

        try {
            const lines = content.trim().split('\n');
            const cards: BinderCard[] = [];

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine.startsWith('#') || trimmedLine.startsWith('//')) {
                    continue; // Skip empty lines and comments
                }

                // Try to match pattern: "3x Card ID 12345" or "3 Card ID 12345"
                const match = trimmedLine.match(/^(\d+)\s*x?\s*(?:Card ID\s*)?(\d+)/i);
                if (match) {
                    const quantity = parseInt(match[1]);
                    const cardId = parseInt(match[2]);

                    if (!isNaN(cardId) && !isNaN(quantity)) {
                        cards.push({ cardId, quantity });
                    } else {
                        result.warnings.push(`Skipping invalid line: ${trimmedLine}`);
                    }
                } else {
                    result.warnings.push(`Skipping unrecognized line: ${trimmedLine}`);
                }
            }

            if (cards.length === 0) {
                result.errors.push('No valid cards found in text file');
                return result;
            }

            const binder: Binder = {
                id: this.generateId(),
                name: 'Imported Binder (Text)',
                cards,
                createdAt: new Date(),
                modifiedAt: new Date(),
            };

            storageService.saveBinder(binder);
            result.imported.binders = 1;
            result.imported.cards = cards.length;
            result.success = true;

            return result;
        } catch (error) {
            result.errors.push(`Failed to parse text file: ${error}`);
            return result;
        }
    }

    private async importDeckFromJSON(content: string): Promise<ImportResult> {
        const result: ImportResult = {
            success: false,
            imported: { decks: 0 },
            errors: [],
            warnings: [],
        };

        try {
            const data = JSON.parse(content);

            if (data.type !== 'deck') {
                result.errors.push('Not a valid deck export file');
                return result;
            }

            const deckData = data.data;
            const deck: Deck = {
                id: this.generateId(),
                name: deckData.name || 'Imported Deck',
                description: deckData.description,
                format: deckData.format,
                mainDeck: this.validateDeckCards(deckData.mainDeck || []),
                extraDeck: this.validateDeckCards(deckData.extraDeck || []),
                sideDeck: this.validateDeckCards(deckData.sideDeck || []),
                createdAt: new Date(),
                modifiedAt: new Date(),
                tags: deckData.tags,
                notes: deckData.notes,
            };

            storageService.saveDeck(deck);
            result.imported.decks = 1;
            result.success = true;

            return result;
        } catch (error) {
            result.errors.push(`Failed to parse JSON: ${error}`);
            return result;
        }
    }

    private async importDeckFromYDK(content: string): Promise<ImportResult> {
        const result: ImportResult = {
            success: false,
            imported: { decks: 0 },
            errors: [],
            warnings: [],
        };

        try {
            const lines = content.trim().split('\n');
            const mainDeck: DeckCard[] = [];
            const extraDeck: DeckCard[] = [];
            const sideDeck: DeckCard[] = [];

            let currentSection = 'main';

            for (const line of lines) {
                const trimmedLine = line.trim();

                if (trimmedLine.startsWith('#')) {
                    if (trimmedLine.includes('main')) {
                        currentSection = 'main';
                    } else if (trimmedLine.includes('extra')) {
                        currentSection = 'extra';
                    }
                    continue;
                }

                if (trimmedLine.startsWith('!side')) {
                    currentSection = 'side';
                    continue;
                }

                const cardId = parseInt(trimmedLine);
                if (!isNaN(cardId)) {
                    let targetDeck: DeckCard[];
                    switch (currentSection) {
                        case 'main':
                            targetDeck = mainDeck;
                            break;
                        case 'extra':
                            targetDeck = extraDeck;
                            break;
                        case 'side':
                            targetDeck = sideDeck;
                            break;
                        default:
                            continue;
                    }

                    const existingCard = targetDeck.find(card => card.cardId === cardId);
                    if (existingCard) {
                        existingCard.quantity++;
                    } else {
                        targetDeck.push({ cardId, quantity: 1 });
                    }
                }
            }

            const deck: Deck = {
                id: this.generateId(),
                name: 'Imported Deck (YDK)',
                mainDeck,
                extraDeck,
                sideDeck,
                createdAt: new Date(),
                modifiedAt: new Date(),
            };

            storageService.saveDeck(deck);
            result.imported.decks = 1;
            result.imported.cards = mainDeck.length + extraDeck.length + sideDeck.length;
            result.success = true;

            return result;
        } catch (error) {
            result.errors.push(`Failed to parse YDK file: ${error}`);
            return result;
        }
    }

    private async importDeckFromText(content: string): Promise<ImportResult> {
        const result: ImportResult = {
            success: false,
            imported: { decks: 0 },
            errors: [],
            warnings: [],
        };

        try {
            const lines = content.trim().split('\n');
            const mainDeck: DeckCard[] = [];
            const extraDeck: DeckCard[] = [];
            const sideDeck: DeckCard[] = [];

            let currentSection = 'main';

            for (const line of lines) {
                const trimmedLine = line.trim().toLowerCase();

                if (trimmedLine.includes('main deck:') || trimmedLine.includes('main:')) {
                    currentSection = 'main';
                    continue;
                }

                if (trimmedLine.includes('extra deck:') || trimmedLine.includes('extra:')) {
                    currentSection = 'extra';
                    continue;
                }

                if (trimmedLine.includes('side deck:') || trimmedLine.includes('side:')) {
                    currentSection = 'side';
                    continue;
                }

                // Try to match pattern: "3x Card ID 12345"
                const match = line.match(/^(\d+)\s*x?\s*(?:Card ID\s*)?(\d+)/i);
                if (match) {
                    const quantity = parseInt(match[1]);
                    const cardId = parseInt(match[2]);

                    if (!isNaN(cardId) && !isNaN(quantity)) {
                        let targetDeck: DeckCard[];
                        switch (currentSection) {
                            case 'main':
                                targetDeck = mainDeck;
                                break;
                            case 'extra':
                                targetDeck = extraDeck;
                                break;
                            case 'side':
                                targetDeck = sideDeck;
                                break;
                            default:
                                continue;
                        }
                        targetDeck.push({ cardId, quantity });
                    }
                }
            }

            const deck: Deck = {
                id: this.generateId(),
                name: 'Imported Deck (Text)',
                mainDeck,
                extraDeck,
                sideDeck,
                createdAt: new Date(),
                modifiedAt: new Date(),
            };

            storageService.saveDeck(deck);
            result.imported.decks = 1;
            result.imported.cards = mainDeck.length + extraDeck.length + sideDeck.length;
            result.success = true;

            return result;
        } catch (error) {
            result.errors.push(`Failed to parse text file: ${error}`);
            return result;
        }
    }

    // === Utility Methods ===

    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private validateBinderCards(cards: any[]): BinderCard[] {
        return cards.filter(card =>
            typeof card.cardId === 'number' &&
            typeof card.quantity === 'number' &&
            card.quantity > 0
        ).map(card => ({
            cardId: card.cardId,
            quantity: card.quantity,
            setCode: card.setCode,
            rarity: card.rarity,
            condition: card.condition,
            notes: card.notes,
        }));
    }

    private validateDeckCards(cards: any[]): DeckCard[] {
        return cards.filter(card =>
            typeof card.cardId === 'number' &&
            typeof card.quantity === 'number' &&
            card.quantity > 0
        ).map(card => ({
            cardId: card.cardId,
            quantity: card.quantity,
        }));
    }

    private parseCSVLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++; // Skip next quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current.trim());
        return result;
    }

    // === File Handling Utilities ===

    /**
     * Download content as a file
     */
    public downloadFile(content: string | Blob, filename: string, mimeType = 'application/octet-stream'): void {
        const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    }

    /**
     * Read file content from File object
     */
    public readFile(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }
}

// Export singleton instance
export const importExportService = ImportExportService.getInstance();