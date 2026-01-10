// packages/core/test/parameterized.test.ts
import { describe, it, formatTestName, parseTemplateTable, normalizeTableData } from '../src';
import { expect } from '@embedunit/assert';

describe('Parameterized Test Utilities', () => {

    describe('formatTestName', () => {
        it('should format %s placeholders', () => {
            const result = formatTestName('test with %s', ['hello']);
            expect(result).toBe('test with hello');
        });

        it('should format %d placeholders', () => {
            const result = formatTestName('test with %d', [42]);
            expect(result).toBe('test with 42');
        });

        it('should format %o and %j placeholders', () => {
            const obj = { key: 'value' };
            const result1 = formatTestName('test with %o', [obj]);
            const result2 = formatTestName('test with %j', [obj]);
            expect(result1).toBe('test with {"key":"value"}');
            expect(result2).toBe('test with {"key":"value"}');
        });

        it('should format %% as literal %', () => {
            const result = formatTestName('test with %% percent', []);
            expect(result).toBe('test with % percent');
        });

        it('should handle multiple placeholders', () => {
            const result = formatTestName('%s + %d = %d', ['two', 2, 4]);
            expect(result).toBe('two + 2 = 4');
        });

        it('should handle missing arguments gracefully', () => {
            const result = formatTestName('%s + %d', ['one']);
            expect(result).toBe('one + 0');
        });

        it('should handle objects that fail JSON.stringify', () => {
            const circular: any = {};
            circular.self = circular;
            const result = formatTestName('test %j', [circular]);
            expect(result).toContain('test [object Object]');
        });
    });

    describe('parseTemplateTable', () => {
        it('should parse simple template table', () => {
            const template = ['a | b | expected\n1 | 2 | 3\n4 | 5 | 9'] as any;
            template.raw = template;
            const result = parseTemplateTable(template);
            expect(result).toEqual([
                ['a', 'b', 'expected'],
                [1, 2, 3],
                [4, 5, 9]
            ]);
        });

        it('should parse numbers correctly', () => {
            const template = ['int | float\n42 | 3.14\n-1 | -2.5'] as any;
            template.raw = template;
            const result = parseTemplateTable(template);
            expect(result).toEqual([
                ['int', 'float'],
                [42, 3.14],
                [-1, -2.5]
            ]);
        });

        it('should parse booleans and null values', () => {
            const template = ['bool | null | undef\ntrue | null | undefined\nfalse | null | undefined'] as any;
            template.raw = template;
            const result = parseTemplateTable(template);
            expect(result).toEqual([
                ['bool', null, 'undef'],
                [true, null, undefined],
                [false, null, undefined]
            ]);
        });

        it('should parse JSON objects and arrays', () => {
            const template = ['obj | arr\n{"key":"value"} | [1,2,3]\n{"x":1} | [4,5]'] as any;
            template.raw = template;
            const result = parseTemplateTable(template);
            expect(result).toEqual([
                ['obj', 'arr'],
                [{ key: 'value' }, [1, 2, 3]],
                [{ x: 1 }, [4, 5]]
            ]);
        });

        it('should handle quoted strings', () => {
            const template = ['str1 | str2\n"hello world" | \'quoted\'\nplain | text'] as any;
            template.raw = template;
            const result = parseTemplateTable(template);
            expect(result).toEqual([
                ['str1', 'str2'],
                ['hello world', 'quoted'],
                ['plain', 'text']
            ]);
        });

        it('should handle empty table', () => {
            const template = [''] as any;
            template.raw = template;
            const result = parseTemplateTable(template);
            expect(result).toEqual([]);
        });

        it('should handle template with interpolated values', () => {
            const value = 'world';
            const template = [`greeting\nhello `, ``] as any;
            template.raw = [`greeting\nhello `, ``];
            const result = parseTemplateTable(template, value);
            expect(result).toEqual([
                ['greeting'],
                ['hello world']
            ]);
        });
    });

    describe('normalizeTableData', () => {
        it('should pass through array of arrays', () => {
            const table = [[1, 2], [3, 4]];
            const result = normalizeTableData(table);
            expect(result).toEqual([[1, 2], [3, 4]]);
        });

        it('should convert array of objects to array of arrays', () => {
            const table = [
                { a: 1, b: 2 },
                { a: 3, b: 4 }
            ];
            const result = normalizeTableData(table);
            expect(result).toEqual([[1, 2], [3, 4]]);
        });

        it('should handle objects with different keys', () => {
            const table = [
                { a: 1, b: 2 },
                { a: 3, c: 4 }
            ];
            const result = normalizeTableData(table);
            // Keys should be sorted: a, b, c
            expect(result).toEqual([
                [1, 2, undefined],
                [3, undefined, 4]
            ]);
        });

        it('should handle empty array', () => {
            const result = normalizeTableData([]);
            expect(result).toEqual([]);
        });

        it('should handle template strings', () => {
            const template = ['a | b\n1 | 2\n3 | 4'] as any;
            template.raw = template;
            const result = normalizeTableData(template);
            expect(result).toEqual([
                ['a', 'b'],
                [1, 2],
                [3, 4]
            ]);
        });
    });
});

