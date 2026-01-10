// src/parameterized.ts
// Parameterized test utilities for test.each functionality

import { TestFn } from './types';

/**
 * Table data types supported by it.each
 */
export type TableData =
    | any[][] // Array of arrays format: [[1, 2, 3], [4, 5, 9]]
    | Record<string, any>[] // Array of objects format: [{a: 1, b: 2, expected: 3}]
    | TemplateStringsArray; // Template literal format: `a | b | expected\n1 | 2 | 3\n4 | 5 | 9`

/**
 * Test function that receives parameters from the table
 */
export type ParameterizedTestFn<T extends any[]> = (...args: T) => void | Promise<void>;

/**
 * Interface for the each function returned by it.each()
 */
export interface EachFunction {
    <T extends any[]>(name: string, fn: ParameterizedTestFn<T>, timeout?: number): void;
    skip<T extends any[]>(name: string, fn: ParameterizedTestFn<T>, timeout?: number): void;
    only<T extends any[]>(name: string, fn: ParameterizedTestFn<T>, timeout?: number): void;
}

/**
 * Format test name with printf-style placeholders
 * Supports: %s (string), %d (number), %o (object), %j (JSON), %% (literal %)
 */
export function formatTestName(template: string, args: any[]): string {
    let index = 0;
    return template.replace(/%[sdojp%]/g, (match) => {
        switch (match) {
            case '%s':
                return String(args[index++] ?? '');
            case '%d':
                return String(Number(args[index++]) || 0);
            case '%o':
            case '%j':
                try {
                    return JSON.stringify(args[index++]);
                } catch {
                    return String(args[index - 1]);
                }
            case '%p':
                return String(args[index++]);
            case '%%':
                return '%';
            default:
                return match;
        }
    });
}

/**
 * Parse template literal table into array of arrays
 * Format: `a | b | expected\n1 | 2 | 3\n4 | 5 | 9`
 */
export function parseTemplateTable(strings: TemplateStringsArray, ...values: any[]): any[][] {
    // Reconstruct the template string
    let template = strings[0];
    for (let i = 0; i < values.length; i++) {
        template += String(values[i]) + strings[i + 1];
    }

    const lines = template.trim().split('\n').map(line => line.trim()).filter(line => line.length > 0);

    if (lines.length === 0) {
        return [];
    }

    // Parse each line by splitting on | and trimming whitespace
    return lines.map(line => {
        return line.split('|').map(cell => {
            const trimmed = cell.trim();

            // Try to parse as number
            if (/^-?\d+$/.test(trimmed)) {
                return parseInt(trimmed, 10);
            }
            if (/^-?\d*\.\d+$/.test(trimmed)) {
                return parseFloat(trimmed);
            }

            // Try to parse as boolean
            if (trimmed === 'true') return true;
            if (trimmed === 'false') return false;
            if (trimmed === 'null') return null;
            if (trimmed === 'undefined') return undefined;

            // Try to parse as JSON (for objects/arrays)
            if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
                (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
                try {
                    return JSON.parse(trimmed);
                } catch {
                    // Fall through to string
                }
            }

            // Remove quotes if present
            if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
                (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
                return trimmed.slice(1, -1);
            }

            return trimmed;
        });
    });
}

/**
 * Normalize table data to array of arrays format
 */
export function normalizeTableData(table: TableData): any[][] {
    // Check if it's a TemplateStringsArray first (has raw property)
    if ('raw' in table) {
        return parseTemplateTable(table as TemplateStringsArray);
    }

    if (Array.isArray(table)) {
        if (table.length === 0) {
            return [];
        }

        // Check if it's array of arrays
        if (Array.isArray(table[0])) {
            return table as any[][];
        }

        // It's array of objects - convert to array of arrays
        const objects = table as Record<string, any>[];
        if (objects.length === 0) {
            return [];
        }

        // Get all unique keys
        const allKeys = new Set<string>();
        objects.forEach(obj => {
            Object.keys(obj).forEach(key => allKeys.add(key));
        });

        const keys = Array.from(allKeys).sort();

        return objects.map(obj => keys.map(key => obj[key]));
    }

    // Fallback
    return [];
}

/**
 * Generate a test name with case index if no formatting is provided
 */
