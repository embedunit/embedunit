// Smoke tests for bundle files
import { describe, it, beforeEach, afterEach } from '@embedunit/core';
import { expect } from '@embedunit/assert';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as vm from 'vm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');

// Bundle file names
const BUNDLE_FILES = [
    'embedunit.recommended.global.js',
    'embedunit.recommended.global.min.js',
    'embedunit.recommended.globals.js',
    'embedunit.recommended.globals.min.js',
    'embedunit.lite.global.js',
    'embedunit.lite.global.min.js'
];

// Expected exports for recommended bundle
const RECOMMENDED_EXPORTS = [
    'describe',
    'it',
    'expect',
    'beforeAll',
    'beforeEach',
    'afterEach',
    'afterAll',
    'xit',
    'xdescribe',
    'fit',
    'fdescribe',
    'mock',
    'spy',
    'spyOn',
    'timeout',
    'conditional',
    'parameterized',
    'error',
    'logging',
    'runner',
    'runTests',
    'getTestList',
    'resetRegistry',
    'reporter',
    'globals'
];

// Expected exports for lite bundle
const LITE_EXPORTS = [
    'describe',
    'it',
    'expect',
    'beforeAll',
    'beforeEach',
    'afterEach',
    'afterAll',
    'xit',
    'xdescribe',
    'fit',
    'fdescribe',
    'runTests',
    'getTestList',
    'resetRegistry'
];

describe('Bundle Files Existence', () => {
    for (const file of BUNDLE_FILES) {
        it(`${file} exists in dist/`, () => {
            const filePath = path.join(distDir, file);
            expect(fs.existsSync(filePath)).toBe(true);
        });
    }

    it('all bundle files have non-zero size', () => {
        for (const file of BUNDLE_FILES) {
            const filePath = path.join(distDir, file);
            const stats = fs.statSync(filePath);
            expect(stats.size).toBeGreaterThan(0);
        }
    });
});

describe('Bundle Export Shape', () => {
    function loadBundleInVM(bundleFile: string): Record<string, unknown> {
        const bundlePath = path.join(distDir, bundleFile);
        const bundleCode = fs.readFileSync(bundlePath, 'utf-8');

        // Create a sandbox with globalThis and required browser globals
        const sandbox: Record<string, unknown> = {
            globalThis: {},
            console: console,
            performance: performance,
            Date: Date
        };
        sandbox.globalThis = sandbox;

        // Run the bundle in a VM context
        vm.createContext(sandbox);
        vm.runInContext(bundleCode, sandbox);

        return sandbox.EmbedUnit as Record<string, unknown>;
    }

    describe('recommended.global bundle', () => {
        let EmbedUnit: Record<string, unknown>;

        beforeEach(() => {
            EmbedUnit = loadBundleInVM('embedunit.recommended.global.js');
        });

        it('exposes EmbedUnit object', () => {
            expect(EmbedUnit).toBeDefined();
            expect(typeof EmbedUnit).toBe('object');
        });

        for (const exportName of RECOMMENDED_EXPORTS) {
            it(`has ${exportName} export`, () => {
                expect(EmbedUnit[exportName]).toBeDefined();
            });
        }

        it('has installGlobals function (recommended bundle specific)', () => {
            expect(typeof EmbedUnit.installGlobals).toBe('function');
        });

        it('has uninstallGlobals function (recommended bundle specific)', () => {
            expect(typeof EmbedUnit.uninstallGlobals).toBe('function');
        });

        it('describe is a function', () => {
            expect(typeof EmbedUnit.describe).toBe('function');
        });

        it('it is a function', () => {
            expect(typeof EmbedUnit.it).toBe('function');
        });

        it('expect is a function', () => {
            expect(typeof EmbedUnit.expect).toBe('function');
        });

        it('runTests is a function', () => {
            expect(typeof EmbedUnit.runTests).toBe('function');
        });
    });

    describe('recommended.globals bundle', () => {
        let EmbedUnit: Record<string, unknown>;

        beforeEach(() => {
            EmbedUnit = loadBundleInVM('embedunit.recommended.globals.js');
        });

        it('exposes EmbedUnit object', () => {
            expect(EmbedUnit).toBeDefined();
            expect(typeof EmbedUnit).toBe('object');
        });

        it('has core DSL functions', () => {
            expect(typeof EmbedUnit.describe).toBe('function');
            expect(typeof EmbedUnit.it).toBe('function');
            expect(typeof EmbedUnit.expect).toBe('function');
        });
    });

    describe('lite.global bundle', () => {
        let EmbedUnit: Record<string, unknown>;

        beforeEach(() => {
            EmbedUnit = loadBundleInVM('embedunit.lite.global.js');
        });

        it('exposes EmbedUnit object', () => {
            expect(EmbedUnit).toBeDefined();
            expect(typeof EmbedUnit).toBe('object');
        });

        for (const exportName of LITE_EXPORTS) {
            it(`has ${exportName} export`, () => {
                expect(EmbedUnit[exportName]).toBeDefined();
            });
        }

        it('does NOT have spy utilities (lite bundle)', () => {
            expect(EmbedUnit.spy).toBeUndefined();
            expect(EmbedUnit.spyOn).toBeUndefined();
            expect(EmbedUnit.mock).toBeUndefined();
        });

        it('does NOT have reporter utilities (lite bundle)', () => {
            expect(EmbedUnit.reporter).toBeUndefined();
        });
    });

    describe('minified bundles have same shape', () => {
        it('recommended.global.min.js has same exports as non-minified', () => {
            const normal = loadBundleInVM('embedunit.recommended.global.js');
            const minified = loadBundleInVM('embedunit.recommended.global.min.js');

            for (const key of RECOMMENDED_EXPORTS) {
                expect(typeof minified[key]).toBe(typeof normal[key]);
            }
        });

        it('lite.global.min.js has same exports as non-minified', () => {
            const normal = loadBundleInVM('embedunit.lite.global.js');
            const minified = loadBundleInVM('embedunit.lite.global.min.js');

            for (const key of LITE_EXPORTS) {
                expect(typeof minified[key]).toBe(typeof normal[key]);
            }
        });
    });
});

