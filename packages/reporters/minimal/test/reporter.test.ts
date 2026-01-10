// test/reporter.test.ts
import { describe, it } from '@embedunit/core';
import { expect } from '@embedunit/assert';
import {
    calculateSummary,
    formatSummary,
    generateCompactSummary,
    generateTextReport,
    generateJsonReport
} from '../src';
import { TestResult } from '@embedunit/core';

describe('Test Reporter', () => {

    describe('calculateSummary', () => {
        it('should calculate correct summary for all passed tests', () => {
            const results: TestResult[] = [
                { suite: 'Suite1', test: 'test1', status: 'passed', duration: 10 },
                { suite: 'Suite1', test: 'test2', status: 'passed', duration: 15 },
                { suite: 'Suite2', test: 'test1', status: 'passed', duration: 20 }
            ];

            const summary = calculateSummary(results);

            expect(summary.total).toBe(3);
            expect(summary.passed).toBe(3);
            expect(summary.failed).toBe(0);
            expect(summary.skipped).toBe(0);
            expect(summary.duration).toBe(45);
            expect(summary.passRate).toBe(100);
        });

        it('should calculate correct summary with failures', () => {
            const results: TestResult[] = [
                { suite: 'Suite1', test: 'test1', status: 'passed', duration: 10 },
                { suite: 'Suite1', test: 'test2', status: 'failed', duration: 15, error: new Error('Failed') },
                { suite: 'Suite2', test: 'test1', status: 'passed', duration: 20 }
            ];

            const summary = calculateSummary(results);

            expect(summary.total).toBe(3);
            expect(summary.passed).toBe(2);
            expect(summary.failed).toBe(1);
            expect(summary.skipped).toBe(0);
            expect(summary.duration).toBe(45);
            expect(Math.round(summary.passRate * 10) / 10).toBe(66.7);
        });

        it('should calculate correct summary with skipped tests', () => {
            const results: TestResult[] = [
                { suite: 'Suite1', test: 'test1', status: 'passed', duration: 10 },
                { suite: 'Suite1', test: 'test2', status: 'skipped', duration: 0 },
                { suite: 'Suite2', test: 'test1', status: 'passed', duration: 20 },
                { suite: 'Suite2', test: 'test2', status: 'skipped', duration: 0 }
            ];

            const summary = calculateSummary(results);

            expect(summary.total).toBe(4);
            expect(summary.passed).toBe(2);
            expect(summary.failed).toBe(0);
            expect(summary.skipped).toBe(2);
            expect(summary.duration).toBe(30);
            expect(summary.passRate).toBe(100); // 2 passed out of 2 run (skipped not counted)
        });

        it('should handle empty results', () => {
            const results: TestResult[] = [];

            const summary = calculateSummary(results);

            expect(summary.total).toBe(0);
            expect(summary.passed).toBe(0);
            expect(summary.failed).toBe(0);
            expect(summary.skipped).toBe(0);
            expect(summary.duration).toBe(0);
            expect(summary.passRate).toBe(0);
        });

        it('should handle all skipped tests', () => {
            const results: TestResult[] = [
                { suite: 'Suite1', test: 'test1', status: 'skipped', duration: 0 },
                { suite: 'Suite1', test: 'test2', status: 'skipped', duration: 0 }
            ];

            const summary = calculateSummary(results);

            expect(summary.total).toBe(2);
            expect(summary.passed).toBe(0);
            expect(summary.failed).toBe(0);
            expect(summary.skipped).toBe(2);
            expect(summary.passRate).toBe(0); // No tests actually ran
        });
    });

    describe('formatSummary', () => {
        it('should format summary with only passed tests', () => {
            const summary = {
                total: 10,
                passed: 10,
                failed: 0,
                skipped: 0,
                duration: 100,
                passRate: 100
            };

            const formatted = formatSummary(summary);

            expect(formatted).toBe('Ran 10 test(s). 10 passed.');
        });

        it('should format summary with failed tests', () => {
            const summary = {
                total: 10,
                passed: 7,
                failed: 3,
                skipped: 0,
                duration: 100,
                passRate: 70
            };

            const formatted = formatSummary(summary);

            expect(formatted).toBe('Ran 10 test(s). 7 passed, 3 failed.');
        });

        it('should format summary with skipped tests', () => {
            const summary = {
                total: 10,
                passed: 6,
                failed: 0,
                skipped: 4,
                duration: 100,
                passRate: 100
            };

            const formatted = formatSummary(summary);

            expect(formatted).toBe('Ran 10 test(s). 6 passed, 4 skipped.');
        });

        it('should format summary with all test types', () => {
            const summary = {
                total: 10,
                passed: 5,
                failed: 2,
                skipped: 3,
                duration: 100,
                passRate: 71.4
            };

            const formatted = formatSummary(summary);

            expect(formatted).toBe('Ran 10 test(s). 5 passed, 2 failed, 3 skipped.');
        });
    });

    describe('generateCompactSummary', () => {
        it('should generate compact summary with success emoji', () => {
            const results: TestResult[] = [
                { suite: 'Suite1', test: 'test1', status: 'passed', duration: 10 },
                { suite: 'Suite1', test: 'test2', status: 'passed', duration: 15 }
            ];

            const summary = generateCompactSummary(results);

            expect(summary).toContain('✅');
            expect(summary).toContain('Ran 2 test(s)');
            expect(summary).toContain('2 passed');
        });

        it('should generate compact summary with failure emoji', () => {
            const results: TestResult[] = [
                { suite: 'Suite1', test: 'test1', status: 'passed', duration: 10 },
                { suite: 'Suite1', test: 'test2', status: 'failed', duration: 15, error: new Error('Failed') }
            ];

            const summary = generateCompactSummary(results);

            expect(summary).toContain('❌');
            expect(summary).toContain('1 passed');
            expect(summary).toContain('1 failed');
        });

        it('should include skipped count when present', () => {
            const results: TestResult[] = [
                { suite: 'Suite1', test: 'test1', status: 'passed', duration: 10 },
                { suite: 'Suite1', test: 'test2', status: 'skipped', duration: 0 }
            ];

            const summary = generateCompactSummary(results);

            expect(summary).toContain('1 passed');
            expect(summary).toContain('1 skipped');
        });
    });

    describe('generateTextReport', () => {
        it('should generate detailed text report', () => {
            const results: TestResult[] = [
                { suite: 'Suite1', test: 'test1', status: 'passed', duration: 10 },
                { suite: 'Suite1', test: 'test2', status: 'failed', duration: 15, error: new Error('Test failed') },
                { suite: 'Suite2', test: 'test1', status: 'skipped', duration: 0 }
            ];

            const report = generateTextReport(results);

            expect(report).toContain('Test Results');
            expect(report).toContain('============');
            expect(report).toContain('Ran 3 test(s)');
            expect(report).toContain('1 passed');
            expect(report).toContain('1 failed');
            expect(report).toContain('1 skipped');
            expect(report).toContain('Duration:');
            expect(report).toContain('Pass Rate:');
            expect(report).toContain('Failed Tests:');
            expect(report).toContain('❌ Suite1 > test2');
            expect(report).toContain('Test failed');
            expect(report).toContain('Skipped Tests:');
            expect(report).toContain('⏭️  Suite2 > test1');
        });

        it('should not show failed section when no failures', () => {
            const results: TestResult[] = [
                { suite: 'Suite1', test: 'test1', status: 'passed', duration: 10 },
                { suite: 'Suite1', test: 'test2', status: 'passed', duration: 15 }
            ];

            const report = generateTextReport(results);

            expect(report).not.toContain('Failed Tests:');
        });

        it('should not show skipped section when no skips', () => {
            const results: TestResult[] = [
                { suite: 'Suite1', test: 'test1', status: 'passed', duration: 10 },
                { suite: 'Suite1', test: 'test2', status: 'passed', duration: 15 }
            ];

            const report = generateTextReport(results);

            expect(report).not.toContain('Skipped Tests:');
        });

        it('should limit skipped tests display to first 10', () => {
            const results: TestResult[] = [];
            // Add 15 skipped tests
            for (let i = 1; i <= 15; i++) {
                results.push({ suite: 'Suite', test: `test${i}`, status: 'skipped', duration: 0 });
            }

            const report = generateTextReport(results);

            expect(report).toContain('... and 5 more');

            // Count occurrences of ⏭️
            const skipSymbolCount = (report.match(/⏭️/g) || []).length;
            expect(skipSymbolCount).toBe(10);
        });
    });

    describe('generateJsonReport', () => {
        it('should generate valid JSON report', () => {
            const results: TestResult[] = [
                { suite: 'Suite1', test: 'test1', status: 'passed', duration: 10 },
                { suite: 'Suite1', test: 'test2', status: 'failed', duration: 15, error: new Error('Failed') }
            ];

            const jsonStr = generateJsonReport(results);
            const parsed = JSON.parse(jsonStr);

            expect(parsed.summary).toBeDefined();
            expect(parsed.summary.total).toBe(2);
            expect(parsed.summary.passed).toBe(1);
            expect(parsed.summary.failed).toBe(1);
            expect(parsed.results).toBeDefined();
            expect(parsed.results.length).toBe(2);
        });

        it('should include error details for failed tests', () => {
            const error = new Error('Test error');
            const results: TestResult[] = [
                {
                    suite: 'Suite1',
                    test: 'test1',
                    status: 'failed',
                    duration: 15,
                    error: Object.assign(error, {
                        file: '/path/to/test.ts',
                        line: 42
                    }) as any
                }
            ];

            const jsonStr = generateJsonReport(results);
            const parsed = JSON.parse(jsonStr);

            expect(parsed.results[0].error).toBeDefined();
            expect(parsed.results[0].error.message).toBe('Test error');
            expect(parsed.results[0].error.file).toBe('/path/to/test.ts');
            expect(parsed.results[0].error.line).toBe(42);
        });

        it('should not include error for passed tests', () => {
            const results: TestResult[] = [
                { suite: 'Suite1', test: 'test1', status: 'passed', duration: 10 }
            ];

            const jsonStr = generateJsonReport(results);
            const parsed = JSON.parse(jsonStr);

            expect(parsed.results[0].error).toBeUndefined();
        });

        it('should handle empty results', () => {
            const results: TestResult[] = [];

            const jsonStr = generateJsonReport(results);
            const parsed = JSON.parse(jsonStr);

            expect(parsed.summary.total).toBe(0);
            expect(parsed.results).toEqual([]);
        });

        it('should be properly formatted with indentation', () => {
            const results: TestResult[] = [
                { suite: 'Suite1', test: 'test1', status: 'passed', duration: 10 }
            ];

            const jsonStr = generateJsonReport(results);

            // Check for indentation (2 spaces)
            expect(jsonStr).toContain('\n  ');
            expect(jsonStr).toContain('{\n');
            expect(jsonStr).toContain('\n}');
        });
    });

    describe('Edge cases', () => {
        it('should handle very long test names', () => {
            const longName = 'a'.repeat(200);
            const results: TestResult[] = [
                { suite: longName, test: longName, status: 'passed', duration: 10 }
            ];

            const compact = generateCompactSummary(results);
            const text = generateTextReport(results);
            const json = generateJsonReport(results);

            expect(compact).toContain('1 passed');
            expect(text).toContain('1 passed');
            expect(JSON.parse(json).summary.passed).toBe(1);
        });

        it('should handle special characters in test names', () => {
            const results: TestResult[] = [
                { suite: 'Suite "with" quotes', test: 'test\nwith\nnewlines', status: 'passed', duration: 10 }
            ];

            const json = generateJsonReport(results);
            const parsed = JSON.parse(json); // Should not throw

            expect(parsed.results[0].suite).toBe('Suite "with" quotes');
            expect(parsed.results[0].test).toBe('test\nwith\nnewlines');
        });

        it('should handle NaN and Infinity in durations', () => {
            const results: TestResult[] = [
                { suite: 'Suite1', test: 'test1', status: 'passed', duration: NaN },
                { suite: 'Suite1', test: 'test2', status: 'passed', duration: Infinity }
            ];

            const summary = calculateSummary(results);

            // NaN and Infinity are sanitized to 0
            expect(summary.duration).toBe(0);
        });

        it('should calculate correct pass rate with mixed results', () => {
            const results: TestResult[] = [
                { suite: 'S1', test: 't1', status: 'passed', duration: 10 },
                { suite: 'S1', test: 't2', status: 'failed', duration: 10, error: new Error() },
                { suite: 'S1', test: 't3', status: 'skipped', duration: 0 },
                { suite: 'S1', test: 't4', status: 'passed', duration: 10 },
                { suite: 'S1', test: 't5', status: 'skipped', duration: 0 }
            ];

            const summary = calculateSummary(results);

            // 2 passed out of 3 run (2 passed + 1 failed, 2 skipped not counted)
            expect(Math.round(summary.passRate * 10) / 10).toBe(66.7);
        });
    });
});