export function generateTestName(template: string, args: any[], caseIndex: number): string {
    // If template contains printf-style placeholders, format them
    if (/%[sdojp%]/.test(template)) {
        return formatTestName(template, args);
    }

    // If template contains $# placeholder, replace with case index
    if (template.includes('$#')) {
        return template.replace(/\$#/g, String(caseIndex + 1));
    }

    // If template contains $1, $2, etc., replace with argument values
    if (/\$\d+/.test(template)) {
        return template.replace(/\$(\d+)/g, (match, index) => {
            const argIndex = parseInt(index, 10) - 1;
            return argIndex < args.length ? String(args[argIndex]) : match;
        });
    }

    // If template contains $propertyName, replace with object property values
    if (/\$\w+/.test(template) && args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
        const obj = args[0];
        return template.replace(/\$(\w+)/g, (match, prop) => {
            return prop in obj ? String(obj[prop]) : match;
        });
    }

    // Default: append case info
    const argsStr = args.map(arg => {
        if (typeof arg === 'string') return `"${arg}"`;
        if (typeof arg === 'object' && arg !== null) {
            try {
                return JSON.stringify(arg);
            } catch {
                return String(arg);
            }
        }
        return String(arg);
    }).join(', ');

    return `${template} [${caseIndex + 1}] (${argsStr})`;
}

/**
 * Interface for the each function returned by describe.each()
 */
export interface DescribeEachFunction {
    <T extends any[]>(name: string, fn: (...args: T) => void, timeout?: number): void;
    skip<T extends any[]>(name: string, fn: (...args: T) => void, timeout?: number): void;
    only<T extends any[]>(name: string, fn: (...args: T) => void, timeout?: number): void;
}

/**
 * Create an it.each function for the given table data
 */
export function createEachFunction(
    table: TableData,
    itImplementation: (name: string, fn: TestFn, skip: boolean, only: boolean, timeout?: number) => void
): EachFunction {
    // Check if original table is array of objects
    const isObjectArray = Array.isArray(table) && table.length > 0 &&
                          typeof table[0] === 'object' && !Array.isArray(table[0]);

    const normalizedTable = normalizeTableData(table);

    const eachFn = function<T extends any[]>(name: string, fn: ParameterizedTestFn<T>, timeout?: number): void {
        if (normalizedTable.length === 0) {
            // Create a single skipped test if no data
            itImplementation(`${name} (no test cases)`, () => {
                throw new Error('No test cases provided to it.each()');
            }, true, false, timeout);
            return;
        }

        normalizedTable.forEach((args, index) => {
            const testName = isObjectArray ?
                generateTestName(name, [(table as any[])[index]], index) :
                generateTestName(name, args, index);

            if (isObjectArray) {
                // For object arrays, pass the original object as single argument
                const obj = (table as any[])[index];
                itImplementation(testName, () => (fn as any)(obj), false, false, timeout);
            } else {
                // For other formats, spread the args
                itImplementation(testName, () => fn(...(args as T)), false, false, timeout);
            }
        });
    } as EachFunction;

    // Add skip and only variants
    eachFn.skip = function<T extends any[]>(name: string, fn: ParameterizedTestFn<T>, timeout?: number): void {
        if (normalizedTable.length === 0) {
            itImplementation(`${name} (no test cases)`, () => {}, true, false, timeout);
            return;
        }

        normalizedTable.forEach((args, index) => {
            const testName = isObjectArray ?
                generateTestName(name, [(table as any[])[index]], index) :
                generateTestName(name, args, index);

            if (isObjectArray) {
                const obj = (table as any[])[index];
                itImplementation(testName, () => (fn as any)(obj), true, false, timeout);
            } else {
                itImplementation(testName, () => fn(...(args as T)), true, false, timeout);
            }
        });
    };

    eachFn.only = function<T extends any[]>(name: string, fn: ParameterizedTestFn<T>, timeout?: number): void {
        if (normalizedTable.length === 0) {
            itImplementation(`${name} (no test cases)`, () => {
                throw new Error('No test cases provided to it.each()');
            }, false, true, timeout);
            return;
        }

        normalizedTable.forEach((args, index) => {
            const testName = isObjectArray ?
                generateTestName(name, [(table as any[])[index]], index) :
                generateTestName(name, args, index);

            if (isObjectArray) {
                const obj = (table as any[])[index];
                itImplementation(testName, () => (fn as any)(obj), false, true, timeout);
            } else {
                itImplementation(testName, () => fn(...(args as T)), false, true, timeout);
            }
        });
    };

    return eachFn;
}

/**
 * Create a describe.each function for the given table data
 */
export function createDescribeEachFunction(
    table: TableData,
    describeImplementation: (name: string, fn: () => void, skip: boolean, only: boolean, timeout?: number) => void
): DescribeEachFunction {
    const normalizedTable = normalizeTableData(table);

    const eachFn = function<T extends any[]>(name: string, fn: (...args: T) => void, timeout?: number): void {
        if (normalizedTable.length === 0) {
            // Create a single skipped suite if no data
            describeImplementation(`${name} (no test cases)`, () => {
                throw new Error('No test cases provided to describe.each()');
            }, true, false, timeout);
            return;
        }

        normalizedTable.forEach((args, index) => {
            const suiteName = generateTestName(name, args, index);
            describeImplementation(suiteName, () => fn(...(args as T)), false, false, timeout);
        });
    } as DescribeEachFunction;

    // Add skip and only variants
    eachFn.skip = function<T extends any[]>(name: string, fn: (...args: T) => void, timeout?: number): void {
        if (normalizedTable.length === 0) {
            describeImplementation(`${name} (no test cases)`, () => {}, true, false, timeout);
            return;
        }

        normalizedTable.forEach((args, index) => {
            const suiteName = generateTestName(name, args, index);
            describeImplementation(suiteName, () => fn(...(args as T)), true, false, timeout);
        });
    };

    eachFn.only = function<T extends any[]>(name: string, fn: (...args: T) => void, timeout?: number): void {
        if (normalizedTable.length === 0) {
            describeImplementation(`${name} (no test cases)`, () => {
                throw new Error('No test cases provided to describe.each()');
            }, false, true, timeout);
            return;
        }

        normalizedTable.forEach((args, index) => {
            const suiteName = generateTestName(name, args, index);
            describeImplementation(suiteName, () => fn(...(args as T)), false, true, timeout);
        });
    };

    return eachFn;
}
