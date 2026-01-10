// packages/core/test/only-suite-nested.test.ts
import { describe, it, beforeAll, afterAll, resetRegistry, runTests } from '../src';
import { expect } from '@embedunit/assert';

describe('Only Suite Filter with Nested Describes', () => {

    it('should run all nested tests when filtering by parent suite', async () => {
        resetRegistry();

        // Register test structure
        describe('Parent Suite', () => {
            beforeAll(() => {
                console.log('Parent beforeAll');
            });

            it('direct test in parent', () => {
                expect(true).toBe(true);
            });

            describe('Child Suite 1', () => {
                it('test in child 1', () => {
                    expect(true).toBe(true);
                });

                describe('Grandchild Suite', () => {
                    it('test in grandchild', () => {
                        expect(true).toBe(true);
                    });
                });
            });

            describe('Child Suite 2', () => {
                it('test in child 2', () => {
                    expect(true).toBe(true);
                });
            });

            afterAll(() => {
                console.log('Parent afterAll');
            });
        });

        describe('Other Suite', () => {
            it('should not run', () => {
                expect(true).toBe(false); // Should not execute
            });
        });

        // Run with only filter for parent suite
        const testResult = await runTests({
            only: { suite: 'Parent Suite' },
            includePassed: true, includeSkipped: true
        });
        const results = [
            ...(testResult.passed || []).map(r => ({ ...r, status: 'passed' })),
            ...(testResult.failures || []).map(r => ({ ...r, status: 'failed' })),
            ...(testResult.skipped || []).map(r => ({ ...r, status: 'skipped', duration: 0 }))
        ];

        // Should run all tests in Parent Suite and nested suites
        expect(results.length).toBe(4);
        expect(results.filter(r => r.status === 'passed').length).toBe(4);

        // Check that all nested tests ran
        const suites = results.map(r => r.suite);
        expect(suites).toContain('Parent Suite');
        expect(suites).toContain('Parent Suite > Child Suite 1');
        expect(suites).toContain('Parent Suite > Child Suite 1 > Grandchild Suite');
        expect(suites).toContain('Parent Suite > Child Suite 2');
    });

    it('should run only specific nested suite when filtered', async () => {
        resetRegistry();

        describe('Root Suite', () => {
            describe('Level 1', () => {
                it('test 1', () => {
                    expect(true).toBe(true);
                });

                describe('Level 2', () => {
                    it('test 2', () => {
                        expect(true).toBe(true);
                    });

                    describe('Level 3', () => {
                        it('test 3', () => {
                            expect(true).toBe(true);
                        });
                    });
                });
            });

            describe('Another Level 1', () => {
                it('should not run', () => {
                    expect(true).toBe(false);
                });
            });
        });

        // Filter for nested suite
        const testResult = await runTests({
            only: { suite: 'Root Suite > Level 1 > Level 2' },
            includePassed: true, includeSkipped: true
        });
        const results = [
            ...(testResult.passed || []).map(r => ({ ...r, status: 'passed' })),
            ...(testResult.failures || []).map(r => ({ ...r, status: 'failed' })),
            ...(testResult.skipped || []).map(r => ({ ...r, status: 'skipped', duration: 0 }))
        ];

        // Should run Level 2 and its children
        expect(results.length).toBe(2);
        expect(results.filter(r => r.status === 'passed').length).toBe(2);

        const testNames = results.map(r => r.test);
        expect(testNames).toContain('test 2');
        expect(testNames).toContain('test 3');
    });

    it('should handle exact match for leaf suite', async () => {
        resetRegistry();

        describe('A', () => {
            describe('B', () => {
                it('test in B', () => {
                    expect(true).toBe(true);
                });

                describe('C', () => {
                    it('test in C', () => {
                        expect(true).toBe(true);
                    });
                });
            });
        });

        const testResult = await runTests({
            only: { suite: 'A > B > C' },
            includePassed: true, includeSkipped: true
        });
        const results = [
            ...(testResult.passed || []).map(r => ({ ...r, status: 'passed' })),
            ...(testResult.failures || []).map(r => ({ ...r, status: 'failed' })),
            ...(testResult.skipped || []).map(r => ({ ...r, status: 'skipped', duration: 0 }))
        ];

        // Should only run test in C
        expect(results.length).toBe(1);
        expect(results[0].suite).toBe('A > B > C');
        expect(results[0].test).toBe('test in C');
    });

    it('should work with both suite and test filters', async () => {
        resetRegistry();

        describe('Suite X', () => {
            it('test alpha', () => {
                expect(true).toBe(true);
            });

            it('test beta', () => {
                expect(true).toBe(true);
            });

            describe('Suite Y', () => {
                it('test alpha', () => {
                    expect(true).toBe(true);
                });

                it('test gamma', () => {
                    expect(true).toBe(true);
                });
            });
        });

        // Filter for Suite X and only 'test alpha'
        const testResult = await runTests({
            only: {
                suite: 'Suite X',
                test: 'test alpha'
            },
            includePassed: true, includeSkipped: true
        });
        const results = [
            ...(testResult.passed || []).map(r => ({ ...r, status: 'passed' })),
            ...(testResult.failures || []).map(r => ({ ...r, status: 'failed' })),
            ...(testResult.skipped || []).map(r => ({ ...r, status: 'skipped', duration: 0 }))
        ];

        // Should run both 'test alpha' tests (in X and in Y)
        expect(results.length).toBe(2);
        expect(results[0].test).toBe('test alpha');
        expect(results[1].test).toBe('test alpha');
        expect(results[0].suite).toBe('Suite X');
        expect(results[1].suite).toBe('Suite X > Suite Y');
    });
});
