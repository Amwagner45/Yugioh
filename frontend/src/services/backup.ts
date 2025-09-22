import { storageService } from './storage';
import type { BackupData } from './storage';
import { importExportService } from './importExport';

export interface BackupSettings {
    autoBackup: boolean;
    backupInterval: number; // minutes
    maxBackups: number;
    includeCardCache: boolean;
    compressionEnabled: boolean;
}

export interface RestoreOptions {
    replaceExisting: boolean;
    mergeData: boolean;
    selectiveRestore?: {
        binders?: string[];
        decks?: string[];
    };
}

export interface BackupInfo {
    id: string;
    timestamp: string;
    size: number;
    itemCount: {
        binders: number;
        decks: number;
    };
    version: string;
    isAutoBackup: boolean;
}

/**
 * Service for automated backups and data restoration
 */
export class BackupService {
    private static instance: BackupService;
    private backupTimer: number | null = null;
    private settings: BackupSettings;

    private constructor() {
        this.settings = this.loadBackupSettings();
        this.initializeAutoBackup();
    }

    public static getInstance(): BackupService {
        if (!BackupService.instance) {
            BackupService.instance = new BackupService();
        }
        return BackupService.instance;
    }

    /**
     * Load backup settings from storage
     */
    private loadBackupSettings(): BackupSettings {
        try {
            const settingsStr = localStorage.getItem('yugioh_backup_settings');
            if (settingsStr) {
                return JSON.parse(settingsStr);
            }
        } catch (error) {
            console.error('Error loading backup settings:', error);
        }

        return {
            autoBackup: true,
            backupInterval: 30, // 30 minutes
            maxBackups: 10,
            includeCardCache: false,
            compressionEnabled: true,
        };
    }

    /**
     * Save backup settings to storage
     */
    private saveBackupSettings(): void {
        try {
            localStorage.setItem('yugioh_backup_settings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Error saving backup settings:', error);
        }
    }

    /**
     * Initialize automatic backup timer
     */
    private initializeAutoBackup(): void {
        if (this.settings.autoBackup && this.settings.backupInterval > 0) {
            this.startAutoBackup();
        }
    }

    /**
     * Start automatic backup timer
     */
    public startAutoBackup(): void {
        this.stopAutoBackup(); // Clear any existing timer

        if (this.settings.autoBackup && this.settings.backupInterval > 0) {
            const intervalMs = this.settings.backupInterval * 60 * 1000;
            this.backupTimer = window.setInterval(() => {
                this.createAutoBackup().catch(error => {
                    console.error('Auto backup failed:', error);
                });
            }, intervalMs);

            console.log(`Auto backup enabled: every ${this.settings.backupInterval} minutes`);
        }
    }

    /**
     * Stop automatic backup timer
     */
    public stopAutoBackup(): void {
        if (this.backupTimer) {
            clearInterval(this.backupTimer);
            this.backupTimer = null;
        }
    }

    /**
     * Get current backup settings
     */
    public getSettings(): BackupSettings {
        return { ...this.settings };
    }

    /**
     * Update backup settings
     */
    public updateSettings(newSettings: Partial<BackupSettings>): void {
        this.settings = { ...this.settings, ...newSettings };
        this.saveBackupSettings();

        // Restart auto backup with new settings
        if (this.settings.autoBackup) {
            this.startAutoBackup();
        } else {
            this.stopAutoBackup();
        }
    }

    /**
     * Create a manual backup
     */
    public async createManualBackup(description?: string): Promise<BackupInfo> {
        return this.createBackup(false, description);
    }

    /**
     * Create an automatic backup
     */
    private async createAutoBackup(): Promise<BackupInfo> {
        // Only create auto backup if there are changes since last backup
        const lastBackup = this.getLatestBackup();
        const pendingChanges = storageService.getPendingChanges();

        if (lastBackup &&
            pendingChanges.binders.length === 0 &&
            pendingChanges.decks.length === 0) {
            console.log('Skipping auto backup: no changes detected');
            throw new Error('No changes to backup');
        }

        return this.createBackup(true, 'Auto backup');
    }

    /**
     * Create a backup (internal method)
     */
    private async createBackup(isAutoBackup: boolean, description?: string): Promise<BackupInfo> {
        try {
            // Create backup data
            const backupData = storageService.createBackup();

            // Generate backup ID
            const backupId = this.generateBackupId();

            // Calculate backup info
            const backupInfo: BackupInfo = {
                id: backupId,
                timestamp: backupData.timestamp,
                size: this.calculateBackupSize(backupData),
                itemCount: {
                    binders: backupData.data.binders.length,
                    decks: backupData.data.decks.length,
                },
                version: backupData.version,
                isAutoBackup,
            };

            // Save backup with metadata
            const backupWithMeta = {
                ...backupData,
                id: backupId,
                description,
                isAutoBackup,
            };

            await this.saveBackup(backupId, backupWithMeta);

            // Manage backup rotation
            await this.rotateBackups();

            console.log(`Backup created: ${backupId} (${isAutoBackup ? 'auto' : 'manual'})`);
            return backupInfo;

        } catch (error) {
            console.error('Backup creation failed:', error);
            throw new Error(`Failed to create backup: ${error}`);
        }
    }

