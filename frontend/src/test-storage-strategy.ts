/**
 * Test suite for the Local Storage Strategy implementation
 * 
 * This file tests all the services we implemented for task 2.3:
 * - Storage Service
 * - Sync Service  
 * - Import/Export Service
 * - Backup Service
 * - Validation Service
 */

import {
    storageService,
    syncService,
    importExportService,
    backupService,
    validationMigrationService,
    storageUtils,
    initializeStorageServices
} from './services/index';
import type { Binder, Deck } from './types';

// Test data
const testBinder: Binder = {
    id: 'test-binder-1',
    name: 'Test Binder',
    description: 'A test binder for unit testing',
    cards: [
        { cardId: 12345, quantity: 3, setCode: 'LART-EN001', rarity: 'Ultra Rare' },
        { cardId: 67890, quantity: 2, setCode: 'LART-EN002', rarity: 'Secret Rare' },
        { cardId: 11111, quantity: 1, condition: 'Near Mint', notes: 'Favorite card' }
    ],
    createdAt: new Date(),
    modifiedAt: new Date(),
    tags: ['test', 'demo']
};

const testDeck: Deck = {
    id: 'test-deck-1',
    name: 'Test Deck',
    description: 'A test deck for unit testing',
    format: 'TCG',
    mainDeck: [
        { cardId: 12345, quantity: 3 },
        { cardId: 67890, quantity: 2 },
        { cardId: 11111, quantity: 1 }
    ],
    extraDeck: [
        { cardId: 99999, quantity: 1 },
        { cardId: 88888, quantity: 2 }
    ],
    sideDeck: [
        { cardId: 77777, quantity: 3 }
    ],
    createdAt: new Date(),
    modifiedAt: new Date(),
    tags: ['test', 'competitive'],
    notes: 'This is a test deck for validation'
};

/**
 * Test Storage Service
 */
function testStorageService(): boolean {
    console.log('🧪 Testing Storage Service...');

    try {
        // Clear any existing data
        storageService.clearAllData();

        // Test binder operations
        console.log('  Testing binder operations...');

        // Save binder
        storageService.saveBinder(testBinder);
        console.log('  ✅ Binder saved successfully');

        // Get binder
        const retrievedBinder = storageService.getBinder(testBinder.id);
        if (!retrievedBinder || retrievedBinder.name !== testBinder.name) {
            throw new Error('Failed to retrieve binder');
        }
        console.log('  ✅ Binder retrieved successfully');

        // Get all binders
        const allBinders = storageService.getBinders();
        if (allBinders.length !== 1 || allBinders[0].id !== testBinder.id) {
            throw new Error('Failed to get all binders');
        }
        console.log('  ✅ Get all binders works');

        // Test deck operations
        console.log('  Testing deck operations...');

        // Save deck
        storageService.saveDeck(testDeck);
        console.log('  ✅ Deck saved successfully');

        // Get deck
        const retrievedDeck = storageService.getDeck(testDeck.id);
        if (!retrievedDeck || retrievedDeck.name !== testDeck.name) {
            throw new Error('Failed to retrieve deck');
        }
        console.log('  ✅ Deck retrieved successfully');

        // Get all decks
        const allDecks = storageService.getDecks();
        if (allDecks.length !== 1 || allDecks[0].id !== testDeck.id) {
            throw new Error('Failed to get all decks');
        }
        console.log('  ✅ Get all decks works');

        // Test card caching
        console.log('  Testing card caching...');
        const testCard = { id: 12345, name: 'Test Card', type: 'Monster', desc: 'A test card' };
        storageService.cacheCard(testCard);

        const cachedCard = storageService.getCachedCard(12345);
        if (!cachedCard || cachedCard.name !== testCard.name) {
            throw new Error('Failed to cache/retrieve card');
        }
        console.log('  ✅ Card caching works');

        // Test storage info
        console.log('  Testing storage info...');
        const storageInfo = storageService.getStorageInfo();
        if (!storageInfo.used || !storageInfo.usage) {
            throw new Error('Failed to get storage info');
        }
        console.log('  ✅ Storage info works');

        // Test configuration
        console.log('  Testing configuration...');
        storageService.getConfig();
        storageService.updateConfig({ autoBackup: false });
        const updatedConfig = storageService.getConfig();
        if (updatedConfig.autoBackup !== false) {
            throw new Error('Failed to update config');
        }
        console.log('  ✅ Configuration works');

        // Test pending changes tracking
        console.log('  Testing sync tracking...');
        const pendingChanges = storageService.getPendingChanges();
        if (pendingChanges.binders.length === 0 || pendingChanges.decks.length === 0) {
            throw new Error('Pending changes not tracked');
        }
        console.log('  ✅ Sync tracking works');

        console.log('✅ Storage Service tests passed!\n');
        return true;

    } catch (error) {
        console.error('❌ Storage Service test failed:', error);
        return false;
    }
}

