import { storageService } from './storage';
import type { DeckCard } from '../types';

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

export interface MigrationResult {
    success: boolean;
    fromVersion: string;
    toVersion: string;
    migratedItems: number;
    errors: string[];
}

export interface DataSchema {
    version: string;
    binder: {
        required: string[];
        optional: string[];
        cardRequired: string[];
        cardOptional: string[];
    };
    deck: {
        required: string[];
        optional: string[];
        cardRequired: string[];
        cardOptional: string[];
    };
}

/**
 * Service for data validation and schema migrations
 */
export class ValidationMigrationService {
    private static instance: ValidationMigrationService;
    private currentSchema: DataSchema;

    private constructor() {
        this.currentSchema = this.getCurrentSchema();
    }

    public static getInstance(): ValidationMigrationService {
        if (!ValidationMigrationService.instance) {
            ValidationMigrationService.instance = new ValidationMigrationService();
        }
        return ValidationMigrationService.instance;
    }

    /**
     * Get current data schema definition
     */
    private getCurrentSchema(): DataSchema {
        return {
            version: '1.0.0',
            binder: {
                required: ['id', 'name', 'cards', 'createdAt', 'modifiedAt'],
                optional: ['description', 'tags'],
                cardRequired: ['cardId', 'quantity'],
                cardOptional: ['setCode', 'rarity', 'condition', 'notes'],
            },
            deck: {
                required: ['id', 'name', 'mainDeck', 'extraDeck', 'sideDeck', 'createdAt', 'modifiedAt'],
                optional: ['description', 'format', 'tags', 'notes'],
                cardRequired: ['cardId', 'quantity'],
                cardOptional: [],
            },
        };
    }

    /**
     * Validate a binder object
     */
    public validateBinder(binder: any): ValidationResult {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
        };

        // Check required fields
        for (const field of this.currentSchema.binder.required) {
            if (binder[field] === undefined || binder[field] === null) {
                result.errors.push(`Binder missing required field: ${field}`);
                result.isValid = false;
            }
        }

        // Validate ID format
        if (binder.id && typeof binder.id !== 'string') {
            result.errors.push('Binder ID must be a string');
            result.isValid = false;
        }

        // Validate name
        if (binder.name && typeof binder.name !== 'string') {
            result.errors.push('Binder name must be a string');
            result.isValid = false;
        } else if (binder.name && binder.name.trim().length === 0) {
            result.errors.push('Binder name cannot be empty');
            result.isValid = false;
        }

        // Validate cards array
        if (binder.cards) {
            if (!Array.isArray(binder.cards)) {
                result.errors.push('Binder cards must be an array');
                result.isValid = false;
            } else {
                for (let i = 0; i < binder.cards.length; i++) {
                    const cardValidation = this.validateBinderCard(binder.cards[i], i);
                    result.errors.push(...cardValidation.errors);
                    result.warnings.push(...cardValidation.warnings);
                    if (!cardValidation.isValid) {
                        result.isValid = false;
                    }
                }
            }
        }

        // Validate dates
        if (binder.createdAt && !this.isValidDate(binder.createdAt)) {
            result.errors.push('Binder createdAt must be a valid date');
            result.isValid = false;
        }

        if (binder.modifiedAt && !this.isValidDate(binder.modifiedAt)) {
            result.errors.push('Binder modifiedAt must be a valid date');
            result.isValid = false;
        }

        // Validate optional fields
        if (binder.description && typeof binder.description !== 'string') {
            result.warnings.push('Binder description should be a string');
        }

        if (binder.tags && !Array.isArray(binder.tags)) {
            result.warnings.push('Binder tags should be an array');
        }

