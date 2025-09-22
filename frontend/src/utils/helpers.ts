import type { Card, BinderCard, DeckCard } from '../types';

/**
 * Format card attack/defense values for display
 */
export const formatAtkDef = (value?: number): string => {
    if (value === undefined || value === null) return '?';
    return value.toString();
};

/**
 * Format card level for display
 */
export const formatLevel = (level?: number): string => {
    if (!level) return '';
    return '★'.repeat(level);
};

/**
 * Get card type category for organizing
 */
export const getCardTypeCategory = (card: Card): string => {
    const type = card.type.toLowerCase();

    if (type.includes('monster')) {
        if (type.includes('xyz')) return 'xyz';
        if (type.includes('synchro')) return 'synchro';
        if (type.includes('fusion')) return 'fusion';
        if (type.includes('link')) return 'link';
        if (type.includes('ritual')) return 'ritual';
        if (type.includes('pendulum')) return 'pendulum';
        return 'monster';
    }

    if (type.includes('spell')) return 'spell';
    if (type.includes('trap')) return 'trap';

    return 'other';
};

/**
 * Check if a card is an Extra Deck monster
 */
export const isExtraDeckCard = (card: Card): boolean => {
    const type = card.type.toLowerCase();
    return type.includes('xyz') ||
        type.includes('synchro') ||
        type.includes('fusion') ||
        type.includes('link');
};

/**
 * Generate a unique ID for client-side entities
 */
export const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Validate deck card counts
 */
export const validateDeckCounts = (
    mainDeck: DeckCard[],
    extraDeck: DeckCard[],
    sideDeck: DeckCard[]
): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Calculate total counts
    const mainCount = mainDeck.reduce((sum, card) => sum + card.quantity, 0);
    const extraCount = extraDeck.reduce((sum, card) => sum + card.quantity, 0);
    const sideCount = sideDeck.reduce((sum, card) => sum + card.quantity, 0);

    // Validate main deck size
    if (mainCount < 40) {
        errors.push('Main deck must contain at least 40 cards');
    }
    if (mainCount > 60) {
        errors.push('Main deck cannot contain more than 60 cards');
    }

    // Validate extra deck size
    if (extraCount > 15) {
        errors.push('Extra deck cannot contain more than 15 cards');
    }

    // Validate side deck size
    if (sideCount > 15) {
        errors.push('Side deck cannot contain more than 15 cards');
    }

    // Validate individual card limits
    const allCards = [...mainDeck, ...extraDeck, ...sideDeck];
    const cardCounts = new Map<number, number>();

    allCards.forEach(card => {
        const current = cardCounts.get(card.cardId) || 0;
        cardCounts.set(card.cardId, current + card.quantity);
    });

    cardCounts.forEach((count, cardId) => {
        if (count > 3) {
            errors.push(`Card ${cardId} appears ${count} times (max 3 allowed)`);
        }
    });

    return {
        valid: errors.length === 0,
        errors
    };
};

/**
 * Calculate binder statistics
 */
export const calculateBinderStats = (cards: BinderCard[]) => {
    const totalCards = cards.reduce((sum, card) => sum + card.quantity, 0);
    const uniqueCards = cards.length;

    return {
        totalCards,
        uniqueCards,
        averageQuantity: uniqueCards > 0 ? totalCards / uniqueCards : 0
    };
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Debounce function for search inputs
 */
export const debounce = <T extends (...args: any[]) => any>(
    func: T,
    delay: number
): ((...args: Parameters<T>) => void) => {
    let timeoutId: NodeJS.Timeout;

    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
};

/**
 * Deep clone an object
 */
export const deepClone = <T>(obj: T): T => {
    return JSON.parse(JSON.stringify(obj));
};

/**
 * Sort cards by various criteria
 */
export const sortCards = (cards: Card[], sortBy: string, direction: 'asc' | 'desc' = 'asc'): Card[] => {
    return [...cards].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortBy) {
            case 'name':
                aValue = a.name.toLowerCase();
                bValue = b.name.toLowerCase();
                break;
            case 'level':
                aValue = a.level || 0;
                bValue = b.level || 0;
                break;
            case 'atk':
                aValue = a.atk || 0;
                bValue = b.atk || 0;
                break;
            case 'def':
                aValue = a.def || 0;
                bValue = b.def || 0;
                break;
            case 'type':
                aValue = a.type.toLowerCase();
                bValue = b.type.toLowerCase();
                break;
            default:
                aValue = a.id;
                bValue = b.id;
        }

        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
        return 0;
    });
};
