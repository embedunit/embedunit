// packages/core/test/test-alias.test.ts
// Tests for the Jest-compatible `test` alias
import { describe, test, xtest, resetRegistry, runTests } from '../src';
import { expect } from '@embedunit/assert';

describe('test() alias', () => {
    describe('basic functionality', () => {
        test('should work as an alias for it()', () => {
            expect(1 + 1).toBe(2);
        });

        test('should support async tests', async () => {
            const result = await Promise.resolve(42);
            expect(result).toBe(42);
        });
    });

    describe('test.skip()', () => {
        test.skip('should skip this test', () => {
            throw new Error('This should not run');
        });

        test('should run this test after skipped one', () => {
            expect(true).toBe(true);
        });
    });

    describe('test.only() behavior', () => {
        test('verifies test.only exists and is a function', () => {
            expect(typeof test.only).toBe('function');
        });
    });

    describe('test.each()', () => {
        test.each([
            [1, 1, 2],
            [2, 3, 5],
            [10, 20, 30]
        ])('adds %d + %d to equal %d', (a, b, expected) => {
            expect(a + b).toBe(expected);
        });

        test.each([
            { a: 1, b: 2, sum: 3 },
            { a: 5, b: 5, sum: 10 }
        ])('object style: $a + $b = $sum', ({ a, b, sum }) => {
            expect(a + b).toBe(sum);
        });
    });

    describe('xtest alias', () => {
        xtest('should be skipped via xtest', () => {
            throw new Error('This should not run');
        });

        test('should run after xtest', () => {
            expect(true).toBe(true);
        });
    });
});

describe('test extended methods', () => {
    describe('test.todo()', () => {
        test('verifies test.todo exists', () => {
            expect(typeof (test as any).todo).toBe('function');
        });
    });

    describe('test.failing()', () => {
        test('verifies test.failing exists', () => {
            expect(typeof (test as any).failing).toBe('function');
        });
    });

    describe('test.skipIf()', () => {
        test('verifies test.skipIf exists', () => {
            expect(typeof (test as any).skipIf).toBe('function');
        });
    });

    describe('test.runIf()', () => {
        test('verifies test.runIf exists', () => {
            expect(typeof (test as any).runIf).toBe('function');
        });
    });
});

describe('test() integration with runner', () => {
    test('should properly register and run tests defined with test()', async () => {
        resetRegistry();

        let executed = false;
        describe('Integration Suite', () => {
            test('integration test', () => {
                executed = true;
            });
        });

        await runTests({ silent: true });
        expect(executed).toBe(true);
    });

    test('test.skip should be reported as skipped', async () => {
        resetRegistry();

        describe('Skip Suite', () => {
            test.skip('skipped test', () => {
                throw new Error('Should not run');
            });
        });

        const result = await runTests({ silent: true, includeSkipped: true });
        expect(result.summary.skipped).toBe(1);
        expect(result.summary.failed).toBe(0);
    });
});
