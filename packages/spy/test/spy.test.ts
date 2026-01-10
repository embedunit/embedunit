// test/spy.test.ts
import { describe, it, beforeEach, afterEach } from '@embedunit/core';
import { expect } from '@embedunit/assert';
import { spyOn, createSpyFunction, restoreAllSpies } from '../src';

describe('Spy Functionality', () => {

    describe('Basic spy creation and restoration', () => {
        it('should create a spy on an object method', () => {
            const obj = {
                method: (x: number) => x * 2
            };

            const spy = spyOn(obj, 'method');
            expect(spy.__isSpy).toBe(true);
            expect(spy.originalFunction).toBeDefined();
        });

        it('should restore the original method', () => {
            const originalMethod = (x: number) => x * 2;
            const obj = { method: originalMethod };

            const spy = spyOn(obj, 'method');
            obj.method(5);
            expect(spy.called).toBe(true);

            spy.restore();
            expect(obj.method).toBe(originalMethod);
        });

        it('should throw error when spying on non-existent method', () => {
            const obj: any = { existing: () => {} };

            expect(() => spyOn(obj, 'nonExistent')).toThrow();
        });

        it('should throw error when spying on already spied method', () => {
            const obj = { method: () => {} };

            spyOn(obj, 'method');
            expect(() => spyOn(obj, 'method')).toThrow();
        });

        it('should create standalone spy function', () => {
            const spy = createSpyFunction('testSpy');

            expect(spy.__isSpy).toBe(true);
            expect(spy.methodName).toBe('testSpy');

            spy(1, 2, 3);
            expect(spy.called).toBe(true);
            expect(spy.callCount).toBe(1);
        });
    });

    describe('Call tracking', () => {
        it('should track call count', () => {
            const obj = { method: () => {} };
            const spy = spyOn(obj, 'method');

            expect(spy.callCount).toBe(0);
            expect(spy.notCalled).toBe(true);

            obj.method();
            expect(spy.callCount).toBe(1);
            expect(spy.calledOnce).toBe(true);

            obj.method();
            expect(spy.callCount).toBe(2);
            expect(spy.calledTwice).toBe(true);

            obj.method();
            expect(spy.callCount).toBe(3);
            expect(spy.calledThrice).toBe(true);
        });

        it('should track call arguments', () => {
            const obj = { method: (x: number, _y: string) => x };
            const spy = spyOn(obj, 'method');

            obj.method(42, 'hello');
            obj.method(10, 'world');

            expect(spy.calls.length).toBe(2);
            expect(spy.calls[0].args).toEqual([42, 'hello']);
            expect(spy.calls[1].args).toEqual([10, 'world']);
        });

        it('should track this context', () => {
            const obj = {
                value: 100,
                method: function() { return this.value; }
            };
            const spy = spyOn(obj, 'method');

            obj.method();
            expect(spy.calls[0].thisArg).toBe(obj);

            const other = { value: 200 };
            obj.method.call(other);
            expect(spy.calls[1].thisArg).toBe(other);
        });

        it('should track return values', () => {
            const obj = { method: (x: number) => x * 2 };
            const spy = spyOn(obj, 'method');

            obj.method(5);
            obj.method(10);

            expect(spy.calls[0].returnValue).toBe(10);
            expect(spy.calls[1].returnValue).toBe(20);
        });

        it('should track thrown errors', () => {
            const obj = {
                method: (shouldThrow: boolean) => {
                    if (shouldThrow) throw new Error('Test error');
                    return 'success';
                }
            };
            const spy = spyOn(obj, 'method');

            obj.method(false);
            expect(spy.calls[0].error).toBeUndefined();
            expect(spy.calls[0].returnValue).toBe('success');

            try {
                obj.method(true);
            } catch (e) {
                // Expected
            }
            expect(spy.calls[1].error).toBeDefined();
            expect(spy.calls[1].error.message).toBe('Test error');
        });
    });

    describe('callThrough behavior', () => {
        it('should call original function by default', () => {
            const obj = { method: (x: number) => x * 2 };
            const spy = spyOn(obj, 'method');

            const result = obj.method(5);
            expect(result).toBe(10);
            expect(spy.called).toBe(true);
        });

        it('should explicitly set callThrough', () => {
            const obj = { method: (x: number) => x * 2 };
            const spy = spyOn(obj, 'method');

            spy.returnValue(999).callThrough();

            const result = obj.method(5);
            expect(result).toBe(10); // Original function called
        });
    });

    describe('returnValue override', () => {
        it('should override return value', () => {
            const obj = { method: (x: number) => x * 2 };
            const spy = spyOn(obj, 'method');

            spy.returnValue(42);

            expect(obj.method(5)).toBe(42);
            expect(obj.method(10)).toBe(42);
            expect(spy.callCount).toBe(2);
        });

        it('should support returnValues for sequential returns', () => {
            const obj = { method: () => 0 };
            const spy = spyOn(obj, 'method');

            spy.returnValues(1, 2, 3);

            expect(obj.method()).toBe(1);
            expect(obj.method()).toBe(2);
            expect(obj.method()).toBe(3);
            expect(obj.method()).toBe(3); // Stays at last value
        });
    });

    describe('throwError behavior', () => {
        it('should throw specified error', () => {
            const obj = { method: () => 'normal' };
            const spy = spyOn(obj, 'method');

            spy.throwError(new Error('Spy error'));

            expect(() => obj.method()).toThrow('Spy error');
            expect(spy.called).toBe(true);
        });

        it('should track thrown errors in calls', () => {
            const obj = { method: () => 'normal' };
            const spy = spyOn(obj, 'method');

            spy.throwError(new Error('Test'));

            try {
                obj.method();
            } catch (e) {
                // Expected
            }

            expect(spy.calls[0].error).toBeDefined();
            expect(spy.calls[0].error.message).toBe('Test');
        });
    });

    describe('callFake implementation', () => {
        it('should use fake implementation', () => {
            const obj = { method: (x: number) => x * 2 };
            const spy = spyOn(obj, 'method');

            spy.callFake((x: number) => x + 100);

            expect(obj.method(5)).toBe(105);
            expect(obj.method(10)).toBe(110);
        });

        it('should track calls with fake implementation', () => {
            const obj = { method: (x: number) => x };
            const spy = spyOn(obj, 'method');

            let callCount = 0;
            spy.callFake((x: number) => {
                callCount++;
                return x * callCount;
            });

            expect(obj.method(5)).toBe(5);  // 5 * 1
            expect(obj.method(5)).toBe(10); // 5 * 2
            expect(spy.callCount).toBe(2);
        });
    });

    describe('Call inspection methods', () => {
        it('should check calledWith', () => {
            const obj = { method: (x: number, y: string) => {} };
            const spy = spyOn(obj, 'method');

            obj.method(42, 'hello');
            obj.method(10, 'world');

            expect(spy.calledWith(42, 'hello')).toBe(true);
            expect(spy.calledWith(10, 'world')).toBe(true);
            expect(spy.calledWith(99, 'test')).toBe(false);
        });

        it('should check neverCalledWith', () => {
            const obj = { method: (x: number) => {} };
            const spy = spyOn(obj, 'method');

            obj.method(1);
            obj.method(2);

            expect(spy.neverCalledWith(3)).toBe(true);
            expect(spy.neverCalledWith(1)).toBe(false);
        });

        it('should get firstCall and lastCall', () => {
            const obj = { method: (x: number) => x };
            const spy = spyOn(obj, 'method');

            obj.method(1);
            obj.method(2);
            obj.method(3);

            expect(spy.firstCall()?.args).toEqual([1]);
            expect(spy.lastCall()?.args).toEqual([3]);
        });

        it('should get specific call by index', () => {
            const obj = { method: (x: number) => x };
            const spy = spyOn(obj, 'method');

            obj.method(10);
            obj.method(20);
            obj.method(30);

            expect(spy.getCall(0)?.args).toEqual([10]);
            expect(spy.getCall(1)?.args).toEqual([20]);
            expect(spy.getCall(2)?.args).toEqual([30]);
            expect(spy.getCall(3)).toBeUndefined();
        });
    });

    describe('Spy assertions with expect', () => {
        it('should use toHaveBeenCalled', () => {
            const obj = { method: () => {} };
            const spy = spyOn(obj, 'method');

            expect(spy).not.toHaveBeenCalled();

            obj.method();
            expect(spy).toHaveBeenCalled();
            expect(spy).toBeCalled(); // Alias
        });

        it('should use toHaveBeenCalledTimes', () => {
            const obj = { method: () => {} };
            const spy = spyOn(obj, 'method');

            expect(spy).toHaveBeenCalledTimes(0);

            obj.method();
            obj.method();
            expect(spy).toHaveBeenCalledTimes(2);
        });

        it('should use toHaveBeenCalledWith', () => {
            const obj = { method: (x: number, y: string) => {} };
            const spy = spyOn(obj, 'method');

            obj.method(42, 'test');

            expect(spy).toHaveBeenCalledWith(42, 'test');
            expect(spy).not.toHaveBeenCalledWith(99, 'other');
        });

        it('should use toHaveBeenLastCalledWith', () => {
            const obj = { method: (x: number) => {} };
            const spy = spyOn(obj, 'method');

            obj.method(1);
            obj.method(2);
            obj.method(3);

            expect(spy).toHaveBeenLastCalledWith(3);
            expect(spy).not.toHaveBeenLastCalledWith(2);
        });

        it('should use toHaveReturned', () => {
            const obj = {
                method: (shouldThrow: boolean) => {
                    if (shouldThrow) throw new Error('Test');
                    return 'success';
                }
            };
            const spy = spyOn(obj, 'method');

            try {
                obj.method(true);
            } catch (e) {}

            expect(spy).not.toHaveReturned();

            obj.method(false);
            expect(spy).toHaveReturned();
        });

        it('should use toHaveReturnedWith', () => {
            const obj = { method: (x: number) => x * 2 };
            const spy = spyOn(obj, 'method');

            obj.method(5);
            obj.method(10);

            expect(spy).toHaveReturnedWith(10);
            expect(spy).toHaveReturnedWith(20);
            expect(spy).not.toHaveReturnedWith(30);
        });
    });

    describe('Reset functionality', () => {
        it('should reset spy calls', () => {
            const obj = { method: (x: number) => x };
            const spy = spyOn(obj, 'method');

            obj.method(1);
            obj.method(2);
            expect(spy.callCount).toBe(2);

            spy.reset();
            expect(spy.callCount).toBe(0);
            expect(spy.calls).toEqual([]);

            obj.method(3);
            expect(spy.callCount).toBe(1);
            expect(spy.calls[0].args).toEqual([3]);
        });
    });

    describe('Multiple spies on same object', () => {
        it('should support multiple spies on different methods', () => {
            const obj = {
                method1: (x: number) => x,
                method2: (y: string) => y
            };

            const spy1 = spyOn(obj, 'method1');
            const spy2 = spyOn(obj, 'method2');

            obj.method1(42);
            obj.method2('hello');

            expect(spy1.callCount).toBe(1);
            expect(spy2.callCount).toBe(1);
            expect(spy1.calls[0].args).toEqual([42]);
            expect(spy2.calls[0].args).toEqual(['hello']);
        });
    });

    describe('Spy on getters and setters', () => {
        it('should spy on getter', () => {
            const obj = {
                _value: 42,
                get value() { return this._value; }
            };

            const spy = spyOn(obj, 'value') as any;

            const val = obj.value;
            expect(val).toBe(42);
            expect(spy.get?.called).toBe(true);
        });

        it('should spy on setter', () => {
            const obj = {
                _value: 0,
                set value(v: number) { this._value = v; }
            };

            const spy = spyOn(obj, 'value') as any;

            obj.value = 100;
            expect(spy.set?.called).toBe(true);
            expect(spy.set?.calls[0].args).toEqual([100]);
        });
    });

    describe('restoreAllSpies', () => {
        it('should restore all active spies', () => {
            const obj1 = { method: () => 1 };
            const obj2 = { method: () => 2 };

            const spy1 = spyOn(obj1, 'method');
            const spy2 = spyOn(obj2, 'method');

            spy1.returnValue(100);
            spy2.returnValue(200);

            expect(obj1.method()).toBe(100);
            expect(obj2.method()).toBe(200);

            restoreAllSpies();

            expect(obj1.method()).toBe(1);
            expect(obj2.method()).toBe(2);
        });
    });

    describe('Edge cases', () => {
        it('should handle spying on methods that return undefined', () => {
            const obj = { method: () => undefined };
            const spy = spyOn(obj, 'method');

            const result = obj.method();
            expect(result).toBeUndefined();
            expect(spy.called).toBe(true);
        });

        it('should handle spying on methods with complex arguments', () => {
            const obj = { method: (a: any[]) => a.length };
            const spy = spyOn(obj, 'method');

            const arr = [1, 2, 3];
            obj.method(arr);

            expect(spy.calledWith(arr)).toBe(true);
            expect(spy.calledWith([1, 2, 3])).toBe(true); // Deep equality
        });

        it('should maintain method context when using arrow functions', () => {
            class TestClass {
                value = 100;
                arrowMethod = () => this.value;
                regularMethod() { return this.value; }
            }

            const instance = new TestClass();
            const spy1 = spyOn(instance, 'arrowMethod');
            const spy2 = spyOn(instance, 'regularMethod');

            expect(instance.arrowMethod()).toBe(100);
            expect(instance.regularMethod()).toBe(100);

            expect(spy1.called).toBe(true);
            expect(spy2.called).toBe(true);
        });
    });
});
