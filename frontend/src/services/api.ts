import axios from 'axios';
import type { Card, CardSearchParams, CardSearchResponse } from '../types';

// Base API URL - will be configurable via environment variables
const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:8000';

// Create axios instance with default configuration
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add request interceptor for debugging
api.interceptors.request.use(
    (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
    },
    (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
    }
);

// Add response interceptor for error handling
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        console.error('API Response Error:', error);
        return Promise.reject(error);
    }
);

/**
 * Card API services
 */
export const cardService = {
    /**
     * Search for cards with optional filters
     */
    async searchCards(params: CardSearchParams): Promise<CardSearchResponse> {
        try {
            const response = await api.get('/api/cards/search', { params });
            return response.data;
        } catch (error) {
            console.error('Error searching cards:', error);
            return {
                data: [],
                count: 0,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    },

    /**
     * Get a specific card by ID
     */
    async getCardById(cardId: number): Promise<Card | null> {
        try {
            const response = await api.get(`/api/cards/${cardId}`);
            return response.data.data;
        } catch (error) {
            console.error('Error fetching card:', error);
            return null;
        }
    },

    /**
     * Get multiple cards by their IDs in a single batch request
     */
    async getCardsBatch(cardIds: number[]): Promise<{ data: Card[]; missing_cards: number[]; warning?: string }> {
        try {
            const response = await api.post('/api/cards/batch', cardIds);
            return response.data;
        } catch (error) {
            console.error('Error fetching cards batch:', error);
            return { data: [], missing_cards: cardIds };
        }
    },

    /**
     * Get random cards for testing/discovery
     */
    async getRandomCards(count = 10): Promise<CardSearchResponse> {
        try {
            const response = await api.get('/api/cards/random', { params: { count } });
            return response.data;
        } catch (error) {
            console.error('Error fetching random cards:', error);
            return {
                data: [],
                count: 0,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    },
};

/**
 * Binder API services
 */
export const binderService = {
    async getBinders() {
        try {
            const response = await api.get('/api/binders');
            return response.data;
        } catch (error) {
            console.error('Error fetching binders:', error);
            return { data: [], error: error instanceof Error ? error.message : 'Unknown error' };
        }
    },

    async createBinder(binder: Omit<import('../types').Binder, 'id' | 'cards' | 'createdAt' | 'modifiedAt'>) {
        try {
            const formData = new FormData();
            formData.append('name', binder.name);
            if (binder.description) formData.append('description', binder.description);
            if (binder.tags) formData.append('tags', binder.tags.join(','));

            const response = await api.post('/api/binders', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        } catch (error) {
            console.error('Error creating binder:', error);
            return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    },

    async updateBinder(uuid: string, binder: Partial<import('../types').Binder>) {
        try {
            const formData = new FormData();
            if (binder.name) formData.append('name', binder.name);
            if (binder.description) formData.append('description', binder.description);
            if (binder.tags) formData.append('tags', binder.tags.join(','));

            const response = await api.put(`/api/binders/${uuid}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        } catch (error) {
            console.error('Error updating binder:', error);
            return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    },

    async deleteBinder(uuid: string) {
        try {
            const response = await api.delete(`/api/binders/${uuid}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting binder:', error);
            return { error: error instanceof Error ? error.message : 'Unknown error' };
        }
    },

    async getBinder(uuid: string, includeCardDetails: boolean = true) {
        try {
            const params = includeCardDetails ? { include_card_details: 'true' } : {};
            const response = await api.get(`/api/binders/${uuid}`, { params });

            // Transform snake_case API response to camelCase for frontend
            const transformedData = {
                ...response.data,
                cards: response.data.cards?.map((card: any) => ({
                    cardId: card.card_id,
                    quantity: card.quantity,
                    setCode: card.set_code,
                    rarity: card.rarity,
                    condition: card.condition,
                    edition: card.edition,
                    notes: card.notes,
                    dateAdded: card.date_added ? new Date(card.date_added) : undefined,
                    card_details: card.card_details // This should already be in the right format
                })) || []
            };

            return transformedData;
        } catch (error) {
            console.error('Error fetching binder:', error);
            return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    },

    async importCSV(binderUuid: string, file: File, createNew: boolean = false, binderName?: string) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('create_new', createNew.toString());
            if (binderName) formData.append('binder_name', binderName);

            const response = await api.post(`/api/binders/${binderUuid}/import-csv`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        } catch (error) {
            console.error('Error importing CSV:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                errors: [],
                warnings: [],
            };
        }
    },

    async addCard(
        binderUuid: string,
        cardId: number,
        quantity: number = 1,
        setCode?: string,
        rarity?: string,
        condition: string = 'Near Mint',
        edition?: string,
        notes?: string
    ) {
        try {
            const formData = new FormData();
            formData.append('card_id', cardId.toString());
            formData.append('quantity', quantity.toString());
            formData.append('condition', condition);
            if (setCode) formData.append('set_code', setCode);
            if (rarity) formData.append('rarity', rarity);
            if (edition) formData.append('edition', edition);
            if (notes) formData.append('notes', notes);

            const response = await api.post(`/api/binders/${binderUuid}/cards`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        } catch (error) {
            console.error('Error adding card to binder:', error);
            return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    },

    async addCardToBinder(binderUuid: string, cardId: number, quantity: number = 1, setCode?: string, rarity?: string, condition?: string, edition?: string, notes?: string) {
        try {
            const cardData = {
                card_id: cardId,
                quantity: quantity,
                set_code: setCode,
                rarity: rarity,
                condition: condition,
                edition: edition,
                notes: notes
            };

            const response = await api.post(`/api/binders/${binderUuid}/cards`, cardData, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            return response.data;
        } catch (error) {
            console.error('Error adding card to binder:', error);
            return { error: error instanceof Error ? error.message : 'Unknown error' };
        }
    },
};

/**
 * Deck API services
 */
export const deckService = {
    async getDecks() {
        try {
            const response = await api.get('/api/decks');
            return response.data;
        } catch (error) {
            console.error('Error fetching decks:', error);
            return { data: [], error: error instanceof Error ? error.message : 'Unknown error' };
        }
    },

    async createDeck(deck: {
        name: string;
        description?: string;
        format?: string;
        binder_id?: number;
        tags?: string[];
        notes?: string;
    }) {
        try {
            const response = await api.post('/api/decks', deck, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            return response.data;
        } catch (error) {
            console.error('Error creating deck:', error);
            return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    },

    async getDeck(uuid: string) {
        try {
            const response = await api.get(`/api/decks/${uuid}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching deck:', error);
            return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    },

    async updateDeck(uuid: string, deck: {
        name?: string;
        description?: string;
        format?: string;
        binder_id?: number;
        tags?: string[];
        notes?: string;
    }) {
        try {
            const response = await api.put(`/api/decks/${uuid}`, deck, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            return response.data;
        } catch (error) {
            console.error('Error updating deck:', error);
            return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    },

    async deleteDeck(uuid: string) {
        try {
            const response = await api.delete(`/api/decks/${uuid}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting deck:', error);
            return { error: error instanceof Error ? error.message : 'Unknown error' };
        }
    },

    async addCardToDeck(deckUuid: string, cardId: number, quantity: number = 1, section: 'main' | 'extra' | 'side' = 'main') {
        try {
            const response = await api.post(`/api/decks/${deckUuid}/cards`, {
                card_id: cardId,
                quantity: quantity,
                section: section
            }, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            return response.data;
        } catch (error) {
            console.error('Error adding card to deck:', error);
            return { error: error instanceof Error ? error.message : 'Unknown error' };
        }
    },

    async removeCardFromDeck(deckUuid: string, cardId: number) {
        try {
            const response = await api.delete(`/api/decks/${deckUuid}/cards/${cardId}`);
            return response.data;
        } catch (error) {
            console.error('Error removing card from deck:', error);
            return { error: error instanceof Error ? error.message : 'Unknown error' };
        }
    },

    async validateDeck(deckUuid: string) {
        try {
            const response = await api.post(`/api/decks/${deckUuid}/validate`);
            return response.data;
        } catch (error) {
            console.error('Error validating deck:', error);
            return { error: error instanceof Error ? error.message : 'Unknown error' };
        }
    },
};

/**
 * Card Synchronization API services
 */
export const cardSyncService = {
    /**
     * Get current card sync status
     */
    async getSyncStatus() {
        try {
            const response = await api.get('/api/cards/sync/status');
            return response.data;
        } catch (error) {
            console.error('Error getting sync status:', error);
            throw error;
        }
    },

    /**
     * Start card synchronization (only if needed)
     */
    async startSync() {
        try {
            const response = await api.post('/api/cards/sync/start');
            return response.data;
        } catch (error) {
            console.error('Error starting sync:', error);
            throw error;
        }
    },

    /**
     * Force card synchronization (regardless of version)
     */
    async forceSync() {
        try {
            const response = await api.post('/api/cards/sync/force');
            return response.data;
        } catch (error) {
            console.error('Error forcing sync:', error);
            throw error;
        }
    },

    /**
     * Check YGOPRODeck API version
     */
    async checkApiVersion() {
        try {
            const response = await api.get('/api/cards/sync/version');
            return response.data;
        } catch (error) {
            console.error('Error checking API version:', error);
            throw error;
        }
    },
};

/**
 * Health check service
 */
export const healthService = {
    async checkHealth() {
        try {
            const response = await api.get('/health');
            return response.data;
        } catch (error) {
            console.error('Health check failed:', error);
            return { status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown error' };
        }
    },
};

export default api;