describe('Bundle Basic Functionality', () => {
    function loadBundleInVM(bundleFile: string): Record<string, unknown> {
        const bundlePath = path.join(distDir, bundleFile);
        const bundleCode = fs.readFileSync(bundlePath, 'utf-8');

        const sandbox: Record<string, unknown> = {
            globalThis: {},
            console: console,
            setTimeout: setTimeout,
            clearTimeout: clearTimeout,
            Promise: Promise,
            performance: performance,
            Date: Date
        };
        sandbox.globalThis = sandbox;

        vm.createContext(sandbox);
        vm.runInContext(bundleCode, sandbox);

        return sandbox.EmbedUnit as Record<string, unknown>;
    }

    describe('recommended bundle functionality', () => {
        let EmbedUnit: Record<string, unknown>;

        beforeEach(() => {
            EmbedUnit = loadBundleInVM('embedunit.recommended.global.js');
            // Reset the registry before each test
            (EmbedUnit.resetRegistry as () => void)();
        });

        afterEach(() => {
            (EmbedUnit.resetRegistry as () => void)();
        });

        it('can define and run a simple test', async () => {
            const describe = EmbedUnit.describe as (name: string, fn: () => void) => void;
            const it = EmbedUnit.it as (name: string, fn: () => void) => void;
            const expectFn = EmbedUnit.expect as (value: unknown) => { toBe: (expected: unknown) => void };
            const runTests = EmbedUnit.runTests as (options?: object) => Promise<{ summary: { passed: number; failed: number; total: number } }>;

            let testRan = false;
            describe('Test Suite', () => {
                it('should pass', () => {
                    testRan = true;
                    expectFn(1 + 1).toBe(2);
                });
            });

            const result = await runTests({ silent: true });

            expect(testRan).toBe(true);
            expect(result.summary.passed).toBe(1);
            expect(result.summary.failed).toBe(0);
        });

        it('can detect a failing test', async () => {
            const describe = EmbedUnit.describe as (name: string, fn: () => void) => void;
            const it = EmbedUnit.it as (name: string, fn: () => void) => void;
            const expectFn = EmbedUnit.expect as (value: unknown) => { toBe: (expected: unknown) => void };
            const runTests = EmbedUnit.runTests as (options?: object) => Promise<{ summary: { passed: number; failed: number; total: number } }>;

            describe('Failing Suite', () => {
                it('should fail', () => {
                    expectFn(1).toBe(2);
                });
            });

            const result = await runTests({ silent: true });

            expect(result.summary.passed).toBe(0);
            expect(result.summary.failed).toBe(1);
        });

        it('can use getTestList to list tests', () => {
            const describe = EmbedUnit.describe as (name: string, fn: () => void) => void;
            const it = EmbedUnit.it as (name: string, fn: () => void) => void;
            const getTestList = EmbedUnit.getTestList as () => Array<{ suite: string; test: string }>;

            describe('Suite A', () => {
                it('test 1', () => {});
                it('test 2', () => {});
            });

            const testList = getTestList();

            expect(testList.length).toBe(2);
            expect(testList[0].suite).toBe('Suite A');
            expect(testList[0].test).toBe('test 1');
        });
    });

    describe('lite bundle functionality', () => {
        let EmbedUnit: Record<string, unknown>;

        beforeEach(() => {
            EmbedUnit = loadBundleInVM('embedunit.lite.global.js');
            (EmbedUnit.resetRegistry as () => void)();
        });

        afterEach(() => {
            (EmbedUnit.resetRegistry as () => void)();
        });

        it('can define and run a simple test', async () => {
            const describe = EmbedUnit.describe as (name: string, fn: () => void) => void;
            const it = EmbedUnit.it as (name: string, fn: () => void) => void;
            const expectFn = EmbedUnit.expect as (value: unknown) => { toBe: (expected: unknown) => void };
            const runTests = EmbedUnit.runTests as (options?: object) => Promise<{ summary: { passed: number; failed: number; total: number } }>;

            let testRan = false;
            describe('Lite Test Suite', () => {
                it('should pass', () => {
                    testRan = true;
                    expectFn(2 * 2).toBe(4);
                });
            });

            const result = await runTests({ silent: true });

            expect(testRan).toBe(true);
            expect(result.summary.passed).toBe(1);
            expect(result.summary.failed).toBe(0);
        });

        it('supports skip modifiers', async () => {
            const describe = EmbedUnit.describe as (name: string, fn: () => void) => void;
            const xit = EmbedUnit.xit as (name: string, fn: () => void) => void;
            const runTests = EmbedUnit.runTests as (options?: object) => Promise<{ summary: { passed: number; failed: number; skipped: number; total: number } }>;

            describe('Skip Suite', () => {
                xit('skipped test', () => {
                    throw new Error('Should not run');
                });
            });

            const result = await runTests({ silent: true });

            expect(result.summary.skipped).toBe(1);
            expect(result.summary.failed).toBe(0);
        });
    });
});
