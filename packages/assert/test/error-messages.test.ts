// test/error-messages.test.ts
import { describe, it } from '@embedunit/core';
import {
    expect,
    diff,
    formatDiff,
    getDiffSummary,
    EnhancedAssertionError,
    createCustomError,
    filterStackTrace,
    formatAsyncError,
    formatErrorForContext,
    createDiffError
} from '../src';

describe('Error Messages & Diffs', () => {

    describe('diff algorithm', () => {
        it('should detect equal primitives', () => {
            const result = diff(42, 42);
            expect(result.equal).toBe(true);
            expect(result.diffs).toHaveLength(0);
        });

        it('should detect different primitives', () => {
            const result = diff(42, 24);
            expect(result.equal).toBe(false);
            expect(result.diffs).toHaveLength(1);
            expect(result.diffs[0].type).toBe('change');
            expect(result.diffs[0].path).toBe('<root>');
        });

        it('should handle null and undefined', () => {
            const result1 = diff(null, undefined);
            expect(result1.equal).toBe(false);

            const result2 = diff(null, null);
            expect(result2.equal).toBe(true);

            const result3 = diff(undefined, undefined);
            expect(result3.equal).toBe(true);
        });

        it('should detect array differences', () => {
            const result = diff([1, 2, 3], [1, 2, 4]);
            expect(result.equal).toBe(false);
            expect(result.diffs).toHaveLength(1);
            expect(result.diffs[0].type).toBe('change');
            expect(result.diffs[0].path).toBe('[2]');
        });

        it('should detect array length differences', () => {
            const result = diff([1, 2], [1, 2, 3]);
            expect(result.equal).toBe(false);
            expect(result.diffs).toHaveLength(1);
            expect(result.diffs[0].type).toBe('add');
            expect(result.diffs[0].path).toBe('[2]');
        });

        it('should detect object property differences', () => {
            const result = diff({ a: 1, b: 2 }, { a: 1, b: 3 });
            expect(result.equal).toBe(false);
            expect(result.diffs).toHaveLength(1);
            expect(result.diffs[0].type).toBe('change');
            expect(result.diffs[0].path).toBe('b');
        });

        it('should detect missing object properties', () => {
            const result = diff({ a: 1 }, { a: 1, b: 2 });
            expect(result.equal).toBe(false);
            expect(result.diffs).toHaveLength(1);
            expect(result.diffs[0].type).toBe('add');
            expect(result.diffs[0].path).toBe('b');
        });

        it('should detect extra object properties', () => {
            const result = diff({ a: 1, b: 2 }, { a: 1 });
            expect(result.equal).toBe(false);
            expect(result.diffs).toHaveLength(1);
            expect(result.diffs[0].type).toBe('remove');
            expect(result.diffs[0].path).toBe('b');
        });

        it('should handle nested objects', () => {
            const result = diff(
                { user: { name: 'John', age: 30 } },
                { user: { name: 'Jane', age: 30 } }
            );
            expect(result.equal).toBe(false);
            expect(result.diffs).toHaveLength(1);
            expect(result.diffs[0].type).toBe('change');
            expect(result.diffs[0].path).toBe('user.name');
        });

        it('should handle nested arrays', () => {
            const result = diff(
                { items: [1, 2, 3] },
                { items: [1, 2, 4] }
            );
            expect(result.equal).toBe(false);
            expect(result.diffs).toHaveLength(1);
            expect(result.diffs[0].type).toBe('change');
            expect(result.diffs[0].path).toBe('items[2]');
        });

        it('should handle complex nested structures', () => {
            const actual = {
                users: [
                    { id: 1, name: 'John', settings: { theme: 'dark' } },
                    { id: 2, name: 'Jane', settings: { theme: 'light' } }
                ],
                meta: { count: 2 }
            };

            const expected = {
                users: [
                    { id: 1, name: 'John', settings: { theme: 'light' } },
                    { id: 2, name: 'Jane', settings: { theme: 'light' } }
                ],
                meta: { count: 2 }
            };

            const result = diff(actual, expected);
            expect(result.equal).toBe(false);
            expect(result.diffs).toHaveLength(1);
            expect(result.diffs[0].path).toBe('users[0].settings.theme');
        });

        it('should handle circular references', () => {
            const obj1: any = { a: 1 };
            obj1.self = obj1;

            const obj2: any = { a: 1 };
            obj2.self = obj2;

            // Should not throw, should handle gracefully
            expect(() => diff(obj1, obj2)).not.toThrow();
        });

        it('should respect max depth option', () => {
            const deep1 = { a: { b: { c: { d: 1 } } } };
            const deep2 = { a: { b: { c: { d: 2 } } } };

            const result = diff(deep1, deep2, { maxDepth: 2 });
            expect(result.equal).toBe(false);
            // Should stop before reaching the actual difference
            expect(result.diffs[0].path).not.toBe('a.b.c.d');
        });
    });

    describe('formatDiff', () => {
        it('should format simple differences', () => {
            const result = diff({ a: 1 }, { a: 2 });
            const formatted = formatDiff(result);
            expect(formatted).toContain('- a: 1');
            expect(formatted).toContain('+ a: 2');
        });

        it('should format additions', () => {
            const result = diff({}, { a: 1 });
            const formatted = formatDiff(result);
            expect(formatted).toContain('+ a: 1');
        });

        it('should format removals', () => {
            const result = diff({ a: 1 }, {});
            const formatted = formatDiff(result);
            expect(formatted).toContain('- a: 1');
        });

        it('should handle equal values', () => {
            const result = diff({ a: 1 }, { a: 1 });
            const formatted = formatDiff(result);
            expect(formatted).toBe('Values are deeply equal');
        });

        it('should limit number of diffs shown', () => {
            const obj1 = { a: 1, b: 2, c: 3, d: 4, e: 5 };
            const obj2 = { a: 2, b: 3, c: 4, d: 5, e: 6 };
            const result = diff(obj1, obj2);
            const formatted = formatDiff(result, { maxDiffs: 2 });
            expect(formatted).toContain('... and 3 more differences');
        });
    });

    describe('getDiffSummary', () => {
        it('should summarize equal values', () => {
            const result = diff({ a: 1 }, { a: 1 });
            const summary = getDiffSummary(result);
            expect(summary).toBe('Values are equal');
        });

        it('should count different types of changes', () => {
            const result = diff(
                { a: 1, b: 2 },
                { a: 2, c: 3 }
            );
            const summary = getDiffSummary(result);
            expect(summary).toContain('1 changed');
            expect(summary).toContain('1 removed');
            expect(summary).toContain('1 added');
        });
    });

    describe('EnhancedAssertionError', () => {
        it('should create basic error with message', () => {
            const error = new EnhancedAssertionError('Test failed');
            expect(error.message).toBe('Test failed');
            expect(error.name).toBe('AssertionError');
        });

        it('should enhance error with diff for object comparison', () => {
            const actual = { a: 1, b: 2 };
            const expected = { a: 1, b: 3 };
            const error = new EnhancedAssertionError('Objects not equal', actual, expected);

            expect(error.message).toContain('Objects not equal');
            expect(error.message).toContain('Difference:');
            expect(error.actual).toEqual(actual);
            expect(error.expected).toEqual(expected);
        });

        it('should not add diff for primitive values', () => {
            const error = new EnhancedAssertionError('Numbers not equal', 1, 2);
            expect(error.message).toBe('Numbers not equal');
            expect(error.message).not.toContain('Difference:');
        });

        it('should provide diff report', () => {
            const actual = { a: 1 };
            const expected = { a: 2 };
            const error = new EnhancedAssertionError('Test', actual, expected);

            const diffReport = error.getDiffReport();
            expect(diffReport).toContain('- a: 1');
            expect(diffReport).toContain('+ a: 2');
        });

        it('should filter stack trace by default', () => {
            const error = new EnhancedAssertionError('Test error');
            const fullStack = error.getFullStack();
            const filteredStack = error.stack;

            if (fullStack && filteredStack) {
                expect(fullStack.split('\n').length).toBeGreaterThanOrEqual(filteredStack.split('\n').length);
            }
        });
    });

    describe('createCustomError', () => {
        it('should create error with custom message prefix', () => {
            const error = createCustomError('Base error', 'Custom context');
            expect(error.message).toContain('Custom context');
            expect(error.message).toContain('Base error');
        });

        it('should handle error without custom message', () => {
            const error = createCustomError('Base error');
            expect(error.message).toBe('Base error');
        });
    });

    describe('createDiffError', () => {
        it('should create enhanced message with diff for objects', () => {
            const result = createDiffError({ a: 1 }, { a: 2 }, 'Objects differ');
            expect(result).toContain('Objects differ');
            expect(result).toContain('Difference:');
            expect(result).toContain('- a: 1');
            expect(result).toContain('+ a: 2');
        });

        it('should not enhance message for primitive values', () => {
            const result = createDiffError(1, 2, 'Numbers differ');
            expect(result).toBe('Numbers differ');
            expect(result).not.toContain('Difference:');
        });

        it('should not enhance message for equal values', () => {
            const result = createDiffError({ a: 1 }, { a: 1 }, 'Should be equal');
            expect(result).toBe('Should be equal');
            expect(result).not.toContain('Difference:');
        });
    });

    describe('filterStackTrace', () => {
        it('should filter internal framework frames', () => {
            const stack = [
                'Error: Test error',
                '    at Object.toBe (src/assertion.ts:176:13)',
                '    at Object.it (test/sample.test.ts:10:23)',
                '    at processTicksAndRejections (node:internal/process/task_queues.js:95:5)',
                '    at async runTest (src/runner.ts:45:12)'
            ];

            const filtered = filterStackTrace(stack);

            // Should keep the error line and user test code
            expect(filtered).toContain('Error: Test error');
            expect(filtered.some(line => line.includes('sample.test.ts'))).toBe(true);

            // Should filter out internal framework code
            expect(filtered.some(line => line.includes('src/assertion.ts'))).toBe(false);
            expect(filtered.some(line => line.includes('src/runner.ts'))).toBe(false);
        });

        it('should preserve stack if all frames are internal', () => {
            const stack = [
                'Error: Test error',
                '    at Object.toBe (src/assertion.ts:176:13)',
                '    at runTest (src/runner.ts:45:12)'
            ];

            const filtered = filterStackTrace(stack);

            // Should preserve original stack if filtering removes everything
            expect(filtered.length).toBeGreaterThan(1);
        });

        it('should respect maxStackDepth option', () => {
            const stack = [
                'Error: Test error',
                '    at userFunction1 (test/sample.test.ts:10:23)',
                '    at userFunction2 (test/sample.test.ts:15:30)',
                '    at userFunction3 (test/sample.test.ts:20:15)',
                '    at userFunction4 (test/sample.test.ts:25:10)'
            ];

            const filtered = filterStackTrace(stack, { maxStackDepth: 2 });

            // Should limit to 2 user frames plus error line
            expect(filtered.length).toBeLessThanOrEqual(3);
        });

        it('should not filter when filterInternalFrames is false', () => {
            const stack = [
                'Error: Test error',
                '    at Object.toBe (src/assertion.ts:176:13)',
                '    at Object.it (test/sample.test.ts:10:23)'
            ];

            const filtered = filterStackTrace(stack, { filterInternalFrames: false });

            expect(filtered).toEqual(stack);
        });
    });

    describe('formatAsyncError', () => {
        it('should format basic async error', () => {
            const error = new Error('Async operation failed');
            const formatted = formatAsyncError(error, 'test execution');

            expect(formatted).toContain('Async error in test execution');
            expect(formatted).toContain('Async operation failed');
        });

        it('should provide timeout-specific help', () => {
            const error = new Error('Operation timed out');
            const formatted = formatAsyncError(error, 'test execution');

            expect(formatted).toContain('This might be caused by:');
            expect(formatted).toContain('Test taking longer than expected');
            expect(formatted).toContain('Unresolved promises');
        });

        it('should provide rejection-specific help', () => {
            const error = new Error('Promise rejection occurred');
            const formatted = formatAsyncError(error, 'test execution');

            expect(formatted).toContain('This might be caused by:');
            expect(formatted).toContain('Unhandled promise rejection');
            expect(formatted).toContain('Missing catch blocks');
        });

        it('should handle non-Error objects', () => {
            const formatted = formatAsyncError('String error', 'test context');
            expect(formatted).toContain('Async error in test context: String error');
        });
    });

    describe('formatErrorForContext', () => {
        it('should format for console context', () => {
            const error = new Error('Test error');
            const formatted = formatErrorForContext(error, 'console');
            expect(formatted).toBe(error.toString());
        });

        it('should format for compact context', () => {
            const error = new Error('This is a very long error message that should be truncated when displayed in compact format');
            const formatted = formatErrorForContext(error, 'compact');
            expect(formatted.length).toBeLessThanOrEqual(80);
            expect(formatted).toContain('...');
        });

        it('should format for JSON context', () => {
            const error = new EnhancedAssertionError('Test error', { a: 1 }, { a: 2 });
            const formatted = formatErrorForContext(error, 'json');

            expect(formatted).toHaveProperty('name');
            expect(formatted).toHaveProperty('message');
            expect(formatted).toHaveProperty('stack');
            expect(formatted).toHaveProperty('actual');
            expect(formatted).toHaveProperty('expected');
            expect(formatted).toHaveProperty('diff');
        });

        it('should handle compact format for short messages', () => {
            const error = new Error('Short');
            const formatted = formatErrorForContext(error, 'compact');
            expect(formatted).toBe('Short');
        });
    });

    describe('edge cases', () => {
        it('should handle very deep nesting', () => {
            const createDeep = (depth: number): any => {
                if (depth === 0) return 'value';
                return { nested: createDeep(depth - 1) };
            };

            const deep1 = createDeep(20);
            const deep2 = createDeep(20);
            deep2.nested.nested.nested.nested.nested = 'different';

            expect(() => diff(deep1, deep2)).not.toThrow();
        });

        it('should handle special JavaScript values', () => {
            const result1 = diff(NaN, NaN);
            expect(result1.equal).toBe(true);

            const result2 = diff(Infinity, Infinity);
            expect(result2.equal).toBe(true);

            const result3 = diff(-Infinity, -Infinity);
            expect(result3.equal).toBe(true);

            const result4 = diff(Infinity, -Infinity);
            expect(result4.equal).toBe(false);
        });

        it('should handle Date objects', () => {
            const date1 = new Date('2023-01-01');
            const date2 = new Date('2023-01-01');
            const date3 = new Date('2023-01-02');

            const result1 = diff(date1, date2);
            expect(result1.equal).toBe(true);

            const result2 = diff(date1, date3);
            expect(result2.equal).toBe(false);
        });

        it('should handle RegExp objects', () => {
            const regex1 = /abc/g;
            const regex2 = /abc/g;
            const regex3 = /xyz/g;

            const result1 = diff(regex1, regex2);
            expect(result1.equal).toBe(true);

            const result2 = diff(regex1, regex3);
            expect(result2.equal).toBe(false);
        });

        it('should handle functions', () => {
            const fn1 = () => 'test';
            const fn2 = () => 'test';
            const fn3 = () => 'different';

            const result1 = diff(fn1, fn1);
            expect(result1.equal).toBe(true);

            const result2 = diff(fn1, fn2);
            expect(result2.equal).toBe(false); // Different function instances
        });

        it('should handle mixed types in arrays', () => {
            const arr1 = [1, 'string', { obj: true }, [1, 2], null, undefined];
            const arr2 = [1, 'string', { obj: false }, [1, 2], null, undefined];

            const result = diff(arr1, arr2);
            expect(result.equal).toBe(false);
            expect(result.diffs).toHaveLength(1);
            expect(result.diffs[0].path).toBe('[2].obj');
        });

        it('should handle empty structures', () => {
            const result1 = diff([], []);
            expect(result1.equal).toBe(true);

            const result2 = diff({}, {});
            expect(result2.equal).toBe(true);

            const result3 = diff([], {});
            expect(result3.equal).toBe(false);
        });

        it('should handle large objects efficiently', () => {
            const large1: any = {};
            const large2: any = {};

            for (let i = 0; i < 1000; i++) {
                large1[`key${i}`] = i;
                large2[`key${i}`] = i;
            }

            // Change one value (use a key that will be within the maxObjectKeys limit)
            large2.key5 = 999;

            // Verify that the change was actually made
            expect(large1.key5).toBe(5);
            expect(large2.key5).toBe(999);

            const start = Date.now();
            const result = diff(large1, large2);
            const duration = Date.now() - start;


            expect(result.equal).toBe(false);
            expect(duration).toBeLessThan(100); // Should be fast
        });
    });
});

