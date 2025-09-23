import type { Binder, BinderCard, Card } from '../types';

export interface ExportOptions {
    format: 'csv' | 'json' | 'txt';
    includeCardDetails: boolean;
    includeImages: boolean;
    includeNotes: boolean;
    includeTags: boolean;
    includeSetInfo: boolean;
}

export interface ExportData {
    filename: string;
    content: string;
    mimeType: string;
}

export interface ImportResult {
    success: boolean;
    binder?: Binder;
    errors: string[];
    warnings: string[];
}

export class BinderExportService {
    /**
     * Export a binder to the specified format
     */
    async exportBinder(
        binder: Binder,
        cardCache: Map<number, Card>,
        options: ExportOptions
    ): Promise<ExportData> {
        switch (options.format) {
            case 'csv':
                return this.exportToCSV(binder, cardCache, options);
            case 'json':
                return this.exportToJSON(binder, cardCache, options);
            case 'txt':
                return this.exportToText(binder, cardCache, options);
            default:
                throw new Error(`Unsupported export format: ${options.format}`);
        }
    }

    /**
     * Export to CSV format
     */
    private exportToCSV(
        binder: Binder,
        cardCache: Map<number, Card>,
        options: ExportOptions
    ): ExportData {
        const headers = [
            'Card ID',
            'Card Name',
            'Quantity',
        ];

        if (options.includeCardDetails) {
            headers.push('Type', 'Attribute', 'Race', 'Level', 'ATK', 'DEF');
        }

        if (options.includeSetInfo) {
            headers.push('Set Code', 'Rarity');
        }

        if (options.includeTags) {
            headers.push('Tags');
        }

        if (options.includeNotes) {
            headers.push('Notes');
        }

        const rows = [headers];

        binder.cards.forEach(binderCard => {
            const card = cardCache.get(binderCard.cardId);
            const row: string[] = [
                binderCard.cardId.toString(),
                card?.name || `Card ID ${binderCard.cardId}`,
                binderCard.quantity.toString(),
            ];

            if (options.includeCardDetails) {
                row.push(
                    card?.type || '',
                    card?.attribute || '',
                    card?.race || '',
                    card?.level?.toString() || '',
                    card?.atk?.toString() || '',
                    card?.def?.toString() || ''
                );
            }

            if (options.includeSetInfo) {
                row.push(
                    binderCard.setCode || '',
                    binderCard.rarity || ''
                );
            }

            if (options.includeTags) {
                row.push((binderCard.tags || []).join('; '));
            }

            if (options.includeNotes) {
                row.push(binderCard.notes || '');
            }

            rows.push(row);
        });

        const csvContent = rows
            .map(row => row.map(cell => this.escapeCsvCell(cell)).join(','))
            .join('\n');

        return {
            filename: `${this.sanitizeFilename(binder.name)}.csv`,
            content: csvContent,
            mimeType: 'text/csv',
        };
    }

    /**
     * Export to JSON format
     */
    private exportToJSON(
        binder: Binder,
        cardCache: Map<number, Card>,
        options: ExportOptions
    ): ExportData {
        const exportData: any = {
            binder: {
                id: binder.id,
                name: binder.name,
                description: binder.description,
                createdAt: binder.createdAt,
                modifiedAt: binder.modifiedAt,
                tags: binder.tags,
            },
            cards: [],
            exportOptions: options,
            exportDate: new Date(),
            version: '1.0',
        };

        binder.cards.forEach(binderCard => {
            const cardData: any = {
                cardId: binderCard.cardId,
                quantity: binderCard.quantity,
            };

            if (options.includeSetInfo) {
                cardData.setCode = binderCard.setCode;
                cardData.rarity = binderCard.rarity;
            }

            if (options.includeTags) {
                cardData.tags = binderCard.tags;
            }

            if (options.includeNotes) {
                cardData.notes = binderCard.notes;
            }

            if (options.includeCardDetails) {
                const card = cardCache.get(binderCard.cardId);
                if (card) {
                    cardData.cardDetails = {
                        name: card.name,
                        type: card.type,
                        desc: card.desc,
                        atk: card.atk,
                        def: card.def,
                        level: card.level,
                        race: card.race,
                        attribute: card.attribute,
                        card_sets: card.card_sets,
                        banlist_info: card.banlist_info,
                    };

                    if (options.includeImages && card.card_images) {
                        cardData.cardDetails.card_images = card.card_images;
                    }
                }
            }

            exportData.cards.push(cardData);
        });

        return {
            filename: `${this.sanitizeFilename(binder.name)}.json`,
            content: JSON.stringify(exportData, null, 2),
            mimeType: 'application/json',
        };
    }

