// src/spy-async.ts
// Advanced spy features for async mocking and sequential returns

import { Spy, SpyCall, createSpyFunction } from './spy';

/**
 * Enhanced spy interface with async and sequential mocking capabilities
 */
export interface AsyncSpy<T extends (...args: any[]) => any = (...args: any[]) => any> extends Spy<T> {
    // Sequential return values
    returnValueOnce(value: any): AsyncSpy<T>;
    returnValuesOnce(...values: any[]): AsyncSpy<T>;

    // Async mocking
    resolvedValue(value: any): AsyncSpy<T>;
    resolvedValueOnce(value: any): AsyncSpy<T>;
    resolvedValues(...values: any[]): AsyncSpy<T>;
    rejectedValue(error: any): AsyncSpy<T>;
    rejectedValueOnce(error: any): AsyncSpy<T>;
    rejectedValues(...errors: any[]): AsyncSpy<T>;

    // Enhanced fake implementations
    callFakeOnce(fn: T): AsyncSpy<T>;

    // Clear methods
    clearCalls(): AsyncSpy<T>;
    clearReturnValues(): AsyncSpy<T>;
    clearAll(): AsyncSpy<T>;

    // Internal queue (not exposed in interface but used internally)
    __onceQueue?: QueueItem[];
    __defaultStrategy?: string;
    __defaultValue?: any;
    __defaultFn?: Function;
}

/**
 * Queue item for sequential behavior
 */
interface QueueItem {
    type: 'returnValue' | 'resolvedValue' | 'rejectedValue' | 'callFake' | 'throwError';
    value?: any;
    fn?: Function;
}

/**
 * Create a standalone async spy function
 */
