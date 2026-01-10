// packages/core/test/multiple-suite-filter.test.ts
import { describe, it, resetRegistry, runTests } from '../src';
import { expect } from '@embedunit/assert';

describe('Multiple Suite and Test Filtering', () => {

    it('should run multiple suites when specified as array', async () => {
        resetRegistry();

        // Register test structure
        describe('Suite A', () => {
            it('test in A', () => {
                expect(true).toBe(true);
            });
        });

        describe('Suite B', () => {
            it('test in B', () => {
                expect(true).toBe(true);
            });
        });

        describe('Suite C', () => {
            it('test in C', () => {
                expect(true).toBe(true);
            });
        });

        describe('Suite D', () => {
            it('test in D', () => {
                expect(true).toBe(false); // Should not run
            });
        });

        // Run with multiple suites
        const testResult = await runTests({
            only: { suites: ['Suite A', 'Suite C'] },
            includePassed: true, includeSkipped: true
        });
        const results = [
            ...(testResult.passed || []).map(r => ({ ...r, status: 'passed' })),
            ...(testResult.failures || []).map(r => ({ ...r, status: 'failed' })),
            ...(testResult.skipped || []).map(r => ({ ...r, status: 'skipped', duration: 0 }))
        ];

        expect(results.length).toBe(2);
        expect(results.map(r => r.suite).sort()).toEqual(['Suite A', 'Suite C']);
    });

    it('should run multiple tests when specified as array', async () => {
        resetRegistry();

        describe('Test Suite', () => {
            it('alpha', () => {
                expect(true).toBe(true);
            });

            it('beta', () => {
                expect(true).toBe(true);
            });

            it('gamma', () => {
                expect(true).toBe(true);
            });

            it('delta', () => {
                expect(true).toBe(false); // Should not run
            });
        });

        // Run specific tests
        const testResult = await runTests({
            only: { tests: ['alpha', 'gamma'] },
            includePassed: true, includeSkipped: true
        });
        const results = [
            ...(testResult.passed || []).map(r => ({ ...r, status: 'passed' })),
            ...(testResult.failures || []).map(r => ({ ...r, status: 'failed' })),
            ...(testResult.skipped || []).map(r => ({ ...r, status: 'skipped', duration: 0 }))
        ];

        expect(results.length).toBe(2);
        expect(results.map(r => r.test).sort()).toEqual(['alpha', 'gamma']);
    });

    it('should support both array and single string formats', async () => {
        resetRegistry();

        describe('Suite X', () => {
            it('test 1', () => expect(true).toBe(true));
            it('test 2', () => expect(true).toBe(true));
        });

        describe('Suite Y', () => {
            it('test 1', () => expect(true).toBe(true));
        });

        // Test with mixed formats
        const testResult1 = await runTests({
            only: { suite: 'Suite X' },  // Single string
            includePassed: true, includeSkipped: true
        });
        const results1 = [
            ...(testResult1.passed || []).map(r => ({ ...r, status: 'passed' })),
            ...(testResult1.failures || []).map(r => ({ ...r, status: 'failed' })),
            ...(testResult1.skipped || []).map(r => ({ ...r, status: 'skipped', duration: 0 }))
        ];
        expect(results1.length).toBe(2);

        resetRegistry();
        describe('Suite X', () => {
            it('test 1', () => expect(true).toBe(true));
            it('test 2', () => expect(true).toBe(true));
        });
        describe('Suite Y', () => {
            it('test 1', () => expect(true).toBe(true));
        });

        const testResult2 = await runTests({
            only: { suite: ['Suite X'] },  // Array with single item
            includePassed: true, includeSkipped: true
        });
        const results2 = [
            ...(testResult2.passed || []).map(r => ({ ...r, status: 'passed' })),
            ...(testResult2.failures || []).map(r => ({ ...r, status: 'failed' })),
            ...(testResult2.skipped || []).map(r => ({ ...r, status: 'skipped', duration: 0 }))
        ];
        expect(results2.length).toBe(2);
    });

    it('should run nested suites for each specified parent', async () => {
        resetRegistry();

        describe('Parent A', () => {
            describe('Child A1', () => {
                it('test a1', () => expect(true).toBe(true));
            });
            describe('Child A2', () => {
                it('test a2', () => expect(true).toBe(true));
            });
        });

        describe('Parent B', () => {
            describe('Child B1', () => {
                it('test b1', () => expect(true).toBe(true));
            });
        });

        describe('Parent C', () => {
            it('test c', () => expect(true).toBe(false)); // Should not run
        });

        const testResult = await runTests({
            only: { suites: ['Parent A', 'Parent B'] },
            includePassed: true, includeSkipped: true
        });
        const results = [
            ...(testResult.passed || []).map(r => ({ ...r, status: 'passed' })),
            ...(testResult.failures || []).map(r => ({ ...r, status: 'failed' })),
            ...(testResult.skipped || []).map(r => ({ ...r, status: 'skipped', duration: 0 }))
        ];

        expect(results.length).toBe(3);
        const suites = results.map(r => r.suite);
        expect(suites).toContain('Parent A > Child A1');
        expect(suites).toContain('Parent A > Child A2');
        expect(suites).toContain('Parent B > Child B1');
    });

    it('should combine suite and test filters', async () => {
        resetRegistry();

        describe('Suite 1', () => {
            it('foo', () => expect(true).toBe(true));
            it('bar', () => expect(true).toBe(true));
            it('baz', () => expect(true).toBe(true));
        });

        describe('Suite 2', () => {
            it('foo', () => expect(true).toBe(true));
            it('bar', () => expect(true).toBe(true));
        });

        describe('Suite 3', () => {
            it('foo', () => expect(true).toBe(false)); // Should not run
        });

        // Run only 'foo' and 'bar' tests in Suite 1 and 2
        const testResult = await runTests({
            only: {
                suites: ['Suite 1', 'Suite 2'],
                tests: ['foo', 'bar']
            },
            includePassed: true, includeSkipped: true
        });
        const results = [
            ...(testResult.passed || []).map(r => ({ ...r, status: 'passed' })),
            ...(testResult.failures || []).map(r => ({ ...r, status: 'failed' })),
            ...(testResult.skipped || []).map(r => ({ ...r, status: 'skipped', duration: 0 }))
        ];

        expect(results.length).toBe(4);
        results.forEach(r => {
            expect(['Suite 1', 'Suite 2']).toContain(r.suite);
            expect(['foo', 'bar']).toContain(r.test);
        });
    });

    it('should filter by grep pattern (string)', async () => {
        resetRegistry();

        describe('API Tests', () => {
            it('should handle user creation', () => expect(true).toBe(true));
            it('should handle user deletion', () => expect(true).toBe(true));
            it('should handle admin creation', () => expect(true).toBe(true));
        });

        describe('UI Tests', () => {
            it('should handle user login', () => expect(true).toBe(true));
            it('should handle user logout', () => expect(true).toBe(true));
        });

        // Filter for tests containing "user"
        const testResult = await runTests({
            grep: 'user',
            includePassed: true, includeSkipped: true
        });
        const results = [
            ...(testResult.passed || []).map(r => ({ ...r, status: 'passed' })),
            ...(testResult.failures || []).map(r => ({ ...r, status: 'failed' })),
            ...(testResult.skipped || []).map(r => ({ ...r, status: 'skipped', duration: 0 }))
        ];

        expect(results.length).toBe(4);
        results.forEach(r => {
            expect(`${r.suite} > ${r.test}`).toMatch(/user/);
        });
    });

    it('should filter by grep pattern (regex)', async () => {
        resetRegistry();

        describe('Component Tests', () => {
            it('should render button component', () => expect(true).toBe(true));
            it('should render input component', () => expect(true).toBe(true));
            it('should handle button click', () => expect(true).toBe(true));
            it('should validate form input', () => expect(true).toBe(true));
        });

        // Filter for tests starting with "should render"
        const testResult = await runTests({
            grep: /^Component Tests > should render/,
            includePassed: true, includeSkipped: true
        });
        const results = [
            ...(testResult.passed || []).map(r => ({ ...r, status: 'passed' })),
            ...(testResult.failures || []).map(r => ({ ...r, status: 'failed' })),
            ...(testResult.skipped || []).map(r => ({ ...r, status: 'skipped', duration: 0 }))
        ];

        expect(results.length).toBe(2);
        expect(results.map(r => r.test)).toEqual([
            'should render button component',
            'should render input component'
        ]);
    });

    it('should exclude tests with grepInvert', async () => {
        resetRegistry();

        describe('Performance Tests', () => {
            it('fast test A', () => expect(true).toBe(true));
            it('slow test B', () => expect(true).toBe(true));
            it('fast test C', () => expect(true).toBe(true));
            it('slow test D', () => expect(true).toBe(true));
        });

        // Exclude slow tests
        const testResult = await runTests({
            grepInvert: 'slow',
            includePassed: true, includeSkipped: true
        });
        const results = [
            ...(testResult.passed || []).map(r => ({ ...r, status: 'passed' })),
            ...(testResult.failures || []).map(r => ({ ...r, status: 'failed' })),
            ...(testResult.skipped || []).map(r => ({ ...r, status: 'skipped', duration: 0 }))
        ];

        expect(results.length).toBe(2);
        expect(results.map(r => r.test)).toEqual([
            'fast test A',
            'fast test C'
        ]);
    });

    it('should combine grep and grepInvert', async () => {
        resetRegistry();

        describe('Integration Tests', () => {
            it('API integration test', () => expect(true).toBe(true));
            it('UI integration test', () => expect(true).toBe(true));
            it('API unit test', () => expect(true).toBe(true));
            it('UI unit test', () => expect(true).toBe(true));
        });

        // Include "integration" but exclude "UI"
        const testResult = await runTests({
            grep: 'integration',
            grepInvert: 'UI',
            includePassed: true, includeSkipped: true
        });
        const results = [
            ...(testResult.passed || []).map(r => ({ ...r, status: 'passed' })),
            ...(testResult.failures || []).map(r => ({ ...r, status: 'failed' })),
            ...(testResult.skipped || []).map(r => ({ ...r, status: 'skipped', duration: 0 }))
        ];

        expect(results.length).toBe(1);
        expect(results[0].test).toBe('API integration test');
    });
});
