// src/dsl-extended.ts
// Extended DSL with Jest/Vitest-like programmatic skip features

import { it, test, describe } from './dsl';

// Helper type for test function
type TestFn = () => void | Promise<void>;
type DescribeFn = () => void;

// Conditional test execution helpers
export const itIf = (condition: boolean | (() => boolean)) => {
    const shouldRun = typeof condition === 'function' ? condition() : condition;
    return shouldRun ? it : it.skip;
};

export const itSkipIf = (condition: boolean | (() => boolean)) => {
    const shouldSkip = typeof condition === 'function' ? condition() : condition;
    return shouldSkip ? it.skip : it;
};

export const describeIf = (condition: boolean | (() => boolean)) => {
    const shouldRun = typeof condition === 'function' ? condition() : condition;
    return shouldRun ? describe : describe.skip;
};

export const describeSkipIf = (condition: boolean | (() => boolean)) => {
    const shouldSkip = typeof condition === 'function' ? condition() : condition;
    return shouldSkip ? describe.skip : describe;
};

// Extend the it, test, and describe types
declare module './dsl' {
    interface ItFunction {
        skipIf: (condition: boolean | (() => boolean)) => typeof it;
        runIf: (condition: boolean | (() => boolean)) => typeof it;
        todo: (name: string, fn?: TestFn) => void;
        failing: (name: string, fn: TestFn) => void;
    }

    interface TestFunction {
        skipIf: (condition: boolean | (() => boolean)) => typeof test;
        runIf: (condition: boolean | (() => boolean)) => typeof test;
        todo: (name: string, fn?: TestFn) => void;
        failing: (name: string, fn: TestFn) => void;
    }

    interface DescribeFunction {
        skipIf: (condition: boolean | (() => boolean)) => typeof describe;
        runIf: (condition: boolean | (() => boolean)) => typeof describe;
        todo: (name: string, fn?: DescribeFn) => void;
    }
}

// Type assertions to allow property assignment
const itAny = it as any;
const testAny = test as any;
const describeAny = describe as any;

// Vitest-style skipIf and runIf for `it`
itAny.skipIf = function(condition: boolean | (() => boolean)) {
    return itSkipIf(condition);
};

itAny.runIf = function(condition: boolean | (() => boolean)) {
    return itIf(condition);
};

// Vitest-style skipIf and runIf for `test`
testAny.skipIf = function(condition: boolean | (() => boolean)) {
    return itSkipIf(condition);
};

testAny.runIf = function(condition: boolean | (() => boolean)) {
    return itIf(condition);
};

describeAny.skipIf = function(condition: boolean | (() => boolean)) {
    return describeSkipIf(condition);
};

describeAny.runIf = function(condition: boolean | (() => boolean)) {
    return describeIf(condition);
};

// TODO placeholder - marks test as not implemented yet
itAny.todo = function(name: string, _fn?: TestFn) {
    // Register as skipped test with TODO marker
    it.skip(`[TODO] ${name}`, () => {
        // Empty test that will be skipped
    });
};

testAny.todo = function(name: string, _fn?: TestFn) {
    // Register as skipped test with TODO marker
    test.skip(`[TODO] ${name}`, () => {
        // Empty test that will be skipped
    });
};

describeAny.todo = function(name: string, _fn?: DescribeFn) {
    describe.skip(`[TODO] ${name}`, () => {
        // Empty suite that will be skipped
    });
};

// Failing test helper (marks test as expected to fail)
itAny.failing = function(name: string, fn: TestFn) {
    it(`[FAILING] ${name}`, async () => {
        try {
            await fn();
            throw new Error('Expected test to fail but it passed');
        } catch {
            // Test failed as expected
            return;
        }
    });
};

testAny.failing = function(name: string, fn: TestFn) {
    test(`[FAILING] ${name}`, async () => {
        try {
            await fn();
            throw new Error('Expected test to fail but it passed');
        } catch {
            // Test failed as expected
            return;
        }
    });
};

// Platform-specific helpers
const isWindows = typeof process !== 'undefined' && process.platform === 'win32';
const isMac = typeof process !== 'undefined' && process.platform === 'darwin';
const isLinux = typeof process !== 'undefined' && process.platform === 'linux';
const isCI = typeof process !== 'undefined' && !!process.env?.CI;

export const platform = {
    windows: itIf(isWindows),
    mac: itIf(isMac),
    linux: itIf(isLinux),
    unix: itIf(!isWindows),
    ci: itIf(isCI),
    local: itIf(!isCI),
};

// Environment-based helpers
const nodeEnv = typeof process !== 'undefined' ? process.env?.NODE_ENV : undefined;
export const env = {
    test: itIf(nodeEnv === 'test'),
    development: itIf(nodeEnv === 'development'),
    production: itIf(nodeEnv === 'production'),
};

// Export enhanced it, test, and describe
export { it, test, describe };
