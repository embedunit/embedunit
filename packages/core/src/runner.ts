// src/runner.ts
import { DescribeBlock, TestResult, TestRunResult, TestSummary, HookFn, SafeError } from './types';
import { rootDescribeBlock, getSuitePath, collectHooks, runHooks } from './dsl';
import { parseError } from "./error";
import { maybeWithTimeout } from './timeout';
import { getConfig } from './config';
import { TestLogCollector, setGlobalLogCollector } from './log-collector';
import { EnhancedTestError, TestContext, toSafeError } from './enhanced-error';

const perf = performance;

/**
 * Events emitted during test execution.
 * Can be used to build custom reporters.
 */
export type TestEvent =
    | { type: 'start'; suite: string; test: string }
    | { type: 'pass'; suite: string; test: string; duration: number }
    | { type: 'fail'; suite: string; test: string; duration: number; error: SafeError }
    | { type: 'skip'; suite: string; test: string; reason?: string }
    | { type: 'complete'; results: TestResult[] };

/**
 * Options for filtering tests by various criteria.
 * Used by both getTestList() and runTests() for consistent filtering.
 */
export interface FilterOptions {
    /** Filter function to selectively include tests */
    filter?: (suite: string, test: string) => boolean;
    /**
     * Include only specific suite(s) or test(s).
     * When suite is specified, includes all tests in that suite and its nested describes.
     * Accepts single string or array of strings for multiple selections.
     * Matches Jest/Vitest behavior for hierarchical filtering.
     */
    only?: {
        suite?: string | string[];
        test?: string | string[];
        suites?: string[];  // Alias for suite array
        tests?: string[];   // Alias for test array
    };
    /**
     * Include tests matching a pattern (like Jest's --grep).
     * Matches against the full test name: "suite > test"
     */
    grep?: string | RegExp;
    /** Skip tests matching pattern */
    grepInvert?: string | RegExp;
    /**
     * Include only tests with specific tags.
     * Tests with ANY of the specified tags will be included (OR condition).
     * Tags can be defined on tests (@tag in test name) or suites (@tag in describe name).
     * Tests inherit tags from all parent suites.
     */
    tags?: string[];
    /**
     * Exclude tests with specific tags.
     * Tests with ANY of the specified tags will be excluded.
     * Useful for filtering out slow tests, flaky tests, etc.
     */
    excludeTags?: string[];
}

/**
 * Options for configuring test execution.
 * Extends FilterOptions with execution-specific settings.
 */
export interface RunOptions extends FilterOptions {
    /** Stop on first failure */
    bail?: boolean;
    /** Callback for test events */
    onEvent?: (event: TestEvent) => void;
    /** Enhanced error context configuration */
    enhancedErrors?: {
        /** Enable log capture during test execution (default: true) */
        logCapture?: boolean;
        /** Maximum number of logs to capture per test (default: 100) */
        maxLogs?: number;
        /** Capture timing information (default: true) */
        timing?: boolean;
    };
    /**
     * Enable console output during test execution (default: false)
     * When false, the runner is silent and only emits events.
     * Use onEvent callback to handle test results.
     */
    consoleOutput?: boolean;
    /** Include passed tests in the results (default: false) */
    includePassed?: boolean;
    /** Include skipped tests in the results (default: false) */
    includeSkipped?: boolean;
    /**
     * Include full error details (stack traces, context) in error objects (default: false)
     * When false: error object contains message, name, and remapped file/line/column
     * When true: error object also includes stack traces and execution context
     */
    verboseErrors?: boolean;
};

/**
 * Metadata for a test case.
 */
export type TestMeta = {
    /** Full suite path */
    suite: string;
    /** Test name */
    test: string;
    /** Tags assigned to this test (includes inherited tags from parent suites) */
    tags: string[];
};

/**
 * Strips @tag annotations from a test or suite name
 */
function stripTags(name: string): string {
    return name.replace(/@[\w\-.:]+/g, '').trim();
}