    /**
     * Export to text format
     */
    private exportToText(
        binder: Binder,
        cardCache: Map<number, Card>,
        options: ExportOptions
    ): ExportData {
        const lines: string[] = [];

        // Header
        lines.push(`Binder: ${binder.name}`);
        if (binder.description) {
            lines.push(`Description: ${binder.description}`);
        }
        lines.push(`Total Cards: ${binder.cards.reduce((sum, card) => sum + card.quantity, 0)}`);
        lines.push(`Unique Cards: ${binder.cards.length}`);
        lines.push(`Exported: ${new Date().toLocaleDateString()}`);
        lines.push('');
        lines.push('='.repeat(50));
        lines.push('');

        // Cards
        binder.cards.forEach((binderCard, index) => {
            const card = cardCache.get(binderCard.cardId);
            lines.push(`${index + 1}. ${card?.name || `Card ID ${binderCard.cardId}`} (×${binderCard.quantity})`);

            if (options.includeCardDetails && card) {
                lines.push(`   Type: ${card.type}`);
                if (card.attribute) lines.push(`   Attribute: ${card.attribute}`);
                if (card.race) lines.push(`   Race: ${card.race}`);
                if (card.level !== undefined) lines.push(`   Level: ${card.level}`);
                if (card.atk !== undefined || card.def !== undefined) {
                    lines.push(`   ATK/DEF: ${card.atk || '?'}/${card.def || '?'}`);
                }
            }

            if (options.includeSetInfo && (binderCard.setCode || binderCard.rarity)) {
                const setInfo = [];
                if (binderCard.setCode) setInfo.push(binderCard.setCode);
                if (binderCard.rarity) setInfo.push(binderCard.rarity);
                lines.push(`   Set: ${setInfo.join(' - ')}`);
            }

            if (options.includeTags && binderCard.tags && binderCard.tags.length > 0) {
                lines.push(`   Tags: ${binderCard.tags.join(', ')}`);
            }

            if (options.includeNotes && binderCard.notes) {
                lines.push(`   Notes: ${binderCard.notes}`);
            }

            lines.push('');
        });

        return {
            filename: `${this.sanitizeFilename(binder.name)}.txt`,
            content: lines.join('\n'),
            mimeType: 'text/plain',
        };
    }

