// Node.js VM E2E Tests
// Tests all bundle variants in Node.js vm context
import { describe, it, beforeEach, afterEach } from '@embedunit/core';
import { expect } from '@embedunit/assert';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as vm from 'vm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bundlesDistDir = path.resolve(__dirname, '../../../bundles/dist');

// All bundle variants to test
const BUNDLE_FILES = [
    'embedunit.recommended.global.js',
    'embedunit.recommended.global.min.js',
    'embedunit.recommended.globals.js',
    'embedunit.recommended.globals.min.js',
    'embedunit.lite.global.js',
    'embedunit.lite.global.min.js'
];

// Helper to load bundle in VM context
function loadBundleInVM(bundleFile: string): { sandbox: Record<string, unknown>; EmbedUnit: Record<string, unknown> } {
    const bundlePath = path.join(bundlesDistDir, bundleFile);
    const bundleCode = fs.readFileSync(bundlePath, 'utf-8');

    // Create sandbox with required globals
    const sandbox: Record<string, unknown> = {
        globalThis: {},
        console: console,
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        setInterval: setInterval,
        clearInterval: clearInterval,
        Promise: Promise,
        performance: performance,
        Date: Date,
        Error: Error,
        TypeError: TypeError,
        RangeError: RangeError,
        Array: Array,
        Object: Object,
        String: String,
        Number: Number,
        Boolean: Boolean,
        JSON: JSON,
        Math: Math,
        RegExp: RegExp
    };
    sandbox.globalThis = sandbox;

    vm.createContext(sandbox);
    vm.runInContext(bundleCode, sandbox);

    return {
        sandbox,
        EmbedUnit: sandbox.EmbedUnit as Record<string, unknown>
    };
}

