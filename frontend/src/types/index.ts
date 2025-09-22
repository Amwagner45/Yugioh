// Core data types for the Yu-Gi-Oh Deck Builder

export interface Card {
    id: number;
    name: string;
    type: string;
    desc: string;
    atk?: number;
    def?: number;
    level?: number;
    race?: string;
    attribute?: string;
    card_images?: CardImage[];
    card_sets?: CardSet[];
    banlist_info?: BanlistInfo;
}

export interface CardImage {
    id: number;
    image_url: string;
    image_url_small: string;
    image_url_cropped?: string;
}

export interface CardSet {
    set_name: string;
    set_code: string;
    set_rarity: string;
    set_rarity_code: string;
    set_price: string;
}

export interface BanlistInfo {
    ban_tcg?: string;
    ban_ocg?: string;
    ban_goat?: string;
}

export interface BinderCard {
    cardId: number;
    quantity: number;
    setCode?: string;
    rarity?: string;
    condition?: string;
    notes?: string;
}

export interface Binder {
    id: string;
    name: string;
    description?: string;
    cards: BinderCard[];
    createdAt: Date;
    modifiedAt: Date;
    tags?: string[];
}

export interface DeckCard {
    cardId: number;
    quantity: number;
}

export interface Deck {
    id: string;
    name: string;
    description?: string;
    format?: string;
    mainDeck: DeckCard[];
    extraDeck: DeckCard[];
    sideDeck: DeckCard[];
    tags?: string[];
    notes?: string;
    createdAt: Date;
    modifiedAt: Date;
}

export interface CardSearchParams {
    name?: string;
    type?: string;
    race?: string;
    attribute?: string;
    level?: number;
    atk?: number;
    def?: number;
    limit?: number;
}

export interface CardSearchResponse {
    data: Card[];
    count: number;
    error?: string;
}

// UI State types
export interface FilterState {
    searchTerm: string;
    selectedTypes: string[];
    selectedAttributes: string[];
    selectedRaces: string[];
    levelRange: [number, number];
    atkRange: [number, number];
    defRange: [number, number];
}

export interface SortOption {
    field: keyof Card;
    direction: 'asc' | 'desc';
}

export interface ViewMode {
    type: 'grid' | 'list';
    cardSize: 'small' | 'medium' | 'large';
}
