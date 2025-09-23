import type { Binder, Deck, Card } from '../types';

// Storage keys for different data types
export const STORAGE_KEYS = {
    BINDERS: 'yugioh_binders',
    DECKS: 'yugioh_decks',
    CARDS_CACHE: 'yugioh_cards_cache',
    APP_CONFIG: 'yugioh_app_config',
    SYNC_STATUS: 'yugioh_sync_status',
    BACKUP_DATA: 'yugioh_backup',
} as const;

// Data versioning for migrations
export const DATA_VERSION = '1.0.0';

export interface AppConfig {
    version: string;
    lastSyncTime?: string;
    offlineMode: boolean;
    autoBackup: boolean;
    maxBackups: number;
    favoriteBanlistId?: string;
}

export interface SyncStatus {
    lastSync: string;
    pendingChanges: {
        binders: string[];
        decks: string[];
    };
    conflicts: Array<{
        type: 'binder' | 'deck';
        id: string;
        localModified: string;
        remoteModified: string;
    }>;
}

export interface BackupData {
    version: string;
    timestamp: string;
    data: {
        binders: Binder[];
        decks: Deck[];
        config: AppConfig;
    };
}

/**
 * Enhanced storage service with offline capabilities and data management
 */
export class StorageService {
    private static instance: StorageService;
    private config: AppConfig;
    private syncStatus: SyncStatus;

    private constructor() {
        this.config = this.loadConfig();
        this.syncStatus = this.loadSyncStatus();
        this.initializeStorage();
    }

    public static getInstance(): StorageService {
        if (!StorageService.instance) {
            StorageService.instance = new StorageService();
        }
        return StorageService.instance;
    }

    /**
     * Initialize storage and perform any necessary migrations
     */
    private initializeStorage(): void {
        // Check if this is a first-time setup
        const existingConfig = localStorage.getItem(STORAGE_KEYS.APP_CONFIG);
        if (!existingConfig) {
            this.config = {
                version: DATA_VERSION,
                offlineMode: false,
                autoBackup: true,
                maxBackups: 5,
            };
            this.saveConfig();
        }

        // Perform any necessary data migrations
        this.performMigrations();
    }

    /**
     * Load application configuration
     */
    private loadConfig(): AppConfig {
        try {
            const configStr = localStorage.getItem(STORAGE_KEYS.APP_CONFIG);
            if (configStr) {
                return JSON.parse(configStr);
            }
        } catch (error) {
            console.error('Error loading config:', error);
        }

        return {
            version: DATA_VERSION,
            offlineMode: false,
            autoBackup: true,
            maxBackups: 5,
        };
    }

    /**
     * Save application configuration
     */
    private saveConfig(): void {
        try {
            localStorage.setItem(STORAGE_KEYS.APP_CONFIG, JSON.stringify(this.config));
        } catch (error) {
            console.error('Error saving config:', error);
        }
    }

    /**
     * Load sync status
     */
    private loadSyncStatus(): SyncStatus {
        try {
            const statusStr = localStorage.getItem(STORAGE_KEYS.SYNC_STATUS);
            if (statusStr) {
                return JSON.parse(statusStr);
            }
        } catch (error) {
            console.error('Error loading sync status:', error);
        }

        return {
            lastSync: '',
            pendingChanges: { binders: [], decks: [] },
            conflicts: [],
        };
    }

    /**
     * Save sync status
     */
    private saveSyncStatus(): void {
        try {
            localStorage.setItem(STORAGE_KEYS.SYNC_STATUS, JSON.stringify(this.syncStatus));
        } catch (error) {
            console.error('Error saving sync status:', error);
        }
    }

    /**
     * Perform data migrations when needed
     */
    private performMigrations(): void {
        const currentVersion = this.config.version;
        if (currentVersion !== DATA_VERSION) {
            console.log(`Migrating data from version ${currentVersion} to ${DATA_VERSION}`);
            // Add migration logic here when needed
            this.config.version = DATA_VERSION;
            this.saveConfig();
        }
    }

    // === Binder Operations ===

    /**
     * Get all binders from local storage
     */
    public getBinders(): Binder[] {
        try {
            const bindersStr = localStorage.getItem(STORAGE_KEYS.BINDERS);
            return bindersStr ? JSON.parse(bindersStr) : [];
        } catch (error) {
            console.error('Error loading binders:', error);
            return [];
        }
    }

