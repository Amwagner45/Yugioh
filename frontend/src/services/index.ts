/**
 * Local Storage Strategy - Task 2.3 Implementation
 * 
 * This module provides comprehensive local storage capabilities including:
 * - Offline data persistence
 * - Data synchronization with conflict resolution
 * - Import/export functionality in multiple formats
 * - Automated backup and restore
 * - Data validation and schema migration
 */

// Core storage service
export { storageService, STORAGE_KEYS, DATA_VERSION } from './storage';
export type { AppConfig, SyncStatus, BackupData } from './storage';

// Synchronization service
export { syncService } from './sync';
export type { SyncResult, SyncOptions } from './sync';

// Import/Export service
export { importExportService } from './importExport';
export type { ExportOptions, ImportResult } from './importExport';

// Backup service
export { backupService } from './backup';
export type { BackupSettings, RestoreOptions, BackupInfo } from './backup';

// Validation and migration service
export { validationMigrationService } from './validation';
export type { ValidationResult, MigrationResult, DataSchema } from './validation';

// Import service instances for internal use
import { storageService } from './storage';
import { syncService } from './sync';
import { importExportService } from './importExport';
import { backupService } from './backup';
import { validationMigrationService } from './validation';

/**
 * Initialize all storage services
 */
export function initializeStorageServices(): {
    storage: typeof storageService;
    sync: typeof syncService;
    importExport: typeof importExportService;
    backup: typeof backupService;
    validation: typeof validationMigrationService;
} {
    // Initialize backup service (which will handle auto-backup setup)
    const backup = backupService;
    backup.updateSettings({ autoBackup: true });

    // Run initial data validation and repair
    const validation = validationMigrationService;
    const validationResults = validation.validateAllData();

    if (validationResults.summary.totalErrors > 0) {
        console.warn(`Found ${validationResults.summary.totalErrors} data validation errors`);
        const repairResults = validation.repairData();
        console.log(`Repaired ${repairResults.repaired.binders} binders and ${repairResults.repaired.decks} decks`);
    }

    return {
        storage: storageService,
        sync: syncService,
        importExport: importExportService,
        backup,
        validation,
    };
}

/**
 * Cleanup storage services on app shutdown
 */
export function cleanupStorageServices(): void {
    // Stop auto-backup timer
    backupService.cleanup();

    // Create final backup before shutdown
    backupService.createManualBackup('App shutdown backup').catch((error: any) => {
        console.error('Failed to create shutdown backup:', error);
    });
}

/**
 * Storage service utilities
 */
export const storageUtils = {
    /**
     * Get comprehensive storage information
     */
    getStorageInfo() {
        const storageInfo = storageService.getStorageInfo();
        const backupInfo = backupService.getBackupStorageUsage();
        const syncStatus = storageService.getPendingChanges();
        const conflicts = storageService.getConflicts();

        return {
            storage: storageInfo,
            backup: backupInfo,
            sync: {
                pendingChanges: syncStatus,
                conflicts,
                canSync: syncService.canSync(),
                networkStatus: syncService.getNetworkStatus(),
            },
            summary: {
                totalBinders: storageService.getBinders().length,
                totalDecks: storageService.getDecks().length,
                totalBackups: backupInfo.backupCount,
                pendingSync: syncStatus.binders.length + syncStatus.decks.length,
                hasConflicts: conflicts.length > 0,
            },
        };
    },

    /**
     * Perform comprehensive data maintenance
     */
    async performMaintenance() {
        const results = {
            validation: validationMigrationService.validateAllData(),
            repair: { repaired: { binders: 0, decks: 0 }, issues: [] as string[] },
            backup: null as any,
            sync: null as any,
        };

        // Repair data issues
        if (results.validation.summary.totalErrors > 0) {
            results.repair = validationMigrationService.repairData();
        }

        // Create maintenance backup
        try {
            results.backup = await backupService.createManualBackup('Maintenance backup');
        } catch (error) {
            console.error('Maintenance backup failed:', error);
        }

        // Attempt sync if online
        if (syncService.canSync()) {
            try {
                results.sync = await syncService.syncAll();
            } catch (error) {
                console.error('Maintenance sync failed:', error);
            }
        }

        return results;
    },

    /**
     * Export all data for backup
     */
    async exportAllData(format: 'json' = 'json') {
        const exportData = importExportService.exportAllData({ format });
        const filename = `yugioh-complete-backup-${new Date().toISOString().split('T')[0]}.json`;

        importExportService.downloadFile(
            exportData,
            filename,
            'application/json'
        );
    },

    /**
     * Quick health check
     */
    healthCheck() {
        const validation = validationMigrationService.validateAllData();
        const storage = storageService.getStorageInfo();
        const network = syncService.getNetworkStatus();

        return {
            dataIntegrity: validation.summary.totalErrors === 0 ? 'good' : 'issues',
            storageUsage: storage.used / (storage.used + storage.available),
            networkStatus: network.isOnline ? 'online' : 'offline',
            syncCapability: network.canSync ? 'ready' : 'unavailable',
            recommendations: [
                ...(validation.summary.totalErrors > 0 ? ['Run data repair'] : []),
                ...(storage.used / (storage.used + storage.available) > 0.8 ? ['Clear old data'] : []),
                ...(!network.canSync && network.isOnline ? ['Check sync settings'] : []),
            ],
        };
    },
};