    /**
     * Save backup to storage
     */
    private async saveBackup(backupId: string, backupData: any): Promise<void> {
        try {
            const key = `yugioh_backup_${backupId}`;

            if (this.settings.compressionEnabled) {
                // In a real implementation, you might use compression here
                // For now, we'll just store as JSON
                localStorage.setItem(key, JSON.stringify(backupData));
            } else {
                localStorage.setItem(key, JSON.stringify(backupData));
            }

            // Update backup index
            this.updateBackupIndex(backupId, {
                id: backupId,
                timestamp: backupData.timestamp,
                size: this.calculateBackupSize(backupData),
                itemCount: {
                    binders: backupData.data.binders.length,
                    decks: backupData.data.decks.length,
                },
                version: backupData.version,
                isAutoBackup: backupData.isAutoBackup || false,
            });

        } catch (error) {
            throw new Error(`Failed to save backup: ${error}`);
        }
    }

    /**
     * Get list of all available backups
     */
    public getAvailableBackups(): BackupInfo[] {
        try {
            const indexStr = localStorage.getItem('yugioh_backup_index');
            if (indexStr) {
                const index = JSON.parse(indexStr);
                return (Object.values(index) as BackupInfo[]).sort((a, b) =>
                    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                );
            }
        } catch (error) {
            console.error('Error loading backup index:', error);
        }
        return [];
    }

    /**
     * Get the latest backup
     */
    public getLatestBackup(): BackupInfo | null {
        const backups = this.getAvailableBackups();
        return backups.length > 0 ? backups[0] : null;
    }

    /**
     * Load a specific backup
     */
    public async loadBackup(backupId: string): Promise<BackupData> {
        try {
            const key = `yugioh_backup_${backupId}`;
            const backupStr = localStorage.getItem(key);

            if (!backupStr) {
                throw new Error(`Backup ${backupId} not found`);
            }

            return JSON.parse(backupStr);
        } catch (error) {
            throw new Error(`Failed to load backup: ${error}`);
        }
    }

    /**
     * Restore from a backup
     */
    public async restoreFromBackup(backupId: string, options: RestoreOptions = { replaceExisting: false, mergeData: true }): Promise<{
        success: boolean;
        restored: {
            binders: number;
            decks: number;
        };
        errors: string[];
    }> {
        const result = {
            success: false,
            restored: { binders: 0, decks: 0 },
            errors: [] as string[],
        };

        try {
            const backupData = await this.loadBackup(backupId);

            if (options.replaceExisting) {
                // Clear all existing data
                storageService.clearAllData();
            }

            // Restore binders
            if (!options.selectiveRestore || !options.selectiveRestore.binders) {
                // Restore all binders
                for (const binder of backupData.data.binders) {
                    try {
                        if (options.mergeData || !storageService.getBinder(binder.id)) {
                            storageService.saveBinder(binder);
                            result.restored.binders++;
                        }
                    } catch (error) {
                        result.errors.push(`Failed to restore binder ${binder.name}: ${error}`);
                    }
                }
            } else {
                // Restore selected binders
                for (const binderId of options.selectiveRestore.binders) {
                    const binder = backupData.data.binders.find(b => b.id === binderId);
                    if (binder) {
                        try {
                            storageService.saveBinder(binder);
                            result.restored.binders++;
                        } catch (error) {
                            result.errors.push(`Failed to restore binder ${binder.name}: ${error}`);
                        }
                    }
                }
            }

            // Restore decks
            if (!options.selectiveRestore || !options.selectiveRestore.decks) {
                // Restore all decks
                for (const deck of backupData.data.decks) {
                    try {
                        if (options.mergeData || !storageService.getDeck(deck.id)) {
                            storageService.saveDeck(deck);
                            result.restored.decks++;
                        }
                    } catch (error) {
                        result.errors.push(`Failed to restore deck ${deck.name}: ${error}`);
                    }
                }
            } else {
                // Restore selected decks
                for (const deckId of options.selectiveRestore.decks) {
                    const deck = backupData.data.decks.find(d => d.id === deckId);
                    if (deck) {
                        try {
                            storageService.saveDeck(deck);
                            result.restored.decks++;
                        } catch (error) {
                            result.errors.push(`Failed to restore deck ${deck.name}: ${error}`);
                        }
                    }
                }
            }

            // Restore configuration if replacing
            if (options.replaceExisting && backupData.data.config) {
                storageService.updateConfig(backupData.data.config);
            }

            result.success = result.errors.length === 0;
            console.log(`Restore completed: ${result.restored.binders} binders, ${result.restored.decks} decks`);

            return result;

        } catch (error) {
            result.errors.push(`Restore failed: ${error}`);
            return result;
        }
    }