export function createAsyncSpy<T extends (...args: any[]) => any>(
    name: string = 'asyncSpy',
    originalFn?: T
): AsyncSpy<T> {
    const spy = createSpyFunction(name, originalFn) as AsyncSpy<T>;

    // Store original implementation
    const originalCalls = spy.calls;
    const originalFunction = spy.originalFunction;

    // Initialize async properties that will be used in closure
    const asyncProperties = {
        __onceQueue: [] as QueueItem[],
        __defaultStrategy: 'callThrough' as string,
        __defaultValue: undefined as any,
        __defaultFn: undefined as Function | undefined,
        __returnValueLocked: false // When true, new once values are ignored
    };

    // Override the spy's implementation
    const asyncImpl = function(this: any, ...args: any[]) {
        const call: SpyCall = {
            args,
            thisArg: this,
            timestamp: Date.now(),
        };

        try {
            let result: any;

            // Check if there's a one-time behavior queued
            if (asyncProperties.__onceQueue && asyncProperties.__onceQueue.length > 0) {
                const item = asyncProperties.__onceQueue.shift()!;

                switch (item.type) {
                    case 'returnValue':
                        result = item.value;
                        break;
                    case 'resolvedValue':
                        result = Promise.resolve(item.value);
                        break;
                    case 'rejectedValue':
                        result = Promise.reject(item.value);
                        // Track the error even though it doesn't throw synchronously
                        call.error = item.value;
                        // Prevent unhandled rejection warnings
                        if (result && typeof result.catch === 'function') {
                            result.catch(() => {});
                        }
                        break;
                    case 'callFake':
                        result = item.fn!.apply(this, args);
                        break;
                    case 'throwError':
                        throw item.value;
                }
            } else {
                // Use default behavior
                switch (asyncProperties.__defaultStrategy) {
                    case 'callThrough':
                        result = originalFunction ? originalFunction.apply(this, args) : undefined;
                        break;
                    case 'returnValue':
                        result = asyncProperties.__defaultValue;
                        break;
                    case 'resolvedValue':
                        result = Promise.resolve(asyncProperties.__defaultValue);
                        break;
                    case 'rejectedValue':
                        result = Promise.reject(asyncProperties.__defaultValue);
                        // Track the error even though it doesn't throw synchronously
                        call.error = asyncProperties.__defaultValue;
                        // Prevent unhandled rejection warnings
                        if (result && typeof result.catch === 'function') {
                            result.catch(() => {});
                        }
                        break;
                    case 'throwError':
                        throw asyncProperties.__defaultValue;
                    case 'callFake':
                        result = asyncProperties.__defaultFn!.apply(this, args);
                        break;
                    default:
                        result = originalFunction ? originalFunction.apply(this, args) : undefined;
                }
            }

            call.returnValue = result;
            originalCalls.push(call);
            return result;
        } catch (error) {
            call.error = error;
            originalCalls.push(call);
            throw error;
        }
    };

    // Copy spy properties manually to avoid getter issues
    Object.setPrototypeOf(asyncImpl, Object.getPrototypeOf(spy));

    // Copy writable properties
    (asyncImpl as any).__isSpy = true;
    (asyncImpl as any).calls = originalCalls;
    (asyncImpl as any).originalFunction = originalFunction;
    (asyncImpl as any).objectRef = (spy as any).objectRef;
    (asyncImpl as any).methodName = (spy as any).methodName;

    // Copy methods
    (asyncImpl as any).restore = spy.restore;
    (asyncImpl as any).reset = spy.reset;
    (asyncImpl as any).callThrough = spy.callThrough;
    (asyncImpl as any).returnValue = spy.returnValue;
    (asyncImpl as any).returnValues = spy.returnValues;
    (asyncImpl as any).throwError = spy.throwError;
    (asyncImpl as any).callFake = spy.callFake;
    (asyncImpl as any).calledWith = spy.calledWith;
    (asyncImpl as any).neverCalledWith = spy.neverCalledWith;
    (asyncImpl as any).firstCall = spy.firstCall;
    (asyncImpl as any).lastCall = spy.lastCall;
    (asyncImpl as any).getCall = spy.getCall;

    // Define getters
    Object.defineProperty(asyncImpl, 'callCount', {
        get() { return originalCalls.length; },
        enumerable: true
    });

    Object.defineProperty(asyncImpl, 'called', {
        get() { return originalCalls.length > 0; },
        enumerable: true
    });

    Object.defineProperty(asyncImpl, 'notCalled', {
        get() { return originalCalls.length === 0; },
        enumerable: true
    });

    Object.defineProperty(asyncImpl, 'calledOnce', {
        get() { return originalCalls.length === 1; },
        enumerable: true
    });

    Object.defineProperty(asyncImpl, 'calledTwice', {
        get() { return originalCalls.length === 2; },
        enumerable: true
    });

    Object.defineProperty(asyncImpl, 'calledThrice', {
        get() { return originalCalls.length === 3; },
        enumerable: true
    });

    // Add async methods
    const asyncSpy = asyncImpl as AsyncSpy<T>;

    // Expose async properties on the asyncSpy object for interface compatibility
    Object.defineProperty(asyncSpy, '__onceQueue', {
        get() { return asyncProperties.__onceQueue; },
        set(value) { asyncProperties.__onceQueue = value; }
    });
    Object.defineProperty(asyncSpy, '__defaultStrategy', {
        get() { return asyncProperties.__defaultStrategy; },
        set(value) { asyncProperties.__defaultStrategy = value; }
    });
    Object.defineProperty(asyncSpy, '__defaultValue', {
        get() { return asyncProperties.__defaultValue; },
        set(value) { asyncProperties.__defaultValue = value; }
    });
    Object.defineProperty(asyncSpy, '__defaultFn', {
        get() { return asyncProperties.__defaultFn; },
        set(value) { asyncProperties.__defaultFn = value; }
    });

    // Sequential return values
    asyncSpy.returnValueOnce = function(value: any) {
        if (!asyncProperties.__returnValueLocked) {
            asyncProperties.__onceQueue.push({ type: 'returnValue', value });
        }
        return asyncSpy;
    };

    asyncSpy.returnValuesOnce = function(...values: any[]) {
        if (!asyncProperties.__returnValueLocked) {
            values.forEach(value => {
                asyncProperties.__onceQueue.push({ type: 'returnValue', value });
            });
        }
        return asyncSpy;
    };

    // Override base returnValue to set default (don't clear existing queue)
    asyncSpy.returnValue = function(value: any) {
        asyncProperties.__defaultStrategy = 'returnValue';
        asyncProperties.__defaultValue = value;
        // Don't clear existing queue items, they should be consumed first
        // But lock to prevent future once values from being added
        asyncProperties.__returnValueLocked = true;
        // Note: We don't call the original returnValue since we're managing the queue ourselves
        return asyncSpy;
    };

    // Override callThrough
    asyncSpy.callThrough = function() {
        asyncProperties.__defaultStrategy = 'callThrough';
        asyncProperties.__defaultValue = undefined;
        asyncProperties.__onceQueue.length = 0;
        asyncProperties.__returnValueLocked = false; // Unlock
        return asyncSpy;
    };

    // Override throwError
    asyncSpy.throwError = function(error: any) {
        asyncProperties.__defaultStrategy = 'throwError';
        asyncProperties.__defaultValue = error;
        asyncProperties.__onceQueue.length = 0;
        asyncProperties.__returnValueLocked = false; // Unlock
        return asyncSpy;
    };

    // Override callFake
    asyncSpy.callFake = function(fn: T) {
        asyncProperties.__defaultStrategy = 'callFake';
        asyncProperties.__defaultFn = fn;
        asyncProperties.__onceQueue.length = 0;
        asyncProperties.__returnValueLocked = false; // Unlock
        return asyncSpy;
    };

    // Async resolved values
    asyncSpy.resolvedValue = function(value: any) {
        asyncProperties.__defaultStrategy = 'resolvedValue';
        asyncProperties.__defaultValue = value;
        // Don't clear queue, but lock it
        asyncProperties.__returnValueLocked = true;
        return asyncSpy;
    };

    asyncSpy.resolvedValueOnce = function(value: any) {
        if (!asyncProperties.__returnValueLocked) {
            asyncProperties.__onceQueue.push({ type: 'resolvedValue', value });
        }
        return asyncSpy;
    };

    asyncSpy.resolvedValues = function(...values: any[]) {
        if (!asyncProperties.__returnValueLocked) {
            values.forEach(value => {
                asyncProperties.__onceQueue.push({ type: 'resolvedValue', value });
            });
        }
        return asyncSpy;
    };

    // Async rejected values
    asyncSpy.rejectedValue = function(error: any) {
        asyncProperties.__defaultStrategy = 'rejectedValue';
        asyncProperties.__defaultValue = error;
        // Don't clear queue, but lock it
        asyncProperties.__returnValueLocked = true;
        return asyncSpy;
    };

    asyncSpy.rejectedValueOnce = function(error: any) {
        if (!asyncProperties.__returnValueLocked) {
            asyncProperties.__onceQueue.push({ type: 'rejectedValue', value: error });
        }
        return asyncSpy;
    };

    asyncSpy.rejectedValues = function(...errors: any[]) {
        if (!asyncProperties.__returnValueLocked) {
            errors.forEach(error => {
                asyncProperties.__onceQueue.push({ type: 'rejectedValue', value: error });
            });
        }
        return asyncSpy;
    };

    // One-time fake implementation
    asyncSpy.callFakeOnce = function(fn: T) {
        if (!asyncProperties.__returnValueLocked) {
            asyncProperties.__onceQueue.push({ type: 'callFake', fn });
        }
        return asyncSpy;
    };

    // Clear methods
    asyncSpy.clearCalls = function() {
        originalCalls.length = 0;
        return asyncSpy;
    };

    asyncSpy.clearReturnValues = function() {
        asyncProperties.__onceQueue.length = 0;
        asyncProperties.__defaultStrategy = 'callThrough';
        asyncProperties.__defaultValue = undefined;
        asyncProperties.__defaultFn = undefined;
        asyncProperties.__returnValueLocked = false; // Unlock
        return asyncSpy;
    };

    asyncSpy.clearAll = function() {
        originalCalls.length = 0;
        asyncProperties.__onceQueue.length = 0;
        asyncProperties.__defaultStrategy = 'callThrough';
        asyncProperties.__defaultValue = undefined;
        asyncProperties.__defaultFn = undefined;
        asyncProperties.__returnValueLocked = false; // Unlock
        return asyncSpy;
    };

    return asyncSpy;
}