/**
 * Checks if a test matches the given filter criteria.
 * This function encapsulates the filtering logic used by both getTestList and runTests.
 */
function matchesFilter(suitePath: string, testName: string, filterOptions: FilterOptions = {}, testTags?: string[]): boolean {
    // Custom filter function
    if (filterOptions.filter && !filterOptions.filter(suitePath, testName)) {
        return false;
    }

    // Suite/test only filtering
    if (filterOptions.only) {
        const suites = filterOptions.only.suites ||
                      (filterOptions.only.suite ? (Array.isArray(filterOptions.only.suite) ? filterOptions.only.suite : [filterOptions.only.suite]) : null);

        if (suites) {
            // Strip tags from user-provided suite names for comparison
            const cleanSuites = suites.map(s => stripTags(s));
            const suiteMatches = cleanSuites.some(s =>
                suitePath === s || suitePath.startsWith(s + ' > ')
            );
            if (!suiteMatches) return false;
        }

        const tests = filterOptions.only.tests ||
                     (filterOptions.only.test ? (Array.isArray(filterOptions.only.test) ? filterOptions.only.test : [filterOptions.only.test]) : null);

        if (tests) {
            // Strip tags from user-provided test names for comparison
            const cleanTests = tests.map(t => stripTags(t));
            const testMatches = cleanTests.includes(testName);
            if (!testMatches) return false;
        }
    }

    // Grep filtering
    if (filterOptions.grep) {
        const fullTestName = `${suitePath} > ${testName}`;
        const pattern = typeof filterOptions.grep === 'string' ? new RegExp(filterOptions.grep) : filterOptions.grep;
        if (!pattern.test(fullTestName)) {
            return false;
        }
    }

    // GrepInvert filtering
    if (filterOptions.grepInvert) {
        const fullTestName = `${suitePath} > ${testName}`;
        const pattern = typeof filterOptions.grepInvert === 'string' ? new RegExp(filterOptions.grepInvert) : filterOptions.grepInvert;
        if (pattern.test(fullTestName)) {
            return false;
        }
    }

    // Tag filtering (inclusion)
    if (filterOptions.tags && filterOptions.tags.length > 0 && testTags) {
        // Test must have at least one of the specified tags (OR condition)
        const hasMatchingTag = filterOptions.tags.some(tag => testTags.includes(tag));
        if (!hasMatchingTag) {
            return false;
        }
    }

    // Tag filtering (exclusion)
    if (filterOptions.excludeTags && filterOptions.excludeTags.length > 0 && testTags) {
        // Test must NOT have any of the excluded tags
        const hasExcludedTag = filterOptions.excludeTags.some(tag => testTags.includes(tag));
        if (hasExcludedTag) {
            return false;
        }
    }

    return true;
}


/**
 * Gets a list of all registered tests, optionally filtered by criteria.
 * Useful for test discovery and reporting.
 *
 * @param filterOptions - Optional filtering criteria to apply
 * @returns Array of test metadata matching the filter criteria
 *
 * @example
 * ```typescript
 * // Get all tests
 * const allTests = getTestList();
 *
 * // Get tests from specific suite
 * const suiteTests = getTestList({
 *   only: { suite: 'ResourceService - Basic Loading' }
 * });
 *
 * // Get tests matching pattern
 * const patternTests = getTestList({
 *   grep: /should load/
 * });
 * ```
 */
export function getTestList(filterOptions?: FilterOptions): TestMeta[] {
    // Validate that filterOptions is an object if provided
    if (filterOptions !== undefined && (typeof filterOptions !== 'object' || filterOptions === null)) {
        throw new Error(
            `getTestList() expects an options object, but received ${typeof filterOptions}. ` +
            `Example: getTestList({ only: { suite: 'MySuite' } }) or getTestList({ grep: 'pattern' })`
        );
    }

    const list: TestMeta[] = [];
    function traverse(block: DescribeBlock) {
        const currentSuitePath = getSuitePath(block);
        // Only add if suitePath is not empty (i.e., not the rootDescribeBlock itself)
        if (currentSuitePath) {
            block.tests.forEach(test => {
                // Apply filtering logic
                if (!filterOptions || matchesFilter(currentSuitePath, test.name, filterOptions, test.tags)) {
                    list.push({ suite: currentSuitePath, test: test.name, tags: test.tags });
                }
            });
        }
        block.children.forEach(traverse);
    }
    traverse(rootDescribeBlock);
    return list;
}

