// Browser E2E Tests using Playwright
// Tests all bundle variants in real browsers (Chromium, Firefox, WebKit)
import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bundlesDistDir = path.resolve(__dirname, '../../../bundles/dist');

// Bundle variants to test
const BUNDLE_FILES = [
    'embedunit.recommended.global.js',
    'embedunit.recommended.global.min.js',
    'embedunit.recommended.globals.js',
    'embedunit.recommended.globals.min.js',
    'embedunit.lite.global.js',
    'embedunit.lite.global.min.js'
];

// Test page that loads bundle and runs tests
const TEST_PAGE_HTML = `
<!DOCTYPE html>
<html>
<head><title>EmbedUnit Test</title></head>
<body>
<script>
window.testResults = null;
window.testError = null;
</script>
</body>
</html>
`;

// Helper to load bundle by file path (not URL)
async function loadBundle(page: any, bundleFile: string) {
    const bundlePath = path.join(bundlesDistDir, bundleFile);
    await page.addScriptTag({ path: bundlePath });
}

test.describe('Browser Runtime', () => {
    for (const bundleFile of BUNDLE_FILES) {
        test.describe(bundleFile, () => {
            test('bundle loads and EmbedUnit is available', async ({ page }) => {
                await page.setContent(TEST_PAGE_HTML);
                await loadBundle(page, bundleFile);

                const isEmbedUnitDefined = await page.evaluate(() => {
                    return typeof (window as any).EmbedUnit !== 'undefined';
                });

                expect(isEmbedUnitDefined).toBe(true);
            });

            test('toBe assertion works', async ({ page }) => {
                await page.setContent(TEST_PAGE_HTML);
                await loadBundle(page, bundleFile);

                const result = await page.evaluate(async () => {
                    const { describe, it, expect, runTests, resetRegistry } = (window as any).EmbedUnit;
                    resetRegistry();

                    describe('toBe Suite', () => {
                        it('primitives match', () => {
                            expect(1).toBe(1);
                            expect('hello').toBe('hello');
                            expect(true).toBe(true);
                        });
                    });

                    return await runTests({ silent: true });
                });

                expect(result.summary.passed).toBe(1);
                expect(result.summary.failed).toBe(0);
            });

            test('toEqual assertion works for objects', async ({ page }) => {
                await page.setContent(TEST_PAGE_HTML);
                await loadBundle(page, bundleFile);

                const result = await page.evaluate(async () => {
                    const { describe, it, expect, runTests, resetRegistry } = (window as any).EmbedUnit;
                    resetRegistry();

                    describe('toEqual Suite', () => {
                        it('objects match', () => {
                            expect({ a: 1, b: 2 }).toEqual({ a: 1, b: 2 });
                            expect([1, 2, 3]).toEqual([1, 2, 3]);
                        });
                    });

                    return await runTests({ silent: true });
                });

                expect(result.summary.passed).toBe(1);
                expect(result.summary.failed).toBe(0);
            });

            test('toThrow assertion works', async ({ page }) => {
                await page.setContent(TEST_PAGE_HTML);
                await loadBundle(page, bundleFile);

                const result = await page.evaluate(async () => {
                    const { describe, it, expect, runTests, resetRegistry } = (window as any).EmbedUnit;
                    resetRegistry();

                    describe('toThrow Suite', () => {
                        it('catches errors', () => {
                            expect(() => { throw new Error('test'); }).toThrow();
                            expect(() => { throw new Error('specific'); }).toThrow('specific');
                        });
                    });

                    return await runTests({ silent: true });
                });

                expect(result.summary.passed).toBe(1);
                expect(result.summary.failed).toBe(0);
            });

            test('async tests work', async ({ page }) => {
                await page.setContent(TEST_PAGE_HTML);
                await loadBundle(page, bundleFile);

                const result = await page.evaluate(async () => {
                    const { describe, it, expect, runTests, resetRegistry } = (window as any).EmbedUnit;
                    resetRegistry();

                    describe('Async Suite', () => {
                        it('resolves promises', async () => {
                            const value = await Promise.resolve(42);
                            expect(value).toBe(42);
                        });
                    });

                    return await runTests({ silent: true });
                });

                expect(result.summary.passed).toBe(1);
                expect(result.summary.failed).toBe(0);
            });

            test('Promise.all works', async ({ page }) => {
                await page.setContent(TEST_PAGE_HTML);
                await loadBundle(page, bundleFile);

                const result = await page.evaluate(async () => {
                    const { describe, it, expect, runTests, resetRegistry } = (window as any).EmbedUnit;
                    resetRegistry();

                    describe('Promise.all Suite', () => {
                        it('resolves multiple promises', async () => {
                            const results = await Promise.all([
                                Promise.resolve(1),
                                Promise.resolve(2),
                                Promise.resolve(3)
                            ]);
                            expect(results).toEqual([1, 2, 3]);
                        });
                    });

                    return await runTests({ silent: true });
                });

                expect(result.summary.passed).toBe(1);
                expect(result.summary.failed).toBe(0);
            });

            test('beforeEach and afterEach hooks work', async ({ page }) => {
                await page.setContent(TEST_PAGE_HTML);
                await loadBundle(page, bundleFile);

                const result = await page.evaluate(async () => {
                    const { describe, it, expect, beforeEach, afterEach, runTests, resetRegistry } = (window as any).EmbedUnit;
                    resetRegistry();

                    let counter = 0;
                    describe('Hooks Suite', () => {
                        beforeEach(() => { counter++; });
                        afterEach(() => { counter--; });

                        it('first test', () => {
                            expect(counter).toBe(1);
                        });
                        it('second test', () => {
                            expect(counter).toBe(1);
                        });
                    });

                    return await runTests({ silent: true });
                });

                expect(result.summary.passed).toBe(2);
                expect(result.summary.failed).toBe(0);
            });

            test('beforeAll runs once per suite', async ({ page }) => {
                await page.setContent(TEST_PAGE_HTML);
                await loadBundle(page, bundleFile);

                const result = await page.evaluate(async () => {
                    const { describe, it, expect, beforeAll, runTests, resetRegistry } = (window as any).EmbedUnit;
                    resetRegistry();

                    let setupCount = 0;
                    describe('BeforeAll Suite', () => {
                        beforeAll(() => { setupCount++; });
                        it('first', () => { expect(setupCount).toBe(1); });
                        it('second', () => { expect(setupCount).toBe(1); });
                    });

                    return await runTests({ silent: true });
                });

                expect(result.summary.passed).toBe(2);
                expect(result.summary.failed).toBe(0);
            });

            test('nested suites inherit parent hooks', async ({ page }) => {
                await page.setContent(TEST_PAGE_HTML);
                await loadBundle(page, bundleFile);

                const result = await page.evaluate(async () => {
                    const { describe, it, expect, beforeEach, runTests, resetRegistry } = (window as any).EmbedUnit;
                    resetRegistry();

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

                    return await runTests({ silent: true });
                });

                expect(result.summary.passed).toBe(1);
                expect(result.summary.failed).toBe(0);
            });

            test('xit skips tests', async ({ page }) => {
                await page.setContent(TEST_PAGE_HTML);
                await loadBundle(page, bundleFile);

                const result = await page.evaluate(async () => {
                    const { describe, xit, runTests, resetRegistry } = (window as any).EmbedUnit;
                    resetRegistry();

                    describe('Skip Suite', () => {
                        xit('skipped', () => {
                            throw new Error('Should not run');
                        });
                    });

                    return await runTests({ silent: true });
                });

                expect(result.summary.skipped).toBe(1);
                expect(result.summary.failed).toBe(0);
            });

            test('fit runs only focused tests', async ({ page }) => {
                await page.setContent(TEST_PAGE_HTML);
                await loadBundle(page, bundleFile);

                const result = await page.evaluate(async () => {
                    const { describe, it, fit, expect, runTests, resetRegistry } = (window as any).EmbedUnit;
                    resetRegistry();

                    describe('Focus Suite', () => {
                        it('regular', () => { expect(true).toBe(true); });
                        fit('focused', () => { expect(1).toBe(1); });
                    });

                    return await runTests({ silent: true });
                });

                expect(result.summary.passed).toBe(1);
                expect(result.summary.skipped).toBe(1);
            });

            test('detects failing tests', async ({ page }) => {
                await page.setContent(TEST_PAGE_HTML);
                await loadBundle(page, bundleFile);

                const result = await page.evaluate(async () => {
                    const { describe, it, expect, runTests, resetRegistry } = (window as any).EmbedUnit;
                    resetRegistry();

                    describe('Failing Suite', () => {
                        it('fails', () => {
                            expect(1).toBe(2);
                        });
                    });

                    return await runTests({ silent: true });
                });

                expect(result.summary.passed).toBe(0);
                expect(result.summary.failed).toBe(1);
            });

            test('reports failure details', async ({ page }) => {
                await page.setContent(TEST_PAGE_HTML);
                await loadBundle(page, bundleFile);

                const result = await page.evaluate(async () => {
                    const { describe, it, expect, runTests, resetRegistry } = (window as any).EmbedUnit;
                    resetRegistry();

                    describe('Details Suite', () => {
                        it('has details', () => {
                            expect(1).toBe(2);
                        });
                    });

                    return await runTests({ silent: true });
                });

                expect(result.failures).toBeDefined();
                expect(result.failures.length).toBe(1);
                expect(result.failures[0].suite).toBe('Details Suite');
                expect(result.failures[0].test).toBe('has details');
            });

            test('not modifier works', async ({ page }) => {
                await page.setContent(TEST_PAGE_HTML);
                await loadBundle(page, bundleFile);

                const result = await page.evaluate(async () => {
                    const { describe, it, expect, runTests, resetRegistry } = (window as any).EmbedUnit;
                    resetRegistry();

                    describe('not Suite', () => {
                        it('negation works', () => {
                            expect(1).not.toBe(2);
                            expect([1, 2]).not.toContain(3);
                        });
                    });

                    return await runTests({ silent: true });
                });

                expect(result.summary.passed).toBe(1);
                expect(result.summary.failed).toBe(0);
            });
        });
    }

    // Special tests for recommended-globals bundle (auto-installs globals)
    test.describe('recommended.globals bundle - auto-installed globals', () => {
        test('globals are auto-installed', async ({ page }) => {
            await page.setContent(TEST_PAGE_HTML);
            await loadBundle(page, 'embedunit.recommended.globals.js');

            const result = await page.evaluate(async () => {
                // With globals bundle, test functions are on window directly
                // EmbedUnit is also available on window for resetRegistry and runTests
                const win = window as any;

                // Verify globals are installed
                if (typeof win.describe !== 'function') {
                    throw new Error('describe not installed as global');
                }

                win.EmbedUnit.resetRegistry();

                win.describe('Auto Globals', () => {
                    win.it('globals work', () => {
                        win.expect(typeof win.describe).toBe('function');
                        win.expect(typeof win.it).toBe('function');
                        win.expect(typeof win.expect).toBe('function');
                    });
                });

                return await win.EmbedUnit.runTests({ silent: true });
            });

            expect(result.summary.passed).toBe(1);
            expect(result.summary.failed).toBe(0);
        });
    });
});
