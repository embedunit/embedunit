// src/diff.ts
// Diff algorithm for better error messages when comparing objects and arrays

/**
 * Types of diff operations
 */
export type DiffType = 'equal' | 'add' | 'remove' | 'change';

/**
 * Represents a single diff operation
 */
export interface DiffEntry {
    type: DiffType;
    path: string;
    actual?: any;
    expected?: any;
    actualValue?: any;
    expectedValue?: any;
}

/**
 * Result of a diff operation
 */
export interface DiffResult {
    equal: boolean;
    diffs: DiffEntry[];
}

/**
 * Configuration for diff algorithm
 */
export interface DiffOptions {
    maxDepth?: number;
    includeArrayIndices?: boolean;
    maxArrayLength?: number;
    maxObjectKeys?: number;
}

const DEFAULT_OPTIONS: Required<DiffOptions> = {
    maxDepth: 10,
    includeArrayIndices: true,
    maxArrayLength: 100,
    maxObjectKeys: 50
};

/**
 * Create a human-readable path string
 */
function createPath(segments: (string | number)[]): string {
    if (segments.length === 0) return '<root>';

    let path = '';
    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        if (typeof segment === 'number') {
            path += `[${segment}]`;
        } else if (i === 0) {
            path += segment;
        } else if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(segment)) {
            path += `.${segment}`;
        } else {
            path += `[${JSON.stringify(segment)}]`;
        }
    }
    return path;
}

/**
 * Check if two values are primitively equal
 */
function isPrimitiveEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a !== a && b !== b) return true; // Both NaN
    return false;
}

/**
 * Get the type of a value for comparison
 */
function getValueType(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return 'array';
    if (value instanceof Date) return 'date';
    if (value instanceof RegExp) return 'regexp';
    return typeof value;
}

/**
 * Check if a value should be treated as a primitive for diffing
 */
function isPrimitive(value: any): boolean {
    const type = getValueType(value);
    return type !== 'array' && type !== 'object';
}

/**
 * Create a string representation of a value for display
 */
function stringifyValue(value: any, maxLength: number = 50): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') {
        const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
        const quoted = `"${escaped}"`;
        return quoted.length > maxLength ? quoted.slice(0, maxLength - 3) + '..."' : quoted;
    }
    if (typeof value === 'number') {
        if (isNaN(value)) return 'NaN';
        if (!isFinite(value)) return value > 0 ? 'Infinity' : '-Infinity';
        return String(value);
    }
    if (typeof value === 'boolean') return String(value);
    if (typeof value === 'bigint') return `${value}n`;
    if (typeof value === 'symbol') return String(value);
    if (typeof value === 'function') return `[Function: ${value.name || 'anonymous'}]`;
    if (value instanceof Date) return `Date(${value.toISOString()})`;
    if (value instanceof RegExp) return String(value);

    try {
        const json = JSON.stringify(value);
        return json.length > maxLength ? json.slice(0, maxLength - 3) + '...' : json;
    } catch {
        if (Array.isArray(value)) return `[Array(${value.length})]`;
        return '[Object]';
    }
}

/**
 * Perform deep diff between two values
 */
