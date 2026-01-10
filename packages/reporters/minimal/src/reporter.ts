// src/reporter.ts
// Test result reporting utilities

import type { TestResult, TestSummary } from '@embedunit/core';

/**
 * Configuration options for reporter output
 */
export interface ReporterOptions {
    /**
     * Whether to use emoji in output (default: true)
     * When false, uses text alternatives like PASS/FAIL, [skip], etc.
     */
    useEmoji?: boolean;

    /**
     * Whether to output compact JSON without whitespace (default: false)
     * When true, produces single-line minified JSON output.
     */
    compact?: boolean;
}

export interface ReporterTestSummary extends TestSummary {
    passRate: number;
}

/**
 * Validates that the results parameter is a valid array of TestResult objects.
 * @param results - The results array to validate
 * @throws {TypeError} When results is null, undefined, or not an array
 */
function validateResults(results: unknown): asserts results is TestResult[] {
    if (results == null) {
        throw new TypeError('Results array cannot be null or undefined');
    }
    if (!Array.isArray(results)) {
        throw new TypeError('Results must be an array');
    }
}

/**
 * Safely gets the duration from a test result, handling NaN and Infinity.
 * @param duration - The duration value to sanitize
 * @returns A valid number, defaulting to 0 for invalid values
 */
function sanitizeDuration(duration: unknown): number {
    if (typeof duration !== 'number' || !Number.isFinite(duration)) {
        return 0;
    }
    return duration;
}

/**
 * Safely gets the name from a test result, with fallback for missing values.
 * @param name - The name to sanitize
 * @param fallback - Fallback value (default: "unknown")
 * @returns The name or fallback
 */
function sanitizeName(name: unknown, fallback = 'unknown'): string {
    if (typeof name !== 'string' || name.trim() === '') {
        return fallback;
    }
    return name;
}

/**
 * Safely gets the error message from an error object.
 * @param error - The error object
 * @returns The error message or a fallback
 */
function getErrorMessage(error: unknown): string {
    if (error == null) {
        return 'Unknown error';
    }
    if (typeof error === 'object' && 'message' in error) {
        const message = (error as { message?: unknown }).message;
        if (typeof message === 'string' && message.trim() !== '') {
            return message;
        }
    }
    return 'Unknown error';
}

/**
 * Validates and sanitizes a single TestResult object.
 * @param result - The test result to validate
 * @returns A sanitized TestResult
 */
function sanitizeTestResult(result: unknown): TestResult {
    if (result == null || typeof result !== 'object') {
        return {
            suite: 'unknown',
            test: 'unknown',
            status: 'failed',
            duration: 0
        };
    }

    const r = result as Partial<TestResult>;
    return {
        suite: sanitizeName(r.suite, 'unknown'),
        test: sanitizeName(r.test, 'unknown'),
        status: r.status === 'passed' || r.status === 'failed' || r.status === 'skipped'
            ? r.status
            : 'failed',
        duration: sanitizeDuration(r.duration),
        error: r.error
    };
}

/**
 * Calculate test summary statistics from an array of test results.
 *
 * Computes passed/failed/skipped counts, total duration, and pass rate.
 * Pass rate is calculated as (passed / (total - skipped)) * 100.
 *
 * @param results - Array of TestResult objects from a test run
 * @returns Summary object containing statistics and pass rate
 * @throws {TypeError} When results is null, undefined, or not an array
 *
 * @example
 * ```typescript
 * const results = await runTests();
 * const summary = calculateSummary(results);
 * console.log(`Pass rate: ${summary.passRate}%`);
 * ```
 */
export function calculateSummary(results: TestResult[]): ReporterTestSummary {
    validateResults(results);

    const sanitizedResults = results.map(sanitizeTestResult);
    const total = sanitizedResults.length;
    const passed = sanitizedResults.filter(r => r.status === 'passed').length;
    const failed = sanitizedResults.filter(r => r.status === 'failed').length;
    const skipped = sanitizedResults.filter(r => r.status === 'skipped').length;
    const duration = sanitizedResults.reduce((sum, r) => sum + sanitizeDuration(r.duration), 0);
    const testRun = total - skipped;
    const passRate = testRun > 0 ? (passed / testRun) * 100 : 0;

    return {
        total,
        passed,
        failed,
        skipped,
        duration: Number.isFinite(duration) ? duration : 0,
        success: failed === 0,
        passRate: Number.isFinite(passRate) ? passRate : 0
    };
}

