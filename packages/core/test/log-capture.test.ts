// packages/core/test/log-capture.test.ts
import { describe, it, resetRegistry, beforeEach, afterEach, runTests, TestLogCollector, testLogger, getCurrentTestLogCollector, setGlobalLogCollector, EnhancedTestError, isEnhancedTestError } from '../src';
import { expect } from '@embedunit/assert';

describe('Log Capture Functionality', () => {
    let originalConsole: { log: any; warn: any; error: any };

    beforeEach(() => {
        resetRegistry();
        // Store original console methods
        originalConsole = {
            log: console.log,
            warn: console.warn,
            error: console.error
        };
    });

    afterEach(() => {
        // Restore original console methods
        console.log = originalConsole.log;
        console.warn = originalConsole.warn;
        console.error = originalConsole.error;
        setGlobalLogCollector(null);
    });

    describe('TestLogCollector', () => {
        it('should intercept console.log calls', () => {
            const collector = new TestLogCollector();
            collector.startTest();

            console.log('Test message 1');
            console.log('Test message 2');

            const logs = collector.getLogs();
            expect(logs.console).toHaveLength(2);
            expect(logs.console[0].message).toBe('Test message 1');
            expect(logs.console[1].message).toBe('Test message 2');
            expect(logs.console[0].timestamp).toBeDefined();
            expect(logs.console[1].timestamp).toBeDefined();

            collector.endTest();
        });

        it('should intercept console.warn calls with prefix', () => {
            const collector = new TestLogCollector();
            collector.startTest();

            console.warn('Warning message');

            const logs = collector.getLogs();
            expect(logs.console).toHaveLength(1);
            expect(logs.console[0].message).toBe('WARN: Warning message');

            collector.endTest();
        });

        it('should intercept console.error calls with prefix', () => {
            const collector = new TestLogCollector();
            collector.startTest();

            console.error('Error message');

            const logs = collector.getLogs();
            expect(logs.console).toHaveLength(1);
            expect(logs.console[0].message).toBe('ERROR: Error message');

            collector.endTest();
        });

        it('should handle object logging with JSON serialization', () => {
            const collector = new TestLogCollector();
            collector.startTest();

            const testObj = { key: 'value', nested: { data: 123 } };
            console.log('Object:', testObj);

            const logs = collector.getLogs();
            expect(logs.console).toHaveLength(1);
            expect(logs.console[0].message).toContain('Object:');
            expect(logs.console[0].message).toContain('"key": "value"');
            expect(logs.console[0].message).toContain('"nested"');

            collector.endTest();
        });

        it('should handle circular objects gracefully', () => {
            const collector = new TestLogCollector();
            collector.startTest();

            const circular: any = { name: 'test' };
            circular.self = circular;
            console.log('Circular:', circular);

            const logs = collector.getLogs();
            expect(logs.console).toHaveLength(1);
            expect(logs.console[0].message).toContain('Circular: [Object]');

            collector.endTest();
        });

        it('should collect framework logs separately', () => {
            const collector = new TestLogCollector();
            collector.startTest();

            collector.addFrameworkLog('Framework message 1');
            collector.addFrameworkLog('Framework message 2');
            console.log('Console message');

            const logs = collector.getLogs();
            expect(logs.framework).toHaveLength(2);
            expect(logs.framework[0].message).toBe('Framework message 1');
            expect(logs.framework[1].message).toBe('Framework message 2');
            expect(logs.console).toHaveLength(1);
            expect(logs.console[0].message).toBe('Console message');

            collector.endTest();
        });

        it('should collect game logs separately', () => {
            const collector = new TestLogCollector();
            collector.startTest();

            collector.addGameLog('Game event 1');
            collector.addGameLog('Game event 2');
            console.log('Console message');

            const logs = collector.getLogs();
            expect(logs.game).toHaveLength(2);
            expect(logs.game[0].message).toBe('Game event 1');
            expect(logs.game[1].message).toBe('Game event 2');
            expect(logs.console).toHaveLength(1);
            expect(logs.console[0].message).toBe('Console message');

            collector.endTest();
        });

        it('should provide recent logs in chronological order', () => {
            const collector = new TestLogCollector();
            collector.startTest();

            // Add logs with small delays to ensure different timestamps
            collector.addFrameworkLog('Framework 1');
            console.log('Console 1');
            collector.addGameLog('Game 1');
            console.log('Console 2');
            collector.addFrameworkLog('Framework 2');

            const recentLogs = collector.getRecentLogs(3);
            expect(recentLogs).toHaveLength(3);
            // Most recent logs should be last in the sorted array
            expect(recentLogs[recentLogs.length - 3].message).toBe('Game 1');
            expect(recentLogs[recentLogs.length - 2].message).toBe('Console 2');
            expect(recentLogs[recentLogs.length - 1].message).toBe('Framework 2');

            collector.endTest();
        });

        it('should track log count correctly', () => {
            const collector = new TestLogCollector();
            collector.startTest();

            expect(collector.getLogCount()).toBe(0);
            expect(collector.hasLogs()).toBe(false);

            console.log('Test');
            collector.addFrameworkLog('Framework');
            collector.addGameLog('Game');

            expect(collector.getLogCount()).toBe(3);
            expect(collector.hasLogs()).toBe(true);

            collector.endTest();
        });

        it('should clear logs when requested', () => {
            const collector = new TestLogCollector();
            collector.startTest();

            console.log('Test');
            collector.addFrameworkLog('Framework');
            expect(collector.hasLogs()).toBe(true);

            collector.clearLogs();
            expect(collector.hasLogs()).toBe(false);
            expect(collector.getLogCount()).toBe(0);

            collector.endTest();
        });

        it('should restore console methods after cleanup', () => {
            const collector = new TestLogCollector();
            const originalLog = console.log;

            collector.startTest();
            expect(console.log).not.toBe(originalLog);

            collector.cleanup();
            expect(console.log).toBe(originalLog);
        });

        it('should not collect logs when not started', () => {
            const collector = new TestLogCollector();

            collector.addFrameworkLog('Should not be collected');
            collector.addGameLog('Should not be collected');

            expect(collector.hasLogs()).toBe(false);
        });
    });

    describe('testLogger helper', () => {
        it('should log game events when collector is active', () => {
            const collector = new TestLogCollector();
            setGlobalLogCollector(collector);
            collector.startTest();

            testLogger.logGameEvent('player_spawn', { x: 100, y: 200 });

            const logs = collector.getLogs();
            expect(logs.game).toHaveLength(1);
            expect(logs.game[0].message).toBe('GAME_EVENT: player_spawn {"x":100,"y":200}');

            collector.endTest();
            setGlobalLogCollector(null);
        });

        it('should log scene changes', () => {
            const collector = new TestLogCollector();
            setGlobalLogCollector(collector);
            collector.startTest();

            testLogger.logSceneChange('MainMenu', 'Level1');

            const logs = collector.getLogs();
            expect(logs.game).toHaveLength(1);
            expect(logs.game[0].message).toBe('GAME_EVENT: scene_change {"from":"MainMenu","to":"Level1"}');

            collector.endTest();
            setGlobalLogCollector(null);
        });

        it('should log player actions', () => {
            const collector = new TestLogCollector();
            setGlobalLogCollector(collector);
            collector.startTest();

            testLogger.logPlayerAction('jump', { x: 50, y: 100 });

            const logs = collector.getLogs();
            expect(logs.game).toHaveLength(1);
            expect(logs.game[0].message).toBe('GAME_EVENT: player_action {"action":"jump","position":{"x":50,"y":100}}');

            collector.endTest();
            setGlobalLogCollector(null);
        });

        it('should log test milestones', () => {
            const collector = new TestLogCollector();
            setGlobalLogCollector(collector);
            collector.startTest();

            testLogger.logTestMilestone('setup_complete', { duration: 150 });

            const logs = collector.getLogs();
            expect(logs.framework).toHaveLength(1);
            expect(logs.framework[0].message).toBe('TEST_MILESTONE: setup_complete {"duration":150}');

            collector.endTest();
            setGlobalLogCollector(null);
        });

        it('should handle no active collector gracefully', () => {
            setGlobalLogCollector(null);

            // Should not throw
            testLogger.logGameEvent('event');
            testLogger.logTestMilestone('milestone');

            expect(true).toBe(true); // Test that we reach this point
        });
    });

    describe('Integration with Test Runner', () => {
        it('should capture logs during test execution and include in enhanced errors', async () => {
            resetRegistry();

            describe('Test Suite with Logs', () => {
                it('failing test with console output', () => {
                    console.log('Debug message before failure');
                    console.warn('Warning about something');
                    testLogger.logGameEvent('test_event', { important: true });

                    throw new Error('Test failure message');
                });
            });

            const testResult = await runTests({
                enhancedErrors: { logCapture: true },
                includePassed: true, includeSkipped: true,
                verboseErrors: true // Need this to get full error objects with context
            });
            const results = [
            ...(testResult.passed || []).map(r => ({ ...r, status: 'passed' })),
            ...(testResult.failures || []).map(r => ({ ...r, status: 'failed' })),
            ...(testResult.skipped || []).map(r => ({ ...r, status: 'skipped', duration: 0 }))
        ];

            expect(results).toHaveLength(1);
            expect(results[0].status).toBe('failed');
            expect(results[0].error).toBeDefined();

            const error = results[0].error!;
            expect(error.context).toBeDefined();

            // Check that it's enhanced with context
            if (error.context) {
                expect(error.context.logs.console.some(log => log.message === 'Debug message before failure')).toBe(true);
                expect(error.context.logs.console.some(log => log.message === 'WARN: Warning about something')).toBe(true);
                expect(error.context.logs.game.some(log => log.message === 'GAME_EVENT: test_event {"important":true}')).toBe(true);
                expect(error.context.logs.framework.length).toBeGreaterThan(0);
                expect(error.context.timing).toBeDefined();
                expect(error.context.testPath?.suite).toBe('Test Suite with Logs');
                expect(error.context.testPath?.test).toBe('failing test with console output');
            }
        });

        it('should work with successful tests (minimal context)', async () => {
            resetRegistry();

            describe('Test Suite', () => {
                it('passing test with logs', () => {
                    console.log('This test passes');
                    testLogger.logGameEvent('success_event');
                    expect(true).toBe(true);
                });
            });

            const testResult = await runTests({
                enhancedErrors: { logCapture: true },
                includePassed: true, includeSkipped: true,
                verboseErrors: true // Need this to get full error objects with context
            });
            const results = [
            ...(testResult.passed || []).map(r => ({ ...r, status: 'passed' })),
            ...(testResult.failures || []).map(r => ({ ...r, status: 'failed' })),
            ...(testResult.skipped || []).map(r => ({ ...r, status: 'skipped', duration: 0 }))
        ];

            expect(results).toHaveLength(1);
            expect(results[0].status).toBe('passed');
        });

        it('should respect enhancedErrors.logCapture=false', async () => {
            resetRegistry();

            describe('Test Suite', () => {
                it('failing test without log capture', () => {
                    console.log('This should not be captured');
                    throw new Error('Test failure');
                });
            });

            const testResult = await runTests({
                enhancedErrors: { logCapture: false },
                includePassed: true, includeSkipped: true,
                verboseErrors: true // Need this to get full error objects
            });
            const results = [
            ...(testResult.passed || []).map(r => ({ ...r, status: 'passed' })),
            ...(testResult.failures || []).map(r => ({ ...r, status: 'failed' })),
            ...(testResult.skipped || []).map(r => ({ ...r, status: 'skipped', duration: 0 }))
        ];

            expect(results).toHaveLength(1);
            expect(results[0].status).toBe('failed');
            expect(results[0].error!.context).toBeUndefined();
        });

        it('should capture logs from beforeEach hooks', async () => {
            resetRegistry();

            describe('Test Suite with Hook Logs', () => {
                beforeEach(() => {
                    console.log('Setup log from beforeEach');
                    testLogger.logTestMilestone('beforeEach_start');
                    throw new Error('beforeEach failure');
                });

                it('test that will not run', () => {
                    expect(true).toBe(true);
                });
            });

            const testResult = await runTests({
                enhancedErrors: { logCapture: true },
                includePassed: true, includeSkipped: true,
                verboseErrors: true // Need this to get full error objects with context
            });
            const results = [
            ...(testResult.passed || []).map(r => ({ ...r, status: 'passed' })),
            ...(testResult.failures || []).map(r => ({ ...r, status: 'failed' })),
            ...(testResult.skipped || []).map(r => ({ ...r, status: 'skipped', duration: 0 }))
        ];

            expect(results).toHaveLength(1);
            expect(results[0].status).toBe('failed');
            expect(results[0].test).toBe('test that will not run');

            if (results[0].error!.context) {
                expect(results[0].error!.context.logs.console.some(log => log.message === 'Setup log from beforeEach')).toBe(true);
                expect(results[0].error!.context.logs.framework.some(log => log.message === 'TEST_MILESTONE: beforeEach_start')).toBe(true);
            }
        });

        it('should capture logs from afterEach hooks', async () => {
            resetRegistry();

            describe('Test Suite with AfterEach Logs', () => {
                afterEach(() => {
                    console.log('Cleanup log from afterEach');
                    throw new Error('afterEach failure');
                });

                it('test that passes but afterEach fails', () => {
                    console.log('Test execution log');
                    expect(true).toBe(true);
                });
            });

            const testResult = await runTests({
                enhancedErrors: { logCapture: true },
                includePassed: true, includeSkipped: true,
                verboseErrors: true // Need this to get full error objects with context
            });
            const results = [
            ...(testResult.passed || []).map(r => ({ ...r, status: 'passed' })),
            ...(testResult.failures || []).map(r => ({ ...r, status: 'failed' })),
            ...(testResult.skipped || []).map(r => ({ ...r, status: 'skipped', duration: 0 }))
        ];

            expect(results).toHaveLength(1);
            expect(results[0].status).toBe('failed');
            expect(results[0].test).toBe('test that passes but afterEach fails');

            if (results[0].error!.context) {
                expect(results[0].error!.context.logs.console.some(log => log.message === 'Test execution log')).toBe(true);
                expect(results[0].error!.context.logs.console.some(log => log.message === 'Cleanup log from afterEach')).toBe(true);
            }
        });

        it('should provide timing information in enhanced errors', async () => {
            resetRegistry();

            describe('Timing Test Suite', () => {
                it('test with timing', async () => {
                    console.log('Starting test');
                    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
                    throw new Error('Timed failure');
                });
            });

            const testResult = await runTests({
                enhancedErrors: { logCapture: true, timing: true },
                includePassed: true, includeSkipped: true,
                verboseErrors: true // Need this to get full error objects with context
            });
            const results = [
            ...(testResult.passed || []).map(r => ({ ...r, status: 'passed' })),
            ...(testResult.failures || []).map(r => ({ ...r, status: 'failed' })),
            ...(testResult.skipped || []).map(r => ({ ...r, status: 'skipped', duration: 0 }))
        ];

            expect(results).toHaveLength(1);
            if (results[0].error!.context) {
                expect(results[0].error!.context.timing).toBeDefined();
                expect(results[0].error!.context.timing!.start).toBeGreaterThan(0);
                expect(results[0].error!.context.timing!.end).toBeGreaterThan(results[0].error!.context.timing!.start);
                expect(results[0].error!.context.timing!.duration).toBeGreaterThan(5); // Should be at least 10ms from setTimeout
            }
        });

        it('should disable timing when enhancedErrors.timing=false', async () => {
            resetRegistry();

            describe('No Timing Test Suite', () => {
                it('test without timing', () => {
                    throw new Error('Failure without timing');
                });
            });

            const testResult = await runTests({
                enhancedErrors: { logCapture: true, timing: false },
                includePassed: true, includeSkipped: true,
                verboseErrors: true // Need this to get full error objects with context
            });
            const results = [
            ...(testResult.passed || []).map(r => ({ ...r, status: 'passed' })),
            ...(testResult.failures || []).map(r => ({ ...r, status: 'failed' })),
            ...(testResult.skipped || []).map(r => ({ ...r, status: 'skipped', duration: 0 }))
        ];

            expect(results).toHaveLength(1);
            if (results[0].error!.context) {
                expect(results[0].error!.context.timing).toBeUndefined();
            }
        });
    });

    describe('EnhancedTestError', () => {
        it('should format error message with log context', () => {
            const testContext = {
                logs: {
                    console: [
                        { message: 'Debug message', timestamp: Date.now() },
                        { message: 'WARN: Warning', timestamp: Date.now() + 10 }
                    ],
                    framework: [
                        { message: 'TEST_MILESTONE: start', timestamp: Date.now() + 20 }
                    ],
                    game: [
                        { message: 'GAME_EVENT: player_move', timestamp: Date.now() + 30 }
                    ]
                },
                timing: {
                    start: Date.now() - 100,
                    end: Date.now(),
                    duration: 100
                },
                testPath: {
                    suite: 'Test Suite',
                    test: 'failing test'
                }
            };

            const error = new EnhancedTestError('Test failed', testContext);
            const errorString = error.toString();

            expect(errorString).toContain('TestError: Test failed'); // Default name when no original error
            expect(errorString).toContain('=== Test Information ===');
            expect(errorString).toContain('Suite: Test Suite');
            expect(errorString).toContain('Test: failing test');
            expect(errorString).toContain('=== Timing Information ===');
            expect(errorString).toContain('Test Duration: 100ms');
            expect(errorString).toContain('=== Recent Logs');
            expect(errorString).toContain('Debug message');
            expect(errorString).toContain('WARN: Warning');
        });

        it('should provide compact summary', () => {
            const testContext = {
                logs: {
                    console: [
                        { message: 'Log 1', timestamp: Date.now() },
                        { message: 'Log 2', timestamp: Date.now() + 10 }
                    ],
                    framework: [
                        { message: 'Framework log', timestamp: Date.now() + 20 }
                    ],
                    game: []
                },
                timing: {
                    start: Date.now() - 50,
                    end: Date.now(),
                    duration: 50
                },
                testPath: {
                    suite: 'Suite',
                    test: 'test'
                }
            };

            const error = new EnhancedTestError('Failed', testContext);
            const summary = error.getCompactSummary();

            expect(summary).toBe('Failed (Suite > test) [50ms] [3 logs]');
        });

        it('should export to JSON correctly', () => {
            const testContext = {
                logs: {
                    console: [
                        { message: 'Test log', timestamp: Date.now() }
                    ],
                    framework: [],
                    game: []
                }
            };

            const originalError = new Error('Original');
            const error = new EnhancedTestError('Enhanced', testContext, originalError);
            const json = error.toJSON();

            expect(json.name).toBe('Error'); // Should preserve original error name
            expect(json.message).toBe('Enhanced');
            expect(json.context).toEqual(testContext);
            expect(json.originalError.name).toBe('Error');
            expect(json.originalError.message).toBe('Original');
        });
    });
});
