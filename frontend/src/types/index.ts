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
    archetype?: string;
    scale?: number;
    linkval?: number;
    linkmarkers?: string[];
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
    edition?: string;  // New field for card edition
    notes?: string;
    tags?: string[];
    dateAdded?: Date;
    card_details?: Card;  // Full card details when included from API
}

export interface Binder {
    id: string;        // String ID for local binders (UUID for API calls)
    uuid?: string;     // UUID for API calls (optional for backward compatibility)
    name: string;
    description?: string;
    cards: BinderCard[];
    createdAt: Date;
    modifiedAt: Date;
    tags?: string[];
    is_default?: boolean;
    card_count?: number;
    total_quantity?: number;
    isFavorite?: boolean;
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
    atk_min?: number;
    atk_max?: number;
    def?: number;
    def_min?: number;
    def_max?: number;
    archetype?: string;
    banlist?: string;
    format?: string;
    sort?: string;
    order?: string;
    cardset?: string;
    rarity?: string;
    description?: string;
    fuzzy?: boolean;
    limit?: number;
    offset?: number;
}

export interface CardSearchResponse {
    data: Card[];
    count: number;
    total?: number; // Total number of results before pagination
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

// Banlist types
export interface Banlist {
    id: string;
    uuid: string;
    name: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    format_type: string;
    is_official: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    forbidden_cards: number[];
    limited_cards: number[];
    semi_limited_cards: number[];
    whitelist_cards: number[];
}

export interface BanlistCard {
    cardId: number;
    restriction: 'forbidden' | 'limited' | 'semi_limited' | 'whitelist' | 'unlimited';
    maxCopies: number;
}

export interface BanlistValidationResult {
    is_valid: boolean;
    violations: BanlistViolation[];
    banlist_name: string;
}

export interface BanlistViolation {
    card_id: number;
    card_name: string;
    current_quantity: number;
    max_allowed: number;
    restriction: string;
}

export interface BanlistSection {
    title: string;
    type: 'forbidden' | 'limited' | 'semi_limited' | 'whitelist';
    cards: number[];
    maxCopies: number;
    color: string;
    bgColor: string;
    borderColor: string;
}