export function diff(actual: any, expected: any, options: DiffOptions = {}): DiffResult {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const diffs: DiffEntry[] = [];

    function diffRecursive(
        actualVal: any,
        expectedVal: any,
        path: (string | number)[],
        depth: number
    ): boolean {
        // Check depth limit
        if (depth > opts.maxDepth) {
            if (!isPrimitiveEqual(actualVal, expectedVal)) {
                diffs.push({
                    type: 'change',
                    path: createPath(path),
                    actualValue: stringifyValue(actualVal),
                    expectedValue: stringifyValue(expectedVal)
                });
                return false;
            }
            return true;
        }

        // Handle Date objects first
        if (actualVal instanceof Date && expectedVal instanceof Date) {
            if (isPrimitiveEqual(actualVal.getTime(), expectedVal.getTime())) {
                return true;
            }
            diffs.push({
                type: 'change',
                path: createPath(path),
                actualValue: stringifyValue(actualVal),
                expectedValue: stringifyValue(expectedVal)
            });
            return false;
        }

        // Handle RegExp objects
        if (actualVal instanceof RegExp && expectedVal instanceof RegExp) {
            if (isPrimitiveEqual(actualVal.toString(), expectedVal.toString())) {
                return true;
            }
            diffs.push({
                type: 'change',
                path: createPath(path),
                actualValue: stringifyValue(actualVal),
                expectedValue: stringifyValue(expectedVal)
            });
            return false;
        }

        // Primitive comparison
        if (isPrimitive(actualVal) || isPrimitive(expectedVal)) {
            if (isPrimitiveEqual(actualVal, expectedVal)) {
                return true;
            }

            diffs.push({
                type: 'change',
                path: createPath(path),
                actualValue: stringifyValue(actualVal),
                expectedValue: stringifyValue(expectedVal)
            });
            return false;
        }

        // Type mismatch
        if (getValueType(actualVal) !== getValueType(expectedVal)) {
            diffs.push({
                type: 'change',
                path: createPath(path),
                actualValue: stringifyValue(actualVal),
                expectedValue: stringifyValue(expectedVal)
            });
            return false;
        }

        // Array comparison
        if (Array.isArray(actualVal) && Array.isArray(expectedVal)) {
            return diffArrays(actualVal, expectedVal, path, depth + 1);
        }

        // Object comparison
        if (getValueType(actualVal) === 'object' && getValueType(expectedVal) === 'object') {
            return diffObjects(actualVal, expectedVal, path, depth + 1);
        }

        // Fallback for any other types
        if (isPrimitiveEqual(actualVal, expectedVal)) {
            return true;
        }

        diffs.push({
            type: 'change',
            path: createPath(path),
            actualValue: stringifyValue(actualVal),
            expectedValue: stringifyValue(expectedVal)
        });
        return false;
    }

    function diffArrays(
        actualArr: any[],
        expectedArr: any[],
        path: (string | number)[],
        depth: number
    ): boolean {
        let isEqual = true;
        const maxLen = Math.max(actualArr.length, expectedArr.length);
        const limitedLen = Math.min(maxLen, opts.maxArrayLength);

        for (let i = 0; i < limitedLen; i++) {
            const actualHas = i < actualArr.length;
            const expectedHas = i < expectedArr.length;

            if (!actualHas && expectedHas) {
                diffs.push({
                    type: 'add',
                    path: createPath([...path, i]),
                    expectedValue: stringifyValue(expectedArr[i])
                });
                isEqual = false;
            } else if (actualHas && !expectedHas) {
                diffs.push({
                    type: 'remove',
                    path: createPath([...path, i]),
                    actualValue: stringifyValue(actualArr[i])
                });
                isEqual = false;
            } else if (actualHas && expectedHas) {
                if (!diffRecursive(actualArr[i], expectedArr[i], [...path, i], depth)) {
                    isEqual = false;
                }
            }
        }

        // Handle truncated arrays
        if (maxLen > opts.maxArrayLength) {
            diffs.push({
                type: 'change',
                path: createPath([...path, '...']),
                actualValue: `... ${actualArr.length - opts.maxArrayLength} more items`,
                expectedValue: `... ${expectedArr.length - opts.maxArrayLength} more items`
            });
        }

        return isEqual;
    }

    function diffObjects(
        actualObj: Record<string, any>,
        expectedObj: Record<string, any>,
        path: (string | number)[],
        depth: number
    ): boolean {
        let isEqual = true;
        const actualKeys = Object.keys(actualObj);
        const expectedKeys = Object.keys(expectedObj);
        const allKeys = new Set([...actualKeys, ...expectedKeys]);
        const limitedKeys = Array.from(allKeys).slice(0, opts.maxObjectKeys);

        for (const key of limitedKeys) {
            const actualHas = key in actualObj;
            const expectedHas = key in expectedObj;

            if (!actualHas && expectedHas) {
                diffs.push({
                    type: 'add',
                    path: createPath([...path, key]),
                    expectedValue: stringifyValue(expectedObj[key])
                });
                isEqual = false;
            } else if (actualHas && !expectedHas) {
                diffs.push({
                    type: 'remove',
                    path: createPath([...path, key]),
                    actualValue: stringifyValue(actualObj[key])
                });
                isEqual = false;
            } else if (actualHas && expectedHas) {
                if (!diffRecursive(actualObj[key], expectedObj[key], [...path, key], depth)) {
                    isEqual = false;
                }
            }
        }

        // Handle truncated objects
        if (allKeys.size > opts.maxObjectKeys) {
            diffs.push({
                type: 'change',
                path: createPath([...path, '...']),
                actualValue: `... ${allKeys.size - opts.maxObjectKeys} more properties`,
                expectedValue: `... ${allKeys.size - opts.maxObjectKeys} more properties`
            });
        }

        return isEqual;
    }

    const equal = diffRecursive(actual, expected, [], 0);

    return {
        equal,
        diffs
    };
}

/**
 * Format a diff result into a human-readable string
 */
export function formatDiff(result: DiffResult, options: { maxDiffs?: number; showEqual?: boolean } = {}): string {
    const { maxDiffs = 10, showEqual = false } = options;

    if (result.equal && !showEqual) {
        return 'Values are deeply equal';
    }

    if (result.diffs.length === 0) {
        return 'No differences found';
    }

    const lines: string[] = [];
    const displayDiffs = result.diffs.slice(0, maxDiffs);

    for (const diff of displayDiffs) {
        switch (diff.type) {
            case 'add':
                lines.push(`  + ${diff.path}: ${diff.expectedValue}`);
                break;
            case 'remove':
                lines.push(`  - ${diff.path}: ${diff.actualValue}`);
                break;
            case 'change':
                lines.push(`  - ${diff.path}: ${diff.actualValue}`);
                lines.push(`  + ${diff.path}: ${diff.expectedValue}`);
                break;
            case 'equal':
                if (showEqual) {
                    lines.push(`    ${diff.path}: ${diff.actualValue}`);
                }
                break;
        }
    }

    if (result.diffs.length > maxDiffs) {
        lines.push(`  ... and ${result.diffs.length - maxDiffs} more differences`);
    }

    return lines.join('\n');
}

/**
 * Create a concise summary of differences
 */
export function getDiffSummary(result: DiffResult): string {
    if (result.equal) {
        return 'Values are equal';
    }

    const counts = {
        add: 0,
        remove: 0,
        change: 0
    };

    for (const diff of result.diffs) {
        if (diff.type in counts) {
            counts[diff.type as keyof typeof counts]++;
        }
    }

    const parts: string[] = [];
    if (counts.add > 0) parts.push(`${counts.add} added`);
    if (counts.remove > 0) parts.push(`${counts.remove} removed`);
    if (counts.change > 0) parts.push(`${counts.change} changed`);

    return parts.length > 0 ? parts.join(', ') : 'No differences';
}
