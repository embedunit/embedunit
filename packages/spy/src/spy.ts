// src/spy.ts
// Spy functionality for tracking and controlling function calls

import { deepEqual } from '@embedunit/assert';

/**
 * Represents a single call to a spy function.
 * Contains all information about how the function was called.
 */
export interface SpyCall {
    /** Arguments passed to the function */
    args: any[];
    /** Value returned by the function */
    returnValue?: any;
    /** Error thrown by the function */
    error?: any;
    /** The 'this' context when the function was called */
    thisArg: any;
    /** Timestamp when the function was called */
    timestamp: number;
}

/**
 * A spy function that tracks calls and can control return behavior.
 * Created by spyOn() or createSpyFunction().
 *
 * @template T - The type of the function being spied on
 */
export interface Spy<T extends (...args: any[]) => any = (...args: any[]) => any> {
    // Core spy properties
    /** The spy function itself - callable like the original */
    (...args: Parameters<T>): ReturnType<T>;
    /** Internal flag to identify spy objects */
    __isSpy: true;
    /** Array of all calls made to this spy */
    calls: SpyCall[];
    /** Number of times the spy has been called */
    callCount: number;
    /** Reference to the original function */
    originalFunction: T;
    /** The object this method belongs to (if spying on a method) */
    objectRef: any;
    /** The name of the method being spied on */
    methodName: string | symbol;

    // Spy control methods
    restore(): void;
    reset(): void;
    callThrough(): Spy<T>;
    returnValue(value: any): Spy<T>;
    returnValues(...values: any[]): Spy<T>;
    throwError(error: any): Spy<T>;
    callFake(fn: T): Spy<T>;

    // Call inspection
    calledWith(...args: any[]): boolean;
    neverCalledWith(...args: any[]): boolean;
    firstCall(): SpyCall | undefined;
    lastCall(): SpyCall | undefined;
    getCall(index: number): SpyCall | undefined;

    // Getters for common checks
    called: boolean;
    notCalled: boolean;
    calledOnce: boolean;
    calledTwice: boolean;
    calledThrice: boolean;
}

// Registry to track all active spies
const activeSpies = new Set<Spy>();

/**
 * Checks if a value is a spy function.
 * @param value - The value to check
 * @returns True if the value is a spy
 * @example
 * const spy = createSpyFunction();
 * expect(isSpy(spy)).toBe(true);
 */
export function isSpy(value: any): value is Spy {
    return value && value.__isSpy === true;
}

/**
 * Creates a spy on an object's method.
 * The spy will track all calls and can control the method's behavior.
 *
 * @param object - The object containing the method
 * @param method - The name of the method to spy on
 * @returns A spy function that replaces the original method
 *
 * @example
 * ```typescript
 * const api = { fetchData: () => 'real data' };
 * const spy = spyOn(api, 'fetchData');
 * spy.returnValue('mock data');
 *
 * expect(api.fetchData()).toBe('mock data');
 * expect(spy).toHaveBeenCalled();
 *
 * spy.restore(); // Restore original method
 * ```
 */
export function spyOn<T extends object, K extends keyof T>(
    object: T,
    method: K
): T[K] extends (...args: any[]) => any ? Spy<T[K]> : never {
    const descriptor = Object.getOwnPropertyDescriptor(object, method as string | symbol);
    const originalFunction = object[method];

    // Check if it's already a spy
    if (isSpy(originalFunction)) {
        throw new Error(`Method '${String(method)}' is already a spy. Restore it first.`);
    }

    // Check if the property exists and is a function
    if (typeof originalFunction !== 'function' && !descriptor?.get && !descriptor?.set) {
        throw new Error(`Method '${String(method)}' is not a function or accessor`);
    }

    // Handle getter/setter spying
    if (descriptor && (descriptor.get || descriptor.set)) {
        return createAccessorSpy(object, method as string | symbol, descriptor) as any;
    }

    // Create the spy function
    const spy = createSpy(originalFunction as any, object, method as string | symbol);

    // Replace the original method with the spy
    Object.defineProperty(object, method as string | symbol, {
        value: spy,
        configurable: true,
        writable: true,
        enumerable: descriptor?.enumerable ?? true
    });

    activeSpies.add(spy);
    return spy as any;
}