/**
 * Create an async-enhanced spy on an object method
 */
export function spyOnAsync<T extends Record<string | symbol, any>, K extends keyof T>(
    object: T,
    method: K
): AsyncSpy<T[K]> {
    // First remove any existing spy
    if (object[method] && (object[method] as any).__isSpy) {
        (object[method] as any).restore();
    }

    // Get the original method
    const originalMethod = object[method];

    // Create async spy
    const asyncSpy = createAsyncSpy(String(method), originalMethod as any);

    // Store reference for restoration
    (asyncSpy as any).objectRef = object;
    (asyncSpy as any).methodName = method;

    // Add restore method
    asyncSpy.restore = function() {
        object[method] = originalMethod;
        return;
    };

    // Replace the method
    object[method] = asyncSpy as any;

    return asyncSpy;
}

/**
 * Enhance an existing spy with async capabilities
 */
export function enhanceSpy<T extends (...args: any[]) => any>(spy: Spy<T>): AsyncSpy<T> {
    // If already enhanced, return as is
    if ('resolvedValue' in spy) {
        return spy as AsyncSpy<T>;
    }

    const asyncSpy = spy as AsyncSpy<T>;

    // Initialize async properties
    asyncSpy.__onceQueue = [];
    asyncSpy.__defaultStrategy = 'callThrough';
    asyncSpy.__defaultValue = undefined;
    asyncSpy.__defaultFn = undefined;
    let returnValueLocked = false; // Track locking state

    // Store original calls array
    const originalCalls = spy.calls;
    const originalFunction = spy.originalFunction;

    // Create wrapper function that uses the queue
    const enhancedImpl = function(this: any, ...args: any[]) {
        const call: SpyCall = {
            args,
            thisArg: this,
            timestamp: Date.now(),
        };

        try {
            let result: any;

            // Check if there's a one-time behavior queued
            if (asyncSpy.__onceQueue && asyncSpy.__onceQueue.length > 0) {
                const item = asyncSpy.__onceQueue.shift()!;

                switch (item.type) {
                    case 'returnValue':
                        result = item.value;
                        break;
                    case 'resolvedValue':
                        result = Promise.resolve(item.value);
                        break;
                    case 'rejectedValue':
                        result = Promise.reject(item.value);
                        if (result && typeof result.catch === 'function') {
                            result.catch(() => {});
                        }
                        break;
                    case 'callFake':
                        result = item.fn!.apply(this, args);
                        break;
                    case 'throwError':
                        throw item.value;
                }
            } else {
                // Fall back to original spy behavior
                result = (spy as any).apply(this, args);
            }

            call.returnValue = result;
            return result;
        } catch (error) {
            call.error = error;
            throw error;
        }
    };

    // Copy spy properties to enhanced function
    Object.setPrototypeOf(enhancedImpl, spy);

    // Manually copy writable properties to avoid getter issues
    (enhancedImpl as any).__isSpy = (spy as any).__isSpy;
    (enhancedImpl as any).calls = originalCalls;
    (enhancedImpl as any).originalFunction = originalFunction;
    (enhancedImpl as any).objectRef = (spy as any).objectRef;
    (enhancedImpl as any).methodName = (spy as any).methodName;

    // Copy methods
    (enhancedImpl as any).restore = spy.restore;
    (enhancedImpl as any).reset = spy.reset;
    (enhancedImpl as any).callThrough = spy.callThrough;
    (enhancedImpl as any).returnValue = spy.returnValue;
    (enhancedImpl as any).returnValues = spy.returnValues;
    (enhancedImpl as any).throwError = spy.throwError;
    (enhancedImpl as any).callFake = spy.callFake;
    (enhancedImpl as any).calledWith = spy.calledWith;
    (enhancedImpl as any).neverCalledWith = spy.neverCalledWith;
    (enhancedImpl as any).firstCall = spy.firstCall;
    (enhancedImpl as any).lastCall = spy.lastCall;
    (enhancedImpl as any).getCall = spy.getCall;

    // Define getters
    Object.defineProperty(enhancedImpl, 'callCount', {
        get() { return originalCalls.length; },
        enumerable: true
    });

    Object.defineProperty(enhancedImpl, 'called', {
        get() { return originalCalls.length > 0; },
        enumerable: true
    });

    Object.defineProperty(enhancedImpl, 'notCalled', {
        get() { return originalCalls.length === 0; },
        enumerable: true
    });

    Object.defineProperty(enhancedImpl, 'calledOnce', {
        get() { return originalCalls.length === 1; },
        enumerable: true
    });

    Object.defineProperty(enhancedImpl, 'calledTwice', {
        get() { return originalCalls.length === 2; },
        enumerable: true
    });

    Object.defineProperty(enhancedImpl, 'calledThrice', {
        get() { return originalCalls.length === 3; },
        enumerable: true
    });

    const enhanced = enhancedImpl as AsyncSpy<T>;

    // Add async methods (similar to createAsyncSpy)
    enhanced.returnValueOnce = function(value: any) {
        if (!returnValueLocked) {
            enhanced.__onceQueue!.push({ type: 'returnValue', value });
        }
        return enhanced;
    };

    enhanced.returnValuesOnce = function(...values: any[]) {
        if (!returnValueLocked) {
            values.forEach(value => {
                enhanced.__onceQueue!.push({ type: 'returnValue', value });
            });
        }
        return enhanced;
    };

    enhanced.resolvedValue = function(value: any) {
        enhanced.__defaultStrategy = 'resolvedValue';
        enhanced.__defaultValue = value;
        // Don't clear queue but lock it
        returnValueLocked = true;
        // Also update the underlying spy
        (enhanced as any).returnValue(Promise.resolve(value));
        return enhanced;
    };

    enhanced.resolvedValueOnce = function(value: any) {
        if (!returnValueLocked) {
            enhanced.__onceQueue!.push({ type: 'resolvedValue', value });
        }
        return enhanced;
    };

    enhanced.resolvedValues = function(...values: any[]) {
        if (!returnValueLocked) {
            values.forEach(value => {
                enhanced.__onceQueue!.push({ type: 'resolvedValue', value });
            });
        }
        return enhanced;
    };

    enhanced.rejectedValue = function(error: any) {
        enhanced.__defaultStrategy = 'rejectedValue';
        enhanced.__defaultValue = error;
        // Don't clear queue but lock it
        returnValueLocked = true;
        const promise = Promise.reject(error);
        promise.catch(() => {}); // Prevent unhandled rejection
        (enhanced as any).returnValue(promise);
        return enhanced;
    };

    enhanced.rejectedValueOnce = function(error: any) {
        if (!returnValueLocked) {
            enhanced.__onceQueue!.push({ type: 'rejectedValue', value: error });
        }
        return enhanced;
    };

    enhanced.rejectedValues = function(...errors: any[]) {
        if (!returnValueLocked) {
            errors.forEach(error => {
                enhanced.__onceQueue!.push({ type: 'rejectedValue', value: error });
            });
        }
        return enhanced;
    };

    enhanced.callFakeOnce = function(fn: T) {
        if (!returnValueLocked) {
            enhanced.__onceQueue!.push({ type: 'callFake', fn });
        }
        return enhanced;
    };

    enhanced.clearCalls = function() {
        originalCalls.length = 0;
        return enhanced;
    };

    enhanced.clearReturnValues = function() {
        enhanced.__onceQueue!.length = 0;
        enhanced.__defaultStrategy = 'callThrough';
        enhanced.__defaultValue = undefined;
        enhanced.__defaultFn = undefined;
        returnValueLocked = false; // Unlock
        (enhanced as any).callThrough();
        return enhanced;
    };

    enhanced.clearAll = function() {
        originalCalls.length = 0;
        enhanced.__onceQueue!.length = 0;
        enhanced.__defaultStrategy = 'callThrough';
        enhanced.__defaultValue = undefined;
        enhanced.__defaultFn = undefined;
        returnValueLocked = false; // Unlock
        (enhanced as any).callThrough();
        return enhanced;
    };

    return enhanced;
}
