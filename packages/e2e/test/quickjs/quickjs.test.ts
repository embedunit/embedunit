// QuickJS E2E Tests
// Tests bundles in QuickJS embedded JavaScript runtime
import { describe, it, beforeAll } from '@embedunit/core';
import { expect } from '@embedunit/assert';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { runInQuickJS, isQuickJSAvailable } from './quickjs-runner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bundlesDistDir = path.resolve(__dirname, '../../../bundles/dist');

// Bundle variants to test in QuickJS
// Note: Testing both minified and non-minified for all variants
const BUNDLE_FILES = [
    'embedunit.recommended.global.js',
    'embedunit.recommended.global.min.js',
    'embedunit.lite.global.js',
    'embedunit.lite.global.min.js'
];

describe('QuickJS Runtime', () => {
    let quickjsAvailable = false;

    beforeAll(async () => {
        quickjsAvailable = await isQuickJSAvailable();
        if (!quickjsAvailable) {
            console.warn('QuickJS not available, tests will be skipped');
        }
    });

    describe('Bundle Loading', () => {
        for (const bundleFile of BUNDLE_FILES) {
            it(`${bundleFile} loads in QuickJS`, async () => {
                if (!quickjsAvailable) {
                    return; // Skip if QuickJS not available
                }

                const bundlePath = path.join(bundlesDistDir, bundleFile);
                const result = await runInQuickJS(bundlePath, `
                    const { describe, it, expect, resetRegistry } = EmbedUnit;
                    resetRegistry();
                    describe('Load Test', () => {
                        it('EmbedUnit is defined', () => {
                            expect(typeof EmbedUnit).toBe('object');
                        });
                    });
                `);

                expect(result.summary.passed).toBe(1);
                expect(result.summary.failed).toBe(0);
            });
        }
    });

    describe('Basic Assertions', () => {
        for (const bundleFile of BUNDLE_FILES) {
            describe(bundleFile, () => {
                it('toBe works', async () => {
                    if (!quickjsAvailable) return;

                    const bundlePath = path.join(bundlesDistDir, bundleFile);
                    const result = await runInQuickJS(bundlePath, `
                        const { describe, it, expect, resetRegistry } = EmbedUnit;
                        resetRegistry();
                        describe('toBe Suite', () => {
                            it('primitives match', () => {
                                expect(1).toBe(1);
                                expect('hello').toBe('hello');
                                expect(true).toBe(true);
                            });
                        });
                    `);

                    expect(result.summary.passed).toBe(1);
                    expect(result.summary.failed).toBe(0);
                });

                it('toEqual works for objects', async () => {
                    if (!quickjsAvailable) return;

                    const bundlePath = path.join(bundlesDistDir, bundleFile);
                    const result = await runInQuickJS(bundlePath, `
                        const { describe, it, expect, resetRegistry } = EmbedUnit;
                        resetRegistry();
                        describe('toEqual Suite', () => {
                            it('objects match', () => {
                                expect({ a: 1 }).toEqual({ a: 1 });
                                expect([1, 2, 3]).toEqual([1, 2, 3]);
                            });
                        });
                    `);

                    expect(result.summary.passed).toBe(1);
                    expect(result.summary.failed).toBe(0);
                });

                it('toThrow works', async () => {
                    if (!quickjsAvailable) return;

                    const bundlePath = path.join(bundlesDistDir, bundleFile);
                    const result = await runInQuickJS(bundlePath, `
                        const { describe, it, expect, resetRegistry } = EmbedUnit;
                        resetRegistry();
                        describe('toThrow Suite', () => {
                            it('catches errors', () => {
                                expect(() => { throw new Error('test'); }).toThrow();
                            });
                        });
                    `);

                    expect(result.summary.passed).toBe(1);
                    expect(result.summary.failed).toBe(0);
                });
            });
        }
    });

    describe('Async Support', () => {
        for (const bundleFile of BUNDLE_FILES) {
            describe(bundleFile, () => {
                it('async tests work', async () => {
                    if (!quickjsAvailable) return;

                    const bundlePath = path.join(bundlesDistDir, bundleFile);
                    const result = await runInQuickJS(bundlePath, `
                        const { describe, it, expect, resetRegistry } = EmbedUnit;
                        resetRegistry();
                        describe('Async Suite', () => {
                            it('resolves promises', async () => {
                                const value = await Promise.resolve(42);
                                expect(value).toBe(42);
                            });
                        });
                    `);

                    expect(result.summary.passed).toBe(1);
                    expect(result.summary.failed).toBe(0);
                });

                it('Promise.all works', async () => {
                    if (!quickjsAvailable) return;

                    const bundlePath = path.join(bundlesDistDir, bundleFile);
                    const result = await runInQuickJS(bundlePath, `
                        const { describe, it, expect, resetRegistry } = EmbedUnit;
                        resetRegistry();
                        describe('Promise.all Suite', () => {
                            it('resolves multiple', async () => {
                                const results = await Promise.all([
                                    Promise.resolve(1),
                                    Promise.resolve(2)
                                ]);
                                expect(results).toEqual([1, 2]);
                            });
                        });
                    `);

                    expect(result.summary.passed).toBe(1);
                    expect(result.summary.failed).toBe(0);
                });
            });
        }
    });

    describe('Hooks', () => {
        for (const bundleFile of BUNDLE_FILES) {
            describe(bundleFile, () => {
                it('beforeEach runs for each test', async () => {
                    if (!quickjsAvailable) return;

                    const bundlePath = path.join(bundlesDistDir, bundleFile);
                    const result = await runInQuickJS(bundlePath, `
                        const { describe, it, expect, beforeEach, resetRegistry } = EmbedUnit;
                        resetRegistry();
                        let counter = 0;
                        describe('Hooks Suite', () => {
                            beforeEach(() => { counter++; });
                            it('first', () => { expect(counter).toBe(1); });
                            it('second', () => { expect(counter).toBe(2); });
                        });
                    `);

                    expect(result.summary.passed).toBe(2);
                    expect(result.summary.failed).toBe(0);
                });
            });
        }
    });

    describe('Error Detection', () => {
        for (const bundleFile of BUNDLE_FILES) {
            describe(bundleFile, () => {
                it('detects failing tests', async () => {
                    if (!quickjsAvailable) return;

                    const bundlePath = path.join(bundlesDistDir, bundleFile);
                    const result = await runInQuickJS(bundlePath, `
                        const { describe, it, expect, resetRegistry } = EmbedUnit;
                        resetRegistry();
                        describe('Failing Suite', () => {
                            it('fails', () => {
                                expect(1).toBe(2);
                            });
                        });
                    `);

                    expect(result.summary.passed).toBe(0);
                    expect(result.summary.failed).toBe(1);
                });
            });
        }
    });

    describe('Skip/Only', () => {
        for (const bundleFile of BUNDLE_FILES) {
            describe(bundleFile, () => {
                it('xit skips tests', async () => {
                    if (!quickjsAvailable) return;

                    const bundlePath = path.join(bundlesDistDir, bundleFile);
                    const result = await runInQuickJS(bundlePath, `
                        const { describe, xit, resetRegistry } = EmbedUnit;
                        resetRegistry();
                        describe('Skip Suite', () => {
                            xit('skipped', () => {
                                throw new Error('Should not run');
                            });
                        });
                    `);

                    expect(result.summary.skipped).toBe(1);
                    expect(result.summary.failed).toBe(0);
                });
            });
        }
    });
});
