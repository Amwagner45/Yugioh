import { cardService } from './api';
import type { Card, DeckCard, Deck } from '../types';

export interface BanListValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    forbiddenCards: DeckCard[];
    limitViolations: DeckCard[];
    semiLimitViolations: DeckCard[];
}

export interface BanListFormat {
    tcg: 'TCG';
    ocg: 'OCG';
    goat: 'GOAT';
}

/**
 * Service for validating decks against Yu-Gi-Oh ban lists
 */
export class BanListValidationService {
    private static instance: BanListValidationService;
    private cardCache: Map<number, Card> = new Map();

    private constructor() { }

    public static getInstance(): BanListValidationService {
        if (!BanListValidationService.instance) {
            BanListValidationService.instance = new BanListValidationService();
        }
        return BanListValidationService.instance;
    }

    /**
     * Validate a deck against ban list restrictions
     */
    public async validateDeck(deck: Deck, format: keyof BanListFormat = 'tcg'): Promise<BanListValidationResult> {
        const result: BanListValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            forbiddenCards: [],
            limitViolations: [],
            semiLimitViolations: [],
        };

        // Combine all deck cards for validation
        // Group cards by ID to count total quantities
        const cardCounts: Map<number, { card: DeckCard; totalQuantity: number; sections: string[] }> = new Map();

        // Count main deck cards
        for (const card of deck.mainDeck) {
            const existing = cardCounts.get(card.cardId);
            if (existing) {
                existing.totalQuantity += card.quantity;
                if (!existing.sections.includes('main')) {
                    existing.sections.push('main');
                }
            } else {
                cardCounts.set(card.cardId, {
                    card,
                    totalQuantity: card.quantity,
                    sections: ['main'],
                });
            }
        }

        // Count extra deck cards
        for (const card of deck.extraDeck) {
            const existing = cardCounts.get(card.cardId);
            if (existing) {
                existing.totalQuantity += card.quantity;
                if (!existing.sections.includes('extra')) {
                    existing.sections.push('extra');
                }
            } else {
                cardCounts.set(card.cardId, {
                    card,
                    totalQuantity: card.quantity,
                    sections: ['extra'],
                });
            }
        }

        // Count side deck cards
        for (const card of deck.sideDeck) {
            const existing = cardCounts.get(card.cardId);
            if (existing) {
                existing.totalQuantity += card.quantity;
                if (!existing.sections.includes('side')) {
                    existing.sections.push('side');
                }
            } else {
                cardCounts.set(card.cardId, {
                    card,
                    totalQuantity: card.quantity,
                    sections: ['side'],
                });
            }
        }

        // Validate each unique card
        for (const [cardId, cardInfo] of cardCounts) {
            try {
                const cardData = await this.getCardData(cardId);
                if (!cardData || !cardData.banlist_info) {
                    continue; // Skip cards without ban list info
                }

                const banStatus = this.getBanStatus(cardData, format);
                if (!banStatus) {
                    continue; // No ban list restriction for this format
                }

                const { card, totalQuantity, sections } = cardInfo;

                // Check ban list violations
                switch (banStatus) {
                    case 'Forbidden':
                        result.forbiddenCards.push(card);
                        result.errors.push(
                            `${cardData.name} is forbidden in ${format.toUpperCase()} format (found ${totalQuantity} copies in ${sections.join(', ')} deck)`
                        );
                        result.isValid = false;
                        break;

                    case 'Limited':
                        if (totalQuantity > 1) {
                            result.limitViolations.push(card);
                            result.errors.push(
                                `${cardData.name} is limited to 1 copy in ${format.toUpperCase()} format (found ${totalQuantity} copies in ${sections.join(', ')} deck)`
                            );
                            result.isValid = false;
                        }
                        break;

                    case 'Semi-Limited':
                        if (totalQuantity > 2) {
                            result.semiLimitViolations.push(card);
                            result.errors.push(
                                `${cardData.name} is semi-limited to 2 copies in ${format.toUpperCase()} format (found ${totalQuantity} copies in ${sections.join(', ')} deck)`
                            );
                            result.isValid = false;
                        }
                        break;
                }
            } catch (error) {
                result.warnings.push(`Could not validate ban list status for card ID ${cardId}: ${error}`);
            }
        }

