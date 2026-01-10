// Deno E2E Tests
// Tests bundles in Deno runtime
import { describe, it, beforeAll } from '@embedunit/core';
import { expect } from '@embedunit/assert';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { runInDeno, isDenoAvailable, getDenoVersion } from './deno-runner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bundlesDistDir = path.resolve(__dirname, '../../../bundles/dist');

// Bundle variants to test in Deno
const BUNDLE_FILES = [
    'embedunit.recommended.global.js',
    'embedunit.recommended.global.min.js',
    'embedunit.lite.global.js',
    'embedunit.lite.global.min.js'
];

describe('Deno Runtime', () => {
    let denoAvailable = false;
    let denoVersion: string | null = null;

    beforeAll(async () => {
        denoAvailable = await isDenoAvailable();
        if (denoAvailable) {
            denoVersion = await getDenoVersion();
            console.log(`Deno version: ${denoVersion}`);
        } else {
            console.warn('Deno not available, tests will be skipped');
        }
    });

    describe('Bundle Loading', () => {
        for (const bundleFile of BUNDLE_FILES) {
            it(`${bundleFile} loads in Deno`, async () => {
                if (!denoAvailable) return;

                const bundlePath = path.join(bundlesDistDir, bundleFile);
                const result = await runInDeno(bundlePath, `
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
                    if (!denoAvailable) return;

                    const bundlePath = path.join(bundlesDistDir, bundleFile);
                    const result = await runInDeno(bundlePath, `
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
                    if (!denoAvailable) return;

                    const bundlePath = path.join(bundlesDistDir, bundleFile);
                    const result = await runInDeno(bundlePath, `
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
                    if (!denoAvailable) return;

                    const bundlePath = path.join(bundlesDistDir, bundleFile);
                    const result = await runInDeno(bundlePath, `
                        describe('toThrow Suite', () => {
                            it('catches errors', () => {
                                expect(() => { throw new Error('test'); }).toThrow();
                            });
                        });
                    `);

                    expect(result.summary.passed).toBe(1);
                    expect(result.summary.failed).toBe(0);
                });

                it('not modifier works', async () => {
                    if (!denoAvailable) return;

                    const bundlePath = path.join(bundlesDistDir, bundleFile);
                    const result = await runInDeno(bundlePath, `
                        describe('not Suite', () => {
                            it('negation works', () => {
                                expect(1).not.toBe(2);
                                expect([1, 2]).not.toContain(3);
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
                    if (!denoAvailable) return;

                    const bundlePath = path.join(bundlesDistDir, bundleFile);
                    const result = await runInDeno(bundlePath, `
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
                    if (!denoAvailable) return;

                    const bundlePath = path.join(bundlesDistDir, bundleFile);
                    const result = await runInDeno(bundlePath, `
                        describe('Promise.all Suite', () => {
                            it('resolves multiple', async () => {
                                const results = await Promise.all([
                                    Promise.resolve(1),
                                    Promise.resolve(2),
                                    Promise.resolve(3)
                                ]);
                                expect(results).toEqual([1, 2, 3]);
                            });
                        });
                    `);

                    expect(result.summary.passed).toBe(1);
                    expect(result.summary.failed).toBe(0);
                });

                it('async/await chains work', async () => {
                    if (!denoAvailable) return;

                    const bundlePath = path.join(bundlesDistDir, bundleFile);
                    const result = await runInDeno(bundlePath, `
                        describe('Async Chain Suite', () => {
                            it('chains resolve', async () => {
                                const step1 = await Promise.resolve(1);
                                const step2 = await Promise.resolve(step1 + 1);
                                expect(step2).toBe(2);
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
                    if (!denoAvailable) return;

                    const bundlePath = path.join(bundlesDistDir, bundleFile);
                    const result = await runInDeno(bundlePath, `
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

                it('beforeAll runs once', async () => {
                    if (!denoAvailable) return;

                    const bundlePath = path.join(bundlesDistDir, bundleFile);
                    const result = await runInDeno(bundlePath, `
                        let setupCount = 0;
                        describe('BeforeAll Suite', () => {
                            beforeAll(() => { setupCount++; });
                            it('first', () => { expect(setupCount).toBe(1); });
                            it('second', () => { expect(setupCount).toBe(1); });
                        });
                    `);

                    expect(result.summary.passed).toBe(2);
                    expect(result.summary.failed).toBe(0);
                });

                it('nested suites inherit hooks', async () => {
                    if (!denoAvailable) return;

                    const bundlePath = path.join(bundlesDistDir, bundleFile);
                    const result = await runInDeno(bundlePath, `
                        let outer = 0;
                        let inner = 0;
                        describe('Outer', () => {
                            beforeEach(() => { outer++; });
                            describe('Inner', () => {
                                beforeEach(() => { inner++; });
                                it('inherits', () => {
                                    expect(outer).toBeGreaterThan(0);
                                    expect(inner).toBeGreaterThan(0);
                                });
                            });
                        });
                    `);

                    expect(result.summary.passed).toBe(1);
                    expect(result.summary.failed).toBe(0);
                });
            });
        }
    });

    describe('Error Detection', () => {
        for (const bundleFile of BUNDLE_FILES) {
            describe(bundleFile, () => {
                it('detects failing tests', async () => {
                    if (!denoAvailable) return;

                    const bundlePath = path.join(bundlesDistDir, bundleFile);
                    const result = await runInDeno(bundlePath, `
                        describe('Failing Suite', () => {
                            it('fails', () => {
                                expect(1).toBe(2);
                            });
                        });
                    `);

                    expect(result.summary.passed).toBe(0);
                    expect(result.summary.failed).toBe(1);
                });

                it('detects thrown errors', async () => {
                    if (!denoAvailable) return;

                    const bundlePath = path.join(bundlesDistDir, bundleFile);
                    const result = await runInDeno(bundlePath, `
                        describe('Error Suite', () => {
                            it('throws', () => {
                                throw new Error('Intentional');
                            });
                        });
                    `);

                    expect(result.summary.failed).toBe(1);
                });
            });
        }
    });

    describe('Skip/Only', () => {
        for (const bundleFile of BUNDLE_FILES) {
            describe(bundleFile, () => {
                it('xit skips tests', async () => {
                    if (!denoAvailable) return;

                    const bundlePath = path.join(bundlesDistDir, bundleFile);
                    const result = await runInDeno(bundlePath, `
                        describe('Skip Suite', () => {
                            xit('skipped', () => {
                                throw new Error('Should not run');
                            });
                        });
                    `);

                    expect(result.summary.skipped).toBe(1);
                    expect(result.summary.failed).toBe(0);
                });

                it('fit focuses tests', async () => {
                    if (!denoAvailable) return;

                    const bundlePath = path.join(bundlesDistDir, bundleFile);
                    const result = await runInDeno(bundlePath, `
                        describe('Focus Suite', () => {
                            it('regular', () => { expect(true).toBe(true); });
                            fit('focused', () => { expect(1).toBe(1); });
                        });
                    `);

                    expect(result.summary.passed).toBe(1);
                    expect(result.summary.skipped).toBe(1);
                });
            });
        }
    });
});
