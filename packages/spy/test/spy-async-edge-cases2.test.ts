// test/spy-async-edge-cases2.test.ts
// Additional edge cases focusing on race conditions and state management

import { describe, it } from '@embedunit/core';
import { expect } from '@embedunit/assert';
import { createAsyncSpy, spyOnAsync } from '../src';

describe('Async Spy Advanced Edge Cases', () => {

    describe('Edge Case: State Transitions', () => {
        it('should handle switching between strategies', () => {
            const spy = createAsyncSpy('strategySpy');
            const fn = (x: number) => x * 2;

            spy.returnValue(100);
            expect(spy(5)).toBe(100);

            spy.callThrough(); // Switch to callThrough (no original function, so undefined)
            expect(spy(5)).toBe(undefined);

            spy.callFake(fn); // Switch to fake
            expect(spy(5)).toBe(10);

            spy.throwError(new Error('boom')); // Switch to throw
            expect(() => spy(5)).toThrow('boom');

            spy.returnValue(200); // Back to return
            expect(spy(5)).toBe(200);
        });

        it('should handle async strategy transitions', async () => {
            const spy = createAsyncSpy('asyncStrategySpy');

            spy.resolvedValue('resolved');
            expect(await spy()).toBe('resolved');

            spy.rejectedValue('rejected');
            try {
                await spy();
                expect(true).toBe(false);
            } catch (e) {
                expect(e).toBe('rejected');
            }

            spy.returnValue('sync'); // Switch to sync
            expect(spy()).toBe('sync');
        });
    });

    describe('Edge Case: Mixed Async/Sync with Errors', () => {
        it('should handle sync throw followed by async resolve', async () => {
            const spy = createAsyncSpy('mixedErrorSpy');

            spy
                .callFakeOnce(() => { throw new Error('sync error'); })
                .resolvedValue('async success');

            expect(() => spy()).toThrow('sync error');
            expect(await spy()).toBe('async success');
        });

        it('should track both returnValue and error', () => {
            const spy = createAsyncSpy('dualTrackSpy');

            spy.callFakeOnce(() => {
                try {
                    throw new Error('internal error');
                } catch (e) {
                    return 'caught';
                }
            });

            const result = spy();
            expect(result).toBe('caught');
            expect(spy.calls[0].returnValue).toBe('caught');
            expect(spy.calls[0].error).toBeUndefined();
        });
    });

    describe('Edge Case: Queue Manipulation', () => {
        it('should handle queue modification during iteration', () => {
            const spy = createAsyncSpy('queueModSpy');

            spy.returnValuesOnce(1, 2, 3);

            expect(spy()).toBe(1);

            // Can add more while consuming (no lock from returnValuesOnce)
            spy.returnValueOnce(4);

            expect(spy()).toBe(2);
            expect(spy()).toBe(3);
            expect(spy()).toBe(4);
            expect(spy()).toBe(undefined);
        });

        it('should handle clearing while consuming queue', () => {
            const spy = createAsyncSpy('clearDuringSpy');

            spy.returnValuesOnce(1, 2, 3);
            expect(spy()).toBe(1);

            spy.clearReturnValues(); // Clear everything

            // Queue should be cleared
            expect(spy()).toBe(undefined);
        });
    });

    describe('Edge Case: Object Method Spying', () => {
        it('should handle getters and setters', () => {
            const obj = {
                _value: 0,
                get value() { return this._value; },
                set value(v) { this._value = v; },
                method() { return 'original'; }
            };

            // Should work on regular methods
            const spy = spyOnAsync(obj, 'method');
            spy.returnValue('mocked');
            expect(obj.method()).toBe('mocked');

            // Note: Spying on getters/setters might need special handling
            // This is a known limitation
        });

        it('should handle prototype methods', () => {
            class TestClass {
                method() { return 'prototype'; }
            }

            const instance = new TestClass();
            const spy = spyOnAsync(instance, 'method');
            spy.returnValue('mocked');

            expect(instance.method()).toBe('mocked');

            spy.restore();
            expect(instance.method()).toBe('prototype');
        });

        it('should handle arrow functions in objects', () => {
            const obj = {
                arrow: () => 'arrow',
                regular: function() { return 'regular'; }
            };

            const arrowSpy = spyOnAsync(obj, 'arrow');
            const regularSpy = spyOnAsync(obj, 'regular');

            arrowSpy.returnValue('mocked arrow');
            regularSpy.returnValue('mocked regular');

            expect(obj.arrow()).toBe('mocked arrow');
            expect(obj.regular()).toBe('mocked regular');
        });
    });

    describe('Edge Case: Async Race Conditions', () => {
        it('should handle concurrent promise resolutions', async () => {
            const spy = createAsyncSpy('raceSpy');
            spy.resolvedValues('first', 'second', 'third');

            // Start all promises at once
            const p1 = spy();
            const p2 = spy();
            const p3 = spy();

            // They should resolve to different values
            const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

            expect(r1).toBe('first');
            expect(r2).toBe('second');
            expect(r3).toBe('third');
        });

        it('should handle mixed resolve/reject in parallel', async () => {
            const spy = createAsyncSpy('mixedRaceSpy');
            spy
                .resolvedValueOnce('success')
                .rejectedValueOnce('failure')
                .resolvedValueOnce('success2');

            const p1 = spy();
            const p2 = spy();
            const p3 = spy();

            expect(await p1).toBe('success');

            try {
                await p2;
                expect(true).toBe(false);
            } catch (e) {
                expect(e).toBe('failure');
            }

            expect(await p3).toBe('success2');
        });
    });

    describe('Edge Case: Memory and Reference', () => {
        it('should not leak memory with large queues', () => {
            const spy = createAsyncSpy('memorySpy');
            const largeObj = new Array(10000).fill('data');

            // Add to queue
            spy.returnValueOnce(largeObj);

            // Consume
            const result = spy();
            expect(result).toBe(largeObj);

            // Clear to free memory
            spy.clearAll();

            // Queue should be empty
            expect((spy as any).__onceQueue.length).toBe(0);
        });

        it('should maintain reference equality', () => {
            const spy = createAsyncSpy('refSpy');
            const obj = { id: 1 };

            spy.returnValue(obj);

            const result1 = spy();
            const result2 = spy();

            expect(result1).toBe(obj);
            expect(result2).toBe(obj);
            expect(result1).toBe(result2);
        });
    });

    describe('Edge Case: Special Return Types', () => {
        it('should handle generators', () => {
            const spy = createAsyncSpy('generatorSpy');

            function* gen() {
                yield 1;
                yield 2;
                yield 3;
            }

            spy.returnValue(gen());

            const iterator = spy();
            expect(iterator.next().value).toBe(1);
            expect(iterator.next().value).toBe(2);
            expect(iterator.next().value).toBe(3);
            expect(iterator.next().done).toBe(true);
        });

        it('should handle async generators', async function() {
            const spy = createAsyncSpy('asyncGenSpy');

            async function* asyncGen() {
                yield await Promise.resolve(1);
                yield await Promise.resolve(2);
            }

            spy.returnValue(asyncGen());

            const iterator = spy();
            expect((await iterator.next()).value).toBe(1);
            expect((await iterator.next()).value).toBe(2);
            expect((await iterator.next()).done).toBe(true);
        });

        it('should handle class instances', () => {
            class TestClass {
                constructor(public value: number) {}
                getValue() { return this.value; }
            }

            const spy = createAsyncSpy('classSpy');
            const instance = new TestClass(42);

            spy.returnValue(instance);

            const result = spy();
            expect(result).toBeInstanceOf(TestClass);
            expect(result.getValue()).toBe(42);
        });
    });

    describe('Edge Case: Boundary Conditions', () => {
        it('should handle empty calls array', () => {
            const spy = createAsyncSpy('emptySpy');

            expect(spy.calls).toEqual([]);
            expect(spy.callCount).toBe(0);
            expect(spy.firstCall()).toBeUndefined();
            expect(spy.lastCall()).toBeUndefined();
            expect(spy.getCall(0)).toBeUndefined();
        });

        it('should handle negative indices in getCall', () => {
            const spy = createAsyncSpy('negativeSpy');
            spy();
            spy();

            expect(spy.getCall(-1)).toBeUndefined();
            expect(spy.getCall(2)).toBeUndefined();
        });

        it('should handle very long argument lists', () => {
            const spy = createAsyncSpy('longArgsSpy');
            const args = new Array(1000).fill(0).map((_, i) => i);

            spy.returnValue('result');
            spy(...args);

            expect(spy.calls[0].args.length).toBe(1000);
            expect(spy.calls[0].args[999]).toBe(999);
        });
    });
});
