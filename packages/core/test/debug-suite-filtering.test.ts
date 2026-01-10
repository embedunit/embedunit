// packages/core/test/debug-suite-filtering.test.ts
import { describe, it, resetRegistry, runTests, getTestList } from '../src';
import { expect } from '@embedunit/assert';

describe('Debug Suite Filtering', () => {
    it('should help debug your real scenario', async () => {
        // This test is designed to be run in your environment
        // to understand what's happening with your ResourceService tests

        console.log('\n=== DEBUGGING SUITE FILTERING ===');

        // 1. Get ALL tests that are currently loaded
        const allTests = getTestList();
        console.log('\n1. All loaded tests:');
        allTests.forEach(t => {
            console.log(`   ${t.suite} > ${t.test}`);
        });

        // 2. Get unique suite names
        const allSuites = [...new Set(allTests.map(t => t.suite))];
        console.log('\n2. All unique suite names:');
        allSuites.forEach(suite => {
            console.log(`   "${suite}"`);
        });

        // 3. Find ResourceService related suites
        const resourceServiceSuites = allSuites.filter(suite =>
            suite.includes('ResourceService')
        );
        console.log('\n3. ResourceService related suites:');
        resourceServiceSuites.forEach(suite => {
            console.log(`   "${suite}"`);
        });

        // 4. Test exact filtering behavior
        if (resourceServiceSuites.length > 0) {
            console.log('\n4. Testing filtering with first ResourceService suite...');
            const targetSuite = resourceServiceSuites[0];
            console.log(`   Target suite: "${targetSuite}"`);

            const testResult = await runTests({
                only: { suite: targetSuite },
                includePassed: true, includeSkipped: true
            });

            const results = [
            ...(testResult.passed || []).map(r => ({ ...r, status: 'passed' })),
            ...(testResult.failures || []).map(r => ({ ...r, status: 'failed' })),
            ...(testResult.skipped || []).map(r => ({ ...r, status: 'skipped', duration: 0 }))
        ];
            const ranSuites = [...new Set(results.map(r => r.suite))];

            console.log('\n   Suites that actually ran:');
            ranSuites.forEach(suite => {
                console.log(`     "${suite}"`);
            });

            console.log('\n   Expected vs Actual:');
            console.log(`     Expected: Only "${targetSuite}" and its children`);
            console.log(`     Actual count: ${ranSuites.length} suites ran`);

            // Check for unexpected suites
            const unexpectedSuites = ranSuites.filter(suite =>
                !suite.startsWith(targetSuite)
            );

            if (unexpectedSuites.length > 0) {
                console.log('\n   ❌ UNEXPECTED SUITES RAN:');
                unexpectedSuites.forEach(suite => {
                    console.log(`     "${suite}"`);
                });
            } else {
                console.log('\n   ✅ Filtering worked correctly!');
            }
        }

        console.log('\n=== END DEBUG INFO ===\n');

        // Always pass - this is just for debugging
        expect(true).toBe(true);
    });

    it('should test filtering internals', async () => {
        // Test the internal filtering logic
        console.log('\n=== TESTING FILTER INTERNALS ===');

        // Test how the only.suite filter works
        const testSuites = [
            'ResourceService - Basic Loading',
            'ResourceService - Basic Loading > Texture Loading',
            'ResourceService - Cache Management',
            'ResourceService - Error Handling',
            'Other Suite'
        ];

        const targetSuite = 'ResourceService - Basic Loading';

        console.log(`\nTesting filter logic for target: "${targetSuite}"`);
        console.log('Suite matching results:');

        testSuites.forEach(suite => {
            // This is the logic from the runner's suite filtering
            const shouldMatch = suite === targetSuite || suite.startsWith(targetSuite + ' > ');
            console.log(`   "${suite}" -> ${shouldMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
        });

        console.log('\n=== END FILTER INTERNALS ===\n');

        expect(true).toBe(true);
    });
});
