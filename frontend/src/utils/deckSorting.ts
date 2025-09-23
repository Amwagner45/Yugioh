import type { DeckCard, Card } from '../types';

// Define card type priority order for sorting
const CARD_TYPE_PRIORITY: Record<string, number> = {
    // Monsters first
    'Effect Monster': 1,
    'Normal Monster': 2,
    'Ritual Effect Monster': 3,
    'Ritual Monster': 4,
    'Fusion Monster': 5,
    'Synchro Monster': 6,
    'XYZ Monster': 7,
    'Pendulum Effect Monster': 8,
    'Pendulum Normal Monster': 9,
    'Pendulum Flip Effect Monster': 10,
    'Pendulum Tuner Effect Monster': 11,
    'Pendulum Ritual Monster': 12,
    'Link Monster': 13,
    'Token': 14,
    // Flip monsters
    'Flip Effect Monster': 15,
    'Flip Tuner Effect Monster': 16,
    // Tuner monsters
    'Tuner Monster': 17,
    'Synchro Tuner Monster': 18,
    // Gemini and Spirit
    'Gemini Monster': 19,
    'Spirit Monster': 20,
    'Toon Monster': 21,
    'Union Effect Monster': 22,
    // Spells
    'Spell Card': 50,
    'Quick-Play Spell Card': 51,
    'Continuous Spell Card': 52,
    'Equip Spell Card': 53,
    'Field Spell Card': 54,
    'Ritual Spell Card': 55,
    // Traps
    'Trap Card': 60,
    'Continuous Trap Card': 61,
    'Counter Trap Card': 62,
};

// Helper type for deck cards with card details
interface DeckCardWithDetails extends DeckCard {
    card_details?: Card;
}

// Get the type priority for sorting
const getTypePriority = (type: string): number => {
    return CARD_TYPE_PRIORITY[type] || 999;
};

// Get the rank/level for sorting (higher levels/ranks first within each type)
const getRankLevel = (card: Card): number => {
    // For XYZ monsters, use rank
    if (card.type.includes('XYZ')) {
        return card.level || 0;
    }
    // For Link monsters, use link value
    if (card.type.includes('Link')) {
        return card.linkval || 0;
    }
    // For other monsters, use level
    if (card.level !== undefined && card.level !== null) {
        return card.level;
    }
    // For non-monster cards, treat as level 0
    return 0;
};

// Determine if a card is an effect monster vs non-effect monster
const isEffectMonster = (type: string): boolean => {
    return type.includes('Effect') ||
        type.includes('Flip') ||
        type.includes('Tuner') ||
        type.includes('Gemini') ||
        type.includes('Spirit') ||
        type.includes('Union') ||
        type.includes('Toon');
};

// Sort deck cards by type → rank → name
export const sortDeckCardsByTypeRankName = (cards: DeckCardWithDetails[]): DeckCardWithDetails[] => {
    return [...cards].sort((a, b) => {
        const cardA = a.card_details;
        const cardB = b.card_details;

        // If either card doesn't have details, sort by cardId
        if (!cardA || !cardB) {
            return a.cardId - b.cardId;
        }

        // First, sort by card type category
        const typeAPriority = getTypePriority(cardA.type);
        const typeBPriority = getTypePriority(cardB.type);

        if (typeAPriority !== typeBPriority) {
            return typeAPriority - typeBPriority;
        }

        // If same type category, handle monster subcategories
        if (typeAPriority < 50) { // Monster cards
            // Within monsters, sort Effect monsters before Non-effect monsters
            const isEffectA = isEffectMonster(cardA.type);
            const isEffectB = isEffectMonster(cardB.type);

            if (isEffectA !== isEffectB) {
                return isEffectA ? -1 : 1; // Effect monsters first
            }

            // Then sort by level/rank (higher levels first)
            const rankA = getRankLevel(cardA);
            const rankB = getRankLevel(cardB);

            if (rankA !== rankB) {
                return rankB - rankA; // Higher levels/ranks first
            }
        }

        // Finally, sort alphabetically by name
        return cardA.name.localeCompare(cardB.name);
    });
};

// Sort deck cards alphabetically by name
export const sortDeckCardsByName = (cards: DeckCardWithDetails[]): DeckCardWithDetails[] => {
    return [...cards].sort((a, b) => {
        const cardA = a.card_details;
        const cardB = b.card_details;

        if (!cardA || !cardB) {
            return a.cardId - b.cardId;
        }

        return cardA.name.localeCompare(cardB.name);
    });
};

// Sort deck cards by quantity (highest first)
export const sortDeckCardsByQuantity = (cards: DeckCardWithDetails[]): DeckCardWithDetails[] => {
    return [...cards].sort((a, b) => {
        if (a.quantity !== b.quantity) {
            return b.quantity - a.quantity;
        }

        // If same quantity, sort by name
        const cardA = a.card_details;
        const cardB = b.card_details;

        if (!cardA || !cardB) {
            return a.cardId - b.cardId;
        }

        return cardA.name.localeCompare(cardB.name);
    });
};

// Sort deck cards by level/rank (highest first)
export const sortDeckCardsByLevel = (cards: DeckCardWithDetails[]): DeckCardWithDetails[] => {
    return [...cards].sort((a, b) => {
        const cardA = a.card_details;
        const cardB = b.card_details;

        if (!cardA || !cardB) {
            return a.cardId - b.cardId;
        }

        const rankA = getRankLevel(cardA);
        const rankB = getRankLevel(cardB);

        if (rankA !== rankB) {
            return rankB - rankA; // Higher levels first
        }

        return cardA.name.localeCompare(cardB.name);
    });
};

// Sort deck cards by type only
export const sortDeckCardsByType = (cards: DeckCardWithDetails[]): DeckCardWithDetails[] => {
    return [...cards].sort((a, b) => {
        const cardA = a.card_details;
        const cardB = b.card_details;

        if (!cardA || !cardB) {
            return a.cardId - b.cardId;
        }

        const typeAPriority = getTypePriority(cardA.type);
        const typeBPriority = getTypePriority(cardB.type);

        if (typeAPriority !== typeBPriority) {
            return typeAPriority - typeBPriority;
        }

        return cardA.name.localeCompare(cardB.name);
    });
};

// Export all sorting functions for deck cards
export const DECK_SORT_OPTIONS = {
    'type-rank-name': {
        label: 'Type → Level → Name',
        description: 'Group by card type (Effect Monster, Non-effect Monster, Spell, Trap), then by level/rank (highest first), then alphabetically',
        sortFunction: sortDeckCardsByTypeRankName
    },
    'name': {
        label: 'Name (A-Z)',
        description: 'Sort alphabetically by card name',
        sortFunction: sortDeckCardsByName
    },
    'type': {
        label: 'Type',
        description: 'Group by card type, then alphabetically',
        sortFunction: sortDeckCardsByType
    },
    'level': {
        label: 'Level/Rank',
        description: 'Sort by level/rank (highest first), then alphabetically',
        sortFunction: sortDeckCardsByLevel
    },
    'quantity': {
        label: 'Quantity',
        description: 'Sort by quantity (highest first)',
        sortFunction: sortDeckCardsByQuantity
    }
} as const;

export type DeckSortOption = keyof typeof DECK_SORT_OPTIONS;