describe('Custom error messages integration', () => {
    it('should use custom message in assertion failure', () => {
        try {
            expect(1, 'Numbers should match').toBe(2);
            expect(true).toBe(false); // Should not reach
        } catch (error: any) {
            expect(error.message).toContain('Numbers should match');
            expect(error.message).toContain('Expected 1 to be (strictly equal) 2');
        }
    });

    it('should work with negated assertions', () => {
        try {
            expect(1, 'Should not equal itself').not.toBe(1);
            expect(true).toBe(false); // Should not reach
        } catch (error: any) {
            expect(error.message).toContain('Should not equal itself');
            expect(error.message).toContain('Expected 1 not to be (strictly equal) 1');
        }
    });

    it('should enhance toEqual errors with diff', () => {
        try {
            expect({ a: 1, b: 2 }, 'Objects should be equal').toEqual({ a: 1, b: 3 });
            expect(true).toBe(false); // Should not reach
        } catch (error: any) {
            expect(error.message).toContain('Objects should be equal');
            expect(error.message).toContain('Difference:');
            expect(error.message).toContain('- b: 2');
            expect(error.message).toContain('+ b: 3');
        }
    });

    it('should work with array comparisons', () => {
        try {
            expect([1, 2, 3], 'Arrays should match').toEqual([1, 2, 4]);
            expect(true).toBe(false); // Should not reach
        } catch (error: any) {
            expect(error.message).toContain('Arrays should match');
            expect(error.message).toContain('- [2]: 3');
            expect(error.message).toContain('+ [2]: 4');
        }
    });
});