    /**
     * Import a binder from various formats
     */
    async importBinder(file: File): Promise<ImportResult> {
        const result: ImportResult = {
            success: false,
            errors: [],
            warnings: [],
        };

        try {
            const content = await this.readFileContent(file);
            const extension = file.name.split('.').pop()?.toLowerCase();

            switch (extension) {
                case 'json':
                    return this.importFromJSON(content);
                case 'csv':
                    return this.importFromCSV(content);
                default:
                    result.errors.push(`Unsupported file format: ${extension}`);
                    return result;
            }
        } catch (error) {
            result.errors.push(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return result;
        }
    }

    /**
     * Import from JSON format
     */
    private importFromJSON(content: string): ImportResult {
        const result: ImportResult = {
            success: false,
            errors: [],
            warnings: [],
        };

        try {
            const data = JSON.parse(content);

            if (!data.binder || !data.cards) {
                result.errors.push('Invalid JSON format: missing binder or cards data');
                return result;
            }

            const binder: Binder = {
                id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: data.binder.name || 'Imported Binder',
                description: data.binder.description,
                cards: [],
                createdAt: new Date(),
                modifiedAt: new Date(),
                tags: data.binder.tags,
            };

            data.cards.forEach((cardData: any, index: number) => {
                if (!cardData.cardId || !cardData.quantity) {
                    result.warnings.push(`Row ${index + 1}: Missing card ID or quantity`);
                    return;
                }

                const binderCard: BinderCard = {
                    cardId: cardData.cardId,
                    quantity: cardData.quantity,
                    setCode: cardData.setCode,
                    rarity: cardData.rarity,
                    tags: cardData.tags,
                    notes: cardData.notes,
                };

                binder.cards.push(binderCard);
            });

            result.success = true;
            result.binder = binder;

            if (result.warnings.length > 0) {
                result.warnings.push(`Successfully imported ${binder.cards.length} cards with ${result.warnings.length} warnings`);
            }

            return result;
        } catch (error) {
            result.errors.push(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return result;
        }
    }

    /**
     * Import from CSV format
     */
    private importFromCSV(content: string): ImportResult {
        const result: ImportResult = {
            success: false,
            errors: [],
            warnings: [],
        };

        try {
            const lines = content.split('\n').filter(line => line.trim());
            if (lines.length < 2) {
                result.errors.push('CSV file must have at least a header and one data row');
                return result;
            }

            const headers = this.parseCSVRow(lines[0]);

            // Check for the new format first (cardname, cardq, cardid, etc.)
            const isNewFormat = this.isNewCSVFormat(headers);

            if (isNewFormat) {
                return this.importFromNewCSVFormat(lines, result);
            } else {
                return this.importFromLegacyCSVFormat(lines, result);
            }
        } catch (error) {
            result.errors.push(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return result;
        }
    }

    /**
     * Check if CSV uses the new format (cardname, cardq, cardid, etc.)
     */
    private isNewCSVFormat(headers: string[]): boolean {
        const lowerHeaders = headers.map(h => h.toLowerCase().trim());
        return lowerHeaders.includes('cardname') &&
            lowerHeaders.includes('cardq') &&
            lowerHeaders.includes('cardid');
    }

    /**
     * Import from new CSV format (cardname, cardq, cardid, cardrarity, cardcondition, card_edition, cardset, cardcode)
     */
    private importFromNewCSVFormat(lines: string[], result: ImportResult): ImportResult {
        const headers = this.parseCSVRow(lines[0]);
        const lowerHeaders = headers.map(h => h.toLowerCase().trim());

        // Find column indices for the new format
        const quantityIndex = lowerHeaders.indexOf('cardq');
        const cardIdIndex = lowerHeaders.indexOf('cardid');
        const rarityIndex = lowerHeaders.indexOf('cardrarity');
        const conditionIndex = lowerHeaders.indexOf('cardcondition');
        const editionIndex = lowerHeaders.indexOf('card_edition');
        const setCodeIndex = lowerHeaders.indexOf('cardcode');

        if (cardIdIndex === -1 || quantityIndex === -1) {
            result.errors.push('CSV must have "cardid" and "cardq" columns');
            return result;
        }

        const binder: Binder = {
            id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: 'Imported Binder',
            description: 'Imported from CSV file',
            cards: [],
            createdAt: new Date(),
            modifiedAt: new Date(),
        };

        for (let i = 1; i < lines.length; i++) {
            const row = this.parseCSVRow(lines[i]);

            if (row.length <= Math.max(cardIdIndex, quantityIndex)) {
                result.warnings.push(`Row ${i + 1}: Insufficient columns`);
                continue;
            }

            const cardId = parseInt(row[cardIdIndex]);
            const quantity = parseInt(row[quantityIndex]);

            if (isNaN(cardId) || isNaN(quantity) || quantity < 1) {
                result.warnings.push(`Row ${i + 1}: Invalid card ID or quantity`);
                continue;
            }

            const binderCard: BinderCard = {
                cardId,
                quantity,
                setCode: setCodeIndex >= 0 && row[setCodeIndex] ? row[setCodeIndex] : undefined,
                rarity: rarityIndex >= 0 && row[rarityIndex] ? row[rarityIndex] : undefined,
                condition: conditionIndex >= 0 && row[conditionIndex] ? row[conditionIndex] : undefined,
                edition: editionIndex >= 0 && row[editionIndex] ? row[editionIndex] : undefined,
            };

            binder.cards.push(binderCard);
        }

        result.success = true;
        result.binder = binder;

        if (result.warnings.length > 0) {
            result.warnings.push(`Successfully imported ${binder.cards.length} cards with ${result.warnings.length} warnings`);
        }

        return result;
    }

    /**
     * Import from legacy CSV format (Card ID, Quantity, etc.)
     */
    private importFromLegacyCSVFormat(lines: string[], result: ImportResult): ImportResult {
        const headers = this.parseCSVRow(lines[0]);
        const cardIdIndex = headers.findIndex(h => h.toLowerCase().includes('card id'));
        const quantityIndex = headers.findIndex(h => h.toLowerCase().includes('quantity'));

        if (cardIdIndex === -1 || quantityIndex === -1) {
            result.errors.push('CSV must have "Card ID" and "Quantity" columns');
            return result;
        }

        const setCodeIndex = headers.findIndex(h => h.toLowerCase().includes('set'));
        const rarityIndex = headers.findIndex(h => h.toLowerCase().includes('rarity'));
        const tagsIndex = headers.findIndex(h => h.toLowerCase().includes('tags'));
        const notesIndex = headers.findIndex(h => h.toLowerCase().includes('notes'));

        const binder: Binder = {
            id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: 'Imported Binder',
            description: 'Imported from CSV file',
            cards: [],
            createdAt: new Date(),
            modifiedAt: new Date(),
        };

        for (let i = 1; i < lines.length; i++) {
            const row = this.parseCSVRow(lines[i]);

            if (row.length <= Math.max(cardIdIndex, quantityIndex)) {
                result.warnings.push(`Row ${i + 1}: Insufficient columns`);
                continue;
            }

            const cardId = parseInt(row[cardIdIndex]);
            const quantity = parseInt(row[quantityIndex]);

            if (isNaN(cardId) || isNaN(quantity) || quantity < 1) {
                result.warnings.push(`Row ${i + 1}: Invalid card ID or quantity`);
                continue;
            }

            const binderCard: BinderCard = {
                cardId,
                quantity,
                setCode: setCodeIndex >= 0 && row[setCodeIndex] ? row[setCodeIndex] : undefined,
                rarity: rarityIndex >= 0 && row[rarityIndex] ? row[rarityIndex] : undefined,
                tags: tagsIndex >= 0 && row[tagsIndex] ? row[tagsIndex].split(';').map(t => t.trim()).filter(Boolean) : undefined,
                notes: notesIndex >= 0 && row[notesIndex] ? row[notesIndex] : undefined,
            };

            binder.cards.push(binderCard);
        }

        result.success = true;
        result.binder = binder;

        if (result.warnings.length > 0) {
            result.warnings.push(`Successfully imported ${binder.cards.length} cards with ${result.warnings.length} warnings`);
        }

        return result;
    }

    /**
     * Download exported data as a file
     */
    downloadExport(exportData: ExportData): void {
        const blob = new Blob([exportData.content], { type: exportData.mimeType });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = exportData.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    }

    /**
     * Generate a shareable link for a binder (JSON format)
     */
    generateShareableLink(binder: Binder, cardCache: Map<number, Card>): string {
        const exportData = this.exportToJSON(binder, cardCache, {
            format: 'json',
            includeCardDetails: true,
            includeImages: false,
            includeNotes: true,
            includeTags: true,
            includeSetInfo: true,
        });

        // In a real application, you would upload this to a sharing service
        // For now, we'll create a data URL (note: this has size limitations)
        const compressed = btoa(JSON.stringify(JSON.parse(exportData.content)));
        return `${window.location.origin}${window.location.pathname}?import=${compressed}`;
    }

    // Helper methods

    private readFileContent(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    }

    private escapeCsvCell(cell: string): string {
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
            return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
    }

    private parseCSVRow(row: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < row.length; i++) {
            const char = row[i];
            const nextChar = row[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    i++; // Skip next quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current);
        return result;
    }

    private sanitizeFilename(filename: string): string {
        return filename.replace(/[^a-z0-9.-]/gi, '_');
    }
}

export const binderExportService = new BinderExportService();