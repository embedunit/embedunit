// test/spy-async.test.ts
import { describe, it, beforeEach } from '@embedunit/core';
import { expect } from '@embedunit/assert';
import { spyOnAsync, createAsyncSpy, enhanceSpy, spyOn, createSpyFunction } from '../src';

describe('Async Spy Features', () => {

    describe('Sequential Return Values', () => {
        it('should return value once then fallback to default', () => {
            const spy = createAsyncSpy('testSpy');
            spy
                .returnValueOnce('first')
                .returnValueOnce('second')
                .returnValue('default');

            console.log('Queue before first call:', (spy as any).__onceQueue);
            const first = spy();
            console.log('First result:', first);
            expect(first).toBe('first');
            expect(spy()).toBe('second');
            expect(spy()).toBe('default');
            expect(spy()).toBe('default');
        });

        it('should support multiple returnValuesOnce', () => {
            const spy = createAsyncSpy('testSpy');
            spy
                .returnValuesOnce('one', 'two', 'three')
                .returnValue('default');

            expect(spy()).toBe('one');
            expect(spy()).toBe('two');
            expect(spy()).toBe('three');
            expect(spy()).toBe('default');
        });

        it('should chain returnValueOnce calls', () => {
            const spy = createAsyncSpy('testSpy');
            spy
                .returnValueOnce(1)
                .returnValueOnce(2)
                .returnValueOnce(3);

            expect(spy()).toBe(1);
            expect(spy()).toBe(2);
            expect(spy()).toBe(3);
            expect(spy()).toBe(undefined); // No default set
        });

        it('should work with complex values', () => {
            const spy = createAsyncSpy('testSpy');
            const obj1 = { id: 1, name: 'first' };
            const obj2 = { id: 2, name: 'second' };

            spy
                .returnValueOnce(obj1)
                .returnValueOnce(obj2)
                .returnValue(null);

            expect(spy()).toEqual(obj1);
            expect(spy()).toEqual(obj2);
            expect(spy()).toBe(null);
        });

        it('should use existing queue before falling back to returnValue', () => {
            const spy = createAsyncSpy('testSpy');
            spy
                .returnValueOnce('once')
                .returnValue('override')
                .returnValueOnce('ignored'); // This should be ignored due to lock

            expect(spy()).toBe('once'); // Use existing queue first
            expect(spy()).toBe('override'); // Then use default
        });

        it('should track calls with sequential returns', () => {
            const spy = createAsyncSpy('testSpy');
            spy.returnValuesOnce(10, 20, 30);

            spy('a');
            spy('b');
            spy('c');

            expect(spy.callCount).toBe(3);
            expect(spy.calls[0].returnValue).toBe(10);
            expect(spy.calls[1].returnValue).toBe(20);
            expect(spy.calls[2].returnValue).toBe(30);
        });
    });

    describe('Async Resolved Values', () => {
        it('should return resolved promise', async () => {
            const spy = createAsyncSpy('asyncSpy');
            spy.resolvedValue('success');

            const result = await spy();
            expect(result).toBe('success');
        });

        it('should return resolved value once then default', async () => {
            const spy = createAsyncSpy('asyncSpy');
            spy
                .resolvedValueOnce('first')
                .resolvedValue('default');

            expect(await spy()).toBe('first');
            expect(await spy()).toBe('default');
            expect(await spy()).toBe('default');
        });

        it('should support multiple resolved values', async () => {
            const spy = createAsyncSpy('asyncSpy');
            spy.resolvedValues('one', 'two', 'three');

            expect(await spy()).toBe('one');
            expect(await spy()).toBe('two');
            expect(await spy()).toBe('three');
            expect(spy()).toBe(undefined); // No more values
        });

        it('should mix sync and async returns', async () => {
            const spy = createAsyncSpy('mixedSpy');
            spy
                .returnValueOnce('sync')
                .resolvedValueOnce('async')
                .returnValueOnce('sync again');

            expect(spy()).toBe('sync');
            expect(await spy()).toBe('async');
            expect(spy()).toBe('sync again');
        });

        it('should handle complex async values', async () => {
            const spy = createAsyncSpy('complexAsync');
            const data = { users: [{ id: 1, name: 'John' }] };

            spy.resolvedValue(data);

            const result = await spy();
            expect(result).toEqual(data);
        });

        it('should track async calls properly', async () => {
            const spy = createAsyncSpy('trackAsync');
            spy.resolvedValue('result');

            await spy('arg1');
            await spy('arg2');

            expect(spy.callCount).toBe(2);
            expect(spy.calls[0].args).toEqual(['arg1']);
            expect(spy.calls[1].args).toEqual(['arg2']);
        });
    });

    describe('Async Rejected Values', () => {
        it('should return rejected promise', async () => {
            const spy = createAsyncSpy('rejectSpy');
            const error = new Error('Failed');
            spy.rejectedValue(error);

            try {
                await spy();
                expect(true).toBe(false); // Should not reach
            } catch (e) {
                expect(e).toBe(error);
            }
        });

        it('should reject once then use default', async () => {
            const spy = createAsyncSpy('rejectOnceSpy');
            spy
                .rejectedValueOnce(new Error('First error'))
                .resolvedValue('success');

            try {
                await spy();
                expect(true).toBe(false); // Should not reach
            } catch (e: any) {
                expect(e.message).toBe('First error');
            }

            expect(await spy()).toBe('success');
        });

        it('should support multiple rejections', async () => {
            const spy = createAsyncSpy('multiReject');
            spy.rejectedValues(
                new Error('Error 1'),
                new Error('Error 2')
            );

            try {
                await spy();
                expect(true).toBe(false);
            } catch (e: any) {
                expect(e.message).toBe('Error 1');
            }

            try {
                await spy();
                expect(true).toBe(false);
            } catch (e: any) {
                expect(e.message).toBe('Error 2');
            }
        });

        it('should track rejected calls', async () => {
            const spy = createAsyncSpy('trackReject');
            const error = new Error('Test error');
            spy.rejectedValue(error);

            try {
                await spy('arg');
            } catch (e) {
                // Expected
            }

            expect(spy.callCount).toBe(1);
            expect(spy.calls[0].error).toBe(error);
            expect(spy.calls[0].args).toEqual(['arg']);
        });

        it('should mix resolved and rejected values', async () => {
            const spy = createAsyncSpy('mixedAsync');
            spy
                .resolvedValueOnce('success')
                .rejectedValueOnce(new Error('fail'))
                .resolvedValueOnce('success again');

            expect(await spy()).toBe('success');

            try {
                await spy();
                expect(true).toBe(false);
            } catch (e: any) {
                expect(e.message).toBe('fail');
            }

            expect(await spy()).toBe('success again');
        });
    });

    describe('One-time Fake Implementations', () => {
        it('should call fake once then fallback', () => {
            const spy = createAsyncSpy('fakeSpy');
            spy
                .callFakeOnce((x: number) => x * 2)
                .returnValue(100);

            expect(spy(5)).toBe(10); // 5 * 2
            expect(spy(5)).toBe(100); // default
            expect(spy(5)).toBe(100); // default
        });

        it('should chain multiple fake implementations', () => {
            const spy = createAsyncSpy('multiFake');
            spy
                .callFakeOnce((x: number) => x + 1)
                .callFakeOnce((x: number) => x * 2)
                .callFakeOnce((x: number) => x - 1);

            expect(spy(5)).toBe(6);  // 5 + 1
            expect(spy(5)).toBe(10); // 5 * 2
            expect(spy(5)).toBe(4);  // 5 - 1
            expect(spy(5)).toBe(undefined); // No default
        });

        it('should work with async fake implementations', async () => {
            const spy = createAsyncSpy('asyncFake');
            spy
                .callFakeOnce(async (x: number) => x * 2)
                .resolvedValue(100);

            expect(await spy(5)).toBe(10);
            expect(await spy(5)).toBe(100);
        });
    });

    describe('Clear Methods', () => {
        it('should clear calls but keep configuration', () => {
            const spy = createAsyncSpy('clearCallsSpy');
            spy.returnValue('test');

            spy();
            spy();
            expect(spy.callCount).toBe(2);

            spy.clearCalls();
            expect(spy.callCount).toBe(0);
            expect(spy()).toBe('test'); // Configuration retained
            expect(spy.callCount).toBe(1);
        });

        it('should clear return values and reset to callThrough', () => {
            const originalFn = (x: number) => x * 2;
            const spy = createAsyncSpy('clearReturnSpy', originalFn);
            spy.returnValue(100);

            expect(spy(5)).toBe(100);

            spy.clearReturnValues();
            expect(spy(5)).toBe(10); // Back to original
        });

        it('should clear everything with clearAll', () => {
            const spy = createAsyncSpy('clearAllSpy');
            spy
                .returnValueOnce('once')
                .returnValue('default');

            spy();
            spy();
            expect(spy.callCount).toBe(2);

            spy.clearAll();
            expect(spy.callCount).toBe(0);
            expect(spy()).toBe(undefined); // No configuration
            expect(spy.callCount).toBe(1);
        });

        it('should use one-time queue before default', () => {
            const spy = createAsyncSpy('clearQueueSpy');
            spy
                .returnValueOnce('once')
                .returnValueOnce('twice')
                .returnValue('override'); // Sets default after queue

            expect(spy()).toBe('once');
            expect(spy()).toBe('twice');
            expect(spy()).toBe('override');
        });
    });

    describe('Enhanced Spy on Objects', () => {
        let obj: any;

        beforeEach(() => {
            obj = {
                syncMethod: (x: number) => x * 2,
                asyncMethod: async (x: number) => x * 3,
                throwMethod: () => { throw new Error('Original error'); }
            };
        });

        it('should enhance existing object methods', () => {
            const spy = spyOnAsync(obj, 'syncMethod');
            spy
                .returnValueOnce(100)
                .returnValue(200);

            expect(obj.syncMethod(5)).toBe(100);
            expect(obj.syncMethod(5)).toBe(200);
            expect(spy.callCount).toBe(2);
        });

        it('should work with async object methods', async () => {
            const spy = spyOnAsync(obj, 'asyncMethod');
            spy
                .resolvedValueOnce(100)
                .resolvedValue(200);

            expect(await obj.asyncMethod(5)).toBe(100);
            expect(await obj.asyncMethod(5)).toBe(200);
        });

        it('should preserve this context', () => {
            obj.value = 42;
            obj.getValue = function() { return this.value; };

            const spy = spyOnAsync(obj, 'getValue');
            spy.callThrough();

            expect(obj.getValue()).toBe(42);
            expect(spy.calls[0].thisArg).toBe(obj);
        });
    });

    describe('Enhancing Basic Spies', () => {
        it('should enhance a basic spy with async features', () => {
            const basicSpy = createSpyFunction('basic');
            const asyncSpy = enhanceSpy(basicSpy);

            asyncSpy
                .returnValueOnce('once')
                .resolvedValue('async');

            expect(asyncSpy()).toBe('once');
            expect(asyncSpy()).toBeInstanceOf(Promise);
        });

        it('should preserve original spy functionality', () => {
            const basicSpy = spyOn({ fn: () => 'original' }, 'fn');
            const asyncSpy = enhanceSpy(basicSpy);

            asyncSpy.callThrough();
            expect(asyncSpy()).toBe('original');

            asyncSpy.returnValue('override');
            expect(asyncSpy()).toBe('override');
        });

        it('should maintain spy properties', () => {
            const basicSpy = createSpyFunction('test');
            const asyncSpy = enhanceSpy(basicSpy);

            asyncSpy('arg1');
            asyncSpy('arg2');

            expect(asyncSpy.__isSpy).toBe(true);
            expect(asyncSpy.callCount).toBe(2);
            expect(asyncSpy.called).toBe(true);
            expect(asyncSpy.calledTwice).toBe(true);
        });
    });

    describe('Complex Scenarios', () => {
        it('should handle mixed sequential operations', async () => {
            const spy = createAsyncSpy('complex');

            spy
                .returnValueOnce('sync1')
                .resolvedValueOnce('async1')
                .rejectedValueOnce(new Error('error1'))
                .callFakeOnce((x: number) => x * 10)
                .resolvedValue('default');

            expect(spy()).toBe('sync1');
            expect(await spy()).toBe('async1');

            try {
                await spy();
                expect(true).toBe(false);
            } catch (e: any) {
                expect(e.message).toBe('error1');
            }

            expect(spy(5)).toBe(50);
            expect(await spy()).toBe('default');
        });

        it('should handle promise chaining', async () => {
            const spy = createAsyncSpy('chain');
            spy.resolvedValue({ data: 'test' });

            const result = await spy()
                .then((res: any) => res.data)
                .then((data: string) => data.toUpperCase());

            expect(result).toBe('TEST');
        });

        it('should handle async/await in loops', async () => {
            const spy = createAsyncSpy('loop');
            spy.resolvedValues(1, 2, 3, 4, 5);

            const results = [];
            for (let i = 0; i < 5; i++) {
                results.push(await spy());
            }

            expect(results).toEqual([1, 2, 3, 4, 5]);
            expect(spy.callCount).toBe(5);
        });

        it('should handle concurrent calls', async () => {
            const spy = createAsyncSpy('concurrent');
            spy.resolvedValues('a', 'b', 'c');

            const [r1, r2, r3] = await Promise.all([
                spy(),
                spy(),
                spy()
            ]);

            expect([r1, r2, r3]).toEqual(['a', 'b', 'c']);
        });
    });

    describe('Error Handling', () => {
        it('should handle errors in fake implementations', () => {
            const spy = createAsyncSpy('errorFake');
            spy.callFakeOnce(() => {
                throw new Error('Fake error');
            });

            expect(() => spy()).toThrow('Fake error');
            expect(spy.calls[0].error).toBeDefined();
        });

        it('should handle async errors in fake implementations', async () => {
            const spy = createAsyncSpy('asyncErrorFake');
            spy.callFakeOnce(async () => {
                throw new Error('Async fake error');
            });

            try {
                await spy();
                expect(true).toBe(false);
            } catch (e: any) {
                expect(e.message).toBe('Async fake error');
            }
        });

        it('should not cause unhandled rejection warnings', async () => {
            const spy = createAsyncSpy('noWarning');
            spy.rejectedValue(new Error('Expected rejection'));

            // Call without await or catch - should not cause warning
            const promise = spy();

            // Verify it's actually rejected
            try {
                await promise;
                expect(true).toBe(false);
            } catch (e: any) {
                expect(e.message).toBe('Expected rejection');
            }
        });
    });
});
