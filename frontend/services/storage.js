"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageService = exports.StorageService = exports.DATA_VERSION = exports.STORAGE_KEYS = void 0;
// Storage keys for different data types
exports.STORAGE_KEYS = {
    BINDERS: 'yugioh_binders',
    DECKS: 'yugioh_decks',
    CARDS_CACHE: 'yugioh_cards_cache',
    APP_CONFIG: 'yugioh_app_config',
    SYNC_STATUS: 'yugioh_sync_status',
    BACKUP_DATA: 'yugioh_backup',
};
// Data versioning for migrations
exports.DATA_VERSION = '1.0.0';
/**
 * Enhanced storage service with offline capabilities and data management
 */
class StorageService {
    constructor() {
        this.config = this.loadConfig();
        this.syncStatus = this.loadSyncStatus();
        this.initializeStorage();
    }
    static getInstance() {
        if (!StorageService.instance) {
            StorageService.instance = new StorageService();
        }
        return StorageService.instance;
    }
    /**
     * Initialize storage and perform any necessary migrations
     */
    initializeStorage() {
        // Check if this is a first-time setup
        const existingConfig = localStorage.getItem(exports.STORAGE_KEYS.APP_CONFIG);
        if (!existingConfig) {
            this.config = {
                version: exports.DATA_VERSION,
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
    loadConfig() {
        try {
            const configStr = localStorage.getItem(exports.STORAGE_KEYS.APP_CONFIG);
            if (configStr) {
                return JSON.parse(configStr);
            }
        }
        catch (error) {
            console.error('Error loading config:', error);
        }
        return {
            version: exports.DATA_VERSION,
            offlineMode: false,
            autoBackup: true,
            maxBackups: 5,
        };
    }
    /**
     * Save application configuration
     */
    saveConfig() {
        try {
            localStorage.setItem(exports.STORAGE_KEYS.APP_CONFIG, JSON.stringify(this.config));
        }
        catch (error) {
            console.error('Error saving config:', error);
        }
    }
    /**
     * Load sync status
     */
    loadSyncStatus() {
        try {
            const statusStr = localStorage.getItem(exports.STORAGE_KEYS.SYNC_STATUS);
            if (statusStr) {
                return JSON.parse(statusStr);
            }
        }
        catch (error) {
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
    saveSyncStatus() {
        try {
            localStorage.setItem(exports.STORAGE_KEYS.SYNC_STATUS, JSON.stringify(this.syncStatus));
        }
        catch (error) {
            console.error('Error saving sync status:', error);
        }
    }
    /**
     * Perform data migrations when needed
     */
    performMigrations() {
        const currentVersion = this.config.version;
        if (currentVersion !== exports.DATA_VERSION) {
            console.log(`Migrating data from version ${currentVersion} to ${exports.DATA_VERSION}`);
            // Add migration logic here when needed
            this.config.version = exports.DATA_VERSION;
            this.saveConfig();
        }
    }
    // === Binder Operations ===
    /**
     * Get all binders from local storage
     */
    getBinders() {
        try {
            const bindersStr = localStorage.getItem(exports.STORAGE_KEYS.BINDERS);
            return bindersStr ? JSON.parse(bindersStr) : [];
        }
        catch (error) {
            console.error('Error loading binders:', error);
            return [];
        }
    }
    /**
     * Get a specific binder by ID
     */
    getBinder(id) {
        const binders = this.getBinders();
        return binders.find(binder => binder.id === id) || null;
    }
    /**
     * Save a binder to local storage
     */
    saveBinder(binder) {
        try {
            const binders = this.getBinders();
            const existingIndex = binders.findIndex(b => b.id === binder.id);
            // Update modified timestamp
            binder.modifiedAt = new Date();
            if (existingIndex >= 0) {
                binders[existingIndex] = binder;
            }
            else {
                binders.push(binder);
            }
            localStorage.setItem(exports.STORAGE_KEYS.BINDERS, JSON.stringify(binders));
            // Track pending changes for sync
            this.markForSync('binder', binder.id);
            // Auto-backup if enabled
            if (this.config.autoBackup) {
                this.createBackup();
            }
        }
        catch (error) {
            console.error('Error saving binder:', error);
            throw new Error('Failed to save binder to local storage');
        }
    }
    /**
     * Delete a binder from local storage
     */
    deleteBinder(id) {
        try {
            const binders = this.getBinders();
            const filteredBinders = binders.filter(binder => binder.id !== id);
            localStorage.setItem(exports.STORAGE_KEYS.BINDERS, JSON.stringify(filteredBinders));
            // Remove from pending changes
            this.syncStatus.pendingChanges.binders = this.syncStatus.pendingChanges.binders.filter(binderId => binderId !== id);
            this.saveSyncStatus();
        }
        catch (error) {
            console.error('Error deleting binder:', error);
            throw new Error('Failed to delete binder from local storage');
        }
    }
    // === Deck Operations ===
    /**
     * Get all decks from local storage
     */
    getDecks() {
        try {
            const decksStr = localStorage.getItem(exports.STORAGE_KEYS.DECKS);
            return decksStr ? JSON.parse(decksStr) : [];
        }
        catch (error) {
            console.error('Error loading decks:', error);
            return [];
        }
    }
    /**
     * Get a specific deck by ID
     */
    getDeck(id) {
        const decks = this.getDecks();
        return decks.find(deck => deck.id === id) || null;
    }
    /**
     * Save a deck to local storage
     */
    saveDeck(deck) {
        try {
            const decks = this.getDecks();
            const existingIndex = decks.findIndex(d => d.id === deck.id);
            // Update modified timestamp
            deck.modifiedAt = new Date();
            if (existingIndex >= 0) {
                decks[existingIndex] = deck;
            }
            else {
                decks.push(deck);
            }
            localStorage.setItem(exports.STORAGE_KEYS.DECKS, JSON.stringify(decks));
            // Track pending changes for sync
            this.markForSync('deck', deck.id);
            // Auto-backup if enabled
            if (this.config.autoBackup) {
                this.createBackup();
            }
        }
        catch (error) {
            console.error('Error saving deck:', error);
            throw new Error('Failed to save deck to local storage');
        }
    }
    /**
     * Delete a deck from local storage
     */
    deleteDeck(id) {
        try {
            const decks = this.getDecks();
            const filteredDecks = decks.filter(deck => deck.id !== id);
            localStorage.setItem(exports.STORAGE_KEYS.DECKS, JSON.stringify(filteredDecks));
            // Remove from pending changes
            this.syncStatus.pendingChanges.decks = this.syncStatus.pendingChanges.decks.filter(deckId => deckId !== id);
            this.saveSyncStatus();
        }
        catch (error) {
            console.error('Error deleting deck:', error);
            throw new Error('Failed to delete deck from local storage');
        }
    }
    // === Card Cache Operations ===
    /**
     * Get cached card data
     */
    getCachedCard(cardId) {
        try {
            const cacheStr = localStorage.getItem(exports.STORAGE_KEYS.CARDS_CACHE);
            if (cacheStr) {
                const cache = JSON.parse(cacheStr);
                return cache[cardId] || null;
            }
        }
        catch (error) {
            console.error('Error reading card cache:', error);
        }
        return null;
    }
    /**
     * Cache card data
     */
    cacheCard(card) {
        try {
            const cacheStr = localStorage.getItem(exports.STORAGE_KEYS.CARDS_CACHE);
            const cache = cacheStr ? JSON.parse(cacheStr) : {};
            cache[card.id] = {
                ...card,
                cachedAt: new Date().toISOString(),
            };
            localStorage.setItem(exports.STORAGE_KEYS.CARDS_CACHE, JSON.stringify(cache));
        }
        catch (error) {
            console.error('Error caching card:', error);
        }
    }
    /**
     * Clear card cache
     */
    clearCardCache() {
        try {
            localStorage.removeItem(exports.STORAGE_KEYS.CARDS_CACHE);
        }
        catch (error) {
            console.error('Error clearing card cache:', error);
        }
    }
    // === Sync Management ===
    /**
     * Mark an item for synchronization
     */
    markForSync(type, id) {
        if (type === 'binder') {
            if (!this.syncStatus.pendingChanges.binders.includes(id)) {
                this.syncStatus.pendingChanges.binders.push(id);
            }
        }
        else {
            if (!this.syncStatus.pendingChanges.decks.includes(id)) {
                this.syncStatus.pendingChanges.decks.push(id);
            }
        }
        this.saveSyncStatus();
    }
    /**
     * Get pending changes for sync
     */
    getPendingChanges() {
        return this.syncStatus.pendingChanges;
    }
    /**
     * Clear pending changes after successful sync
     */
    clearPendingChanges() {
        this.syncStatus.pendingChanges = { binders: [], decks: [] };
        this.syncStatus.lastSync = new Date().toISOString();
        this.saveSyncStatus();
    }
    /**
     * Add conflict for manual resolution
     */
    addConflict(type, id, localModified, remoteModified) {
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
    getConflicts() {
        return this.syncStatus.conflicts;
    }
    /**
     * Resolve a conflict
     */
    resolveConflict(conflictIndex) {
        this.syncStatus.conflicts.splice(conflictIndex, 1);
        this.saveSyncStatus();
    }
    // === Configuration ===
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Update configuration
     */
    updateConfig(updates) {
        this.config = { ...this.config, ...updates };
        this.saveConfig();
    }
    /**
     * Enable/disable offline mode
     */
    setOfflineMode(enabled) {
        this.config.offlineMode = enabled;
        this.saveConfig();
    }
    /**
     * Check if app is in offline mode
     */
    isOfflineMode() {
        return this.config.offlineMode;
    }
    // === Storage Management ===
    /**
     * Get storage usage information
     */
    getStorageInfo() {
        const getItemSize = (key) => {
            const item = localStorage.getItem(key);
            return item ? new Blob([item]).size : 0;
        };
        const usage = {
            binders: getItemSize(exports.STORAGE_KEYS.BINDERS),
            decks: getItemSize(exports.STORAGE_KEYS.DECKS),
            cache: getItemSize(exports.STORAGE_KEYS.CARDS_CACHE),
            config: getItemSize(exports.STORAGE_KEYS.APP_CONFIG),
            backups: getItemSize(exports.STORAGE_KEYS.BACKUP_DATA),
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
    clearAllData() {
        try {
            Object.values(exports.STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            // Reinitialize
            this.config = {
                version: exports.DATA_VERSION,
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
        }
        catch (error) {
            console.error('Error clearing data:', error);
            throw new Error('Failed to clear application data');
        }
    }
    // === Backup Operations ===
    /**
     * Create a backup of all user data
     */
    createBackup() {
        const backup = {
            version: exports.DATA_VERSION,
            timestamp: new Date().toISOString(),
            data: {
                binders: this.getBinders(),
                decks: this.getDecks(),
                config: this.config,
            },
        };
        try {
            // Save as latest backup
            localStorage.setItem(exports.STORAGE_KEYS.BACKUP_DATA, JSON.stringify(backup));
            // Manage backup rotation
            this.rotateBackups();
            return backup;
        }
        catch (error) {
            console.error('Error creating backup:', error);
            throw new Error('Failed to create backup');
        }
    }
    /**
     * Rotate backups to maintain maximum count
     */
    rotateBackups() {
        // For now, we just keep the latest backup
        // In a more advanced implementation, we could keep multiple timestamped backups
    }
    /**
     * Get the latest backup
     */
    getLatestBackup() {
        try {
            const backupStr = localStorage.getItem(exports.STORAGE_KEYS.BACKUP_DATA);
            return backupStr ? JSON.parse(backupStr) : null;
        }
        catch (error) {
            console.error('Error loading backup:', error);
            return null;
        }
    }
}
exports.StorageService = StorageService;
// Export singleton instance
exports.storageService = StorageService.getInstance();