    /**
     * Get a specific binder by ID
     */
    public getBinder(id: string): Binder | null {
        const binders = this.getBinders();
        return binders.find(binder => binder.id === id) || null;
    }

    /**
     * Save a binder to local storage
     */
    public saveBinder(binder: Binder): void {
        try {
            const binders = this.getBinders();
            const existingIndex = binders.findIndex(b => b.id === binder.id);

            // Update modified timestamp
            binder.modifiedAt = new Date();

            if (existingIndex >= 0) {
                binders[existingIndex] = binder;
            } else {
                binders.push(binder);
            }

            localStorage.setItem(STORAGE_KEYS.BINDERS, JSON.stringify(binders));

            // Track pending changes for sync
            this.markForSync('binder', binder.id);

            // Auto-backup if enabled
            if (this.config.autoBackup) {
                this.createBackup();
            }
        } catch (error) {
            console.error('Error saving binder:', error);
            throw new Error('Failed to save binder to local storage');
        }
    }

    /**
     * Set a binder as favorite (only one binder can be favorite at a time)
     */
    public setFavoriteBinder(binderId: string): void {
        try {
            const binders = this.getBinders();

            // Remove favorite status from all binders
            binders.forEach(binder => {
                binder.isFavorite = false;
            });

            // Set the specified binder as favorite
            const targetBinder = binders.find(b => b.id === binderId);
            if (targetBinder) {
                targetBinder.isFavorite = true;
                targetBinder.modifiedAt = new Date();
            }

            localStorage.setItem(STORAGE_KEYS.BINDERS, JSON.stringify(binders));

            // Track pending changes for sync
            this.markForSync('binder', binderId);

            // Auto-backup if enabled
            if (this.config.autoBackup) {
                this.createBackup();
            }
        } catch (error) {
            console.error('Error setting favorite binder:', error);
            throw new Error('Failed to set favorite binder');
        }
    }

    /**
     * Remove favorite status from a binder
     */
    public removeFavoriteBinder(binderId: string): void {
        try {
            const binders = this.getBinders();
            const targetBinder = binders.find(b => b.id === binderId);

            if (targetBinder) {
                targetBinder.isFavorite = false;
                targetBinder.modifiedAt = new Date();
                localStorage.setItem(STORAGE_KEYS.BINDERS, JSON.stringify(binders));

                // Track pending changes for sync
                this.markForSync('binder', binderId);

                // Auto-backup if enabled
                if (this.config.autoBackup) {
                    this.createBackup();
                }
            }
        } catch (error) {
            console.error('Error removing favorite binder:', error);
            throw new Error('Failed to remove favorite binder');
        }
    }

    /**
     * Get the current favorite binder
     */
    public getFavoriteBinder(): Binder | null {
        const binders = this.getBinders();
        return binders.find(binder => binder.isFavorite === true) || null;
    }

    /**
     * Delete a binder from local storage
     */
    public deleteBinder(id: string): void {
        try {
            const binders = this.getBinders();
            const filteredBinders = binders.filter(binder => binder.id !== id);
            localStorage.setItem(STORAGE_KEYS.BINDERS, JSON.stringify(filteredBinders));

            // Remove from pending changes
            this.syncStatus.pendingChanges.binders = this.syncStatus.pendingChanges.binders.filter(binderId => binderId !== id);
            this.saveSyncStatus();
        } catch (error) {
            console.error('Error deleting binder:', error);
            throw new Error('Failed to delete binder from local storage');
        }
    }

    // === Banlist Operations ===

    /**
     * Set a banlist as favorite
     */
    public setFavoriteBanlist(banlistId: string): void {
        try {
            this.config.favoriteBanlistId = banlistId;
            this.saveConfig();

            // Auto-backup if enabled
            if (this.config.autoBackup) {
                this.createBackup();
            }
        } catch (error) {
            console.error('Error setting favorite banlist:', error);
            throw new Error('Failed to set favorite banlist');
        }
    }

    /**
     * Get the current favorite banlist ID
     */
    public getFavoriteBanlistId(): string | null {
        return this.config.favoriteBanlistId || null;
    }