/**
 * Runs all registered tests and returns results.
 * This is the main entry point for test execution.
 *
 * @param options - Configuration options for the test run
 * @returns Promise resolving to array of test results
 *
 * @example
 * ```typescript
 * // Run all tests
 * const results = await runTests();
 *
 * // Run with options
 * const results = await runTests({
 *   filter: (suite, test) => suite.includes('critical'),
 *   bail: true, // Stop on first failure
 *   onEvent: (event) => {
 *     if (event.type === 'fail') {
 *       console.error(`FAILED: ${event.test}`);
 *     }
 *   }
 * });
 * ```
 */
export async function runTests(options: RunOptions = {}): Promise<TestRunResult> {
    // Validate that options is an object, not a string or other type
    if (typeof options !== 'object' || options === null) {
        throw new Error(
            `runTests() expects an options object, but received ${typeof options}. ` +
            `Example: runTests({ only: { suite: 'MySuite' } }) or runTests({ grep: 'pattern' })`
        );
    }

    const results: TestResult[] = [];
    let globalBail = false; // Shared bail flag

    // Check if there are any .only tests or describes in the tree
    function hasOnlyTests(block: DescribeBlock): boolean {
        if (block.only) return true;
        if (block.tests.some(t => t.only)) return true;
        return block.children.some(hasOnlyTests);
    }
    const hasOnly = hasOnlyTests(rootDescribeBlock);

    // Reset execution state before running
    function resetExecutionState(block: DescribeBlock) {
        block.ranBeforeAll = false;
        block.executed = false;
        block.children.forEach(resetExecutionState);
    }
    resetExecutionState(rootDescribeBlock);

    // Helper function to check if a describe block would match FilterOptions (recursive)
    function wouldDescribeBlockMatch(block: DescribeBlock, filterOptions: FilterOptions): boolean {
        const suitePath = getSuitePath(block);
        if (!suitePath) return false;

        // Check if any tests in this block match
        const hasMatchingTests = block.tests.some(test =>
            matchesFilter(suitePath, test.name, filterOptions, test.tags)
        );

        if (hasMatchingTests) return true;

        // Check children recursively
        return block.children.some(child => wouldDescribeBlockMatch(child, filterOptions));
    }

    // Check if a describe block should run based on skip/only flags and FilterOptions
    // Returns: { shouldRun: boolean, skipReason: 'explicit' | 'filtered' | null }
    function shouldRunDescribe(block: DescribeBlock): { shouldRun: boolean; skipReason: 'explicit' | 'filtered' | null } {
        // If the block is explicitly skipped, don't run
        if (block.skip) return { shouldRun: false, skipReason: 'explicit' };

        // Check parent skip status
        let parent = block.parent;
        while (parent) {
            if (parent.skip) return { shouldRun: false, skipReason: 'explicit' };
            parent = parent.parent;
        }

        // Apply FilterOptions filtering at describe block level
        const suitePath = getSuitePath(block);
        if (suitePath) { // Only apply filtering if this isn't the root block
            // Check if this describe block or any of its tests would match the filter
            const hasMatchingTests = block.tests.some(test =>
                matchesFilter(suitePath, test.name, options, test.tags)
            );

            // Check if any child describe blocks would match (recursive check)
            const hasMatchingChildren = block.children.some(child =>
                wouldDescribeBlockMatch(child, options)
            );

            // If neither this block's tests nor children match, skip this block
            if (!hasMatchingTests && !hasMatchingChildren) {
                return { shouldRun: false, skipReason: 'filtered' };
            }
        }

        // If there are .only tests/describes, only run those
        if (hasOnly) {
            // Check if this block or any parent has .only
            let current: DescribeBlock | null = block;
            while (current) {
                if (current.only) return { shouldRun: true, skipReason: null };
                current = current.parent;
            }
            // Check if any child has .only
            function hasOnlyDescendant(b: DescribeBlock): boolean {
                if (b.only) return true;
                if (b.tests.some(t => t.only)) return true;
                return b.children.some(hasOnlyDescendant);
            }
            return hasOnlyDescendant(block) ? { shouldRun: true, skipReason: null } : { shouldRun: false, skipReason: 'explicit' };
        }

        return { shouldRun: true, skipReason: null };
    }

    // Recursive function to run tests within a describe block
    // Returns true if execution should continue (no bail), false otherwise
    async function runDescribeBlock(block: DescribeBlock): Promise<boolean> {
        // If a bail occurred in a sibling or ancestor, stop immediately.
        if (globalBail) return false;

        // Check if this describe block should run
        const { shouldRun, skipReason } = shouldRunDescribe(block);
        if (!shouldRun) {
            const suitePath = getSuitePath(block);

            // Only add skipped tests to results if they were explicitly skipped (.skip/.only)
            // Don't add filtered tests to results - they should be completely excluded
            if (skipReason === 'explicit') {
                // Process all tests in this block as skipped
                for (const testCase of block.tests) {
                    const result: TestResult = {
                        suite: suitePath,
                        test: testCase.name,
                        status: 'skipped',
                        duration: 0
                    };
                    results.push(result);
                    options.onEvent?.({ type: 'skip', suite: suitePath, test: testCase.name, reason: 'explicitly skipped' });
                }

                // Also process nested describe blocks as skipped
                for (const child of block.children) {
                    await runDescribeBlock(child);
                }
            }
            // For filtered tests (skipReason === 'filtered'), don't add anything to results

            return true; // Continue with siblings
        }

        const suitePath = getSuitePath(block);
        block.executed = true; // Mark this block as entered *before* hooks

        // --- 1. Run beforeAll hooks ---
        let beforeAllSuccess = true; // Assume success unless a hook fails
        if (!block.ranBeforeAll) {
            // Collect hooks from ancestors + current block that haven't run beforeAll yet
            const beforeAllHooksToRun: HookFn[] = [];
            let current: DescribeBlock | null = block;
            const lineage: DescribeBlock[] = [];
            while (current && !current.ranBeforeAll) {
                lineage.unshift(current); // Build path from root to current
                current = current.parent;
            }
            // Add hooks from the lineage & mark as ran *before* execution
            for (const ancestor of lineage) {
                beforeAllHooksToRun.push(...ancestor.beforeAllHooks);
                ancestor.ranBeforeAll = true;
            }

            if (beforeAllHooksToRun.length > 0) {
                const hookContext = `${suitePath} (beforeAll)`;
                const { success, error } = await runHooks(beforeAllHooksToRun, 'beforeAll', hookContext);
                if (!success) {
                    beforeAllSuccess = false; // Mark failure
                    const beforeAllError = await parseError(error);
                    const result: TestResult = { suite: suitePath, test: '(beforeAll hook)', status: 'failed', duration: 0, error: beforeAllError };
                    results.push(result);
                    options.onEvent?.({ type: 'fail', suite: suitePath, test: '(beforeAll hook)', duration: 0, error: beforeAllError });
                    if (options.bail) {
                        globalBail = true;
                        // Do NOT return false immediately - we still need to run afterAll for cleanup
                    }
                }
            }
        } else {
            // If ranBeforeAll was already true, it implies a parent ran it.
            // Check if the parent's execution failed, if so, this block's beforeAll implicitly failed.
            // This logic might be complex. Let's assume ranBeforeAll implies success for now.
        }


        // --- 2. Run tests in *this* block ---
        // Only run tests if the beforeAll hooks for this scope succeeded.
        if (beforeAllSuccess && !globalBail) {
            for (const testCase of block.tests) {
                // Check bail flag *before* each test
                if (globalBail) break;

                // Check if test should be skipped
                if (testCase.skip) {
                    const result: TestResult = {
                        suite: suitePath,
                        test: testCase.name,
                        status: 'skipped',
                        duration: 0
                    };
                    results.push(result);
                    options.onEvent?.({ type: 'skip', suite: suitePath, test: testCase.name, reason: 'explicitly skipped' });
                    continue;
                }

                // Check if test should run based on .only flags
                if (hasOnly) {
                    // Check if this test has .only
                    if (!testCase.only) {
                        // Check if parent describe has .only
                        let parentHasOnly = false;
                        let current: DescribeBlock | null = testCase.describeBlock;
                        while (current) {
                            if (current.only) {
                                parentHasOnly = true;
                                break;
                            }
                            current = current.parent;
                        }
                        if (!parentHasOnly) {
                            // Skip this test as it's not marked with .only and no parent is
                            const result: TestResult = {
                                suite: suitePath,
                                test: testCase.name,
                                status: 'skipped',
                                duration: 0
                            };
                            results.push(result);
                            options.onEvent?.({ type: 'skip', suite: suitePath, test: testCase.name, reason: 'not focused' });
                            continue;
                        }
                    }
                }

                // Use shared filtering logic
                const shouldRun = matchesFilter(suitePath, testCase.name, options, testCase.tags);
                if (!shouldRun) continue;

                options.onEvent?.({ type: 'start', suite: suitePath, test: testCase.name });

                let testSuccess = true;
                let testError: SafeError | undefined = undefined;
                const start = perf.now();
                let duration = 0;

                // Enhanced error context setup
                const enhancedErrorsConfig = {
                    logCapture: true,
                    maxLogs: 100,
                    timing: true,
                    ...options.enhancedErrors
                };

                // Initialize log collector for this test
                let logCollector: TestLogCollector | null = null;
                if (enhancedErrorsConfig.logCapture) {
                    logCollector = new TestLogCollector();
                    setGlobalLogCollector(logCollector);
                    logCollector.startTest();
                    logCollector.addFrameworkLog(`Starting test: ${suitePath} > ${testCase.name}`);
                }

                // Run beforeEach hooks
                const beforeEachHooks = collectHooks(testCase.describeBlock, 'beforeEach');
                const beforeEachContext = `${suitePath} > ${testCase.name} (beforeEach)`;
                const { success: beforeSuccess, error: beforeErr } = await runHooks(beforeEachHooks, 'beforeEach', beforeEachContext);

                if (!beforeSuccess) {
                    testSuccess = false;
                    testError = await parseError(beforeErr);
                    duration = perf.now() - start;

                    // Create enhanced error for beforeEach failure
                    if (logCollector && enhancedErrorsConfig.logCapture) {
                        const testContext: TestContext = {
                            logs: logCollector.getLogs(),
                            timing: enhancedErrorsConfig.timing ? {
                                start,
                                end: perf.now(),
                                duration: perf.now() - start
                            } : undefined,
                            testPath: {
                                suite: suitePath,
                                test: `${testCase.name} (beforeEach hook)`
                            }
                        };
                        const enhancedError = new EnhancedTestError(
                            testError.message,
                            testContext,
                            new Error(testError.message),
                            testError // Pass the remapped location info
                        );
                        testError = toSafeError(enhancedError);
                    }

                    // Silent by default - error already captured in testError
                } else {
                    // Run the actual test with timeout
                    try {
                        // Determine timeout: test-specific > suite-specific > default
                        const config = getConfig();
                        let timeout = testCase.timeout;
                        if (!timeout && testCase.describeBlock.timeout) {
                            timeout = testCase.describeBlock.timeout;
                        }
                        if (!timeout) {
                            timeout = config.defaultTimeout;
                        }

                        if (logCollector) {
                            logCollector.addFrameworkLog(`Executing test function with ${timeout}ms timeout`);
                        }

                        await maybeWithTimeout(
                            () => testCase.fn(),
                            timeout,
                            `Test "${testCase.name}"`
                        );

                        if (logCollector) {
                            logCollector.addFrameworkLog(`Test function completed successfully`);
                        }
                    } catch (error) {
                        testSuccess = false;
                        const parsedError = await parseError(error);

                        // Create enhanced error with log context
                        if (logCollector && enhancedErrorsConfig.logCapture) {
                            const testContext: TestContext = {
                                logs: logCollector.getLogs(),
                                timing: enhancedErrorsConfig.timing ? {
                                    start,
                                    end: perf.now(),
                                    duration: perf.now() - start
                                } : undefined,
                                testPath: {
                                    suite: suitePath,
                                    test: testCase.name
                                }
                            };
                            const enhancedError = new EnhancedTestError(
                                parsedError.message,
                                testContext,
                                error instanceof Error ? error : new Error(String(error)),
                                parsedError // Pass the remapped location info
                            );
                            testError = toSafeError(enhancedError);
                        } else {
                            testError = parsedError;
                        }

                        // Silent by default - error already captured in testError
                    }
                    duration = perf.now() - start;
                }

                // Run afterEach hooks (always run for cleanup)
                const afterEachHooks = collectHooks(testCase.describeBlock, 'afterEach');
                const afterEachContext = `${suitePath} > ${testCase.name} (afterEach)`;
                const { success: afterSuccess, error: afterErr } = await runHooks(afterEachHooks, 'afterEach', afterEachContext);

                if (!afterSuccess) {
                    const afterEachError = await parseError(afterErr);

                    // Create enhanced error for afterEach failure
                    if (logCollector && enhancedErrorsConfig.logCapture) {
                        const testContext: TestContext = {
                            logs: logCollector.getLogs(),
                            timing: enhancedErrorsConfig.timing ? {
                                start,
                                end: perf.now(),
                                duration: perf.now() - start
                            } : undefined,
                            testPath: {
                                suite: suitePath,
                                test: `${testCase.name} (afterEach hook)`
                            }
                        };
                        const enhancedAfterEachError = new EnhancedTestError(
                            afterEachError.message,
                            testContext,
                            new Error(afterEachError.message),
                            afterEachError // Pass the remapped location info
                        );
                        const safeAfterEachError = toSafeError(enhancedAfterEachError);
                        // Silent by default - error already captured

                        if (testSuccess) { // Override test success if afterEach failed
                            testSuccess = false;
                            testError = safeAfterEachError; // Report afterEach error
                        }
                    } else {
                        // Silent by default - error already captured
                        if (testSuccess) { // Override test success if afterEach failed
                            testSuccess = false;
                            testError = afterEachError; // Report afterEach error
                        }
                    }
                    // If both beforeEach/test and afterEach failed, the first error (testError) is kept.
                }

                // Clean up log collector
                if (logCollector) {
                    logCollector.addFrameworkLog(`Test completed: ${testSuccess ? 'PASSED' : 'FAILED'}`);
                    logCollector.endTest();
                    setGlobalLogCollector(null);
                }

                // Record final result
                const status = testSuccess ? 'passed' : 'failed';
                const finalError = testError;
                results.push({ suite: suitePath, test: testCase.name, status, duration, error: finalError });

                if (status === 'passed') {
                    options.onEvent?.({ type: 'pass', suite: suitePath, test: testCase.name, duration });
                } else {
                    options.onEvent?.({ type: 'fail', suite: suitePath, test: testCase.name, duration, error: finalError! });
                    if (options.bail) {
                        globalBail = true;
                        // Break test loop for this block if bail is triggered by a test failure
                        break;
                    }
                }
            } // End of test loop
        }


        // --- 3. Run child describe blocks ---
        // Run children regardless of test failures in parent, but respect beforeAll failure and bail.
        if (beforeAllSuccess && !globalBail) {
            for (const child of block.children) {
                // Check bail flag *before* each child recursion
                if (globalBail) break;

                const continueRunning = await runDescribeBlock(child);
                // If child run signals bail (returns false), set global bail and stop processing siblings.
                if (!continueRunning) {
                    globalBail = true;
                    break;
                }
            }
        }


        // --- 4. Run afterAll hooks for *this* block ---
        // Run ONLY if the block was executed. Crucially, run *after* children have completed.
        // Run even if tests/children failed or bailed *within* this scope, for cleanup.
        // Do NOT run if globalBail was set *before* entering this block or during its beforeAll.
        let runAfterAll = block.executed;
        // Let's refine: Only run afterAll if the corresponding beforeAll succeeded.
        runAfterAll = runAfterAll && beforeAllSuccess;

        // Also, check if a bail occurred *above* this block. If so, maybe skip afterAll?
        // Let's try running if beforeAll succeeded, respecting bail only if it triggers *during* afterAll.
        if (runAfterAll) {
            const afterAllHooks = block.afterAllHooks; // Only hooks defined in *this* block
            if (afterAllHooks.length > 0) {
                const hookContext = `${suitePath} (afterAll)`;
                const { success, error } = await runHooks(afterAllHooks, 'afterAll', hookContext);

                if (!success) {
                    // Report failure for this hook
                    const afterAllError = await parseError(error);
                    const result: TestResult = { suite: suitePath, test: '(afterAll hook)', status: 'failed', duration: 0, error: afterAllError };
                    results.push(result);
                    options.onEvent?.({ type: 'fail', suite: suitePath, test: '(afterAll hook)', duration: 0, error: afterAllError });
                    if (options.bail) {
                        globalBail = true;
                        // If afterAll fails with bail, signal upwards to stop further execution
                        return false;
                    }
                }
            }
        }

        // Return true if execution should continue (bail flag is not set), false otherwise.
        return !globalBail;
    }

    // --- Main Execution Start ---
    // Execute top-level describe blocks sequentially.
    for (const topLevelDescribe of rootDescribeBlock.children) {
        await runDescribeBlock(topLevelDescribe);
        // If runDescribeBlock returned false (bail) or globalBail is set, stop.
        if (globalBail) break;
    }

    // --- Final Event ---
    // No separate afterAll queue processing needed now.
    options.onEvent?.({ type: 'complete', results });

    // Calculate summary
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    const summary: TestSummary = {
        total: results.length,
        passed,
        failed,
        skipped,
        duration: totalDuration,
        success: failed === 0
    };

    // Extract failures - always as objects, verboseErrors controls detail level
    const failures = results
        .filter(r => r.status === 'failed')
        .map(r => {
            const fullError = r.error || { message: 'Unknown error' };

            // Create minimal or full error based on verboseErrors option
            const error: SafeError = options.verboseErrors
                ? fullError  // Full error with stack, context, etc.
                : {          // Minimal error object with essential info
                    message: fullError.message || 'Unknown error',
                    name: fullError.name,
                    // Always include remapped file location in minimal mode
                    file: fullError.file,
                    line: fullError.line,
                    column: fullError.column
                    // Excluded in minimal: stack, context
                };

            return {
                suite: r.suite,
                test: r.test,
                error,
                duration: r.duration
            };
        });

    // Build result object
    const result: TestRunResult = {
        summary,
        failures
    };

    // Include passed tests if requested
    if (options.includePassed) {
        result.passed = results
            .filter(r => r.status === 'passed')
            .map(r => ({
                suite: r.suite,
                test: r.test,
                duration: r.duration
            }));
    }

    // Include skipped tests if requested
    if (options.includeSkipped) {
        result.skipped = results
            .filter(r => r.status === 'skipped')
            .map(r => ({
                suite: r.suite,
                test: r.test
            }));
    }

    return result;
}
