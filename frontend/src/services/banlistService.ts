import axios from 'axios';
import type { Banlist, BanlistValidationResult, Deck } from '../types';

// Base API URL - will be configurable via environment variables
const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:8000';

// Create axios instance for banlist operations
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

export interface BanlistCreateData {
    name: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    format_type?: string;
    is_official?: boolean;
    forbidden_cards?: number[];
    limited_cards?: number[];
    semi_limited_cards?: number[];
    whitelist_cards?: number[];
}

export interface BanlistUpdateData extends Partial<BanlistCreateData> {}

class BanlistService {
    private baseUrl = '/api/banlists';

    /**
     * Get all banlists
     */
    async getAll(includeInactive: boolean = false): Promise<{ banlists: Banlist[]; count: number }> {
        const response = await apiClient.get(`${this.baseUrl}?include_inactive=${includeInactive}`);
        return response.data;
    }

    /**
     * Get banlist by ID or UUID
     */
    async getById(banlistId: string): Promise<Banlist> {
        const response = await apiClient.get(`${this.baseUrl}/${banlistId}`);
        return response.data;
    }

    /**
     * Create a new banlist
     */
    async create(data: BanlistCreateData): Promise<Banlist> {
        const response = await apiClient.post(this.baseUrl, data);
        return response.data;
    }

    /**
     * Update an existing banlist
     */
    async update(banlistId: string, data: BanlistUpdateData): Promise<Banlist> {
        const response = await apiClient.put(`${this.baseUrl}/${banlistId}`, data);
        return response.data;
    }

    /**
     * Delete a banlist
     */
    async delete(banlistId: string): Promise<{ message: string }> {
        const response = await apiClient.delete(`${this.baseUrl}/${banlistId}`);
        return response.data;
    }

    /**
     * Add a card to a banlist with specified restriction
     */
    async addCard(banlistId: string, cardId: number, restrictionType: string): Promise<{ message: string }> {
        const formData = new FormData();
        formData.append('restriction_type', restrictionType);

        const response = await apiClient.post(`${this.baseUrl}/${banlistId}/cards/${cardId}`, formData);
        return response.data;
    }

    /**
     * Remove a card from all restriction lists in a banlist
     */
    async removeCard(banlistId: string, cardId: number): Promise<{ message: string }> {
        const response = await apiClient.delete(`${this.baseUrl}/${banlistId}/cards/${cardId}`);
        return response.data;
    }

    /**
     * Get restriction level for a specific card in a banlist
     */
    async getCardRestriction(banlistId: string, cardId: number): Promise<{
        card_id: number;
        restriction: string;
        max_copies: number;
    }> {
        const response = await apiClient.get(`${this.baseUrl}/${banlistId}/cards/${cardId}/restriction`);
        return response.data;
    }

    /**
     * Import banlist from .lflist.conf file
     */
    async importFromFile(file: File): Promise<{ message: string; banlist: Banlist }> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await apiClient.post(`${this.baseUrl}/import/lflist`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }

    /**
     * Export banlist to .lflist.conf file
     */
    async exportToFile(banlistId: string): Promise<Blob> {
        const response = await apiClient.get(`${this.baseUrl}/${banlistId}/export/lflist`, {
            responseType: 'blob',
        });
        return response.data;
    }

    /**
     * Validate a deck against a banlist
     */
    async validateDeck(banlistId: string, deck: Deck): Promise<BanlistValidationResult> {
        const response = await apiClient.post(`${this.baseUrl}/${banlistId}/validate-deck`, deck);
        return response.data;
    }

    /**
     * Download exported banlist file
     */
    async downloadExport(banlistId: string, filename?: string): Promise<void> {
        try {
            const blob = await this.exportToFile(banlistId);
            
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename || `banlist_${banlistId}.lflist.conf`;
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            
            // Cleanup
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading banlist:', error);
            throw error;
        }
    }

    /**
     * Create a copy of an existing banlist
     */
    async duplicate(banlistId: string, newName?: string): Promise<Banlist> {
        const originalBanlist = await this.getById(banlistId);
        
        const duplicateData: BanlistCreateData = {
            name: newName || `${originalBanlist.name} (Copy)`,
            description: originalBanlist.description,
            format_type: originalBanlist.format_type,
            is_official: false, // Copies are never official
            forbidden_cards: [...originalBanlist.forbidden_cards],
            limited_cards: [...originalBanlist.limited_cards],
            semi_limited_cards: [...originalBanlist.semi_limited_cards],
            whitelist_cards: [...originalBanlist.whitelist_cards],
        };

        return this.create(duplicateData);
    }

    /**
     * Get banlist statistics
     */
    getBanlistStats(banlist: Banlist): {
        totalCards: number;
        forbiddenCount: number;
        limitedCount: number;
        semiLimitedCount: number;
        whitelistCount: number;
    } {
        return {
            totalCards: banlist.forbidden_cards.length + banlist.limited_cards.length + 
                       banlist.semi_limited_cards.length + banlist.whitelist_cards.length,
            forbiddenCount: banlist.forbidden_cards.length,
            limitedCount: banlist.limited_cards.length,
            semiLimitedCount: banlist.semi_limited_cards.length,
            whitelistCount: banlist.whitelist_cards.length,
        };
    }

    /**
     * Get card restriction in a banlist
     */
    getCardRestrictionLocal(banlist: Banlist, cardId: number): {
        restriction: 'forbidden' | 'limited' | 'semi_limited' | 'whitelist' | 'unlimited';
        maxCopies: number;
    } {
        if (banlist.forbidden_cards.includes(cardId)) {
            return { restriction: 'forbidden', maxCopies: 0 };
        } else if (banlist.limited_cards.includes(cardId)) {
            return { restriction: 'limited', maxCopies: 1 };
        } else if (banlist.semi_limited_cards.includes(cardId)) {
            return { restriction: 'semi_limited', maxCopies: 2 };
        } else if (banlist.whitelist_cards.includes(cardId)) {
            return { restriction: 'whitelist', maxCopies: 3 };
        } else {
            return { restriction: 'unlimited', maxCopies: 3 };
        }
    }

    /**
     * Validate deck against banlist locally (without API call)
     */
    validateDeckLocal(banlist: Banlist, deck: Deck): BanlistValidationResult {
        const violations = [];
        let isValid = true;

        // Combine all deck cards
        const allCards = [
            ...deck.mainDeck,
            ...deck.extraDeck,
            ...deck.sideDeck,
        ];

        // Group cards by ID and sum quantities
        const cardTotals: { [cardId: number]: number } = {};
        for (const card of allCards) {
            cardTotals[card.cardId] = (cardTotals[card.cardId] || 0) + card.quantity;
        }

        // Check each card against banlist
        for (const [cardIdStr, totalQuantity] of Object.entries(cardTotals)) {
            const cardId = parseInt(cardIdStr);
            const { restriction, maxCopies } = this.getCardRestrictionLocal(banlist, cardId);
            
            if (totalQuantity > maxCopies) {
                isValid = false;
                violations.push({
                    card_id: cardId,
                    card_name: `Card ID ${cardId}`, // Would need to fetch card name
                    current_quantity: totalQuantity,
                    max_allowed: maxCopies,
                    restriction,
                });
            }
        }

        return {
            is_valid: isValid,
            violations,
            banlist_name: banlist.name,
        };
    }
}

export const banlistService = new BanlistService();