/**
 * Format a test summary as a human-readable string.
 *
 * Generates a one-line summary like "Ran 5 test(s). 4 passed, 1 failed."
 * Only includes failed/skipped counts when they are greater than zero.
 *
 * @param summary - TestSummary object with test counts
 * @returns Formatted summary string
 * @throws {TypeError} When summary is null or undefined
 *
 * @example
 * ```typescript
 * const summary = calculateSummary(results);
 * console.log(formatSummary(summary));
 * // Output: "Ran 10 test(s). 8 passed, 2 failed."
 * ```
 */
export function formatSummary(summary: TestSummary): string {
    if (summary == null) {
        throw new TypeError('Summary cannot be null or undefined');
    }

    const total = typeof summary.total === 'number' && Number.isFinite(summary.total)
        ? summary.total
        : 0;
    const passed = typeof summary.passed === 'number' && Number.isFinite(summary.passed)
        ? summary.passed
        : 0;
    const failed = typeof summary.failed === 'number' && Number.isFinite(summary.failed)
        ? summary.failed
        : 0;
    const skipped = typeof summary.skipped === 'number' && Number.isFinite(summary.skipped)
        ? summary.skipped
        : 0;

    const parts = [
        `${passed} passed`,
        failed > 0 ? `${failed} failed` : null,
        skipped > 0 ? `${skipped} skipped` : null
    ].filter(Boolean);

    return `Ran ${total} test(s). ${parts.join(', ')}.`;
}

/**
 * Generate a detailed text report of test results.
 *
 * Creates a multi-line report including:
 * - Header with test counts and duration
 * - List of failed tests with error messages
 * - List of skipped tests (first 10)
 *
 * @param results - Array of TestResult objects from a test run
 * @param options - Optional configuration for report formatting
 * @param options.useEmoji - Whether to use emoji (default: true). When false, uses FAIL/PASS text.
 * @returns Multi-line text report
 * @throws {TypeError} When results is null, undefined, or not an array
 *
 * @example
 * ```typescript
 * const results = await runTests();
 * console.log(generateTextReport(results));
 *
 * // Without emojis:
 * console.log(generateTextReport(results, { useEmoji: false }));
 * ```
 */
export function generateTextReport(results: TestResult[], options?: ReporterOptions): string {
    validateResults(results);

    const useEmoji = options?.useEmoji !== false;
    const failIcon = useEmoji ? '❌' : '[FAIL]';
    const skipIcon = useEmoji ? '⏭️ ' : '[skip]';

    const sanitizedResults = results.map(sanitizeTestResult);
    const summary = calculateSummary(sanitizedResults);
    const lines: string[] = [];

    lines.push('Test Results');
    lines.push('============');
    lines.push('');
    lines.push(formatSummary(summary));

    const durationStr = Number.isFinite(summary.duration)
        ? summary.duration.toFixed(2)
        : '0.00';
    const passRateStr = Number.isFinite(summary.passRate)
        ? summary.passRate.toFixed(1)
        : '0.0';

    lines.push(`Duration: ${durationStr}ms`);
    lines.push(`Pass Rate: ${passRateStr}%`);

    if (summary.failed > 0) {
        lines.push('');
        lines.push('Failed Tests:');
        lines.push('-------------');
        sanitizedResults
            .filter(r => r.status === 'failed')
            .forEach(r => {
                const suite = sanitizeName(r.suite, 'unknown');
                const test = sanitizeName(r.test, 'unknown');
                lines.push(`  ${failIcon} ${suite} > ${test}`);
                if (r.error) {
                    lines.push(`     ${getErrorMessage(r.error)}`);
                }
            });
    }

    if (summary.skipped > 0) {
        lines.push('');
        lines.push('Skipped Tests:');
        lines.push('--------------');
        sanitizedResults
            .filter(r => r.status === 'skipped')
            .slice(0, 10) // Show first 10
            .forEach(r => {
                const suite = sanitizeName(r.suite, 'unknown');
                const test = sanitizeName(r.test, 'unknown');
                lines.push(`  ${skipIcon} ${suite} > ${test}`);
            });
        if (summary.skipped > 10) {
            lines.push(`  ... and ${summary.skipped - 10} more`);
        }
    }

    return lines.join('\n');
}

