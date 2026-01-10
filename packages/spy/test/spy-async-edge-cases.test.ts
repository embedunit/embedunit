// test/spy-async-edge-cases.test.ts
// Additional edge case tests for async spy features

import { describe, it } from '@embedunit/core';
import { expect } from '@embedunit/assert';
import { createAsyncSpy, spyOnAsync, enhanceSpy, createSpyFunction } from '../src';

describe('Async Spy Edge Cases', () => {

    describe('Edge Case: Empty and Null Values', () => {
        it('should handle null and undefined return values', () => {
            const spy = createAsyncSpy('nullSpy');
            spy
                .returnValueOnce(null)
                .returnValueOnce(undefined)
                .returnValue('default');

            expect(spy()).toBe(null);
            expect(spy()).toBe(undefined);
            expect(spy()).toBe('default');
        });

        it('should handle empty string and zero', () => {
            const spy = createAsyncSpy('emptySpy');
            spy
                .returnValueOnce('')
                .returnValueOnce(0)
                .returnValueOnce(false)
                .returnValue(true);

            expect(spy()).toBe('');
            expect(spy()).toBe(0);
            expect(spy()).toBe(false);
            expect(spy()).toBe(true);
        });

        it('should handle NaN and Infinity', () => {
            const spy = createAsyncSpy('specialSpy');
            spy
                .returnValueOnce(NaN)
                .returnValueOnce(Infinity)
                .returnValueOnce(-Infinity);

            expect(Number.isNaN(spy())).toBe(true);
            expect(spy()).toBe(Infinity);
            expect(spy()).toBe(-Infinity);
        });
    });

    describe('Edge Case: Circular References', () => {
        it('should handle circular references in return values', () => {
            const spy = createAsyncSpy('circularSpy');
            const obj: any = { name: 'test' };
            obj.self = obj; // Circular reference

            spy.returnValue(obj);
            const result = spy();

            expect(result.name).toBe('test');
            expect(result.self).toBe(result);
        });

        it('should handle circular references in async values', async () => {
            const spy = createAsyncSpy('asyncCircularSpy');
            const obj: any = { data: 'async' };
            obj.ref = obj;

            spy.resolvedValue(obj);
            const result = await spy();

            expect(result.data).toBe('async');
            expect(result.ref).toBe(result);
        });
    });

    describe('Edge Case: Symbol and BigInt', () => {
        it('should handle Symbol return values', () => {
            const spy = createAsyncSpy('symbolSpy');
            const sym1 = Symbol('test1');
            const sym2 = Symbol('test2');

            spy
                .returnValueOnce(sym1)
                .returnValue(sym2);

            expect(spy()).toBe(sym1);
            expect(spy()).toBe(sym2);
        });

        it('should handle BigInt values', () => {
            const spy = createAsyncSpy('bigIntSpy');
            const big1 = BigInt(9007199254740991);
            const big2 = BigInt('9007199254740992');

            spy
                .returnValueOnce(big1)
                .returnValue(big2);

            expect(spy()).toBe(big1);
            expect(spy()).toBe(big2);
        });
    });

    describe('Edge Case: Method Chaining Scenarios', () => {
        it('should handle alternating returnValue and returnValueOnce', () => {
            const spy = createAsyncSpy('alternateSpy');

            spy
                .returnValue('default1')
                .returnValueOnce('once1') // Should be ignored due to lock
                .returnValueOnce('once2'); // Should be ignored due to lock

            expect(spy()).toBe('default1');
            expect(spy()).toBe('default1');
        });

        it('should handle multiple returnValue calls', () => {
            const spy = createAsyncSpy('multiDefaultSpy');

            spy
                .returnValueOnce('once')
                .returnValue('first')
                .returnValue('second') // Should override
                .returnValue('third'); // Should override again

            expect(spy()).toBe('once'); // Uses queued value first
            expect(spy()).toBe('third'); // Then uses last set default
        });

        it('should handle clearing and re-setting', () => {
            const spy = createAsyncSpy('clearSetSpy');

            spy
                .returnValueOnce('once1')
                .returnValue('default1')
                .clearReturnValues() // Clear everything
                .returnValueOnce('once2') // Should work after clear
                .returnValue('default2');

            expect(spy()).toBe('once2');
            expect(spy()).toBe('default2');
        });
    });

    describe('Edge Case: Promise Edge Cases', () => {
        it('should handle already resolved/rejected promises', async () => {
            const spy = createAsyncSpy('promiseSpy');
            const resolvedPromise = Promise.resolve('already resolved');
            const rejectedPromise = Promise.reject('already rejected');
            rejectedPromise.catch(() => {}); // Prevent unhandled rejection

            spy
                .returnValueOnce(resolvedPromise)
                .returnValueOnce(rejectedPromise);

            expect(await spy()).toBe('already resolved');

            try {
                await spy();
                expect(true).toBe(false); // Should not reach
            } catch (e) {
                expect(e).toBe('already rejected');
            }
        });

        it('should handle promise that resolves to another promise', async () => {
            const spy = createAsyncSpy('nestedPromiseSpy');
            const nestedPromise = Promise.resolve(Promise.resolve('nested'));

            spy.returnValue(nestedPromise);
            const result = await spy();

            // JavaScript automatically flattens nested promises when awaited
            expect(result).toBe('nested');
        });

        it('should handle thenable objects', async () => {
            const spy = createAsyncSpy('thenableSpy');
            const thenable = {
                then: (resolve: Function) => resolve('thenable result')
            };

            spy.returnValue(thenable);
            const result = await spy();

            expect(result).toBe('thenable result');
        });
    });

    describe('Edge Case: Arguments and Context', () => {
        it('should track arguments correctly with sequential returns', () => {
            const spy = createAsyncSpy('argsSpy');
            spy.returnValuesOnce('a', 'b', 'c');

            spy(1, 2);
            spy('x', 'y', 'z');
            spy();

            expect(spy.calls[0].args).toEqual([1, 2]);
            expect(spy.calls[1].args).toEqual(['x', 'y', 'z']);
            expect(spy.calls[2].args).toEqual([]);
        });

        it('should preserve this context with sequential returns', () => {
            const spy = createAsyncSpy('contextSpy');
            spy.returnValuesOnce('first', 'second');

            const obj1 = { name: 'obj1' };
            const obj2 = { name: 'obj2' };

            spy.call(obj1);
            spy.call(obj2);

            expect(spy.calls[0].thisArg).toBe(obj1);
            expect(spy.calls[1].thisArg).toBe(obj2);
        });
    });

    describe('Edge Case: Restoration and Reset', () => {
        it('should handle restore on enhanced object methods', () => {
            const obj = {
                method: (x: number) => x * 2
            };

            const spy = spyOnAsync(obj, 'method');
            spy.returnValue(100);

            expect(obj.method(5)).toBe(100);

            spy.restore();
            expect(obj.method(5)).toBe(10); // Back to original
        });

        it('should handle multiple enhancements', () => {
            const basicSpy = createSpyFunction('multi');

            const enhanced1 = enhanceSpy(basicSpy);
            enhanced1.returnValueOnce('first');

            const enhanced2 = enhanceSpy(enhanced1); // Enhance again
            expect(enhanced2).toBe(enhanced1); // Should return same spy

            expect(enhanced2()).toBe('first');
        });

        it('should handle reset with queued values', () => {
            const spy = createAsyncSpy('resetSpy');
            spy.returnValuesOnce(1, 2, 3);

            spy();
            expect(spy.callCount).toBe(1);

            spy.reset(); // Reset calls but not configuration
            expect(spy.callCount).toBe(0);

            expect(spy()).toBe(2); // Continues from where it left off
            expect(spy()).toBe(3);
        });
    });

    describe('Edge Case: Error Scenarios', () => {
        it('should handle throwing errors vs returning them', () => {
            const spy = createAsyncSpy('errorSpy');
            const error = new Error('test error');

            // This throws synchronously
            spy.throwError(error);

            expect(() => spy()).toThrow('test error');
            expect(spy.calls[0].error).toBe(error);
        });

        it('should handle rejected promises that are not awaited', () => {
            const spy = createAsyncSpy('rejectSpy');
            spy.rejectedValue('error');

            // Call without await - should not throw
            const promise = spy();
            expect(promise).toBeInstanceOf(Promise);

            // Error is still tracked
            expect(spy.calls[0].error).toBe('error');
        });

        it('should handle errors in callFakeOnce', () => {
            const spy = createAsyncSpy('fakeErrorSpy');

            spy
                .callFakeOnce(() => { throw new Error('fake error'); })
                .returnValue('default');

            expect(() => spy()).toThrow('fake error');
            expect(spy()).toBe('default'); // Fallback works
        });
    });

    describe('Edge Case: Type Coercion', () => {
        it('should handle functions as return values', () => {
            const spy = createAsyncSpy('funcSpy');
            const fn1 = () => 'fn1';
            const fn2 = function() { return 'fn2'; };

            spy
                .returnValueOnce(fn1)
                .returnValue(fn2);

            const result1 = spy();
            const result2 = spy();

            expect(result1()).toBe('fn1');
            expect(result2()).toBe('fn2');
        });

        it('should distinguish between callFake and returning a function', () => {
            const spy = createAsyncSpy('fakeFuncSpy');
            const myFunc = () => 'myFunc';

            // First call returns the function itself
            spy.returnValueOnce(myFunc);

            // Second call executes a fake function
            spy.callFakeOnce(() => 'executed');

            const result1 = spy();
            const result2 = spy();

            expect(typeof result1).toBe('function');
            expect(result1()).toBe('myFunc');
            expect(result2).toBe('executed');
        });
    });

    describe('Edge Case: Performance and Limits', () => {
        it('should handle very long queues', () => {
            const spy = createAsyncSpy('longQueueSpy');
            const values = Array.from({ length: 1000 }, (_, i) => i);

            spy.returnValuesOnce(...values);

            for (let i = 0; i < 1000; i++) {
                expect(spy()).toBe(i);
            }

            expect(spy()).toBe(undefined); // No default
        });

        it('should handle rapid successive calls', () => {
            const spy = createAsyncSpy('rapidSpy');
            spy.returnValuesOnce(...[1, 2, 3, 4, 5]);

            const results = [spy(), spy(), spy(), spy(), spy()];

            expect(results).toEqual([1, 2, 3, 4, 5]);
        });

        it('should handle deep call stacks', () => {
            const spy = createAsyncSpy('recursiveSpy');
            let depth = 0;

            spy.callFake(function recurse(): any {
                depth++;
                if (depth < 100) {
                    return recurse();
                }
                return depth;
            });

            expect(spy()).toBe(100);
            expect(depth).toBe(100);
        });
    });
});