    /**
     * Remove favorite status from banlist
     */
    public removeFavoriteBanlist(): void {
        try {
            this.config.favoriteBanlistId = undefined;
            this.saveConfig();

            // Auto-backup if enabled
            if (this.config.autoBackup) {
                this.createBackup();
            }
        } catch (error) {
            console.error('Error removing favorite banlist:', error);
            throw new Error('Failed to remove favorite banlist');
        }
    }

    // === Deck Operations ===

    /**
     * Get all decks from local storage
     */
    public getDecks(): Deck[] {
        try {
            const decksStr = localStorage.getItem(STORAGE_KEYS.DECKS);
            return decksStr ? JSON.parse(decksStr) : [];
        } catch (error) {
            console.error('Error loading decks:', error);
            return [];
        }
    }

    /**
     * Get a specific deck by ID
     */
    public getDeck(id: string): Deck | null {
        const decks = this.getDecks();
        return decks.find(deck => deck.id === id) || null;
    }

    /**
     * Save a deck to local storage
     */
    public saveDeck(deck: Deck): void {
        try {
            const decks = this.getDecks();
            const existingIndex = decks.findIndex(d => d.id === deck.id);

            // Update modified timestamp
            deck.modifiedAt = new Date();

            if (existingIndex >= 0) {
                decks[existingIndex] = deck;
            } else {
                decks.push(deck);
            }

            localStorage.setItem(STORAGE_KEYS.DECKS, JSON.stringify(decks));

            // Track pending changes for sync
            this.markForSync('deck', deck.id);

            // Auto-backup if enabled
            if (this.config.autoBackup) {
                this.createBackup();
            }
        } catch (error) {
            console.error('Error saving deck:', error);
            throw new Error('Failed to save deck to local storage');
        }
    }

    /**
     * Delete a deck from local storage
     */
    public deleteDeck(id: string): void {
        try {
            const decks = this.getDecks();
            const filteredDecks = decks.filter(deck => deck.id !== id);
            localStorage.setItem(STORAGE_KEYS.DECKS, JSON.stringify(filteredDecks));

            // Remove from pending changes
            this.syncStatus.pendingChanges.decks = this.syncStatus.pendingChanges.decks.filter(deckId => deckId !== id);
            this.saveSyncStatus();
        } catch (error) {
            console.error('Error deleting deck:', error);
            throw new Error('Failed to delete deck from local storage');
        }
    }

    // === Card Cache Operations ===

    /**
     * Get cached card data
     */
    public getCachedCard(cardId: number): Card | null {
        try {
            const cacheStr = localStorage.getItem(STORAGE_KEYS.CARDS_CACHE);
            if (cacheStr) {
                const cache = JSON.parse(cacheStr);
                return cache[cardId] || null;
            }
        } catch (error) {
            console.error('Error reading card cache:', error);
        }
        return null;
    }

    /**
     * Cache card data
     */
    public cacheCard(card: Card): void {
        try {
            const cacheStr = localStorage.getItem(STORAGE_KEYS.CARDS_CACHE);
            const cache = cacheStr ? JSON.parse(cacheStr) : {};
            cache[card.id] = {
                ...card,
                cachedAt: new Date().toISOString(),
            };
            localStorage.setItem(STORAGE_KEYS.CARDS_CACHE, JSON.stringify(cache));
        } catch (error) {
            console.error('Error caching card:', error);
        }
    }

    /**
     * Clear card cache
     */
    public clearCardCache(): void {
        try {
            localStorage.removeItem(STORAGE_KEYS.CARDS_CACHE);
        } catch (error) {
            console.error('Error clearing card cache:', error);
        }
    }

    // === Sync Management ===

    /**
     * Mark an item for synchronization
     */
    private markForSync(type: 'binder' | 'deck', id: string): void {
        if (type === 'binder') {
            if (!this.syncStatus.pendingChanges.binders.includes(id)) {
                this.syncStatus.pendingChanges.binders.push(id);
            }
        } else {
            if (!this.syncStatus.pendingChanges.decks.includes(id)) {
                this.syncStatus.pendingChanges.decks.push(id);
            }
        }
        this.saveSyncStatus();
    }

    /**
     * Get pending changes for sync
     */
    public getPendingChanges(): SyncStatus['pendingChanges'] {
        return this.syncStatus.pendingChanges;
    }

    /**
     * Clear pending changes after successful sync
     */
    public clearPendingChanges(): void {
        this.syncStatus.pendingChanges = { binders: [], decks: [] };
        this.syncStatus.lastSync = new Date().toISOString();
        this.saveSyncStatus();
    }