describe('Node.js VM Runtime', () => {
    describe('Bundle Loading', () => {
        for (const bundleFile of BUNDLE_FILES) {
            it(`${bundleFile} loads without error`, () => {
                const { EmbedUnit } = loadBundleInVM(bundleFile);
                expect(EmbedUnit).toBeDefined();
                expect(typeof EmbedUnit).toBe('object');
            });
        }
    });

    describe('Basic Assertions', () => {
        for (const bundleFile of BUNDLE_FILES) {
            describe(bundleFile, () => {
                let EmbedUnit: Record<string, unknown>;

                beforeEach(() => {
                    ({ EmbedUnit } = loadBundleInVM(bundleFile));
                    (EmbedUnit.resetRegistry as () => void)();
                });

                afterEach(() => {
                    (EmbedUnit.resetRegistry as () => void)();
                });

                it('toBe assertion works', async () => {
                    const describe = EmbedUnit.describe as Function;
                    const it = EmbedUnit.it as Function;
                    const expectFn = EmbedUnit.expect as Function;
                    const runTests = EmbedUnit.runTests as Function;

                    describe('toBe Suite', () => {
                        it('primitives match', () => {
                            expectFn(1).toBe(1);
                            expectFn('hello').toBe('hello');
                            expectFn(true).toBe(true);
                        });
                    });

                    const result = await runTests({ silent: true });
                    expect(result.summary.passed).toBe(1);
                    expect(result.summary.failed).toBe(0);
                });

                it('toEqual assertion works for objects', async () => {
                    const describe = EmbedUnit.describe as Function;
                    const it = EmbedUnit.it as Function;
                    const expectFn = EmbedUnit.expect as Function;
                    const runTests = EmbedUnit.runTests as Function;

                    describe('toEqual Suite', () => {
                        it('objects match', () => {
                            expectFn({ a: 1, b: 2 }).toEqual({ a: 1, b: 2 });
                            expectFn([1, 2, 3]).toEqual([1, 2, 3]);
                        });
                    });

                    const result = await runTests({ silent: true });
                    expect(result.summary.passed).toBe(1);
                    expect(result.summary.failed).toBe(0);
                });

                it('toThrow assertion works', async () => {
                    const describe = EmbedUnit.describe as Function;
                    const it = EmbedUnit.it as Function;
                    const expectFn = EmbedUnit.expect as Function;
                    const runTests = EmbedUnit.runTests as Function;

                    describe('toThrow Suite', () => {
                        it('catches errors', () => {
                            expectFn(() => { throw new Error('test'); }).toThrow();
                            expectFn(() => { throw new Error('specific'); }).toThrow('specific');
                        });
                    });

                    const result = await runTests({ silent: true });
                    expect(result.summary.passed).toBe(1);
                    expect(result.summary.failed).toBe(0);
                });

                it('not modifier works', async () => {
                    const describe = EmbedUnit.describe as Function;
                    const it = EmbedUnit.it as Function;
                    const expectFn = EmbedUnit.expect as Function;
                    const runTests = EmbedUnit.runTests as Function;

                    describe('not Suite', () => {
                        it('negation works', () => {
                            expectFn(1).not.toBe(2);
                            expectFn([1, 2]).not.toContain(3);
                        });
                    });

                    const result = await runTests({ silent: true });
                    expect(result.summary.passed).toBe(1);
                    expect(result.summary.failed).toBe(0);
                });
            });
        }
    });

    describe('Async Support', () => {
        for (const bundleFile of BUNDLE_FILES) {
            describe(bundleFile, () => {
                let EmbedUnit: Record<string, unknown>;

                beforeEach(() => {
                    ({ EmbedUnit } = loadBundleInVM(bundleFile));
                    (EmbedUnit.resetRegistry as () => void)();
                });

                afterEach(() => {
                    (EmbedUnit.resetRegistry as () => void)();
                });

                it('async tests resolve correctly', async () => {
                    const describe = EmbedUnit.describe as Function;
                    const it = EmbedUnit.it as Function;
                    const expectFn = EmbedUnit.expect as Function;
                    const runTests = EmbedUnit.runTests as Function;

                    describe('Async Suite', () => {
                        it('resolves promise', async () => {
                            const value = await Promise.resolve(42);
                            expectFn(value).toBe(42);
                        });
                    });

                    const result = await runTests({ silent: true });
                    expect(result.summary.passed).toBe(1);
                    expect(result.summary.failed).toBe(0);
                });

                it('Promise.all works', async () => {
                    const describe = EmbedUnit.describe as Function;
                    const it = EmbedUnit.it as Function;
                    const expectFn = EmbedUnit.expect as Function;
                    const runTests = EmbedUnit.runTests as Function;

                    describe('Promise.all Suite', () => {
                        it('resolves multiple promises', async () => {
                            const results = await Promise.all([
                                Promise.resolve(1),
                                Promise.resolve(2),
                                Promise.resolve(3)
                            ]);
                            expectFn(results).toEqual([1, 2, 3]);
                        });
                    });

                    const result = await runTests({ silent: true });
                    expect(result.summary.passed).toBe(1);
                    expect(result.summary.failed).toBe(0);
                });
            });
        }
    });

    describe('Hooks', () => {
        for (const bundleFile of BUNDLE_FILES) {
            describe(bundleFile, () => {
                let EmbedUnit: Record<string, unknown>;

                beforeEach(() => {
                    ({ EmbedUnit } = loadBundleInVM(bundleFile));
                    (EmbedUnit.resetRegistry as () => void)();
                });

                afterEach(() => {
                    (EmbedUnit.resetRegistry as () => void)();
                });

                it('beforeEach and afterEach run for each test', async () => {
                    const describe = EmbedUnit.describe as Function;
                    const it = EmbedUnit.it as Function;
                    const beforeEach = EmbedUnit.beforeEach as Function;
                    const afterEach = EmbedUnit.afterEach as Function;
                    const expectFn = EmbedUnit.expect as Function;
                    const runTests = EmbedUnit.runTests as Function;

                    let counter = 0;

                    describe('Hooks Suite', () => {
                        beforeEach(() => { counter++; });
                        afterEach(() => { counter--; });

                        it('first test', () => {
                            expectFn(counter).toBe(1);
                        });

                        it('second test', () => {
                            expectFn(counter).toBe(1);
                        });
                    });

                    const result = await runTests({ silent: true });
                    expect(result.summary.passed).toBe(2);
                    expect(result.summary.failed).toBe(0);
                });

                it('beforeAll and afterAll run once per suite', async () => {
                    const describe = EmbedUnit.describe as Function;
                    const it = EmbedUnit.it as Function;
                    const beforeAll = EmbedUnit.beforeAll as Function;
                    const expectFn = EmbedUnit.expect as Function;
                    const runTests = EmbedUnit.runTests as Function;

                    let setupCount = 0;

                    describe('BeforeAll Suite', () => {
                        beforeAll(() => { setupCount++; });

                        it('first test', () => {
                            expectFn(setupCount).toBe(1);
                        });

                        it('second test', () => {
                            expectFn(setupCount).toBe(1);
                        });
                    });

                    const result = await runTests({ silent: true });
                    expect(result.summary.passed).toBe(2);
                    expect(result.summary.failed).toBe(0);
                });

                it('nested suites inherit parent hooks', async () => {
                    const describe = EmbedUnit.describe as Function;
                    const it = EmbedUnit.it as Function;
                    const beforeEach = EmbedUnit.beforeEach as Function;
                    const expectFn = EmbedUnit.expect as Function;
                    const runTests = EmbedUnit.runTests as Function;

                    let outerCount = 0;
                    let innerCount = 0;

                    describe('Outer Suite', () => {
                        beforeEach(() => { outerCount++; });

                        describe('Inner Suite', () => {
                            beforeEach(() => { innerCount++; });

                            it('has both hooks run', () => {
                                expectFn(outerCount).toBeGreaterThan(0);
                                expectFn(innerCount).toBeGreaterThan(0);
                            });
                        });
                    });

                    const result = await runTests({ silent: true });
                    expect(result.summary.passed).toBe(1);
                    expect(result.summary.failed).toBe(0);
                });
            });
        }
    });

    describe('Skip and Only', () => {
        for (const bundleFile of BUNDLE_FILES) {
            describe(bundleFile, () => {
                let EmbedUnit: Record<string, unknown>;

                beforeEach(() => {
                    ({ EmbedUnit } = loadBundleInVM(bundleFile));
                    (EmbedUnit.resetRegistry as () => void)();
                });

                afterEach(() => {
                    (EmbedUnit.resetRegistry as () => void)();
                });

                it('xit skips tests', async () => {
                    const describe = EmbedUnit.describe as Function;
                    const xit = EmbedUnit.xit as Function;
                    const runTests = EmbedUnit.runTests as Function;

                    describe('Skip Suite', () => {
                        xit('skipped test', () => {
                            throw new Error('Should not run');
                        });
                    });

                    const result = await runTests({ silent: true });
                    expect(result.summary.skipped).toBe(1);
                    expect(result.summary.failed).toBe(0);
                });

                it('fit runs only focused tests', async () => {
                    const describe = EmbedUnit.describe as Function;
                    const it = EmbedUnit.it as Function;
                    const fit = EmbedUnit.fit as Function;
                    const expectFn = EmbedUnit.expect as Function;
                    const runTests = EmbedUnit.runTests as Function;

                    describe('Focus Suite', () => {
                        it('regular test', () => {
                            expectFn(true).toBe(true);
                        });

                        fit('focused test', () => {
                            expectFn(1).toBe(1);
                        });
                    });

                    const result = await runTests({ silent: true });
                    expect(result.summary.passed).toBe(1);
                    expect(result.summary.skipped).toBe(1);
                });
            });
        }
    });

    describe('Error Detection', () => {
        for (const bundleFile of BUNDLE_FILES) {
            describe(bundleFile, () => {
                let EmbedUnit: Record<string, unknown>;

                beforeEach(() => {
                    ({ EmbedUnit } = loadBundleInVM(bundleFile));
                    (EmbedUnit.resetRegistry as () => void)();
                });

                afterEach(() => {
                    (EmbedUnit.resetRegistry as () => void)();
                });

                it('detects failing assertions', async () => {
                    const describe = EmbedUnit.describe as Function;
                    const it = EmbedUnit.it as Function;
                    const expectFn = EmbedUnit.expect as Function;
                    const runTests = EmbedUnit.runTests as Function;

                    describe('Failing Suite', () => {
                        it('fails', () => {
                            expectFn(1).toBe(2);
                        });
                    });

                    const result = await runTests({ silent: true });
                    expect(result.summary.passed).toBe(0);
                    expect(result.summary.failed).toBe(1);
                });

                it('detects thrown errors', async () => {
                    const describe = EmbedUnit.describe as Function;
                    const it = EmbedUnit.it as Function;
                    const runTests = EmbedUnit.runTests as Function;

                    describe('Error Suite', () => {
                        it('throws', () => {
                            throw new Error('Intentional error');
                        });
                    });

                    const result = await runTests({ silent: true });
                    expect(result.summary.failed).toBe(1);
                });

                it('reports failure details', async () => {
                    const describe = EmbedUnit.describe as Function;
                    const it = EmbedUnit.it as Function;
                    const expectFn = EmbedUnit.expect as Function;
                    const runTests = EmbedUnit.runTests as Function;

                    describe('Details Suite', () => {
                        it('has details', () => {
                            expectFn(1).toBe(2);
                        });
                    });

                    const result = await runTests({ silent: true });
                    expect(result.failures).toBeDefined();
                    expect(result.failures.length).toBe(1);
                    expect(result.failures[0].suite).toBe('Details Suite');
                    expect(result.failures[0].test).toBe('has details');
                });
            });
        }
    });

    describe('Tag Filtering', () => {
        for (const bundleFile of BUNDLE_FILES) {
            describe(bundleFile, () => {
                let EmbedUnit: Record<string, unknown>;

                beforeEach(() => {
                    ({ EmbedUnit } = loadBundleInVM(bundleFile));
                    (EmbedUnit.resetRegistry as () => void)();
                });

                afterEach(() => {
                    (EmbedUnit.resetRegistry as () => void)();
                });

                it('filters tests by simple tag', async () => {
                    const describe = EmbedUnit.describe as Function;
                    const it = EmbedUnit.it as Function;
                    const expectFn = EmbedUnit.expect as Function;
                    const runTests = EmbedUnit.runTests as Function;

                    describe('Tag Suite', () => {
                        it('test with @slow tag', () => {
                            expectFn(true).toBe(true);
                        });

                        it('test without tag', () => {
                            expectFn(true).toBe(true);
                        });
                    });

                    const result = await runTests({ silent: true, tags: ['slow'] });
                    expect(result.summary.passed).toBe(1);
                    expect(result.summary.total).toBe(1);
                });

                it('filters tests by tag with hyphen (e.g. @debug-test)', async () => {
                    const describe = EmbedUnit.describe as Function;
                    const it = EmbedUnit.it as Function;
                    const expectFn = EmbedUnit.expect as Function;
                    const runTests = EmbedUnit.runTests as Function;
                    const getTestList = EmbedUnit.getTestList as Function;

                    describe('Hyphen Tag Suite', () => {
                        it('test with @debug-test tag', () => {
                            expectFn(true).toBe(true);
                        });

                        it('test with @e2e-integration tag', () => {
                            expectFn(true).toBe(true);
                        });

                        it('test without tag', () => {
                            expectFn(true).toBe(true);
                        });
                    });

                    // First verify the tag is properly extracted
                    const testList = getTestList();
                    const debugTest = testList.find((t: { test: string }) => t.test.includes('debug'));
                    expect(debugTest).toBeDefined();
                    expect(debugTest.tags).toContain('debug-test');

                    // Then verify filtering works
                    const result = await runTests({ silent: true, tags: ['debug-test'] });
                    expect(result.summary.passed).toBe(1);
                    expect(result.summary.total).toBe(1);
                });

                it('strips hyphenated tags from test names correctly', async () => {
                    const describe = EmbedUnit.describe as Function;
                    const it = EmbedUnit.it as Function;
                    const expectFn = EmbedUnit.expect as Function;
                    const runTests = EmbedUnit.runTests as Function;

                    describe('Name Stripping Suite', () => {
                        it('@slow-running test should have clean name', () => {
                            expectFn(true).toBe(true);
                        });
                    });

                    const result = await runTests({ silent: true, includePassed: true });
                    expect(result.summary.passed).toBe(1);
                    // The test name should be stripped of the tag
                    expect(result.passed[0].test).toBe('test should have clean name');
                });
            });
        }
    });
});
