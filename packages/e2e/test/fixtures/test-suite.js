// Shared test suite code that runs across all runtimes
// This is executed inside sandboxed environments (Node VM, QuickJS, Browser)

const testSuiteCode = `
const { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, runTests, resetRegistry } = EmbedUnit;

resetRegistry();

describe('Cross-Runtime Verification', () => {
    describe('Basic Assertions', () => {
        it('toBe works with primitives', () => {
            expect(1).toBe(1);
            expect('hello').toBe('hello');
            expect(true).toBe(true);
            expect(null).toBe(null);
        });

        it('toEqual works for objects', () => {
            expect({ a: 1 }).toEqual({ a: 1 });
            expect([1, 2, 3]).toEqual([1, 2, 3]);
            expect({ nested: { value: 42 } }).toEqual({ nested: { value: 42 } });
        });

        it('toBeGreaterThan and toBeLessThan work', () => {
            expect(5).toBeGreaterThan(3);
            expect(3).toBeLessThan(5);
        });

        it('toContain works with arrays and strings', () => {
            expect([1, 2, 3]).toContain(2);
            expect('hello world').toContain('world');
        });

        it('toBeTruthy and toBeFalsy work', () => {
            expect(1).toBeTruthy();
            expect('yes').toBeTruthy();
            expect(0).toBeFalsy();
            expect('').toBeFalsy();
            expect(null).toBeFalsy();
        });

        it('toBeNull and toBeUndefined work', () => {
            expect(null).toBeNull();
            expect(undefined).toBeUndefined();
        });

        it('toBeDefined works', () => {
            expect(42).toBeDefined();
            expect('value').toBeDefined();
        });

        it('toHaveLength works', () => {
            expect([1, 2, 3]).toHaveLength(3);
            expect('hello').toHaveLength(5);
        });

        it('not modifier works', () => {
            expect(1).not.toBe(2);
            expect([1, 2]).not.toContain(3);
        });
    });

    describe('Error Assertions', () => {
        it('toThrow catches thrown errors', () => {
            expect(() => {
                throw new Error('test error');
            }).toThrow();
        });

        it('toThrow matches error message', () => {
            expect(() => {
                throw new Error('specific message');
            }).toThrow('specific message');
        });

        it('toThrow with regex pattern', () => {
            expect(() => {
                throw new Error('Error code: 123');
            }).toThrow(/code: \\d+/);
        });
    });

    describe('Async Support', () => {
        it('resolves promises', async () => {
            const value = await Promise.resolve(42);
            expect(value).toBe(42);
        });

        it('handles async/await chains', async () => {
            const step1 = await Promise.resolve(1);
            const step2 = await Promise.resolve(step1 + 1);
            const step3 = await Promise.resolve(step2 + 1);
            expect(step3).toBe(3);
        });

        it('handles Promise.all', async () => {
            const results = await Promise.all([
                Promise.resolve(1),
                Promise.resolve(2),
                Promise.resolve(3)
            ]);
            expect(results).toEqual([1, 2, 3]);
        });
    });

    describe('Hooks', () => {
        let hookLog = [];

        beforeAll(() => {
            hookLog.push('beforeAll');
        });

        afterAll(() => {
            hookLog.push('afterAll');
        });

        beforeEach(() => {
            hookLog.push('beforeEach');
        });

        afterEach(() => {
            hookLog.push('afterEach');
        });

        it('hooks run in correct order (first test)', () => {
            expect(hookLog).toContain('beforeAll');
            expect(hookLog).toContain('beforeEach');
        });

        it('hooks run for each test (second test)', () => {
            // beforeEach should have run twice by now
            const beforeEachCount = hookLog.filter(h => h === 'beforeEach').length;
            expect(beforeEachCount).toBe(2);
        });
    });

    describe('Nested Suites', () => {
        let outerValue = 0;

        beforeEach(() => {
            outerValue++;
        });

        describe('Inner Suite', () => {
            let innerValue = 0;

            beforeEach(() => {
                innerValue++;
            });

            it('inherits parent hooks', () => {
                expect(outerValue).toBeGreaterThan(0);
                expect(innerValue).toBeGreaterThan(0);
            });
        });

        it('outer suite works independently', () => {
            expect(outerValue).toBeGreaterThan(0);
        });
    });
});

runTests({ silent: true });
`;

export default testSuiteCode;
