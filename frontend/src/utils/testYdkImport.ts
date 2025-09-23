import { importExportService } from '../services/importExport';

/**
 * Test the .ydk import functionality with the provided 2003.ydk file
 * Run this in the browser console to test
 */
export async function testYdkImport() {
    console.log('Testing YDK import functionality...');

    // Example YDK content from the 2003.ydk file
    const ydkContent = `#main
72630549
77585513
7572887
95956346
95956346
24317029
24317029
24317029
78010363
37101832
37101832
13215230
2460565
15150365
15150365
83994646
83994646
83994646
15383415
15383415
15383415
95178994
95178994
28933734
28933734
7089711
7089711
7089711
9076207
31560081
53129443
66788016
66788016
19613556
32807846
32807846
72302403
70368879
14087893
5318639
40619825
40619825
56747793
29401950
29401950
60082869
37580756
37580756
4178474
4178474
4178474
56120475
56120475
56120475
53582587
4206964
83887306
97077563
77414722
77414722

#extra
25655502
58528964
15237615
70681994
15237615
28593363
28593363
28593363
17881964
17881964
89112729
95952802
1641882
1641882
66889139

!side
60682203
60682203
60682203
43434803
46918794
46918794
46918794
23171610
59197169
59197169
59197169`;

    try {
        // Test import
        const result = await importExportService.importDeck(ydkContent, 'ydk');

        console.log('Import result:', result);

        if (result.success) {
            console.log('✅ YDK import successful!');
            console.log(`Imported ${result.imported.decks} deck(s) with ${result.imported.cards} cards`);

            // Test export (get the imported deck and export it back)
            const decks = (window as any).storageService?.getDecks() || [];
            const importedDeck = decks.find((deck: any) => deck.name === 'Imported Deck (YDK)');

            if (importedDeck) {
                console.log('Testing YDK export...');
                const exportedContent = importExportService.exportDeck(importedDeck.id, { format: 'ydk' });
                console.log('✅ YDK export successful!');
                console.log('Exported content preview:', exportedContent.toString().substring(0, 200) + '...');

                // Test roundtrip consistency
                const reimportResult = await importExportService.importDeck(exportedContent as string, 'ydk');
                if (reimportResult.success) {
                    console.log('✅ Roundtrip test successful!');
                } else {
                    console.log('❌ Roundtrip test failed:', reimportResult.errors);
                }
            } else {
                console.log('⚠️ Could not find imported deck for export test');
            }
        } else {
            console.log('❌ YDK import failed:', result.errors);
        }

        if (result.warnings.length > 0) {
            console.log('⚠️ Warnings:', result.warnings);
        }

        return result;
    } catch (error) {
        console.error('❌ Test failed with exception:', error);
        return { success: false, errors: [String(error)] };
    }
}

/**
 * Test all export formats
 */
export async function testAllExportFormats() {
    console.log('Testing all export formats...');

    const decks = (window as any).storageService?.getDecks() || [];
    if (decks.length === 0) {
        console.log('No decks available for testing. Please import a deck first.');
        return;
    }

    const testDeck = decks[0];
    console.log(`Testing with deck: ${testDeck.name}`);

    const formats = ['ydk', 'json', 'txt', 'csv'] as const;

    for (const format of formats) {
        try {
            const exported = importExportService.exportDeck(testDeck.id, { format });
            console.log(`✅ ${format.toUpperCase()} export successful (${exported.toString().length} characters)`);
        } catch (error) {
            console.log(`❌ ${format.toUpperCase()} export failed:`, error);
        }
    }
}

/**
 * Helper function to download test YDK file
 */
export function downloadTestYdk() {
    const ydkContent = `#created by Yu-Gi-Oh Deck Builder Test
#main
72630549
77585513
7572887
95956346
95956346
24317029
24317029
24317029

#extra
25655502
58528964

!side
60682203
60682203`;

    importExportService.downloadFile(ydkContent, 'test-deck.ydk', 'text/plain');
    console.log('✅ Test YDK file downloaded');
}

// Make functions available globally for testing
if (typeof window !== 'undefined') {
    (window as any).testYdkImport = testYdkImport;
    (window as any).testAllExportFormats = testAllExportFormats;
    (window as any).downloadTestYdk = downloadTestYdk;

    console.log('YDK test functions available:');
    console.log('- testYdkImport(): Test importing the 2003.ydk file');
    console.log('- testAllExportFormats(): Test all export formats');
    console.log('- downloadTestYdk(): Download a test .ydk file');
}