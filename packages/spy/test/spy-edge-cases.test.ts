// test/spy-edge-cases.test.ts
import { describe, it } from '@embedunit/core';
import { expect } from '@embedunit/assert';
import { spyOn, createSpyFunction, restoreAllSpies } from '../src';

describe('Spy Edge Cases and Additional Coverage', () => {

    describe('Chaining behavior', () => {
        it('should support method chaining when switching strategies', () => {
            const obj = { method: () => 'original' };
            const spy = spyOn(obj, 'method');

            // Chain multiple strategy changes
            spy.returnValue('first')
               .callFake(() => 'fake')
               .throwError(new Error('error'))
               .callThrough()
               .returnValue('final');

            expect(obj.method()).toBe('final');
        });

        it('should maintain spy reference through chaining', () => {
            const obj = { method: () => {} };
            const spy = spyOn(obj, 'method');

            const chained = spy.returnValue(1).callThrough().returnValue(2);
            expect(chained).toBe(spy);
        });
    });

    describe('Async function spying', () => {
        it('should spy on async functions', async () => {
            const obj = {
                async fetchData(id: number): Promise<string> {
                    return `data-${id}`;
                }
            };

            const spy = spyOn(obj, 'fetchData');

            const result = await obj.fetchData(123);
            expect(result).toBe('data-123');
            expect(spy.called).toBe(true);
            expect(spy.calls[0].args).toEqual([123]);
        });

        it('should track successful async returns', async () => {
            const obj = {
                async process(value: string): Promise<string> {
                    return `processed-${value}`;
                }
            };

            const spy = spyOn(obj, 'process');

            const result = await obj.process('test');

            // The spy tracks the promise itself as the return value
            expect(result).toBe('processed-test');
            expect(spy.calls[0].returnValue).toBeInstanceOf(Promise);
            expect(spy.called).toBe(true);
        });

        it('should override async return with returnValue', async () => {
            const obj = {
                async getData(): Promise<number> {
                    return 42;
                }
            };

            const spy = spyOn(obj, 'getData');
            spy.returnValue(Promise.resolve(100));

            const result = await obj.getData();
            expect(result).toBe(100);
        });
    });

    describe('Symbol property spying', () => {
        it('should spy on symbol properties', () => {
            const sym = Symbol('testMethod');
            const obj = {
                [sym]: (x: number) => x * 2
            };

            const spy = spyOn(obj, sym);

            const result = obj[sym](5);
            expect(result).toBe(10);
            expect(spy.called).toBe(true);
        });
    });

    describe('Prototype chain spying', () => {
        it('should spy on inherited methods', () => {
            class Base {
                baseMethod() { return 'base'; }
            }

            class Derived extends Base {
                derivedMethod() { return 'derived'; }
            }

            const instance = new Derived();
            const spy = spyOn(instance, 'baseMethod');

            const result = instance.baseMethod();
            expect(result).toBe('base');
            expect(spy.called).toBe(true);
        });
    });

    describe('Edge cases with special values', () => {
        it('should handle NaN arguments and returns', () => {
            const obj = { method: (x: number) => x };
            const spy = spyOn(obj, 'method');

            const result = obj.method(NaN);
            expect(isNaN(result)).toBe(true);
            expect(isNaN(spy.calls[0].args[0])).toBe(true);
            expect(isNaN(spy.calls[0].returnValue)).toBe(true);
        });

        it('should handle null and undefined distinctly', () => {
            const obj = { method: (x: any) => x };
            const spy = spyOn(obj, 'method');

            obj.method(null);
            obj.method(undefined);

            expect(spy.calls[0].args[0]).toBe(null);
            expect(spy.calls[1].args[0]).toBe(undefined);
            expect(spy.calledWith(null)).toBe(true);
            expect(spy.calledWith(undefined)).toBe(true);
        });

        it('should handle circular references in arguments', () => {
            const obj = { method: (x: any) => x };
            const spy = spyOn(obj, 'method');

            const circular: any = { a: 1 };
            circular.self = circular;

            obj.method(circular);
            expect(spy.calls[0].args[0]).toBe(circular);
            expect(spy.called).toBe(true);
        });
    });

    describe('Multiple consecutive spying', () => {
        it('should allow re-spying after restore', () => {
            const obj = { method: () => 'original' };

            const spy1 = spyOn(obj, 'method');
            spy1.returnValue('spy1');
            expect(obj.method()).toBe('spy1');

            spy1.restore();
            expect(obj.method()).toBe('original');

            const spy2 = spyOn(obj, 'method');
            spy2.returnValue('spy2');
            expect(obj.method()).toBe('spy2');
        });
    });

    describe('Empty and edge case returns', () => {
        it('should handle empty string returns', () => {
            const obj = { method: () => '' };
            const spy = spyOn(obj, 'method');

            const result = obj.method();
            expect(result).toBe('');
            expect(spy.calls[0].returnValue).toBe('');
        });

        it('should handle zero returns', () => {
            const obj = { method: () => 0 };
            const spy = spyOn(obj, 'method');

            const result = obj.method();
            expect(result).toBe(0);
            expect(spy.calls[0].returnValue).toBe(0);
        });

        it('should handle false returns', () => {
            const obj = { method: () => false };
            const spy = spyOn(obj, 'method');

            const result = obj.method();
            expect(result).toBe(false);
            expect(spy.calls[0].returnValue).toBe(false);
        });
    });

    describe('Spy on methods with default parameters', () => {
        it('should track default parameter usage', () => {
            const obj = {
                method: (x: number = 10, y: string = 'default') => `${x}-${y}`
            };
            const spy = spyOn(obj, 'method');

            obj.method();
            obj.method(20);
            obj.method(30, 'custom');

            expect(spy.calls[0].args).toEqual([]);
            expect(spy.calls[1].args).toEqual([20]);
            expect(spy.calls[2].args).toEqual([30, 'custom']);
        });
    });

    describe('Spy on methods with rest parameters', () => {
        it('should track rest parameters', () => {
            const obj = {
                method: (...args: number[]) => args.reduce((a, b) => a + b, 0)
            };
            const spy = spyOn(obj, 'method');

            obj.method();
            obj.method(1);
            obj.method(1, 2, 3, 4, 5);

            expect(spy.calls[0].args).toEqual([]);
            expect(spy.calls[1].args).toEqual([1]);
            expect(spy.calls[2].args).toEqual([1, 2, 3, 4, 5]);
            expect(spy.calls[2].returnValue).toBe(15);
        });
    });

    describe('returnValues edge cases', () => {
        it('should handle empty returnValues array', () => {
            const obj = { method: () => 'original' };
            const spy = spyOn(obj, 'method');

            spy.returnValues(); // No values provided

            expect(obj.method()).toBeUndefined();
            expect(obj.method()).toBeUndefined();
        });

        it('should handle single returnValues', () => {
            const obj = { method: () => 'original' };
            const spy = spyOn(obj, 'method');

            spy.returnValues(42);

            expect(obj.method()).toBe(42);
            expect(obj.method()).toBeUndefined(); // Returns undefined after exhausting values
            expect(obj.method()).toBeUndefined();
        });
    });

    describe('Concurrent spy operations', () => {
        it('should handle multiple spies being restored simultaneously', () => {
            const obj1 = { method: () => 1 };
            const obj2 = { method: () => 2 };
            const obj3 = { method: () => 3 };

            const spy1 = spyOn(obj1, 'method');
            const spy2 = spyOn(obj2, 'method');
            const spy3 = spyOn(obj3, 'method');

            spy1.returnValue(10);
            spy2.returnValue(20);
            spy3.returnValue(30);

            // Restore in different order
            spy2.restore();
            expect(obj2.method()).toBe(2);

            spy3.restore();
            expect(obj3.method()).toBe(3);

            spy1.restore();
            expect(obj1.method()).toBe(1);
        });
    });

    describe('Spy timestamps', () => {
        it('should track call timestamps', async () => {
            const obj = { method: () => {} };
            const spy = spyOn(obj, 'method');

            const time1 = Date.now();
            obj.method();

            // Wait a bit before second call
            await new Promise(resolve => setTimeout(resolve, 10));

            obj.method();

            expect(spy.calls[0].timestamp).toBeGreaterThanOrEqual(time1);
            expect(spy.calls[1].timestamp).toBeGreaterThan(spy.calls[0].timestamp);
        });
    });

    describe('Property descriptor edge cases', () => {
        it('should preserve non-enumerable property status', () => {
            const obj: any = {};
            Object.defineProperty(obj, 'method', {
                value: () => 'original',
                enumerable: false,
                configurable: true,
                writable: true
            });

            const spy = spyOn(obj, 'method');

            const descriptor = Object.getOwnPropertyDescriptor(obj, 'method');
            expect(descriptor?.enumerable).toBe(false);

            spy.restore();

            const restoredDescriptor = Object.getOwnPropertyDescriptor(obj, 'method');
            expect(restoredDescriptor?.enumerable).toBe(false);
        });
    });

    describe('Error handling in callFake', () => {
        it('should track errors thrown by fake implementation', () => {
            const obj = { method: () => 'original' };
            const spy = spyOn(obj, 'method');

            spy.callFake(() => {
                throw new Error('Fake error');
            });

            try {
                obj.method();
            } catch (e) {
                // Expected
            }

            expect(spy.calls[0].error).toBeDefined();
            expect(spy.calls[0].error.message).toBe('Fake error');
        });
    });

    describe('Deep equality in calledWith', () => {
        it('should use deep equality for object arguments', () => {
            const obj = { method: (data: any) => {} };
            const spy = spyOn(obj, 'method');

            obj.method({ a: 1, b: { c: 2 } });

            expect(spy.calledWith({ a: 1, b: { c: 2 } })).toBe(true);
            expect(spy.calledWith({ a: 1, b: { c: 3 } })).toBe(false);
        });

        it('should handle Date objects in arguments', () => {
            const obj = { method: (date: Date) => {} };
            const spy = spyOn(obj, 'method');

            const date = new Date('2025-01-01');
            obj.method(date);

            // Same reference should match
            expect(spy.calledWith(date)).toBe(true);

            // Different Date instance with same value should also match
            // because we use proper deepEqual that compares Date by value
            const sameDate = new Date('2025-01-01');
            expect(spy.calledWith(sameDate)).toBe(true);

            // Different date should not match
            expect(spy.calledWith(new Date('2025-01-02'))).toBe(false);
        });
    });

    describe('Standalone spy functions', () => {
        it('should create spy with custom name', () => {
            const spy = createSpyFunction('customSpy');

            expect(spy.methodName).toBe('customSpy');
            spy(1, 2, 3);
            expect(spy.callCount).toBe(1);
        });

        it('should create spy with original function', () => {
            const original = (x: number) => x * 2;
            const spy = createSpyFunction('withOriginal', original);

            const result = spy(5);
            expect(result).toBe(10);
            expect(spy.called).toBe(true);
        });

        it('should work with all spy methods', () => {
            const spy = createSpyFunction();

            spy.returnValue(42);
            expect(spy()).toBe(42);

            spy.reset();
            expect(spy.callCount).toBe(0);

            spy.throwError(new Error('Test'));
            expect(() => spy()).toThrow('Test');
        });
    });
});