        return result;
    }

    /**
     * Validate a deck object
     */
    public validateDeck(deck: any): ValidationResult {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
        };

        // Check required fields
        for (const field of this.currentSchema.deck.required) {
            if (deck[field] === undefined || deck[field] === null) {
                result.errors.push(`Deck missing required field: ${field}`);
                result.isValid = false;
            }
        }

        // Validate ID format
        if (deck.id && typeof deck.id !== 'string') {
            result.errors.push('Deck ID must be a string');
            result.isValid = false;
        }

        // Validate name
        if (deck.name && typeof deck.name !== 'string') {
            result.errors.push('Deck name must be a string');
            result.isValid = false;
        } else if (deck.name && deck.name.trim().length === 0) {
            result.errors.push('Deck name cannot be empty');
            result.isValid = false;
        }

        // Validate deck sections
        const sections = ['mainDeck', 'extraDeck', 'sideDeck'];
        for (const section of sections) {
            if (deck[section]) {
                if (!Array.isArray(deck[section])) {
                    result.errors.push(`Deck ${section} must be an array`);
                    result.isValid = false;
                } else {
                    for (let i = 0; i < deck[section].length; i++) {
                        const cardValidation = this.validateDeckCard(deck[section][i], i, section);
                        result.errors.push(...cardValidation.errors);
                        result.warnings.push(...cardValidation.warnings);
                        if (!cardValidation.isValid) {
                            result.isValid = false;
                        }
                    }
                }
            }
        }

        // Validate deck size limits
        if (deck.mainDeck && Array.isArray(deck.mainDeck)) {
            const mainDeckSize = deck.mainDeck.reduce((total: number, card: DeckCard) => total + card.quantity, 0);
            if (mainDeckSize < 40) {
                result.warnings.push('Main deck should have at least 40 cards');
            } else if (mainDeckSize > 60) {
                result.warnings.push('Main deck should have at most 60 cards');
            }
        }

        if (deck.extraDeck && Array.isArray(deck.extraDeck)) {
            const extraDeckSize = deck.extraDeck.reduce((total: number, card: DeckCard) => total + card.quantity, 0);
            if (extraDeckSize > 15) {
                result.warnings.push('Extra deck should have at most 15 cards');
            }
        }

        if (deck.sideDeck && Array.isArray(deck.sideDeck)) {
            const sideDeckSize = deck.sideDeck.reduce((total: number, card: DeckCard) => total + card.quantity, 0);
            if (sideDeckSize > 15) {
                result.warnings.push('Side deck should have at most 15 cards');
            }
        }

        // Validate dates
        if (deck.createdAt && !this.isValidDate(deck.createdAt)) {
            result.errors.push('Deck createdAt must be a valid date');
            result.isValid = false;
        }

        if (deck.modifiedAt && !this.isValidDate(deck.modifiedAt)) {
            result.errors.push('Deck modifiedAt must be a valid date');
            result.isValid = false;
        }

        return result;
    }

    /**
     * Validate a binder card
     */
    private validateBinderCard(card: any, index: number): ValidationResult {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
        };

        const prefix = `Card ${index + 1}`;

        // Check required fields
        for (const field of this.currentSchema.binder.cardRequired) {
            if (card[field] === undefined || card[field] === null) {
                result.errors.push(`${prefix}: missing required field ${field}`);
                result.isValid = false;
            }
        }

        // Validate cardId
        if (card.cardId !== undefined) {
            if (typeof card.cardId !== 'number' || !Number.isInteger(card.cardId) || card.cardId <= 0) {
                result.errors.push(`${prefix}: cardId must be a positive integer`);
                result.isValid = false;
            }
        }

        // Validate quantity
        if (card.quantity !== undefined) {
            if (typeof card.quantity !== 'number' || !Number.isInteger(card.quantity) || card.quantity <= 0) {
                result.errors.push(`${prefix}: quantity must be a positive integer`);
                result.isValid = false;
            } else if (card.quantity > 99) {
                result.warnings.push(`${prefix}: quantity ${card.quantity} seems unusually high`);
            }
        }

        // Validate optional fields
        if (card.setCode !== undefined && typeof card.setCode !== 'string') {
            result.warnings.push(`${prefix}: setCode should be a string`);
        }

        if (card.rarity !== undefined && typeof card.rarity !== 'string') {
            result.warnings.push(`${prefix}: rarity should be a string`);
        }

        if (card.condition !== undefined && typeof card.condition !== 'string') {
            result.warnings.push(`${prefix}: condition should be a string`);
        }

        if (card.notes !== undefined && typeof card.notes !== 'string') {
            result.warnings.push(`${prefix}: notes should be a string`);
        }

        return result;
    }

    /**
     * Validate a deck card
     */
    private validateDeckCard(card: any, index: number, section: string): ValidationResult {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
        };

        const prefix = `${section} card ${index + 1}`;

        // Check required fields
        for (const field of this.currentSchema.deck.cardRequired) {
            if (card[field] === undefined || card[field] === null) {
                result.errors.push(`${prefix}: missing required field ${field}`);
                result.isValid = false;
            }
        }

        // Validate cardId
        if (card.cardId !== undefined) {
            if (typeof card.cardId !== 'number' || !Number.isInteger(card.cardId) || card.cardId <= 0) {
                result.errors.push(`${prefix}: cardId must be a positive integer`);
                result.isValid = false;
            }
        }

        // Validate quantity
        if (card.quantity !== undefined) {
            if (typeof card.quantity !== 'number' || !Number.isInteger(card.quantity) || card.quantity <= 0) {
                result.errors.push(`${prefix}: quantity must be a positive integer`);
                result.isValid = false;
            } else if (card.quantity > 3) {
                result.warnings.push(`${prefix}: quantity ${card.quantity} exceeds typical card limit of 3`);
            }
        }

        return result;
    }

    /**
     * Validate all user data
     */
    public validateAllData(): {
        binders: { [id: string]: ValidationResult };
        decks: { [id: string]: ValidationResult };
        summary: {
            totalErrors: number;
            totalWarnings: number;
            validBinders: number;
            validDecks: number;
        };
    } {
        const binderResults: { [id: string]: ValidationResult } = {};
        const deckResults: { [id: string]: ValidationResult } = {};

        // Validate all binders
        const binders = storageService.getBinders();
        for (const binder of binders) {
            binderResults[binder.id] = this.validateBinder(binder);
        }

        // Validate all decks
        const decks = storageService.getDecks();
        for (const deck of decks) {
            deckResults[deck.id] = this.validateDeck(deck);
        }

        // Calculate summary
        const summary = {
            totalErrors: 0,
            totalWarnings: 0,
            validBinders: 0,
            validDecks: 0,
        };

        Object.values(binderResults).forEach(result => {
            summary.totalErrors += result.errors.length;
            summary.totalWarnings += result.warnings.length;
            if (result.isValid) summary.validBinders++;
        });

        Object.values(deckResults).forEach(result => {
            summary.totalErrors += result.errors.length;
            summary.totalWarnings += result.warnings.length;
            if (result.isValid) summary.validDecks++;
        });

        return {
            binders: binderResults,
            decks: deckResults,
            summary,
        };
    }

    /**
     * Repair common data issues
     */
    public repairData(): {
        repaired: {
            binders: number;
            decks: number;
        };
        issues: string[];
    } {
        const result = {
            repaired: { binders: 0, decks: 0 },
            issues: [] as string[],
        };

        // Repair binders
        const binders = storageService.getBinders();
        for (const binder of binders) {
            let modified = false;

            // Fix missing dates
            if (!binder.createdAt) {
                binder.createdAt = new Date();
                modified = true;
                result.issues.push(`Fixed missing createdAt for binder: ${binder.name}`);
            }

            if (!binder.modifiedAt) {
                binder.modifiedAt = new Date();
                modified = true;
                result.issues.push(`Fixed missing modifiedAt for binder: ${binder.name}`);
            }

            // Fix invalid cards
            if (binder.cards) {
                const validCards = binder.cards.filter(card =>
                    typeof card.cardId === 'number' &&
                    typeof card.quantity === 'number' &&
                    card.quantity > 0
                );

                if (validCards.length !== binder.cards.length) {
                    binder.cards = validCards;
                    modified = true;
                    result.issues.push(`Removed invalid cards from binder: ${binder.name}`);
                }
            }

            if (modified) {
                storageService.saveBinder(binder);
                result.repaired.binders++;
            }
        }

        // Repair decks
        const decks = storageService.getDecks();
        for (const deck of decks) {
            let modified = false;

            // Fix missing dates
            if (!deck.createdAt) {
                deck.createdAt = new Date();
                modified = true;
                result.issues.push(`Fixed missing createdAt for deck: ${deck.name}`);
            }

            if (!deck.modifiedAt) {
                deck.modifiedAt = new Date();
                modified = true;
                result.issues.push(`Fixed missing modifiedAt for deck: ${deck.name}`);
            }

            // Fix missing deck sections
            if (!deck.mainDeck) {
                deck.mainDeck = [];
                modified = true;
                result.issues.push(`Fixed missing mainDeck for deck: ${deck.name}`);
            }

            if (!deck.extraDeck) {
                deck.extraDeck = [];
                modified = true;
                result.issues.push(`Fixed missing extraDeck for deck: ${deck.name}`);
            }

            if (!deck.sideDeck) {
                deck.sideDeck = [];
                modified = true;
                result.issues.push(`Fixed missing sideDeck for deck: ${deck.name}`);
            }

            // Fix invalid cards in all sections
            const sections = ['mainDeck', 'extraDeck', 'sideDeck'] as const;
            for (const section of sections) {
                const validCards = deck[section].filter(card =>
                    typeof card.cardId === 'number' &&
                    typeof card.quantity === 'number' &&
                    card.quantity > 0
                );

                if (validCards.length !== deck[section].length) {
                    deck[section] = validCards;
                    modified = true;
                    result.issues.push(`Removed invalid cards from ${section} in deck: ${deck.name}`);
                }
            }

            if (modified) {
                storageService.saveDeck(deck);
                result.repaired.decks++;
            }
        }

        return result;
    }

    /**
     * Migrate data from old schema version to current
     */
    public async migrateData(fromVersion: string): Promise<MigrationResult> {
        const result: MigrationResult = {
            success: false,
            fromVersion,
            toVersion: this.currentSchema.version,
            migratedItems: 0,
            errors: [],
        };

        try {
            if (fromVersion === this.currentSchema.version) {
                result.success = true;
                return result;
            }

            // Define migration paths
            const migrationPath = this.getMigrationPath(fromVersion, this.currentSchema.version);

            if (!migrationPath) {
                result.errors.push(`No migration path from ${fromVersion} to ${this.currentSchema.version}`);
                return result;
            }

            // Execute migrations step by step
            for (const migration of migrationPath) {
                try {
                    const migrationResult = await this.executeMigration(migration);
                    result.migratedItems += migrationResult.migratedItems;
                } catch (error) {
                    result.errors.push(`Migration ${migration.fromVersion} -> ${migration.toVersion} failed: ${error}`);
                    return result;
                }
            }

            // Update version in config
            storageService.updateConfig({ version: this.currentSchema.version });

            result.success = true;
            return result;

        } catch (error) {
            result.errors.push(`Migration failed: ${error}`);
            return result;
        }
    }

    /**
     * Get migration path between versions
     */
    private getMigrationPath(fromVersion: string, toVersion: string): Array<{
        fromVersion: string;
        toVersion: string;
        migration: (data: any) => any;
    }> | null {
        // Define known migration steps
        // const migrations = [
        //     // Example: if we had a migration from 0.9.0 to 1.0.0
        //     // {
        //     //     fromVersion: '0.9.0',
        //     //     toVersion: '1.0.0',
        //     //     migration: this.migrate_0_9_0_to_1_0_0.bind(this)
        //     // }
        // ];

        // For now, if versions are the same, no migration needed
        if (fromVersion === toVersion) {
            return [];
        }

        // For this initial implementation, we only support current version
        // In the future, you would implement a graph traversal algorithm
        // to find the shortest migration path
        return null;
    }

    /**
     * Execute a single migration step
     */
    private async executeMigration(_migration: {
        fromVersion: string;
        toVersion: string;
        migration: (data: any) => any;
    }): Promise<{ migratedItems: number }> {
        // This is where individual migration logic would be executed
        // For now, return empty result
        return { migratedItems: 0 };
    }

    /**
     * Check if a value is a valid date
     */
    private isValidDate(value: any): boolean {
        if (value instanceof Date) {
            return !isNaN(value.getTime());
        }

        if (typeof value === 'string') {
            const date = new Date(value);
            return !isNaN(date.getTime());
        }

        return false;
    }

    /**
     * Get current schema version
     */
    public getCurrentVersion(): string {
        return this.currentSchema.version;
    }

    /**
     * Get schema definition
     */
    public getSchema(): DataSchema {
        return { ...this.currentSchema };
    }
}

// Export singleton instance
export const validationMigrationService = ValidationMigrationService.getInstance();