    /**
     * Add conflict for manual resolution
     */
    public addConflict(type: 'binder' | 'deck', id: string, localModified: string, remoteModified: string): void {
        this.syncStatus.conflicts.push({
            type,
            id,
            localModified,
            remoteModified,
        });
        this.saveSyncStatus();
    }

    /**
     * Get current conflicts
     */
    public getConflicts(): SyncStatus['conflicts'] {
        return this.syncStatus.conflicts;
    }

    /**
     * Resolve a conflict
     */
    public resolveConflict(conflictIndex: number): void {
        this.syncStatus.conflicts.splice(conflictIndex, 1);
        this.saveSyncStatus();
    }

    // === Configuration ===

    /**
     * Get current configuration
     */
    public getConfig(): AppConfig {
        return { ...this.config };
    }

    /**
     * Update configuration
     */
    public updateConfig(updates: Partial<AppConfig>): void {
        this.config = { ...this.config, ...updates };
        this.saveConfig();
    }

    /**
     * Enable/disable offline mode
     */
    public setOfflineMode(enabled: boolean): void {
        this.config.offlineMode = enabled;
        this.saveConfig();
    }

    /**
     * Check if app is in offline mode
     */
    public isOfflineMode(): boolean {
        return this.config.offlineMode;
    }

    // === Storage Management ===

    /**
     * Get storage usage information
     */
    public getStorageInfo(): {
        used: number;
        available: number;
        usage: {
            binders: number;
            decks: number;
            cache: number;
            config: number;
            backups: number;
        };
    } {
        const getItemSize = (key: string): number => {
            const item = localStorage.getItem(key);
            return item ? new Blob([item]).size : 0;
        };

        const usage = {
            binders: getItemSize(STORAGE_KEYS.BINDERS),
            decks: getItemSize(STORAGE_KEYS.DECKS),
            cache: getItemSize(STORAGE_KEYS.CARDS_CACHE),
            config: getItemSize(STORAGE_KEYS.APP_CONFIG),
            backups: getItemSize(STORAGE_KEYS.BACKUP_DATA),
        };

        const used = Object.values(usage).reduce((total, size) => total + size, 0);

        // Estimate available storage (5MB is typical localStorage limit)
        const estimated_limit = 5 * 1024 * 1024;
        const available = Math.max(0, estimated_limit - used);

        return { used, available, usage };
    }

    /**
     * Clear all application data
     */
    public clearAllData(): void {
        try {
            Object.values(STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });

            // Reinitialize
            this.config = {
                version: DATA_VERSION,
                offlineMode: false,
                autoBackup: true,
                maxBackups: 5,
            };
            this.syncStatus = {
                lastSync: '',
                pendingChanges: { binders: [], decks: [] },
                conflicts: [],
            };
            this.saveConfig();
            this.saveSyncStatus();
        } catch (error) {
            console.error('Error clearing data:', error);
            throw new Error('Failed to clear application data');
        }
    }

    // === Backup Operations ===

    /**
     * Create a backup of all user data
     */
    public createBackup(): BackupData {
        const backup: BackupData = {
            version: DATA_VERSION,
            timestamp: new Date().toISOString(),
            data: {
                binders: this.getBinders(),
                decks: this.getDecks(),
                config: this.config,
            },
        };

        try {
            // Save as latest backup
            localStorage.setItem(STORAGE_KEYS.BACKUP_DATA, JSON.stringify(backup));

            // Manage backup rotation
            this.rotateBackups();

            return backup;
        } catch (error) {
            console.error('Error creating backup:', error);
            throw new Error('Failed to create backup');
        }
    }

    /**
     * Rotate backups to maintain maximum count
     */
    private rotateBackups(): void {
        // For now, we just keep the latest backup
        // In a more advanced implementation, we could keep multiple timestamped backups
    }

    /**
     * Get the latest backup
     */
    public getLatestBackup(): BackupData | null {
        try {
            const backupStr = localStorage.getItem(STORAGE_KEYS.BACKUP_DATA);
            return backupStr ? JSON.parse(backupStr) : null;
        } catch (error) {
            console.error('Error loading backup:', error);
            return null;
        }
    }
}

// Export singleton instance
export const storageService = StorageService.getInstance();