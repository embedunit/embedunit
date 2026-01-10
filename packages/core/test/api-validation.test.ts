// packages/core/test/api-validation.test.ts
import { describe, it, resetRegistry, runTests, getTestList } from '../src';
import { expect } from '@embedunit/assert';

describe('API Validation', () => {
    describe('runTests() parameter validation', () => {
        it('should throw error when passed a string instead of options', async () => {
            try {
                // @ts-ignore - Intentionally passing wrong type for testing
                await runTests('ResourceService - Basic Loading');
                throw new Error('Should have thrown');
            } catch (error: any) {
                expect(error.message).toMatch(/runTests\(\) expects an options object, but received string/);
            }
        });

        it('should throw error when passed a number instead of options', async () => {
            try {
                // @ts-ignore - Intentionally passing wrong type for testing
                await runTests(123);
                throw new Error('Should have thrown');
            } catch (error: any) {
                expect(error.message).toMatch(/runTests\(\) expects an options object, but received number/);
            }
        });

        it('should throw error when passed null', async () => {
            try {
                // @ts-ignore - Intentionally passing wrong type for testing
                await runTests(null);
                throw new Error('Should have thrown');
            } catch (error: any) {
                expect(error.message).toMatch(/runTests\(\) expects an options object, but received object/);
            }
        });

        it('should throw error with helpful example', async () => {
            try {
                // @ts-ignore - Intentionally passing wrong type for testing
                await runTests('MySuite');
                throw new Error('Should have thrown');
            } catch (error: any) {
                expect(error.message).toMatch(/Example: runTests\({ only: { suite: 'MySuite' } }\)/);
            }
        });

        it('should work with valid options object', async () => {
            // Should not throw
            const result = await runTests({
                filter: () => false // Filter out all tests
            });
            expect(result.summary.total).toBe(0);
        });

        it('should work with empty options object', async () => {
            // Reset registry and add isolated test data
            resetRegistry();
            describe('Isolated Test', () => {
                it('dummy test', () => { expect(true).toBe(true); });
            });

            // Should not throw
            const result = await runTests({});
            expect(result.summary).toBeDefined();
            expect(result.summary.total).toBe(1);
        });

        it('should work with no arguments (default empty object)', async () => {
            // Reset registry and add isolated test data
            resetRegistry();
            describe('Isolated Test', () => {
                it('dummy test', () => { expect(true).toBe(true); });
            });

            // Should not throw
            const result = await runTests();
            expect(result.summary).toBeDefined();
            expect(result.summary.total).toBe(1);
        });
    });

    describe('getTestList() parameter validation', () => {
        it('should throw error when passed a string instead of options', () => {
            expect(() => {
                // @ts-ignore - Intentionally passing wrong type for testing
                getTestList('ResourceService - Basic Loading');
            }).toThrow(/getTestList\(\) expects an options object, but received string/);
        });

        it('should throw error when passed a number instead of options', () => {
            expect(() => {
                // @ts-ignore - Intentionally passing wrong type for testing
                getTestList(123);
            }).toThrow(/getTestList\(\) expects an options object, but received number/);
        });

        it('should throw error when passed null', () => {
            expect(() => {
                // @ts-ignore - Intentionally passing wrong type for testing
                getTestList(null);
            }).toThrow(/getTestList\(\) expects an options object, but received object/);
        });

        it('should throw error with helpful example', () => {
            expect(() => {
                // @ts-ignore - Intentionally passing wrong type for testing
                getTestList('MySuite');
            }).toThrow(/Example: getTestList\({ only: { suite: 'MySuite' } }\)/);
        });

        it('should work with valid options object', () => {
            // Should not throw
            const result = getTestList({
                filter: () => false // Filter out all tests
            });
            expect(result).toEqual([]);
        });

        it('should work with empty options object', () => {
            // Should not throw
            const result = getTestList({});
            expect(Array.isArray(result)).toBe(true);
        });

        it('should work with no arguments (undefined)', () => {
            // Should not throw
            const result = getTestList();
            expect(Array.isArray(result)).toBe(true);
        });
    });
});
