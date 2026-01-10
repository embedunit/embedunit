// packages/preset-recommended/test/preset.test.ts
// Integration tests for @embedunit/preset-recommended package

import EmbedUnit, {
    // Core DSL exports
    describe as namedDescribe,
    it as namedIt,
    beforeAll as namedBeforeAll,
    beforeEach as namedBeforeEach,
    afterEach as namedAfterEach,
    afterAll as namedAfterAll,
    xit as namedXit,
    xdescribe as namedXdescribe,
    fit as namedFit,
    fdescribe as namedFdescribe,
    runTests as namedRunTests,
    getTestList as namedGetTestList,
    resetRegistry as namedResetRegistry,

    // Assert exports
    expect as namedExpect,
    Assertion,
    PromiseAssertion,
    EnhancedAssertionError,
    deepEqual,
    diff,
    formatDiff,
    getDiffSummary,
    createCustomError,
    createDiffError,
    filterStackTrace,
    formatAsyncError,
    formatErrorForContext,
    stringifyValue,
    getType,
    isThenable,
    registerSpyIntegration,
    unregisterSpyIntegration,
    getCallCount,
    getCalls,

    // Spy exports
    spyOn as namedSpyOn,
    createSpyFunction,
    restoreAllSpies,
    spyOnAsync,
    createAsyncSpy,
    enhanceSpy,
    mock as namedMock,
    isSpy,

    // Core utilities
    setConfig,
    getConfig,
    resetConfig,
    withTimeout,
    maybeWithTimeout,
    TimeoutError,
    itIf,
    itSkipIf,
    describeIf,
    describeSkipIf,
    platform,
    env,
    formatTestName,
    parseTemplateTable,
    normalizeTableData,
    EnhancedTestError,
    createEnhancedError,
    isEnhancedTestError,
    TestLogCollector,
    testLogger,
    getCurrentTestLogCollector,

    // Reporter exports
    calculateSummary,
    formatSummary,
    generateTextReport,
    generateJsonReport,
    generateCompactSummary,

    // Globals exports
    installGlobals,
    uninstallGlobals
} from '../src';

// Use the preset's own test DSL to test itself
const { describe, it, expect, resetRegistry } = EmbedUnit;

