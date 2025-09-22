import { storageService } from './storage';
import { binderService, deckService } from './api';
import type { Binder, Deck } from '../types';

export interface SyncResult {
    success: boolean;
    synced: {
        binders: number;
        decks: number;
    };
    conflicts: Array<{
        type: 'binder' | 'deck';
        id: string;
        localItem: Binder | Deck;
        remoteItem: Binder | Deck;
    }>;
    errors: string[];
}

export interface SyncOptions {
    forceSync?: boolean;
    resolveConflicts?: 'local' | 'remote' | 'manual';
}

/**
 * Service for synchronizing data between local storage and remote API
 */
export class SyncService {
    private static instance: SyncService;
    private isOnline: boolean = navigator.onLine;
    private syncInProgress: boolean = false;

    private constructor() {
        this.setupNetworkListeners();
    }

    public static getInstance(): SyncService {
        if (!SyncService.instance) {
            SyncService.instance = new SyncService();
        }
        return SyncService.instance;
    }

    /**
     * Set up network status listeners
     */
    private setupNetworkListeners(): void {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.handleOnlineStatusChange(true);
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.handleOnlineStatusChange(false);
        });
    }

    /**
     * Handle network status changes
     */
    private handleOnlineStatusChange(isOnline: boolean): void {
        console.log(`Network status changed: ${isOnline ? 'online' : 'offline'}`);

        if (isOnline && !storageService.isOfflineMode()) {
            // Auto-sync when coming back online
            this.syncAll({ resolveConflicts: 'manual' }).catch(error => {
                console.error('Auto-sync failed:', error);
            });
        }
    }

    /**
     * Check if the app can sync (online and not in offline mode)
     */
    public canSync(): boolean {
        return this.isOnline && !storageService.isOfflineMode() && !this.syncInProgress;
    }

    /**
     * Get current network status
     */
    public getNetworkStatus(): { isOnline: boolean; canSync: boolean } {
        return {
            isOnline: this.isOnline,
            canSync: this.canSync(),
        };
    }

    /**
     * Sync all pending changes
     */
    public async syncAll(options: SyncOptions = {}): Promise<SyncResult> {
        if (!this.canSync() && !options.forceSync) {
            throw new Error('Cannot sync: offline or sync in progress');
        }

        this.syncInProgress = true;
        const result: SyncResult = {
            success: true,
            synced: { binders: 0, decks: 0 },
            conflicts: [],
            errors: [],
        };

        try {
            // Get pending changes
            const pendingChanges = storageService.getPendingChanges();

            // Sync binders
            for (const binderId of pendingChanges.binders) {
                try {
                    const syncResult = await this.syncBinder(binderId, options);
                    if (syncResult.success) {
                        result.synced.binders++;
                    } else if (syncResult.conflict) {
                        result.conflicts.push(syncResult.conflict);
                    }
                } catch (error) {
                    result.errors.push(`Failed to sync binder ${binderId}: ${error}`);
                }
            }

            // Sync decks
            for (const deckId of pendingChanges.decks) {
                try {
                    const syncResult = await this.syncDeck(deckId, options);
                    if (syncResult.success) {
                        result.synced.decks++;
                    } else if (syncResult.conflict) {
                        result.conflicts.push(syncResult.conflict);
                    }
                } catch (error) {
                    result.errors.push(`Failed to sync deck ${deckId}: ${error}`);
                }
            }

            // If no errors and no conflicts, clear pending changes
            if (result.errors.length === 0 && result.conflicts.length === 0) {
                storageService.clearPendingChanges();
            }

            result.success = result.errors.length === 0;
            return result;

        } catch (error) {
            result.success = false;
            result.errors.push(`Sync failed: ${error}`);
            return result;
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Sync a specific binder
     */
    private async syncBinder(binderId: string, options: SyncOptions): Promise<{
        success: boolean;
        conflict?: {
            type: 'binder';
            id: string;
            localItem: Binder;
            remoteItem: Binder;
        };
    }> {
        const localBinder = storageService.getBinder(binderId);
        if (!localBinder) {
            throw new Error(`Local binder ${binderId} not found`);
        }

        try {
            // Try to get remote binder
            const remoteBinder = await this.getRemoteBinder(binderId);

            if (!remoteBinder) {
                // New binder - upload to remote
                await this.uploadBinder(localBinder);
                return { success: true };
            }

            // Check for conflicts
            const localModified = new Date(localBinder.modifiedAt).getTime();
            const remoteModified = new Date(remoteBinder.modifiedAt).getTime();

            if (localModified === remoteModified) {
                // No changes needed
                return { success: true };
            }

            if (localModified > remoteModified) {
                // Local is newer - upload
                await this.uploadBinder(localBinder);
                return { success: true };
            }

            if (remoteModified > localModified) {
                // Remote is newer
                if (options.resolveConflicts === 'remote') {
                    // Use remote version
                    storageService.saveBinder(remoteBinder);
                    return { success: true };
                } else if (options.resolveConflicts === 'local') {
                    // Use local version
                    await this.uploadBinder(localBinder);
                    return { success: true };
                } else {
                    // Manual resolution needed
                    return {
                        success: false,
                        conflict: {
                            type: 'binder',
                            id: binderId,
                            localItem: localBinder,
                            remoteItem: remoteBinder,
                        },
                    };
                }
            }

            return { success: true };

        } catch (error) {
            console.error(`Error syncing binder ${binderId}:`, error);
            throw error;
        }
    }

    /**
     * Sync a specific deck
     */
    private async syncDeck(deckId: string, options: SyncOptions): Promise<{
        success: boolean;
        conflict?: {
            type: 'deck';
            id: string;
            localItem: Deck;
            remoteItem: Deck;
        };
    }> {
        const localDeck = storageService.getDeck(deckId);
        if (!localDeck) {
            throw new Error(`Local deck ${deckId} not found`);
        }

        try {
            // Try to get remote deck
            const remoteDeck = await this.getRemoteDeck(deckId);

            if (!remoteDeck) {
                // New deck - upload to remote
                await this.uploadDeck(localDeck);
                return { success: true };
            }

            // Check for conflicts (similar logic to binder sync)
            const localModified = new Date(localDeck.modifiedAt).getTime();
            const remoteModified = new Date(remoteDeck.modifiedAt).getTime();

            if (localModified === remoteModified) {
                return { success: true };
            }

            if (localModified > remoteModified) {
                await this.uploadDeck(localDeck);
                return { success: true };
            }

            if (remoteModified > localModified) {
                if (options.resolveConflicts === 'remote') {
                    storageService.saveDeck(remoteDeck);
                    return { success: true };
                } else if (options.resolveConflicts === 'local') {
                    await this.uploadDeck(localDeck);
                    return { success: true };
                } else {
                    return {
                        success: false,
                        conflict: {
                            type: 'deck',
                            id: deckId,
                            localItem: localDeck,
                            remoteItem: remoteDeck,
                        },
                    };
                }
            }

            return { success: true };

        } catch (error) {
            console.error(`Error syncing deck ${deckId}:`, error);
            throw error;
        }
    }

    /**
     * Download all data from remote and sync with local
     */
    public async downloadFromRemote(options: SyncOptions = {}): Promise<SyncResult> {
        if (!this.canSync() && !options.forceSync) {
            throw new Error('Cannot sync: offline or sync in progress');
        }

        this.syncInProgress = true;
        const result: SyncResult = {
            success: true,
            synced: { binders: 0, decks: 0 },
            conflicts: [],
            errors: [],
        };

        try {
            // Download all remote binders
            const remoteBinders = await this.getAllRemoteBinders();
            for (const remoteBinder of remoteBinders) {
                const localBinder = storageService.getBinder(remoteBinder.id);

                if (!localBinder) {
                    // New remote binder - download
                    storageService.saveBinder(remoteBinder);
                    result.synced.binders++;
                } else {
                    // Check for conflicts
                    const localModified = new Date(localBinder.modifiedAt).getTime();
                    const remoteModified = new Date(remoteBinder.modifiedAt).getTime();

                    if (remoteModified > localModified) {
                        if (options.resolveConflicts === 'remote') {
                            storageService.saveBinder(remoteBinder);
                            result.synced.binders++;
                        } else if (options.resolveConflicts === 'local') {
                            // Keep local version
                        } else {
                            result.conflicts.push({
                                type: 'binder',
                                id: remoteBinder.id,
                                localItem: localBinder,
                                remoteItem: remoteBinder,
                            });
                        }
                    }
                }
            }

            // Download all remote decks
            const remoteDecks = await this.getAllRemoteDecks();
            for (const remoteDeck of remoteDecks) {
                const localDeck = storageService.getDeck(remoteDeck.id);

                if (!localDeck) {
                    storageService.saveDeck(remoteDeck);
                    result.synced.decks++;
                } else {
                    const localModified = new Date(localDeck.modifiedAt).getTime();
                    const remoteModified = new Date(remoteDeck.modifiedAt).getTime();

                    if (remoteModified > localModified) {
                        if (options.resolveConflicts === 'remote') {
                            storageService.saveDeck(remoteDeck);
                            result.synced.decks++;
                        } else if (options.resolveConflicts === 'local') {
                            // Keep local version
                        } else {
                            result.conflicts.push({
                                type: 'deck',
                                id: remoteDeck.id,
                                localItem: localDeck,
                                remoteItem: remoteDeck,
                            });
                        }
                    }
                }
            }

            result.success = result.errors.length === 0;
            return result;

        } catch (error) {
            result.success = false;
            result.errors.push(`Download failed: ${error}`);
            return result;
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Resolve a specific conflict
     */
    public async resolveConflict(
        conflictIndex: number,
        resolution: 'local' | 'remote'
    ): Promise<void> {
        const conflicts = storageService.getConflicts();
        const conflict = conflicts[conflictIndex];

        if (!conflict) {
            throw new Error('Conflict not found');
        }

        try {
            if (conflict.type === 'binder') {
                if (resolution === 'local') {
                    const localBinder = storageService.getBinder(conflict.id);
                    if (localBinder) {
                        await this.uploadBinder(localBinder);
                    }
                } else {
                    // Fetch latest remote and save locally
                    const remoteBinder = await this.getRemoteBinder(conflict.id);
                    if (remoteBinder) {
                        storageService.saveBinder(remoteBinder);
                    }
                }
            } else {
                if (resolution === 'local') {
                    const localDeck = storageService.getDeck(conflict.id);
                    if (localDeck) {
                        await this.uploadDeck(localDeck);
                    }
                } else {
                    const remoteDeck = await this.getRemoteDeck(conflict.id);
                    if (remoteDeck) {
                        storageService.saveDeck(remoteDeck);
                    }
                }
            }

            // Remove resolved conflict
            storageService.resolveConflict(conflictIndex);
        } catch (error) {
            console.error('Error resolving conflict:', error);
            throw error;
        }
    }

    // === Private API Methods ===

    private async getRemoteBinder(id: string): Promise<Binder | null> {
        try {
            // TODO: Replace with actual API call when backend is ready
            const response = await binderService.getBinders();
            return response.data.find((binder: Binder) => binder.id === id) || null;
        } catch (error) {
            console.error('Error fetching remote binder:', error);
            return null;
        }
    }

    private async getAllRemoteBinders(): Promise<Binder[]> {
        try {
            const response = await binderService.getBinders();
            return response.data || [];
        } catch (error) {
            console.error('Error fetching remote binders:', error);
            return [];
        }
    }

    private async uploadBinder(binder: Binder): Promise<void> {
        try {
            // TODO: Replace with actual API call when backend is ready
            console.log('Uploading binder:', binder.id);
            // await binderService.saveBinder(binder);
        } catch (error) {
            console.error('Error uploading binder:', error);
            throw error;
        }
    }

    private async getRemoteDeck(id: string): Promise<Deck | null> {
        try {
            const response = await deckService.getDecks();
            return response.data.find((deck: Deck) => deck.id === id) || null;
        } catch (error) {
            console.error('Error fetching remote deck:', error);
            return null;
        }
    }

    private async getAllRemoteDecks(): Promise<Deck[]> {
        try {
            const response = await deckService.getDecks();
            return response.data || [];
        } catch (error) {
            console.error('Error fetching remote decks:', error);
            return [];
        }
    }

    private async uploadDeck(deck: Deck): Promise<void> {
        try {
            console.log('Uploading deck:', deck.id);
            // await deckService.saveDeck(deck);
        } catch (error) {
            console.error('Error uploading deck:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const syncService = SyncService.getInstance();