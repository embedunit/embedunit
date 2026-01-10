// packages/core/test/skip-events.test.ts
import { describe, it, xdescribe, xit, resetRegistry, runTests } from '../src';
import type { TestEvent } from '../src';
import { expect } from '@embedunit/assert';

describe('Skip Event Emission', () => {
    it('should emit skip event for explicitly skipped tests', async () => {
        const events: TestEvent[] = [];

        // Reset registry to ensure clean state
        resetRegistry();

        // Register test dynamically
        describe('Test Suite', () => {
            it('normal test', () => {
                expect(true).toBe(true);
            });

            xit('skipped test', () => {
                expect(true).toBe(false); // Should not run
            });
        });

        await runTests({
            filter: (suite) => suite === 'Test Suite',
            onEvent: (event) => events.push(event)
        });

        // Find skip events
        const skipEvents = events.filter(e => e.type === 'skip');
        expect(skipEvents).toHaveLength(1);
        expect(skipEvents[0]).toEqual({
            type: 'skip',
            suite: 'Test Suite',
            test: 'skipped test',
            reason: 'explicitly skipped'
        });
    });

    it('should emit skip event for non-focused tests when .only is used', async () => {
        const events: TestEvent[] = [];

        // Reset registry to ensure clean state
        resetRegistry();

        // Register tests dynamically
        describe('Focus Suite', () => {
            it('normal test 1', () => {
                expect(true).toBe(true);
            });

            it.only('focused test', () => {
                expect(true).toBe(true);
            });

            it('normal test 2', () => {
                expect(true).toBe(true);
            });
        });

        await runTests({
            filter: (suite) => suite === 'Focus Suite',
            onEvent: (event) => events.push(event)
        });

        // Find skip events for non-focused tests
        const skipEvents = events.filter(e => e.type === 'skip');
        expect(skipEvents).toHaveLength(2);

        const skippedTests = skipEvents.map(e => e.type === 'skip' ? e.test : '');
        expect(skippedTests).toContain('normal test 1');
        expect(skippedTests).toContain('normal test 2');

        // Verify reason
        skipEvents.forEach(event => {
            if (event.type === 'skip') {
                expect(event.reason).toBe('not focused');
            }
        });
    });

    it('should include skip events in complete event results', async () => {
        const events: TestEvent[] = [];

        // Reset registry to ensure clean state
        resetRegistry();

        describe('Mixed Suite', () => {
            it('passing test', () => {
                expect(1).toBe(1);
            });

            xit('skipped test', () => {
                expect(true).toBe(false);
            });
        });

        await runTests({
            filter: (suite) => suite === 'Mixed Suite',
            onEvent: (event) => events.push(event)
        });

        // Find complete event
        const completeEvent = events.find(e => e.type === 'complete');
        expect(completeEvent).toBeDefined();

        if (completeEvent?.type === 'complete') {
            const skippedResults = completeEvent.results.filter(r => r.status === 'skipped');
            expect(skippedResults).toHaveLength(1);
            expect(skippedResults[0].test).toBe('skipped test');
        }
    });

    it('should emit skip events for entire skipped suites', async () => {
        const events: TestEvent[] = [];

        // Reset registry to ensure clean state
        resetRegistry();

        xdescribe('Skipped Suite', () => {
            it('test 1', () => {
                expect(true).toBe(true);
            });

            it('test 2', () => {
                expect(true).toBe(true);
            });
        });

        await runTests({
            filter: (suite) => suite.includes('Skipped Suite'),
            onEvent: (event) => events.push(event)
        });

        const skipEvents = events.filter(e => e.type === 'skip');
        expect(skipEvents).toHaveLength(2);

        skipEvents.forEach(event => {
            if (event.type === 'skip') {
                expect(event.suite).toBe('Skipped Suite');
                expect(event.reason).toBe('explicitly skipped');
            }
        });
    });

    it('should handle mixed skip and only scenarios', async () => {
        const events: TestEvent[] = [];

        // Reset registry to ensure clean state
        resetRegistry();

        describe('Complex Suite', () => {
            it.only('focused test', () => {
                expect(true).toBe(true);
            });

            xit('explicitly skipped', () => {
                expect(true).toBe(false);
            });

            it('implicitly skipped by focus', () => {
                expect(true).toBe(true);
            });
        });

        await runTests({
            filter: (suite) => suite === 'Complex Suite',
            onEvent: (event) => events.push(event)
        });

        const skipEvents = events.filter(e => e.type === 'skip');
        expect(skipEvents).toHaveLength(2);

        // Check explicitly skipped
        const explicitSkip = skipEvents.find(e => e.type === 'skip' && e.test === 'explicitly skipped');
        expect(explicitSkip).toBeDefined();
        if (explicitSkip?.type === 'skip') {
            expect(explicitSkip.reason).toBe('explicitly skipped');
        }

        // Check implicitly skipped by focus
        const implicitSkip = skipEvents.find(e => e.type === 'skip' && e.test === 'implicitly skipped by focus');
        expect(implicitSkip).toBeDefined();
        if (implicitSkip?.type === 'skip') {
            expect(implicitSkip.reason).toBe('not focused');
        }
    });
});
