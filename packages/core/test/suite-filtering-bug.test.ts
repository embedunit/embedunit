// packages/core/test/suite-filtering-bug.test.ts
import { describe, it, resetRegistry, runTests, getTestList } from '../src';
import { expect } from '@embedunit/assert';

describe('Suite Filtering Bug Reproduction', () => {
    it('should only run the specified suite and its nested suites', async () => {
        resetRegistry();

        // Set up test suites that mimic your ResourceService structure
        describe('ResourceService - Basic Loading', () => {
            it('basic test 1', () => {
                expect(true).toBe(true);
            });

            describe('Texture Loading with fetch()', () => {
                it('should fetch texture', () => {
                    expect(true).toBe(true);
                });
            });

            describe('Bundle Loading', () => {
                it('should handle bundle loading', () => {
                    expect(true).toBe(true);
                });
            });
        });

        describe('ResourceService - Cache Management', () => {
            it('cache test 1', () => {
                expect(true).toBe(true);
            });

            describe('Cache Statistics', () => {
                it('should track stats', () => {
                    expect(true).toBe(true);
                });
            });
        });

        describe('ResourceService - Concurrent Loading', () => {
            it('concurrent test 1', () => {
                expect(true).toBe(true);
            });
        });

        describe('ResourceService - Error Handling', () => {
            it('error test 1', () => {
                expect(true).toBe(true);
            });
        });

        // Now test the filtering
        const testResult = await runTests({
            only: { suite: 'ResourceService - Basic Loading' },
            includePassed: true, includeSkipped: true
        });

        // Combine all results for filtering verification
        const results = [
            ...(testResult.passed || []).map(r => ({ ...r, status: 'passed' })),
            ...(testResult.failures || []).map(r => ({ ...r, status: 'failed' })),
            ...(testResult.skipped || []).map(r => ({ ...r, status: 'skipped', duration: 0 }))
        ];

        // Log all suites that actually ran for debugging
        const ranSuites = [...new Set(results.map(r => r.suite))];
        console.log('Suites that ran:', ranSuites);

        // Check that ONLY "ResourceService - Basic Loading" and its nested suites ran
        const expectedSuites = [
            'ResourceService - Basic Loading',
            'ResourceService - Basic Loading > Texture Loading with fetch()',
            'ResourceService - Basic Loading > Bundle Loading'
        ];

        const unexpectedSuites = ranSuites.filter(suite =>
            !suite.startsWith('ResourceService - Basic Loading')
        );

        // This should be empty - no unexpected suites should run
        expect(unexpectedSuites).toEqual([]);

        // These suites should NOT appear in results
        const shouldNotRun = [
            'ResourceService - Cache Management',
            'ResourceService - Concurrent Loading',
            'ResourceService - Error Handling'
        ];

        shouldNotRun.forEach(suite => {
            const found = ranSuites.some(ranSuite => ranSuite.startsWith(suite));
            expect(found).toBe(false);
        });

        // Should only run 3 tests total (1 + 1 + 1 from the nested describes)
        expect(results.length).toBe(3);

        // All should be from the target suite or its children
        results.forEach(result => {
            expect(result.suite.startsWith('ResourceService - Basic Loading')).toBe(true);
        });
    });

    it('should demonstrate exact vs partial matching behavior', async () => {
        resetRegistry();

        // Set up suites with similar names to test partial matching
        describe('ResourceService', () => {
            it('parent test', () => {
                expect(true).toBe(true);
            });
        });

        describe('ResourceService - Basic', () => {
            it('basic test', () => {
                expect(true).toBe(true);
            });
        });

        describe('ResourceService - Basic Loading', () => {
            it('full test', () => {
                expect(true).toBe(true);
            });
        });

        describe('ResourceService - Basic Loading Extended', () => {
            it('extended test', () => {
                expect(true).toBe(true);
            });
        });

        // Test filtering by "ResourceService - Basic"
        const testResult = await runTests({
            only: { suite: 'ResourceService - Basic' },
            includePassed: true, includeSkipped: true
        });

        // Combine all results for filtering verification
        const results = [
            ...(testResult.passed || []).map(r => ({ ...r, status: 'passed' })),
            ...(testResult.failures || []).map(r => ({ ...r, status: 'failed' })),
            ...(testResult.skipped || []).map(r => ({ ...r, status: 'skipped', duration: 0 }))
        ];
        const ranSuites = [...new Set(results.map(r => r.suite))];

        console.log('For "ResourceService - Basic" filter, suites that ran:', ranSuites);

        // Should only run "ResourceService - Basic", not partial matches
        const shouldRun = ['ResourceService - Basic'];
        const shouldNotRun = [
            'ResourceService',
            'ResourceService - Basic Loading',
            'ResourceService - Basic Loading Extended'
        ];

        shouldRun.forEach(suite => {
            expect(ranSuites).toContain(suite);
        });

        shouldNotRun.forEach(suite => {
            expect(ranSuites).not.toContain(suite);
        });
    });

    it('should test getTestList to see all available suites', async () => {
        resetRegistry();

        // Set up the same structure as before
        describe('ResourceService - Basic Loading', () => {
            describe('Nested Suite A', () => {
                it('test A', () => expect(true).toBe(true));
            });
        });

        describe('ResourceService - Cache Management', () => {
            it('cache test', () => expect(true).toBe(true));
        });

        // Get all test metadata
        const allTests = getTestList();
        const allSuites = [...new Set(allTests.map(t => t.suite))];

        console.log('All available suites:', allSuites);
        console.log('All tests:', allTests.map(t => `${t.suite} > ${t.test}`));

        // Verify that getTestList shows all our test suites
        expect(allSuites).toContain('ResourceService - Basic Loading > Nested Suite A');
        expect(allSuites).toContain('ResourceService - Cache Management');

        // Log for debugging
        expect(allSuites.length).toBeGreaterThan(0);
    });
});