// Create a spy function
function createSpy<T extends (...args: any[]) => any>(
    originalFunction: T,
    objectRef: any,
    methodName: string | symbol
): Spy<T> {
    let strategy: 'callThrough' | 'returnValue' | 'returnValues' | 'throwError' | 'callFake' = 'callThrough';
    let returnValue: any;
    let returnValues: any[] = [];
    let returnValueIndex = 0;
    let errorToThrow: any;
    let fakeImplementation: T;

    const calls: SpyCall[] = [];

    const spy = function(this: any, ...args: any[]) {
        const call: SpyCall = {
            args,
            thisArg: this,
            timestamp: Date.now(),
        };

        try {
            let result: any;

            switch (strategy) {
                case 'callThrough':
                    result = originalFunction.apply(this, args);
                    break;
                case 'returnValue':
                    result = returnValue;
                    break;
                case 'returnValues':
                    result = returnValueIndex < returnValues.length ? returnValues[returnValueIndex] : undefined;
                    returnValueIndex++;
                    break;
                case 'throwError':
                    throw errorToThrow;
                case 'callFake':
                    result = fakeImplementation.apply(this, args);
                    break;
            }

            call.returnValue = result;
            calls.push(call);
            return result;
        } catch (error) {
            call.error = error;
            calls.push(call);
            throw error;
        }
    } as Spy<T>;

    // Core spy properties
    spy.__isSpy = true;
    spy.calls = calls;
    spy.originalFunction = originalFunction;
    spy.objectRef = objectRef;
    spy.methodName = methodName;

    // Define callCount as a getter
    Object.defineProperty(spy, 'callCount', {
        get() { return calls.length; },
        enumerable: true
    });

    // Spy control methods
    spy.restore = function() {
        if (objectRef && methodName) {
            objectRef[methodName] = originalFunction;
        }
        activeSpies.delete(spy);
    };

    spy.reset = function() {
        calls.length = 0;
        returnValueIndex = 0;
    };

    spy.callThrough = function() {
        strategy = 'callThrough';
        return spy;
    };

    spy.returnValue = function(value: any) {
        strategy = 'returnValue';
        returnValue = value;
        return spy;
    };

    spy.returnValues = function(...values: any[]) {
        strategy = 'returnValues';
        returnValues = values;
        returnValueIndex = 0;
        return spy;
    };

    spy.throwError = function(error: any) {
        strategy = 'throwError';
        errorToThrow = error;
        return spy;
    };

    spy.callFake = function(fn: T) {
        strategy = 'callFake';
        fakeImplementation = fn;
        return spy;
    };

    // Call inspection methods
    spy.calledWith = function(...args: any[]) {
        return calls.some(call =>
            args.length === call.args.length &&
            args.every((arg, i) => deepEqual(arg, call.args[i]))
        );
    };

    spy.neverCalledWith = function(...args: any[]) {
        return !spy.calledWith(...args);
    };

    spy.firstCall = function() {
        return calls[0];
    };

    spy.lastCall = function() {
        return calls[calls.length - 1];
    };

    spy.getCall = function(index: number) {
        return calls[index];
    };

    // Define getters for common checks
    Object.defineProperty(spy, 'called', {
        get() { return calls.length > 0; },
        enumerable: true
    });

    Object.defineProperty(spy, 'notCalled', {
        get() { return calls.length === 0; },
        enumerable: true
    });

    Object.defineProperty(spy, 'calledOnce', {
        get() { return calls.length === 1; },
        enumerable: true
    });

    Object.defineProperty(spy, 'calledTwice', {
        get() { return calls.length === 2; },
        enumerable: true
    });

    Object.defineProperty(spy, 'calledThrice', {
        get() { return calls.length === 3; },
        enumerable: true
    });

    return spy;
}

// Create spy for getter/setter
function createAccessorSpy<T extends object>(
    object: T,
    property: string | symbol,
    descriptor: PropertyDescriptor
): Spy {
    const getterSpy = descriptor.get ? createSpy(descriptor.get as any, object, property) : undefined;
    const setterSpy = descriptor.set ? createSpy(descriptor.set as any, object, property) : undefined;

    // Create a combined spy that tracks both getter and setter
    const accessorSpy: any = {
        __isSpy: true,
        get: getterSpy,
        set: setterSpy,
        restore() {
            Object.defineProperty(object, property, descriptor);
            activeSpies.delete(this);
        },
        reset() {
            getterSpy?.reset();
            setterSpy?.reset();
        }
    };

    // Replace the property with spied getter/setter
    Object.defineProperty(object, property, {
        get: getterSpy,
        set: setterSpy,
        configurable: true,
        enumerable: descriptor.enumerable
    });

    activeSpies.add(accessorSpy);
    return accessorSpy;
}

// Note: deepEqual is imported from '@embedunit/assert' at the top of this file
// It handles Date objects, RegExp, arrays, and other special cases properly

/**
 * Restores all active spies to their original implementations.
 * Useful for cleanup in afterEach hooks.
 *
 * @example
 * ```typescript
 * afterEach(() => {
 *   restoreAllSpies();
 * });
 * ```
 */
export function restoreAllSpies(): void {
    for (const spy of activeSpies) {
        spy.restore();
    }
    activeSpies.clear();
}

/**
 * Creates a standalone spy function not attached to any object.
 * Useful for creating mock functions from scratch.
 *
 * @param name - Optional name for the spy (for debugging)
 * @param originalFn - Optional original function to wrap
 * @returns A spy function
 *
 * @example
 * ```typescript
 * const callback = createSpyFunction('myCallback');
 * callback.returnValue('mocked');
 *
 * someFunction(callback);
 *
 * expect(callback).toHaveBeenCalledTimes(1);
 * expect(callback.calls[0].args).toEqual(['expected', 'args']);
 * ```
 */
export function createSpyFunction<T extends (...args: any[]) => any = (...args: any[]) => any>(
    name?: string,
    originalFn?: T
): Spy<T> {
    const fn = originalFn || ((() => undefined) as T);
    return createSpy(fn, null, name || 'spy');
}