describe('Parameterized Tests Integration', () => {

    // Test it.each with array of arrays
    it.each([
        [1, 2, 3],
        [2, 3, 5],
        [5, 7, 12]
    ])('adds %d + %d = %d', (a, b, expected) => {
        expect(a + b).toBe(expected);
    });

    // Test it.each with array of objects
    it.each([
        { input: 'hello', expected: 5 },
        { input: 'world', expected: 5 },
        { input: '', expected: 0 }
    ])('string "$input" has length $expected', ({ input, expected }) => {
        expect(input.length).toBe(expected);
    });

    // Test it.each with template literal
    it.each`
        operation | a    | b    | expected
        add       | 1    | 2    | 3
        subtract  | 5    | 3    | 2
        multiply  | 4    | 6    | 24
    `('$operation: $a and $b = $expected', ({ operation, a, b, expected }) => {
        switch (operation) {
            case 'add':
                expect(a + b).toBe(expected);
                break;
            case 'subtract':
                expect(a - b).toBe(expected);
                break;
            case 'multiply':
                expect(a * b).toBe(expected);
                break;
        }
    });

    // Test complex data types
    it.each([
        [{ x: 1, y: 2 }, { x: 1, y: 2 }],
        [[1, 2, 3], [1, 2, 3]],
        ['string', 'string']
    ])('deep equality test case $#', (actual, expected) => {
        expect(actual).toEqual(expected);
    });

    // Test with different argument counts
    it.each([
        [1],
        [2, 'extra'],
        [3, 'more', true]
    ])('flexible arguments test $#', (first, ...rest) => {
        expect(typeof first).toBe('number');
        expect(first).toBeGreaterThan(0);
    });
});

// Test describe.each
describe.each([
    ['Array', []],
    ['Object', {}],
    ['String', ''],
    ['Number', 0]
])('Type testing for %s', (typeName, value) => {
    it('should have correct type', () => {
        if (typeName === 'Array') {
            expect(Array.isArray(value)).toBe(true);
        } else {
            expect(typeof value).toBe(typeName.toLowerCase());
        }
    });

    it('should be truthy or falsy appropriately', () => {
        if (typeName === 'Array' || typeName === 'Object') {
            expect(Boolean(value)).toBe(true);
        } else {
            expect(Boolean(value)).toBe(false);
        }
    });
});

describe('Parameterized edge cases', () => {

    // Test with timeout parameter
    it.each([[100], [200]])('async test with timeout %dms', async (delay) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        expect(delay).toBeGreaterThan(50);
    }, 500);

    // Test skip functionality
    it.each([[1], [2]]).skip('skipped parameterized test $#', (num) => {
        // This should be skipped
        expect(num).toBe(999); // Would fail if not skipped
    });

    // Test with empty data (should create one skipped test)
    it.each([])('test with no data', () => {
        expect(true).toBe(false); // Should not run
    });
});
