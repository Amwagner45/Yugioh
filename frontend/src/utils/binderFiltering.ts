import type { Card, BinderCard } from '../types';
import type { BinderFilterOptions, BinderSortOption } from '../components/binder/BinderFilters';

export interface ExtendedBinderCard extends BinderCard {
    card?: Card;
}

/**
 * Filter cards based on the provided filter options
 */
export function filterBinderCards(
    cards: ExtendedBinderCard[],
    filters: BinderFilterOptions
): ExtendedBinderCard[] {
    return cards.filter((binderCard) => {
        const { card } = binderCard;
        if (!card) return false; // Skip cards that haven't loaded yet

        // Search term filter (name and description)
        if (filters.searchTerm.trim()) {
            const searchTerm = filters.searchTerm.toLowerCase();
            const matchesName = card.name.toLowerCase().includes(searchTerm);
            const matchesDescription = card.desc?.toLowerCase().includes(searchTerm);
            if (!matchesName && !matchesDescription) return false;
        }

        // Card type filter
        if (filters.cardType && card.type !== filters.cardType) {
            return false;
        }

        // Attribute filter
        if (filters.attribute && card.attribute !== filters.attribute) {
            return false;
        }

        // Race filter
        if (filters.race && card.race !== filters.race) {
            return false;
        }

        // Level filter
        if (filters.level && card.level?.toString() !== filters.level) {
            return false;
        }

        // ATK range filter
        if (filters.atkRange.min && card.atk !== undefined) {
            if (card.atk < parseInt(filters.atkRange.min)) return false;
        }
        if (filters.atkRange.max && card.atk !== undefined) {
            if (card.atk > parseInt(filters.atkRange.max)) return false;
        }

        // DEF range filter
        if (filters.defRange.min && card.def !== undefined) {
            if (card.def < parseInt(filters.defRange.min)) return false;
        }
        if (filters.defRange.max && card.def !== undefined) {
            if (card.def > parseInt(filters.defRange.max)) return false;
        }

        // Rarity filter
        if (filters.rarity && card.card_sets) {
            const hasRarity = card.card_sets.some(set => set.set_rarity === filters.rarity);
            if (!hasRarity) return false;
        }

        // Set code filter
        if (filters.setCode && card.card_sets) {
            const hasSetCode = card.card_sets.some(set => set.set_code === filters.setCode);
            if (!hasSetCode) return false;
        }

        // Tags filter
        if (filters.tags.length > 0) {
            const cardTags = binderCard.tags || [];
            const hasMatchingTag = filters.tags.some(tag => cardTags.includes(tag));
            if (!hasMatchingTag) return false;
        }

        return true;
    });
}

/**
 * Sort cards based on the provided sort option
 */
export function sortBinderCards(
    cards: ExtendedBinderCard[],
    sortOption: BinderSortOption
): ExtendedBinderCard[] {
    return [...cards].sort((a, b) => {
        const { field, direction } = sortOption;
        const multiplier = direction === 'asc' ? 1 : -1;

        // Handle quantity sorting (binder-specific)
        if (field === 'quantity') {
            return (a.quantity - b.quantity) * multiplier;
        }

        // Handle dateAdded sorting (when implemented)
        if (field === 'dateAdded') {
            // For now, we'll use a placeholder - could be based on when card was added
            return 0; // Placeholder
        }

        // Handle card-based sorting
        if (!a.card || !b.card) {
            return 0; // Don't change order if card data is missing
        }

        const cardA = a.card;
        const cardB = b.card;

        switch (field) {
            case 'name':
                return cardA.name.localeCompare(cardB.name) * multiplier;

            case 'type':
                return cardA.type.localeCompare(cardB.type) * multiplier;

            case 'attribute':
                const attrA = cardA.attribute || '';
                const attrB = cardB.attribute || '';
                return attrA.localeCompare(attrB) * multiplier;

            case 'level':
                const levelA = cardA.level || 0;
                const levelB = cardB.level || 0;
                return (levelA - levelB) * multiplier;

            case 'atk':
                const atkA = cardA.atk ?? -1;
                const atkB = cardB.atk ?? -1;
                return (atkA - atkB) * multiplier;

            case 'def':
                const defA = cardA.def ?? -1;
                const defB = cardB.def ?? -1;
                return (defA - defB) * multiplier;

            case 'rarity':
                // Sort by highest rarity in card sets
                const rarityA = getHighestRarity(cardA);
                const rarityB = getHighestRarity(cardB);
                return rarityA.localeCompare(rarityB) * multiplier;

            default:
                return 0;
        }
    });
}

/**
 * Get default filter options
 */
export function getDefaultBinderFilters(): BinderFilterOptions {
    return {
        searchTerm: '',
        cardType: '',
        attribute: '',
        race: '',
        level: '',
        atkRange: { min: '', max: '' },
        defRange: { min: '', max: '' },
        rarity: '',
        setCode: '',
        tags: [],
    };
}

/**
 * Get default sort option
 */
export function getDefaultBinderSort(): BinderSortOption {
    return {
        field: 'name',
        direction: 'asc',
    };
}

/**
 * Helper function to get the highest rarity from a card's sets
 */
function getHighestRarity(card: Card): string {
    if (!card.card_sets || card.card_sets.length === 0) {
        return 'Unknown';
    }

    // Define rarity hierarchy (higher index = higher rarity)
    const rarityHierarchy = [
        'Common',
        'Rare',
        'Super Rare',
        'Ultra Rare',
        'Secret Rare',
        'Ultimate Rare',
        'Ghost Rare',
        'Starlight Rare',
        'Collector\'s Rare',
        'Prismatic Secret Rare',
    ];

    let highestRarity = 'Common';
    let highestIndex = -1;

    for (const set of card.card_sets) {
        const index = rarityHierarchy.indexOf(set.set_rarity);
        if (index > highestIndex) {
            highestIndex = index;
            highestRarity = set.set_rarity;
        }
    }

    return highestRarity;
}

/**
 * Helper function to count active filters
 */
export function countActiveFilters(filters: BinderFilterOptions): number {
    let count = 0;
    if (filters.searchTerm.trim()) count++;
    if (filters.cardType) count++;
    if (filters.attribute) count++;
    if (filters.race) count++;
    if (filters.level) count++;
    if (filters.atkRange.min || filters.atkRange.max) count++;
    if (filters.defRange.min || filters.defRange.max) count++;
    if (filters.rarity) count++;
    if (filters.setCode) count++;
    if (filters.tags.length > 0) count++;
    return count;
}

/**
 * Filter and sort binder cards in one operation
 */
export function filterAndSortBinderCards(
    cards: ExtendedBinderCard[],
    filters: BinderFilterOptions,
    sortOption: BinderSortOption
): ExtendedBinderCard[] {
    const filtered = filterBinderCards(cards, filters);
    return sortBinderCards(filtered, sortOption);
}