/**
 * Generate a JSON-formatted report of test results.
 *
 * Creates a structured JSON object containing summary statistics
 * and detailed results for each test, suitable for parsing by
 * external tools or CI systems.
 *
 * @param results - Array of TestResult objects from a test run
 * @param options - Optional configuration for JSON formatting
 * @param options.compact - When true, outputs minified single-line JSON (default: false)
 * @returns JSON string with summary and results array
 * @throws {TypeError} When results is null, undefined, or not an array
 *
 * @example
 * ```typescript
 * const results = await runTests();
 * const jsonReport = generateJsonReport(results);
 * fs.writeFileSync('test-results.json', jsonReport);
 *
 * // Compact output for size-constrained environments:
 * const compact = generateJsonReport(results, { compact: true });
 * ```
 */
export function generateJsonReport(results: TestResult[], options?: ReporterOptions): string {
    validateResults(results);

    const sanitizedResults = results.map(sanitizeTestResult);
    const summary = calculateSummary(sanitizedResults);

    const report = {
        summary,
        results: sanitizedResults.map(r => ({
            suite: sanitizeName(r.suite, 'unknown'),
            test: sanitizeName(r.test, 'unknown'),
            status: r.status,
            duration: sanitizeDuration(r.duration),
            error: r.error ? {
                message: getErrorMessage(r.error),
                name: typeof r.error.name === 'string' ? r.error.name : undefined,
                file: typeof r.error.file === 'string' ? r.error.file : undefined,
                line: typeof r.error.line === 'number' && Number.isFinite(r.error.line)
                    ? r.error.line
                    : undefined
            } : undefined
        }))
    };

    return options?.compact
        ? JSON.stringify(report)
        : JSON.stringify(report, null, 2);
}

/**
 * Generate a compact single-line summary of test results.
 *
 * Creates a brief summary suitable for console output or status displays.
 * Uses emoji by default to indicate success/failure status.
 *
 * @param results - Array of TestResult objects from a test run
 * @param options - Optional configuration for summary formatting
 * @param options.useEmoji - Whether to use emoji (default: true). When false, uses PASS/FAIL text.
 * @returns Single-line summary string with status indicator
 * @throws {TypeError} When results is null, undefined, or not an array
 *
 * @example
 * ```typescript
 * const results = await runTests();
 * console.log(generateCompactSummary(results));
 * // Output: "✅ Ran 10 test(s). 10 passed."
 *
 * // Without emojis:
 * console.log(generateCompactSummary(results, { useEmoji: false }));
 * // Output: "[PASS] Ran 10 test(s). 10 passed."
 * ```
 */
export function generateCompactSummary(results: TestResult[], options?: ReporterOptions): string {
    validateResults(results);

    const useEmoji = options?.useEmoji !== false;
    const sanitizedResults = results.map(sanitizeTestResult);
    const summary = calculateSummary(sanitizedResults);

    let statusIcon: string;
    if (useEmoji) {
        statusIcon = summary.failed > 0 ? '❌' : '✅';
    } else {
        statusIcon = summary.failed > 0 ? '[FAIL]' : '[PASS]';
    }

    const parts = [
        `${summary.passed} passed`,
        summary.failed > 0 ? `${summary.failed} failed` : null,
        summary.skipped > 0 ? `${summary.skipped} skipped` : null
    ].filter(Boolean);

    return `${statusIcon} Ran ${summary.total} test(s). ${parts.join(', ')}.`;
}