        return result;
    }

    /**
     * Get ban list status for a specific card in a format
     */
    public async getCardBanStatus(cardId: number, format: keyof BanListFormat = 'tcg'): Promise<string | null> {
        try {
            const cardData = await this.getCardData(cardId);
            if (!cardData || !cardData.banlist_info) {
                return null;
            }
            return this.getBanStatus(cardData, format);
        } catch (error) {
            console.error(`Error getting ban status for card ${cardId}:`, error);
            return null;
        }
    }

    /**
     * Check if a card is playable in a format (not forbidden)
     */
    public async isCardPlayable(cardId: number, format: keyof BanListFormat = 'tcg'): Promise<boolean> {
        const banStatus = await this.getCardBanStatus(cardId, format);
        return banStatus !== 'Forbidden';
    }

    /**
     * Get maximum allowed copies of a card in a format
     */
    public async getMaxCopies(cardId: number, format: keyof BanListFormat = 'tcg'): Promise<number> {
        const banStatus = await this.getCardBanStatus(cardId, format);

        switch (banStatus) {
            case 'Forbidden':
                return 0;
            case 'Limited':
                return 1;
            case 'Semi-Limited':
                return 2;
            default:
                return 3; // Unlimited
        }
    }

    /**
     * Get available ban list formats
     */
    public getAvailableFormats(): Array<{ key: keyof BanListFormat; name: string; description: string }> {
        return [
            {
                key: 'tcg',
                name: 'TCG',
                description: 'Trading Card Game (Western regions)',
            },
            {
                key: 'ocg',
                name: 'OCG',
                description: 'Official Card Game (Japan and Asian regions)',
            },
            {
                key: 'goat',
                name: 'GOAT',
                description: 'Greatest Of All Time (April 2005 format)',
            },
        ];
    }

    /**
     * Validate deck composition without ban list checks
     */
    public validateDeckComposition(deck: Deck): BanListValidationResult {
        const result: BanListValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            forbiddenCards: [],
            limitViolations: [],
            semiLimitViolations: [],
        };

        // Check deck size limits
        const mainDeckSize = deck.mainDeck.reduce((sum, card) => sum + card.quantity, 0);
        const extraDeckSize = deck.extraDeck.reduce((sum, card) => sum + card.quantity, 0);
        const sideDeckSize = deck.sideDeck.reduce((sum, card) => sum + card.quantity, 0);

        // Main deck validation
        if (mainDeckSize < 40) {
            result.errors.push(`Main deck must contain at least 40 cards (currently ${mainDeckSize})`);
            result.isValid = false;
        } else if (mainDeckSize > 60) {
            result.errors.push(`Main deck cannot contain more than 60 cards (currently ${mainDeckSize})`);
            result.isValid = false;
        }

        // Extra deck validation
        if (extraDeckSize > 15) {
            result.errors.push(`Extra deck cannot contain more than 15 cards (currently ${extraDeckSize})`);
            result.isValid = false;
        }

        // Side deck validation
        if (sideDeckSize > 15) {
            result.errors.push(`Side deck cannot contain more than 15 cards (currently ${sideDeckSize})`);
            result.isValid = false;
        }

        // Check for duplicate card limits (max 3 of any card)
        const allSections = [
            { name: 'main', cards: deck.mainDeck },
            { name: 'extra', cards: deck.extraDeck },
            { name: 'side', cards: deck.sideDeck },
        ];

        for (const section of allSections) {
            for (const card of section.cards) {
                if (card.quantity > 3) {
                    result.errors.push(
                        `Cannot have more than 3 copies of any card (${section.name} deck contains ${card.quantity} copies of card ID ${card.cardId})`
                    );
                    result.isValid = false;
                }
            }
        }

        return result;
    }

    /**
     * Get comprehensive deck validation (composition + ban list)
     */
    public async validateDeckComprehensive(deck: Deck, format: keyof BanListFormat = 'tcg'): Promise<BanListValidationResult> {
        // First validate deck composition
        const compositionResult = this.validateDeckComposition(deck);

        // Then validate against ban list
        const banListResult = await this.validateDeck(deck, format);

        // Combine results
        return {
            isValid: compositionResult.isValid && banListResult.isValid,
            errors: [...compositionResult.errors, ...banListResult.errors],
            warnings: [...compositionResult.warnings, ...banListResult.warnings],
            forbiddenCards: banListResult.forbiddenCards,
            limitViolations: banListResult.limitViolations,
            semiLimitViolations: banListResult.semiLimitViolations,
        };
    }

    // Private helper methods

    private async getCardData(cardId: number): Promise<Card | null> {
        // Check cache first
        if (this.cardCache.has(cardId)) {
            return this.cardCache.get(cardId)!;
        }

        try {
            const card = await cardService.getCardById(cardId);
            if (card) {
                this.cardCache.set(cardId, card);
            }
            return card;
        } catch (error) {
            console.error(`Error fetching card data for ID ${cardId}:`, error);
            return null;
        }
    }

    private getBanStatus(card: Card, format: keyof BanListFormat): string | null {
        if (!card.banlist_info) {
            return null;
        }

        switch (format) {
            case 'tcg':
                return card.banlist_info.ban_tcg || null;
            case 'ocg':
                return card.banlist_info.ban_ocg || null;
            case 'goat':
                return card.banlist_info.ban_goat || null;
            default:
                return null;
        }
    }

    /**
     * Clear the card data cache
     */
    public clearCache(): void {
        this.cardCache.clear();
    }
}

// Export singleton instance
export const banListValidationService = BanListValidationService.getInstance();