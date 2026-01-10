// src/error-format.ts
// Enhanced error formatting with stack trace filtering and better messages

import { diff, formatDiff, DiffResult } from './diff';

/**
 * Configuration for error formatting
 */
export interface ErrorFormatOptions {
    showStackTrace?: boolean;
    filterInternalFrames?: boolean;
    maxStackDepth?: number;
    diffOptions?: {
        maxDiffs?: number;
        showContext?: boolean;
    };
}

const DEFAULT_OPTIONS: Required<ErrorFormatOptions> = {
    showStackTrace: true,
    filterInternalFrames: true,
    maxStackDepth: 10,
    diffOptions: {
        maxDiffs: 10,
        showContext: false
    }
};

/**
 * Patterns to identify internal framework code
 */
const INTERNAL_PATTERNS = [
    /CCTestSuite\.(js|ts)/,
    /src\/(assertion|dsl|runner|spy|mock|timeout|parameterized|diff|error-format)\.ts/,
    /node_modules/,
    /dist\/CCTestSuite\.js/,
    /at (expect|it|describe|beforeAll|beforeEach|afterEach|afterAll)\s/,
    /at .*\.(toBe|toEqual|toMatch|toContain|toHaveLength|toThrow)\s/
];

/**
 * Check if a stack frame is from internal framework code
 */
function isInternalFrame(frame: string): boolean {
    return INTERNAL_PATTERNS.some(pattern => pattern.test(frame));
}

/**
 * Filter stack trace to show only user code
 */
export function filterStackTrace(stack: string[], options: ErrorFormatOptions = {}): string[] {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    if (!opts.filterInternalFrames) {
        return stack.slice(0, opts.maxStackDepth);
    }

    const filtered: string[] = [];
    let userFrameCount = 0;

    for (const frame of stack) {
        // Always include the first frame (error location) even if internal
        if (filtered.length === 0) {
            filtered.push(frame);
            if (!isInternalFrame(frame)) {
                userFrameCount++;
            }
            continue;
        }

        if (!isInternalFrame(frame)) {
            filtered.push(frame);
            userFrameCount++;

            if (userFrameCount >= opts.maxStackDepth) {
                break;
            }
        }
    }

    // If we filtered everything out, show the original stack
    if (filtered.length <= 1 && stack.length > 1) {
        return stack.slice(0, opts.maxStackDepth);
    }

    return filtered;
}

/**
 * Create a diff-enhanced error message for comparison failures
 */
export function createDiffError(
    actual: any,
    expected: any,
    message: string,
    options: ErrorFormatOptions = {}
): string {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // For primitive values or small objects, don't show diff
    if (isPrimitiveValue(actual) && isPrimitiveValue(expected)) {
        return message;
    }

    const diffResult = diff(actual, expected);

    if (diffResult.equal) {
        return message;
    }

    const diffFormatted = formatDiff(diffResult, opts.diffOptions);

    return `${message}\n\nDifference:\n${diffFormatted}`;
}

/**
 * Check if a value should be treated as primitive for diff purposes
 */
function isPrimitiveValue(value: any): boolean {
    if (value === null || value === undefined) return true;
    const type = typeof value;
    if (type === 'string' || type === 'number' || type === 'boolean' || type === 'bigint' || type === 'symbol') {
        return true;
    }
    if (type === 'object') {
        // Small objects/arrays still benefit from diff
        if (Array.isArray(value)) {
            return value.length === 0;
        }
        return Object.keys(value).length === 0;
    }
    return true;
}

/**
 * Enhanced error class with better formatting
 */
export class EnhancedAssertionError extends Error {
    public actual?: any;
    public expected?: any;
    public diffResult?: DiffResult;
    public originalStack?: string[];

    constructor(
        message: string,
        actual?: any,
        expected?: any,
        options: ErrorFormatOptions = {}
    ) {
        const opts = { ...DEFAULT_OPTIONS, ...options };

        // Create diff-enhanced message for comparison errors
        let enhancedMessage = message;
        if (actual !== undefined && expected !== undefined) {
            enhancedMessage = createDiffError(actual, expected, message, opts);
        }

        super(enhancedMessage);

        this.name = 'AssertionError';
        this.actual = actual;
        this.expected = expected;

        // Store original stack
        if (this.stack) {
            this.originalStack = this.stack.split('\n');

            if (opts.showStackTrace) {
                const filtered = filterStackTrace(this.originalStack, opts);
                this.stack = filtered.join('\n');
            } else {
                // Keep only the first line (error message)
                this.stack = this.originalStack[0] || this.message;
            }
        }

        // Calculate diff if both values provided
        if (actual !== undefined && expected !== undefined) {
            this.diffResult = diff(actual, expected);
        }
    }

    /**
     * Get the full unfiltered stack trace
     */
    getFullStack(): string | undefined {
        return this.originalStack?.join('\n');
    }

    /**
     * Get a detailed diff report
     */
    getDiffReport(): string | undefined {
        if (!this.diffResult || this.diffResult.equal) {
            return undefined;
        }

        return formatDiff(this.diffResult, { maxDiffs: 20, showEqual: false });
    }
}

/**
 * Format async error with better context
 */
export function formatAsyncError(error: any, context: string): string {
    let message = '';

    if (error instanceof Error) {
        message = error.message;
    } else {
        message = String(error);
    }

    // Add context information
    const contextMessage = `Async error in ${context}: ${message}`;

    // If it's a timeout, provide helpful information
    if (message.toLowerCase().includes('timeout') || message.toLowerCase().includes('timed out')) {
        return `${contextMessage}\n\nThis might be caused by:\n- Test taking longer than expected\n- Unresolved promises\n- Missing await statements\n- Infinite loops or blocking operations`;
    }

    // If it's a promise rejection, provide helpful information
    if (message.toLowerCase().includes('rejection') || message.toLowerCase().includes('reject')) {
        return `${contextMessage}\n\nThis might be caused by:\n- Unhandled promise rejection\n- Missing catch blocks\n- Async function throwing errors`;
    }

    return contextMessage;
}

/**
 * Create user-friendly error message with custom context
 */
export function createCustomError(
    baseMessage: string,
    customMessage?: string,
    actual?: any,
    expected?: any,
    options: ErrorFormatOptions = {}
): EnhancedAssertionError {
    let message = baseMessage;

    if (customMessage) {
        message = `${customMessage}\n\n${baseMessage}`;
    }

    return new EnhancedAssertionError(message, actual, expected, options);
}

/**
 * Format error for different output contexts
 */
export function formatErrorForContext(error: Error, context: 'console' | 'json' | 'compact'): any {
    switch (context) {
        case 'json':
            return {
                name: error.name,
                message: error.message,
                stack: error.stack?.split('\n'),
                actual: error instanceof EnhancedAssertionError ? error.actual : undefined,
                expected: error instanceof EnhancedAssertionError ? error.expected : undefined,
                diff: error instanceof EnhancedAssertionError ? error.getDiffReport() : undefined
            };

        case 'compact': {
            const firstLine = error.message.split('\n')[0];
            return firstLine.length > 80 ? firstLine.slice(0, 77) + '...' : firstLine;
        }

        case 'console':
        default:
            return error.toString();
    }
}