    /**
     * Delete a backup
     */
    public async deleteBackup(backupId: string): Promise<void> {
        try {
            // Remove backup file
            const key = `yugioh_backup_${backupId}`;
            localStorage.removeItem(key);

            // Update backup index
            this.removeFromBackupIndex(backupId);

            console.log(`Backup deleted: ${backupId}`);
        } catch (error) {
            throw new Error(`Failed to delete backup: ${error}`);
        }
    }

    /**
     * Export backup to file
     */
    public async exportBackup(backupId: string): Promise<void> {
        try {
            const backupData = await this.loadBackup(backupId);
            const filename = `yugioh-backup-${backupId}-${new Date().toISOString().split('T')[0]}.json`;

            importExportService.downloadFile(
                JSON.stringify(backupData, null, 2),
                filename,
                'application/json'
            );
        } catch (error) {
            throw new Error(`Failed to export backup: ${error}`);
        }
    }

    /**
     * Import backup from file
     */
    public async importBackup(content: string): Promise<BackupInfo> {
        try {
            const backupData = JSON.parse(content);

            // Validate backup structure
            if (!backupData.version || !backupData.data || !backupData.timestamp) {
                throw new Error('Invalid backup file format');
            }

            // Generate new backup ID
            const backupId = this.generateBackupId();

            // Save as new backup
            const backupWithMeta = {
                ...backupData,
                id: backupId,
                description: 'Imported backup',
                isAutoBackup: false,
            };

            await this.saveBackup(backupId, backupWithMeta);

            return {
                id: backupId,
                timestamp: backupData.timestamp,
                size: this.calculateBackupSize(backupData),
                itemCount: {
                    binders: backupData.data.binders?.length || 0,
                    decks: backupData.data.decks?.length || 0,
                },
                version: backupData.version,
                isAutoBackup: false,
            };

        } catch (error) {
            throw new Error(`Failed to import backup: ${error}`);
        }
    }

    /**
     * Get storage usage for backups
     */
    public getBackupStorageUsage(): {
        totalSize: number;
        backupCount: number;
        oldestBackup?: string;
        newestBackup?: string;
    } {
        const backups = this.getAvailableBackups();
        const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);

        return {
            totalSize,
            backupCount: backups.length,
            oldestBackup: backups.length > 0 ? backups[backups.length - 1].timestamp : undefined,
            newestBackup: backups.length > 0 ? backups[0].timestamp : undefined,
        };
    }

    /**
     * Clean up old backups based on settings
     */
    private async rotateBackups(): Promise<void> {
        const backups = this.getAvailableBackups();

        if (backups.length > this.settings.maxBackups) {
            // Sort by timestamp (newest first)
            const sortedBackups = backups.sort((a, b) =>
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );

            // Keep only the newest backups
            const backupsToDelete = sortedBackups.slice(this.settings.maxBackups);

            for (const backup of backupsToDelete) {
                try {
                    await this.deleteBackup(backup.id);
                    console.log(`Rotated old backup: ${backup.id}`);
                } catch (error) {
                    console.error(`Failed to delete old backup ${backup.id}:`, error);
                }
            }
        }
    }

    // === Private Utility Methods ===

    private generateBackupId(): string {
        return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private calculateBackupSize(backupData: any): number {
        return new Blob([JSON.stringify(backupData)]).size;
    }

    private updateBackupIndex(backupId: string, backupInfo: BackupInfo): void {
        try {
            const indexStr = localStorage.getItem('yugioh_backup_index');
            const index = indexStr ? JSON.parse(indexStr) : {};
            index[backupId] = backupInfo;
            localStorage.setItem('yugioh_backup_index', JSON.stringify(index));
        } catch (error) {
            console.error('Error updating backup index:', error);
        }
    }

    private removeFromBackupIndex(backupId: string): void {
        try {
            const indexStr = localStorage.getItem('yugioh_backup_index');
            if (indexStr) {
                const index = JSON.parse(indexStr);
                delete index[backupId];
                localStorage.setItem('yugioh_backup_index', JSON.stringify(index));
            }
        } catch (error) {
            console.error('Error removing from backup index:', error);
        }
    }

    /**
     * Initialize backup service on app start
     */
    public static initialize(): BackupService {
        const instance = BackupService.getInstance();

        // Create initial backup if none exists
        const backups = instance.getAvailableBackups();
        if (backups.length === 0) {
            instance.createManualBackup('Initial backup').catch(error => {
                console.error('Failed to create initial backup:', error);
            });
        }

        return instance;
    }

    /**
     * Cleanup on app close
     */
    public cleanup(): void {
        this.stopAutoBackup();
    }
}

// Export singleton instance
export const backupService = BackupService.getInstance();