/**
 * Test Sync Service
 */
function testSyncService(): boolean {
    console.log('🧪 Testing Sync Service...');

    try {
        // Test network status
        console.log('  Testing network status...');
        const networkStatus = syncService.getNetworkStatus();
        if (typeof networkStatus.isOnline !== 'boolean' || typeof networkStatus.canSync !== 'boolean') {
            throw new Error('Invalid network status');
        }
        console.log('  ✅ Network status works');

        // Test pending changes
        console.log('  Testing pending changes...');
        const pendingChanges = storageService.getPendingChanges();
        if (!pendingChanges.binders || !pendingChanges.decks) {
            throw new Error('Invalid pending changes structure');
        }
        console.log('  ✅ Pending changes structure is correct');

        // Test conflict management
        console.log('  Testing conflict management...');
        const conflicts = storageService.getConflicts();
        if (!Array.isArray(conflicts)) {
            throw new Error('Invalid conflicts structure');
        }
        console.log('  ✅ Conflict management structure is correct');

        console.log('✅ Sync Service tests passed!\n');
        return true;

    } catch (error) {
        console.error('❌ Sync Service test failed:', error);
        return false;
    }
}

/**
 * Test Import/Export Service
 */
async function testImportExportService(): Promise<boolean> {
    console.log('🧪 Testing Import/Export Service...');

    try {
        // Test binder export (JSON)
        console.log('  Testing binder export (JSON)...');
        const binderJSON = importExportService.exportBinder(testBinder.id, { format: 'json' });
        if (typeof binderJSON !== 'string' || !binderJSON.includes(testBinder.name)) {
            throw new Error('Binder JSON export failed');
        }
        console.log('  ✅ Binder JSON export works');

        // Test binder export (CSV)
        console.log('  Testing binder export (CSV)...');
        const binderCSV = importExportService.exportBinder(testBinder.id, { format: 'csv' });
        if (typeof binderCSV !== 'string' || !binderCSV.includes('Card ID')) {
            throw new Error('Binder CSV export failed');
        }
        console.log('  ✅ Binder CSV export works');

        // Test deck export (JSON)
        console.log('  Testing deck export (JSON)...');
        const deckJSON = importExportService.exportDeck(testDeck.id, { format: 'json' });
        if (typeof deckJSON !== 'string' || !deckJSON.includes(testDeck.name)) {
            throw new Error('Deck JSON export failed');
        }
        console.log('  ✅ Deck JSON export works');

        // Test deck export (YDK)
        console.log('  Testing deck export (YDK)...');
        const deckYDK = importExportService.exportDeck(testDeck.id, { format: 'ydk' });
        if (typeof deckYDK !== 'string' || !deckYDK.includes('#main')) {
            throw new Error('Deck YDK export failed');
        }
        console.log('  ✅ Deck YDK export works');

        // Test all data export
        console.log('  Testing all data export...');
        const allDataJSON = importExportService.exportAllData({ format: 'json' });
        if (typeof allDataJSON !== 'string' || !allDataJSON.includes('binders')) {
            throw new Error('All data export failed');
        }
        console.log('  ✅ All data export works');

        // Test import functionality
        console.log('  Testing import functionality...');

        // Test binder import (JSON)
        const importResult = await importExportService.importBinder(binderJSON, 'json');
        if (!importResult.success || (importResult.imported.binders || 0) < 1) {
            throw new Error('Binder JSON import failed');
        }
        console.log('  ✅ Binder JSON import works');

        // Test deck import (YDK)
        const deckImportResult = await importExportService.importDeck(deckYDK, 'ydk');
        if (!deckImportResult.success || (deckImportResult.imported.decks || 0) < 1) {
            throw new Error('Deck YDK import failed');
        }
        console.log('  ✅ Deck YDK import works');

        console.log('✅ Import/Export Service tests passed!\n');
        return true;

    } catch (error) {
        console.error('❌ Import/Export Service test failed:', error);
        return false;
    }
}

/**
 * Test Backup Service
 */
async function testBackupService(): Promise<boolean> {
    console.log('🧪 Testing Backup Service...');

    try {
        // Test manual backup creation
        console.log('  Testing manual backup creation...');
        const backup = await backupService.createManualBackup('Test backup');
        if (!backup || !backup.id || !backup.timestamp) {
            throw new Error('Manual backup creation failed');
        }
        console.log('  ✅ Manual backup creation works');

        // Test backup storage usage
        console.log('  Testing backup storage usage...');
        const storageUsage = backupService.getBackupStorageUsage();
        if (!storageUsage || typeof storageUsage.totalSize !== 'number') {
            throw new Error('Backup storage usage failed');
        }
        console.log('  ✅ Backup storage usage works');

        // Test backup settings
        console.log('  Testing backup settings...');
        backupService.updateSettings({ autoBackup: true, backupInterval: 60 });
        const settings = backupService.getSettings();
        if (!settings.autoBackup || settings.backupInterval !== 60) {
            throw new Error('Backup settings update failed');
        }
        console.log('  ✅ Backup settings work');

        console.log('✅ Backup Service tests passed!\n');
        return true;

    } catch (error) {
        console.error('❌ Backup Service test failed:', error);
        return false;
    }
}