describe('Preset Integration', () => {
    describe('Default Export Structure', () => {
        it('should have all expected top-level DSL functions', () => {
            expect(typeof EmbedUnit.describe).toBe('function');
            expect(typeof EmbedUnit.it).toBe('function');
            expect(typeof EmbedUnit.expect).toBe('function');
        });

        it('should have all lifecycle hooks', () => {
            expect(typeof EmbedUnit.beforeAll).toBe('function');
            expect(typeof EmbedUnit.beforeEach).toBe('function');
            expect(typeof EmbedUnit.afterEach).toBe('function');
            expect(typeof EmbedUnit.afterAll).toBe('function');
        });

        it('should have skip/only modifiers', () => {
            expect(typeof EmbedUnit.xit).toBe('function');
            expect(typeof EmbedUnit.xdescribe).toBe('function');
            expect(typeof EmbedUnit.fit).toBe('function');
            expect(typeof EmbedUnit.fdescribe).toBe('function');
        });

        it('should have mock object with all methods', () => {
            expect(typeof EmbedUnit.mock).toBe('object');
            expect(typeof EmbedUnit.mock.mockFn).toBe('function');
            expect(typeof EmbedUnit.mock.when).toBe('function');
            expect(typeof EmbedUnit.mock.verify).toBe('function');
            expect(typeof EmbedUnit.mock.reset).toBe('function');
        });

        it('should have spy namespace with all utilities', () => {
            expect(typeof EmbedUnit.spy).toBe('object');
            expect(typeof EmbedUnit.spy.spyOn).toBe('function');
            expect(typeof EmbedUnit.spy.createSpy).toBe('function');
            expect(typeof EmbedUnit.spy.restoreAllSpies).toBe('function');
            expect(typeof EmbedUnit.spy.spyOnAsync).toBe('function');
            expect(typeof EmbedUnit.spy.createAsyncSpy).toBe('function');
            expect(typeof EmbedUnit.spy.enhanceSpy).toBe('function');
        });

        it('should expose spyOn at top level for convenience', () => {
            expect(typeof EmbedUnit.spyOn).toBe('function');
            expect(EmbedUnit.spyOn).toBe(EmbedUnit.spy.spyOn);
        });

        it('should have timeout namespace', () => {
            expect(typeof EmbedUnit.timeout).toBe('object');
            expect(typeof EmbedUnit.timeout.setConfig).toBe('function');
            expect(typeof EmbedUnit.timeout.getConfig).toBe('function');
            expect(typeof EmbedUnit.timeout.resetConfig).toBe('function');
            expect(typeof EmbedUnit.timeout.withTimeout).toBe('function');
            expect(typeof EmbedUnit.timeout.maybeWithTimeout).toBe('function');
            expect(typeof EmbedUnit.timeout.TimeoutError).toBe('function');
        });

        it('should have conditional namespace', () => {
            expect(typeof EmbedUnit.conditional).toBe('object');
            expect(typeof EmbedUnit.conditional.itIf).toBe('function');
            expect(typeof EmbedUnit.conditional.itSkipIf).toBe('function');
            expect(typeof EmbedUnit.conditional.describeIf).toBe('function');
            expect(typeof EmbedUnit.conditional.describeSkipIf).toBe('function');
            expect(typeof EmbedUnit.conditional.platform).toBe('object');
            expect(typeof EmbedUnit.conditional.env).toBe('object');
        });

        it('should have parameterized namespace', () => {
            expect(typeof EmbedUnit.parameterized).toBe('object');
            expect(typeof EmbedUnit.parameterized.formatTestName).toBe('function');
            expect(typeof EmbedUnit.parameterized.parseTemplateTable).toBe('function');
            expect(typeof EmbedUnit.parameterized.normalizeTableData).toBe('function');
        });

        it('should have error namespace', () => {
            expect(typeof EmbedUnit.error).toBe('object');
            expect(typeof EmbedUnit.error.diff).toBe('function');
            expect(typeof EmbedUnit.error.formatDiff).toBe('function');
            expect(typeof EmbedUnit.error.getDiffSummary).toBe('function');
            expect(typeof EmbedUnit.error.EnhancedAssertionError).toBe('function');
            expect(typeof EmbedUnit.error.createCustomError).toBe('function');
            expect(typeof EmbedUnit.error.formatAsyncError).toBe('function');
            expect(typeof EmbedUnit.error.EnhancedTestError).toBe('function');
            expect(typeof EmbedUnit.error.createEnhancedError).toBe('function');
            expect(typeof EmbedUnit.error.isEnhancedTestError).toBe('function');
        });

        it('should have logging namespace', () => {
            expect(typeof EmbedUnit.logging).toBe('object');
            expect(typeof EmbedUnit.logging.TestLogCollector).toBe('function');
            expect(typeof EmbedUnit.logging.testLogger).toBe('object');
            expect(typeof EmbedUnit.logging.getCurrentTestLogCollector).toBe('function');
        });

        it('should have runner namespace', () => {
            expect(typeof EmbedUnit.runner).toBe('object');
            expect(typeof EmbedUnit.runner.runTests).toBe('function');
            expect(typeof EmbedUnit.runner.getTestList).toBe('function');
            expect(typeof EmbedUnit.runner.resetRegistry).toBe('function');
        });

        it('should expose runner functions at top level', () => {
            expect(typeof EmbedUnit.runTests).toBe('function');
            expect(typeof EmbedUnit.getTestList).toBe('function');
            expect(typeof EmbedUnit.resetRegistry).toBe('function');
            expect(EmbedUnit.runTests).toBe(EmbedUnit.runner.runTests);
            expect(EmbedUnit.getTestList).toBe(EmbedUnit.runner.getTestList);
            expect(EmbedUnit.resetRegistry).toBe(EmbedUnit.runner.resetRegistry);
        });

        it('should have reporter namespace', () => {
            expect(typeof EmbedUnit.reporter).toBe('object');
            expect(typeof EmbedUnit.reporter.calculateSummary).toBe('function');
            expect(typeof EmbedUnit.reporter.formatSummary).toBe('function');
            expect(typeof EmbedUnit.reporter.generateTextReport).toBe('function');
            expect(typeof EmbedUnit.reporter.generateJsonReport).toBe('function');
            expect(typeof EmbedUnit.reporter.generateCompactSummary).toBe('function');
        });

        it('should have globals namespace', () => {
            expect(typeof EmbedUnit.globals).toBe('object');
            expect(typeof EmbedUnit.globals.installGlobals).toBe('function');
            expect(typeof EmbedUnit.globals.uninstallGlobals).toBe('function');
        });
    });

    describe('Named Exports', () => {
        it('should export core DSL functions', () => {
            expect(typeof namedDescribe).toBe('function');
            expect(typeof namedIt).toBe('function');
            expect(typeof namedBeforeAll).toBe('function');
            expect(typeof namedBeforeEach).toBe('function');
            expect(typeof namedAfterEach).toBe('function');
            expect(typeof namedAfterAll).toBe('function');
        });

        it('should export skip/only modifiers', () => {
            expect(typeof namedXit).toBe('function');
            expect(typeof namedXdescribe).toBe('function');
            expect(typeof namedFit).toBe('function');
            expect(typeof namedFdescribe).toBe('function');
        });

        it('should export runner functions', () => {
            expect(typeof namedRunTests).toBe('function');
            expect(typeof namedGetTestList).toBe('function');
            expect(typeof namedResetRegistry).toBe('function');
        });

        it('should export expect and Assertion classes', () => {
            expect(typeof namedExpect).toBe('function');
            expect(typeof Assertion).toBe('function');
            expect(typeof PromiseAssertion).toBe('function');
        });

        it('should export assertion utilities', () => {
            expect(typeof deepEqual).toBe('function');
            expect(typeof diff).toBe('function');
            expect(typeof formatDiff).toBe('function');
            expect(typeof getDiffSummary).toBe('function');
            expect(typeof stringifyValue).toBe('function');
            expect(typeof getType).toBe('function');
            expect(typeof isThenable).toBe('function');
        });

        it('should export error utilities', () => {
            expect(typeof EnhancedAssertionError).toBe('function');
            expect(typeof createCustomError).toBe('function');
            expect(typeof createDiffError).toBe('function');
            expect(typeof filterStackTrace).toBe('function');
            expect(typeof formatAsyncError).toBe('function');
            expect(typeof formatErrorForContext).toBe('function');
        });

        it('should export spy integration utilities', () => {
            expect(typeof registerSpyIntegration).toBe('function');
            expect(typeof unregisterSpyIntegration).toBe('function');
            expect(typeof getCallCount).toBe('function');
            expect(typeof getCalls).toBe('function');
        });

        it('should export spy functions', () => {
            expect(typeof namedSpyOn).toBe('function');
            expect(typeof createSpyFunction).toBe('function');
            expect(typeof restoreAllSpies).toBe('function');
            expect(typeof spyOnAsync).toBe('function');
            expect(typeof createAsyncSpy).toBe('function');
            expect(typeof enhanceSpy).toBe('function');
            expect(typeof namedMock).toBe('object');
            expect(typeof isSpy).toBe('function');
        });

        it('should export timeout utilities', () => {
            expect(typeof setConfig).toBe('function');
            expect(typeof getConfig).toBe('function');
            expect(typeof resetConfig).toBe('function');
            expect(typeof withTimeout).toBe('function');
            expect(typeof maybeWithTimeout).toBe('function');
            expect(typeof TimeoutError).toBe('function');
        });

        it('should export conditional test helpers', () => {
            expect(typeof itIf).toBe('function');
            expect(typeof itSkipIf).toBe('function');
            expect(typeof describeIf).toBe('function');
            expect(typeof describeSkipIf).toBe('function');
            expect(typeof platform).toBe('object');
            expect(typeof env).toBe('object');
        });

        it('should export parameterized test helpers', () => {
            expect(typeof formatTestName).toBe('function');
            expect(typeof parseTemplateTable).toBe('function');
            expect(typeof normalizeTableData).toBe('function');
        });

        it('should export enhanced error utilities', () => {
            expect(typeof EnhancedTestError).toBe('function');
            expect(typeof createEnhancedError).toBe('function');
            expect(typeof isEnhancedTestError).toBe('function');
        });

        it('should export logging utilities', () => {
            expect(typeof TestLogCollector).toBe('function');
            expect(typeof testLogger).toBe('object');
            expect(typeof getCurrentTestLogCollector).toBe('function');
        });

        it('should export reporter functions', () => {
            expect(typeof calculateSummary).toBe('function');
            expect(typeof formatSummary).toBe('function');
            expect(typeof generateTextReport).toBe('function');
            expect(typeof generateJsonReport).toBe('function');
            expect(typeof generateCompactSummary).toBe('function');
        });

        it('should export globals installation functions', () => {
            expect(typeof installGlobals).toBe('function');
            expect(typeof uninstallGlobals).toBe('function');
        });
    });

    describe('Functional Integration', () => {
        it('should be able to create assertions with expect', () => {
            const assertion = EmbedUnit.expect(42);
            expect(assertion).toBeInstanceOf(Assertion);
        });

        it('should be able to use toBe matcher', () => {
            EmbedUnit.expect(1 + 1).toBe(2);
            EmbedUnit.expect('hello').toBe('hello');
            EmbedUnit.expect(true).toBe(true);
        });

        it('should be able to use toEqual matcher for deep equality', () => {
            EmbedUnit.expect({ a: 1, b: 2 }).toEqual({ a: 1, b: 2 });
            EmbedUnit.expect([1, 2, 3]).toEqual([1, 2, 3]);
        });

        it('should be able to use toMatch matcher', () => {
            EmbedUnit.expect('hello world').toMatch(/hello/);
            EmbedUnit.expect('test123').toMatch(/\d+/);
        });

        it('should be able to use toThrow matcher', () => {
            EmbedUnit.expect(() => {
                throw new Error('test error');
            }).toThrow('test error');
        });

        it('should be able to create and use spies', () => {
            const spy = createSpyFunction();
            spy('arg1', 'arg2');
            spy('arg3');

            EmbedUnit.expect(spy).toHaveBeenCalled();
            EmbedUnit.expect(spy).toHaveBeenCalledTimes(2);
            EmbedUnit.expect(spy).toHaveBeenCalledWith('arg1', 'arg2');
        });

        it('should be able to spy on object methods', () => {
            const obj = {
                method: (x: number) => x * 2
            };

            const spy = EmbedUnit.spyOn(obj, 'method');
            obj.method(5);

            EmbedUnit.expect(spy).toHaveBeenCalled();
            EmbedUnit.expect(spy).toHaveBeenCalledWith(5);

            spy.restore();
        });

        it('should be able to use mock functions', () => {
            const mockFn = EmbedUnit.mock.mockFn<(x: number) => number>('testMock');
            mockFn(42);

            // Mock functions have their own verify mechanism
            EmbedUnit.mock.verify(mockFn).wasCalledWith(42);
        });

        it('should be able to create promise assertions', async () => {
            const promise = Promise.resolve(42);
            await EmbedUnit.expect(promise).resolves.toBe(42);
        });

        it('should be able to use diff utilities', () => {
            const result = diff({ a: 1 }, { a: 2 });
            // DiffResult has { equal: boolean, diffs: DiffEntry[] }
            expect(typeof result.equal).toBe('boolean');
            expect(result.equal).toBe(false);
            expect(Array.isArray(result.diffs)).toBe(true);
            expect(result.diffs.length).toBeGreaterThan(0);
        });

        it('should be able to use deepEqual', () => {
            expect(deepEqual({ a: 1 }, { a: 1 })).toBe(true);
            expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
            expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
        });

        it('should be able to use getType utility', () => {
            expect(getType(null)).toBe('null');
            expect(getType(undefined)).toBe('undefined');
            expect(getType(42)).toBe('number');
            expect(getType('hello')).toBe('string');
            expect(getType([])).toBe('array');
            expect(getType({})).toBe('object');
        });

        it('should be able to use isThenable utility', () => {
            expect(isThenable(Promise.resolve())).toBe(true);
            expect(isThenable({ then: () => {} })).toBe(true);
            expect(isThenable(42)).toBe(false);
            expect(isThenable(null)).toBe(false);
        });

        it('should be able to use formatTestName for parameterized tests', () => {
            // formatTestName uses printf-style placeholders: %s, %d, %o, %j
            const name = formatTestName('adds %d + %d = %d', [1, 2, 3]);
            expect(name).toBe('adds 1 + 2 = 3');
        });

        it('should be able to use parseTemplateTable', () => {
            // parseTemplateTable returns array of arrays (not objects)
            // Values are converted from strings
            const table = parseTemplateTable`
                a | b | expected
                1 | 2 | 3
                4 | 5 | 9
            `;
            // First row is header, subsequent rows are data
            expect(table.length).toBe(3);
            expect(table[0]).toEqual(['a', 'b', 'expected']);
            expect(table[1]).toEqual([1, 2, 3]);
            expect(table[2]).toEqual([4, 5, 9]);
        });

        it('should be able to create enhanced errors', () => {
            // createEnhancedError takes an Error and optional context
            const originalError = new Error('Test failed');
            const error = createEnhancedError(originalError, {
                testPath: { suite: 'TestSuite', test: 'testCase' }
            });
            expect(error).toBeInstanceOf(EnhancedTestError);
            expect(error.message).toBe('Test failed');
            expect(error.context.testPath?.suite).toBe('TestSuite');
        });

        it('should be able to use reporter utilities', () => {
            // calculateSummary takes TestResult[] with status field
            const results = [
                { suite: 'Suite', test: 'test1', status: 'passed' as const, duration: 10 },
                { suite: 'Suite', test: 'test2', status: 'failed' as const, duration: 20, error: { name: 'Error', message: 'Failed' } }
            ];
            const summary = calculateSummary(results);
            expect(summary.total).toBe(2);
            expect(summary.passed).toBe(1);
            expect(summary.failed).toBe(1);
        });

        it('should be able to use conditional test helpers', () => {
            // These should return functions
            const conditionalIt = itIf(true);
            expect(typeof conditionalIt).toBe('function');

            const skipIt = itSkipIf(false);
            expect(typeof skipIt).toBe('function');
        });
    });

    describe('Type Compatibility', () => {
        it('should have consistent function signatures between default and named exports', () => {
            // Verify that the default export functions are the same as named exports
            expect(EmbedUnit.describe).toBe(namedDescribe);
            expect(EmbedUnit.it).toBe(namedIt);
            expect(EmbedUnit.expect).toBe(namedExpect);
            expect(EmbedUnit.beforeAll).toBe(namedBeforeAll);
            expect(EmbedUnit.beforeEach).toBe(namedBeforeEach);
            expect(EmbedUnit.afterEach).toBe(namedAfterEach);
            expect(EmbedUnit.afterAll).toBe(namedAfterAll);
            expect(EmbedUnit.spyOn).toBe(namedSpyOn);
            expect(EmbedUnit.runTests).toBe(namedRunTests);
            expect(EmbedUnit.getTestList).toBe(namedGetTestList);
            expect(EmbedUnit.resetRegistry).toBe(namedResetRegistry);
        });

        it('should have all platform conditional helpers', () => {
            expect(typeof platform.windows).toBe('function');
            expect(typeof platform.mac).toBe('function');
            expect(typeof platform.linux).toBe('function');
            expect(typeof platform.unix).toBe('function');
            expect(typeof platform.ci).toBe('function');
            expect(typeof platform.local).toBe('function');
        });

        it('should have all env conditional helpers', () => {
            expect(typeof env.test).toBe('function');
            expect(typeof env.development).toBe('function');
            expect(typeof env.production).toBe('function');
        });

        it('should have testLogger with all methods', () => {
            expect(typeof testLogger.logGameEvent).toBe('function');
            expect(typeof testLogger.logSceneChange).toBe('function');
            expect(typeof testLogger.logPlayerAction).toBe('function');
            expect(typeof testLogger.logTestMilestone).toBe('function');
        });

        it('should have mock object with correct structure', () => {
            expect(typeof namedMock.mockFn).toBe('function');
            expect(typeof namedMock.when).toBe('function');
            expect(typeof namedMock.verify).toBe('function');
            expect(typeof namedMock.reset).toBe('function');
        });
    });

    describe('Error Classes', () => {
        it('should be able to instantiate EnhancedAssertionError', () => {
            const error = new EnhancedAssertionError('Assertion failed', {
                expected: 1,
                received: 2
            });
            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(EnhancedAssertionError);
            expect(error.message).toBe('Assertion failed');
        });

        it('should be able to instantiate TimeoutError', () => {
            const error = new TimeoutError('Operation timed out', 5000);
            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(TimeoutError);
        });

        it('should be able to instantiate EnhancedTestError', () => {
            const error = new EnhancedTestError('Test error');
            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(EnhancedTestError);
        });
    });

    describe('Spy Integration', () => {
        it('should correctly identify spies with isSpy', () => {
            const spy = createSpyFunction();
            // isSpy checks for the __isSpy flag
            expect(isSpy(spy)).toBe(true);
            // Regular functions should not be identified as spies
            const regularFn = () => {};
            expect(isSpy(regularFn)).toBe(false);
        });

        it('should support spy assertions through expect', () => {
            const spy = createSpyFunction();
            spy();
            spy();

            // These matchers should be available via spy integration
            expect(spy).toHaveBeenCalled();
            expect(spy).toHaveBeenCalledTimes(2);
        });

        it('should be able to enhance a spy with async capabilities', () => {
            // enhanceSpy takes a Spy object and adds async methods
            const spy = createSpyFunction();
            const enhanced = enhanceSpy(spy);

            enhanced();
            // Enhanced spy should still be a spy
            expect(isSpy(enhanced)).toBe(true);
            expect(enhanced).toHaveBeenCalled();
            // Enhanced spy should have async methods
            expect(typeof enhanced.resolvedValue).toBe('function');
            expect(typeof enhanced.rejectedValue).toBe('function');
        });

        it('should be able to restore all spies', () => {
            const obj = { method: () => 'original' };
            EmbedUnit.spyOn(obj, 'method');

            restoreAllSpies();

            // After restore, calling method should work normally
            expect(obj.method()).toBe('original');
        });
    });
});
