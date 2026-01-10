// packages/core/test/filtered-getTestList.test.ts
import { describe, it, beforeEach, resetRegistry, getTestList, runTests } from '../src';
import type { FilterOptions } from '../src';
import { expect } from '@embedunit/assert';

describe('Filtered getTestList', () => {
    beforeEach(() => {
        resetRegistry();
    });

    it('should return all tests when no filter is provided', () => {
        // Set up test structure
        describe('Suite A', () => {
            it('test 1', () => expect(true).toBe(true));
            it('test 2', () => expect(true).toBe(true));
        });

        describe('Suite B', () => {
            it('test 3', () => expect(true).toBe(true));
        });

        const allTests = getTestList();

        expect(allTests).toHaveLength(3);
        expect(allTests.map(t => t.test)).toEqual(['test 1', 'test 2', 'test 3']);
    });

    it('should filter by suite name', () => {
        // Set up test structure similar to ResourceService scenario
        describe('ResourceService - Basic Loading', () => {
            it('should load basic resource', () => expect(true).toBe(true));

            describe('Texture Loading', () => {
                it('should load texture', () => expect(true).toBe(true));
            });
        });

        describe('ResourceService - Cache Management', () => {
            it('should manage cache', () => expect(true).toBe(true));
        });

        describe('ResourceService - Error Handling', () => {
            it('should handle errors', () => expect(true).toBe(true));
        });

        // Filter for only Basic Loading suite
        const filteredTests = getTestList({
            only: { suite: 'ResourceService - Basic Loading' }
        });

        expect(filteredTests).toHaveLength(2);
        expect(filteredTests.map(t => t.suite)).toEqual([
            'ResourceService - Basic Loading',
            'ResourceService - Basic Loading > Texture Loading'
        ]);

        // Should NOT include other ResourceService suites
        const suiteNames = filteredTests.map(t => t.suite);
        expect(suiteNames).not.toContain('ResourceService - Cache Management');
        expect(suiteNames).not.toContain('ResourceService - Error Handling');
    });

    it('should filter by test name', () => {
        describe('Suite A', () => {
            it('should load resource', () => expect(true).toBe(true));
            it('should save data', () => expect(true).toBe(true));
            it('should delete item', () => expect(true).toBe(true));
        });

        const filteredTests = getTestList({
            only: { test: 'should load resource' }
        });

        expect(filteredTests).toHaveLength(1);
        expect(filteredTests[0].test).toBe('should load resource');
    });

    it('should filter by grep pattern', () => {
        describe('Suite A', () => {
            it('should load texture', () => expect(true).toBe(true));
            it('should load audio', () => expect(true).toBe(true));
            it('should save data', () => expect(true).toBe(true));
        });

        const filteredTests = getTestList({
            grep: /load/
        });

        expect(filteredTests).toHaveLength(2);
        expect(filteredTests.map(t => t.test)).toEqual([
            'should load texture',
            'should load audio'
        ]);
    });

    it('should filter by grepInvert pattern', () => {
        describe('Suite A', () => {
            it('should load texture', () => expect(true).toBe(true));
            it('should load audio', () => expect(true).toBe(true));
            it('should save data', () => expect(true).toBe(true));
        });

        const filteredTests = getTestList({
            grepInvert: /load/
        });

        expect(filteredTests).toHaveLength(1);
        expect(filteredTests[0].test).toBe('should save data');
    });

    it('should filter by custom filter function', () => {
        describe('Suite A', () => {
            it('test 1', () => expect(true).toBe(true));
            it('test 2', () => expect(true).toBe(true));
            it('test 3', () => expect(true).toBe(true));
        });

        const filteredTests = getTestList({
            filter: (suite, test) => test.includes('2') || test.includes('3')
        });

        expect(filteredTests).toHaveLength(2);
        expect(filteredTests.map(t => t.test)).toEqual(['test 2', 'test 3']);
    });

    it('should combine multiple filter criteria', () => {
        describe('ResourceService - Basic Loading', () => {
            it('should load texture', () => expect(true).toBe(true));
            it('should save texture', () => expect(true).toBe(true));
        });

        describe('ResourceService - Cache Management', () => {
            it('should load cache', () => expect(true).toBe(true));
        });

        const filteredTests = getTestList({
            only: { suite: 'ResourceService - Basic Loading' },
            grep: /load/
        });

        expect(filteredTests).toHaveLength(1);
        expect(filteredTests[0].test).toBe('should load texture');
        expect(filteredTests[0].suite).toBe('ResourceService - Basic Loading');
    });

    it('should handle nested suites correctly', () => {
        describe('Parent Suite', () => {
            describe('Child Suite A', () => {
                it('test A1', () => expect(true).toBe(true));
                it('test A2', () => expect(true).toBe(true));
            });

            describe('Child Suite B', () => {
                it('test B1', () => expect(true).toBe(true));
            });
        });

        const filteredTests = getTestList({
            only: { suite: 'Parent Suite' }
        });

        expect(filteredTests).toHaveLength(3);
        const suites = filteredTests.map(t => t.suite);
        expect(suites).toContain('Parent Suite > Child Suite A');
        expect(suites).toContain('Parent Suite > Child Suite B');
    });

    it('should match exact suite names and children', () => {
        describe('ResourceService', () => {
            it('parent test', () => expect(true).toBe(true));
        });

        describe('ResourceService - Basic', () => {
            it('basic test', () => expect(true).toBe(true));
        });

        describe('ResourceService - Basic Loading', () => {
            it('loading test', () => expect(true).toBe(true));
        });

        const filteredTests = getTestList({
            only: { suite: 'ResourceService - Basic' }
        });

        expect(filteredTests).toHaveLength(1);
        expect(filteredTests[0].suite).toBe('ResourceService - Basic');
        expect(filteredTests[0].test).toBe('basic test');
    });

    it('should produce same results as runTests filtering', async () => {
        // Set up test structure
        describe('ResourceService - Basic Loading', () => {
            it('test 1', () => expect(true).toBe(true));

            describe('Nested Suite', () => {
                it('test 2', () => expect(true).toBe(true));
            });
        });

        describe('ResourceService - Cache Management', () => {
            it('test 3', () => expect(true).toBe(true));
        });

        const filterOptions: FilterOptions = {
            only: { suite: 'ResourceService - Basic Loading' }
        };

        // Get filtered test list
        const filteredTestList = getTestList(filterOptions);

        // Run tests with same filter
        const runResult = await runTests({
            ...filterOptions,
            includePassed: true, includeSkipped: true
        });

        // Should have same tests
        expect(filteredTestList).toHaveLength([
            ...(runResult.passed || []).map(r => ({ ...r, status: 'passed' })),
            ...(runResult.failures || []).map(r => ({ ...r, status: 'failed' })),
            ...(runResult.skipped || []).map(r => ({ ...r, status: 'skipped', duration: 0 }))
        ].length);

        filteredTestList.forEach(testMeta => {
            const found = [
            ...(runResult.passed || []).map(r => ({ ...r, status: 'passed' })),
            ...(runResult.failures || []).map(r => ({ ...r, status: 'failed' })),
            ...(runResult.skipped || []).map(r => ({ ...r, status: 'skipped', duration: 0 }))
        ].find(
                result => result.suite === testMeta.suite && result.test === testMeta.test
            );
            expect(found).toBeDefined();
        });
    });
});