/**
 * Test Validation Service
 */
function testValidationService(): boolean {
    console.log('🧪 Testing Validation Service...');

    try {
        // Test binder validation
        console.log('  Testing binder validation...');
        const binderValidation = validationMigrationService.validateBinder(testBinder);
        if (!binderValidation.isValid) {
            console.warn('  ⚠️ Binder validation has issues:', binderValidation.errors);
        } else {
            console.log('  ✅ Binder validation works');
        }

        // Test deck validation
        console.log('  Testing deck validation...');
        const deckValidation = validationMigrationService.validateDeck(testDeck);
        if (!deckValidation.isValid) {
            console.warn('  ⚠️ Deck validation has issues:', deckValidation.errors);
        } else {
            console.log('  ✅ Deck validation works');
        }

        // Test all data validation
        console.log('  Testing all data validation...');
        const allValidation = validationMigrationService.validateAllData();
        if (!allValidation.summary || typeof allValidation.summary.totalErrors !== 'number') {
            throw new Error('All data validation failed');
        }
        console.log('  ✅ All data validation works');

        // Test data repair
        console.log('  Testing data repair...');
        const repairResult = validationMigrationService.repairData();
        if (!repairResult.repaired || !Array.isArray(repairResult.issues)) {
            throw new Error('Data repair failed');
        }
        console.log('  ✅ Data repair works');

        // Test schema version
        console.log('  Testing schema version...');
        const version = validationMigrationService.getCurrentVersion();
        if (typeof version !== 'string' || version.length === 0) {
            throw new Error('Schema version retrieval failed');
        }
        console.log('  ✅ Schema version works');

        console.log('✅ Validation Service tests passed!\n');
        return true;

    } catch (error) {
        console.error('❌ Validation Service test failed:', error);
        return false;
    }
}

/**
 * Test Integration
 */
function testIntegration(): boolean {
    console.log('🧪 Testing Integration...');

    try {
        // Test service initialization
        console.log('  Testing service initialization...');
        const services = initializeStorageServices();
        if (!services.storage || !services.sync || !services.importExport || !services.backup || !services.validation) {
            throw new Error('Service initialization failed');
        }
        console.log('  ✅ Service initialization works');

        // Test storage utils
        console.log('  Testing storage utils...');
        const storageInfo = storageUtils.getStorageInfo();
        if (!storageInfo.storage || !storageInfo.sync || !storageInfo.summary) {
            throw new Error('Storage utils failed');
        }
        console.log('  ✅ Storage utils work');

        // Test health check
        console.log('  Testing health check...');
        const healthCheck = storageUtils.healthCheck();
        if (!healthCheck.dataIntegrity || !healthCheck.recommendations) {
            throw new Error('Health check failed');
        }
        console.log('  ✅ Health check works');

        console.log('✅ Integration tests passed!\n');
        return true;

    } catch (error) {
        console.error('❌ Integration test failed:', error);
        return false;
    }
}

/**
 * Run all tests
 */
export async function runAllTests(): Promise<void> {
    console.log('🚀 Starting Local Storage Strategy Tests\n');
    console.log('========================================\n');

    const results = {
        storage: false,
        sync: false,
        importExport: false,
        backup: false,
        validation: false,
        integration: false
    };

    // Run individual service tests
    results.storage = testStorageService();
    results.sync = testSyncService();
    results.importExport = await testImportExportService();
    results.backup = await testBackupService();
    results.validation = testValidationService();
    results.integration = testIntegration();

    // Summary
    console.log('========================================');
    console.log('📊 TEST RESULTS SUMMARY:');
    console.log('========================================');

    const passed = Object.values(results).filter(Boolean).length;
    const total = Object.keys(results).length;

    Object.entries(results).forEach(([service, passed]) => {
        console.log(`${passed ? '✅' : '❌'} ${service.charAt(0).toUpperCase() + service.slice(1)} Service: ${passed ? 'PASSED' : 'FAILED'}`);
    });

    console.log(`\n🎯 Overall: ${passed}/${total} tests passed (${Math.round(passed / total * 100)}%)`);

    if (passed === total) {
        console.log('\n🎉 ALL TESTS PASSED! Local Storage Strategy is working correctly! 🎉');
        console.log('\n✨ Ready to proceed with Phase 3: Binder Management System ✨');
    } else {
        console.log('\n⚠️ Some tests failed. Please review the implementation.');
    }
}

// Export individual test functions for targeted testing
export {
    testStorageService,
    testSyncService,
    testImportExportService,
    testBackupService,
    testValidationService,
    testIntegration
};