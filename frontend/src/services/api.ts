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
 * Binder API services (placeholder for future implementation)
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
};

/**
 * Deck API services (placeholder for future implementation)
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
