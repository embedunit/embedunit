// src/assertion.ts

// Helper function for type checking
import {PromiseAssertion} from "./promise-assertion";
import {deepEqual, getType, isThenable} from "./deepEqual";
import {deepEqualAsymmetric} from "./asymmetric-matchers";
import {isSpy, getCallCount, getCalls} from "./spy-integration";
import {createCustomError, ErrorFormatOptions} from "./error-format";

/**
 * Assertion class that provides chainable matchers for testing values.
 * Created by the expect() function.
 */
export class Assertion {
    private actual: any;
    private _isNegated: boolean = false;
    private _customMessage?: string;
    private _errorOptions: ErrorFormatOptions;

    constructor(actual: any, negated: boolean = false, customMessage?: string, errorOptions: ErrorFormatOptions = {}) {
        this.actual = actual;
        this._isNegated = negated;
        this._customMessage = customMessage;
        this._errorOptions = errorOptions;
    }

    // --- Negation ---
    /**
     * Negates the assertion.
     * @example
     * expect(5).not.toBe(3);
     * expect('hello').not.toContain('x');
     */
    get not(): Assertion {
        return new Assertion(this.actual, !this._isNegated, this._customMessage, this._errorOptions);
    }

    // --- Promise-based assertions ---
    /**
     * Asserts that a promise resolves and allows chaining assertions on the resolved value.
     * @example
     * await expect(promise).resolves.toBe('value');
     * await expect(fetchData()).resolves.toHaveProperty('id');
     */
    get resolves(): PromiseAssertion {
        if (!isThenable(this.actual)) {
            throw new TypeError(`Expected ${this.stringify(this.actual)} to be a Promise or thenable`);
        }
        return new PromiseAssertion(this.actual, this._isNegated, 'resolves');
    }

    /**
     * Asserts that a promise rejects and allows chaining assertions on the rejection reason.
     * @example
     * await expect(promise).rejects.toThrow('error');
     * await expect(failingFn()).rejects.toBeInstanceOf(Error);
     */
    get rejects(): PromiseAssertion {
        if (!isThenable(this.actual)) {
            throw new TypeError(`Expected ${this.stringify(this.actual)} to be a Promise or thenable`);
        }
        return new PromiseAssertion(this.actual, this._isNegated, 'rejects');
    }

    // --- Helpers ---
    protected stringify(value: any): string {
        // Use a Set to track visited objects/arrays for circular reference detection
        const seen = new Set<any>();
        // Set a maximum depth to prevent excessive output / potential stack overflow
        const maxDepth = 4; // Adjust as needed

        function _stringifyInternal(val: any, depth: number): string {
            // Handle primitives first
            if (val === null) return 'null';
            if (val === undefined) return 'undefined';
            if (typeof val === 'string') {
                const escaped = val.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                return `'${escaped}'`;
            }
            if (typeof val === 'number') {
                if (isNaN(val)) return 'NaN';
                if (!isFinite(val)) return val > 0 ? 'Infinity' : '-Infinity';
                return String(val);
            }
            if (typeof val === 'boolean') return String(val);
            if (typeof val === 'bigint') return `${String(val)}n`;
            if (typeof val === 'symbol') return String(val);

            // Handle complex types
            const type = typeof val;
            if (type === 'object' || type === 'function') {
                if (seen.has(val)) {
                    return '[Circular]';
                }
                if (depth <= 0) {
                    if (Array.isArray(val)) return '[Array]';
                    if (val instanceof Date) return `Date(...)`; // Abbreviate at depth limit
                    if (val instanceof RegExp) return String(val);
                    return '[Object]';
                }

                seen.add(val);
                let result: string;

                if (val instanceof Date) {
                    result = `Date(${val.toISOString()})`;
                } else if (val instanceof RegExp) {
                    result = String(val);
                } else if (val instanceof Error) {
                    result = `${val.name || 'Error'}(${val.message ? `'${val.message}'` : ''})`;
                } else if (Array.isArray(val)) {
                    const elements = val.map(el => _stringifyInternal(el, depth - 1));
                    result = `[${elements.length > 0 ? ' ' + elements.join(', ') + ' ' : ''}]`;
                } else if (type === 'function') {
                    result = `[Function${val.name ? ': ' + val.name : ''}]`;
                } else { // Plain objects or others
                    const keys = Object.keys(val);
                    if (keys.length === 0) {
                        // Check constructor name for slightly better empty object representation
                        const constructorName = val?.constructor?.name;
                        result = (constructorName && constructorName !== 'Object') ? `${constructorName} {}` : '{}';
                    } else {
                        const properties = keys.map(key => {
                            // --- FIX IS HERE ---
                            // Use JSON.stringify for keys that aren't simple identifiers
                            const keyStr = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)
                                ? key
                                : JSON.stringify(key); // Use JSON.stringify for complex/quoted keys
                            // --- END FIX ---
                            return `${keyStr}: ${_stringifyInternal(val[key], depth - 1)}`;
                        });
                        const constructorName = val?.constructor?.name;
                        const prefix = (constructorName && constructorName !== 'Object') ? `${constructorName} ` : '';
                        result = `${prefix}{ ${properties.join(', ')} }`;
                    }
                }

                seen.delete(val);
                return result;

            } else {
                // Fallback for unknown types
                return String(val);
            }
        }

        return _stringifyInternal(value, maxDepth);
    }

    // Generates the final error message, replacing ESCAPED placeholders
    protected generateErrorMessage(expected: any, messageTpl: string): string {
        const negation = this._isNegated ? 'not ' : '';
        const actualStr = this.stringify(this.actual);
        // Stringify expected only if it's needed for the message
        const expectedStr = messageTpl.includes('%{expected}') ? this.stringify(expected) : ''; // Look for escaped placeholder

        // Replace the ESCAPED placeholders
        return messageTpl
            .replace('%{negation}', negation) // Replace escaped placeholder
            .replace('%{actual}', actualStr)   // Replace escaped placeholder
            .replace('%{expected}', expectedStr); // Replace escaped placeholder
    }

    // Performs the check and throws if needed, using the template with escaped placeholders
    protected check(condition: boolean, expected: any, messageTpl: string): void {
        // messageTpl now contains literal '%{negation}', '%{actual}', '%{expected}'
        if (this._isNegated ? condition : !condition) {
            const baseMessage = this.generateErrorMessage(expected, messageTpl);
            throw createCustomError(baseMessage, this._customMessage, this.actual, expected, this._errorOptions);
        }
    }

    // --- Assertions ---

    /**
     * Asserts strict equality using ===.
     * @param expected - The expected value
     * @example
     * expect(5).toBe(5);
     * expect('hello').toBe('hello');
     * expect(obj).toBe(obj); // Same reference
     */
    toBe(expected: any): void {
        this.check(
            this.actual === expected,
            expected,
            // Use escaped placeholders in the template literal string
            `Expected %{actual} %{negation}to be (strictly equal) %{expected}`
        );
    }

    /**
     * Asserts deep equality for objects and arrays.
     * Recursively compares all properties.
     * @param expected - The expected value
     * @example
     * expect({a: 1}).toEqual({a: 1});
     * expect([1, 2, 3]).toEqual([1, 2, 3]);
     */
    toEqual(expected: any): void {
        this.check(
            deepEqualAsymmetric(this.actual, expected),
            expected,
            // Use escaped placeholders
            `Expected %{actual} %{negation}to deeply equal %{expected}`
        );
    }

    /**
     * Asserts strict deep equality for objects and arrays.
     * Like toEqual but also checks for undefined properties and array sparseness.
     * @param expected - The expected value
     * @example
     * expect({a: 1}).toStrictEqual({a: 1});
     * expect([1, 2, 3]).toStrictEqual([1, 2, 3]);
     */
    toStrictEqual(expected: any): void {
        this.check(
            deepEqualAsymmetric(this.actual, expected),
            expected,
            `Expected %{actual} %{negation}to strictly equal %{expected}`
        );
    }

    /**
     * Asserts that a value is truthy.
     * @example
     * expect(1).toBeTruthy();
     * expect('hello').toBeTruthy();
     * expect({}).toBeTruthy();
     */
    toBeTruthy(): void {
        this.check(
            !!this.actual,
            undefined,
            // Use escaped placeholders
            `Expected %{actual} %{negation}to be truthy`
        );
    }

    /**
     * Asserts that a value is falsy.
     * @example
     * expect(0).toBeFalsy();
     * expect('').toBeFalsy();
     * expect(null).toBeFalsy();
     */
    toBeFalsy(): void {
        this.check(
            !this.actual,
            undefined,
            // Use escaped placeholders
            `Expected %{actual} %{negation}to be falsy`
        );
    }

    /**
     * Asserts that a value is null.
     * @example
     * expect(null).toBeNull();
     * expect(undefined).not.toBeNull();
     */
    toBeNull(): void {
        this.check(
            this.actual === null,
            null,
            // Use escaped placeholders
            `Expected %{actual} %{negation}to be null`
        );
    }

    /**
     * Asserts that a value is undefined.
     * @example
     * expect(undefined).toBeUndefined();
     * expect(null).not.toBeUndefined();
     */
    toBeUndefined(): void {
        this.check(
            this.actual === undefined,
            undefined,
            // Use escaped placeholders
            `Expected %{actual} %{negation}to be undefined`
        );
    }

    /**
     * Asserts that a value is defined (not undefined).
     * @example
     * expect(null).toBeDefined();
     * expect(0).toBeDefined();
     * expect(undefined).not.toBeDefined();
     */
    toBeDefined(): void {
        this.check(
            this.actual !== undefined,
            undefined,
            // Use escaped placeholders
            `Expected %{actual} %{negation}to be defined (not undefined)`
        );
    }

    /**
     * Asserts that a value is NaN.
     * @example
     * expect(NaN).toBeNaN();
     * expect(0).not.toBeNaN();
     */
    toBeNaN(): void {
        this.check(
            Number.isNaN(this.actual),
            undefined,
            `Expected %{actual} %{negation}to be NaN`
        );
    }

    /**
     * Asserts that a number is greater than another.
     * @param expected - The number to compare against
     * @example
     * expect(5).toBeGreaterThan(3);
     * expect(10).toBeGreaterThan(9.99);
     */
    toBeGreaterThan(expected: number): void {
        if (typeof this.actual !== 'number' || typeof expected !== 'number') {
            throw new Error(`Both actual (${this.stringify(this.actual)}) and expected (${this.stringify(expected)}) must be numbers for toBeGreaterThan`);
        }
        this.check(
            this.actual > expected,
            expected,
            // Use escaped placeholders
            `Expected %{actual} %{negation}to be greater than %{expected}`
        );
    }


    /**
     * Asserts that a number is greater than or equal to another.
     * @param expected - The number to compare against
     * @example
     * expect(5).toBeGreaterThanOrEqual(5);
     * expect(10).toBeGreaterThanOrEqual(5);
     */
    toBeGreaterThanOrEqual(expected: number): void {
        if (typeof this.actual !== 'number' || typeof expected !== 'number') {
            throw new Error(`Both actual (${this.stringify(this.actual)}) and expected (${this.stringify(expected)}) must be numbers for toBeGreaterThanOrEqual`);
        }
        this.check(
            this.actual >= expected,
            expected,
            // Use escaped placeholders
            `Expected %{actual} %{negation}to be greater than or equal to %{expected}`
        );
    }


    /**
     * Asserts that a number is less than another.
     * @param expected - The number to compare against
     * @example
     * expect(3).toBeLessThan(5);
     * expect(9.99).toBeLessThan(10);
     */
    toBeLessThan(expected: number): void {
        if (typeof this.actual !== 'number' || typeof expected !== 'number') {
            throw new Error(`Both actual (${this.stringify(this.actual)}) and expected (${this.stringify(expected)}) must be numbers for toBeLessThan`);
        }
        this.check(
            this.actual < expected,
            expected,
            // Use escaped placeholders
            `Expected %{actual} %{negation}to be less than %{expected}`
        );
    }


    /**
     * Asserts that a number is less than or equal to another.
     * @param expected - The number to compare against
     * @example
     * expect(5).toBeLessThanOrEqual(5);
     * expect(3).toBeLessThanOrEqual(10);
     */
    toBeLessThanOrEqual(expected: number): void {
        if (typeof this.actual !== 'number' || typeof expected !== 'number') {
            throw new Error(`Both actual (${this.stringify(this.actual)}) and expected (${this.stringify(expected)}) must be numbers for toBeLessThanOrEqual`);
        }
        this.check(
            this.actual <= expected,
            expected,
            // Use escaped placeholders
            `Expected %{actual} %{negation}to be less than or equal to %{expected}`
        );
    }


    /**
     * Asserts that a string contains a substring or an array contains a value.
     * @param expected - The value or substring to search for
     * @example
     * expect('hello world').toContain('world');
     * expect([1, 2, 3]).toContain(2);
     */
    toContain(expected: any): void {
        let condition = false;
        let typeError = false;
        if (typeof this.actual === 'string') {
            condition = this.actual.includes(String(expected));
        } else if (Array.isArray(this.actual)) {
            condition = this.actual.includes(expected);
        } else {
            typeError = true;
        }
        if (typeError) {
            throw new Error(`Actual value ${this.stringify(this.actual)} must be an array or string for toContain`);
        }
        this.check(
            condition,
            expected,
            // Use escaped placeholders
            `Expected %{actual} %{negation}to contain %{expected}`
        );
    }

    /** Check if array contains an item deeply equal to the expected value */
    toContainEqual(expected: any): void {
        if (!Array.isArray(this.actual)) {
            throw new Error(`Actual value ${this.stringify(this.actual)} must be an array for toContainEqual`);
        }
        const condition = this.actual.some(item => deepEqualAsymmetric(item, expected));
        this.check(
            condition,
            expected,
            // Use escaped placeholders
            `Expected %{actual} %{negation}to contain an item deeply equal to %{expected}`
        );
    }

    /**
     * Helper for recursive partial object matching used by toMatchObject.
     */
    private isObjectMatch(actual: any, expected: any): boolean {
        if (typeof expected !== 'object' || expected === null) {
            return deepEqualAsymmetric(actual, expected);
        }
        if (typeof actual !== 'object' || actual === null) {
            return false;
        }
        if (Array.isArray(expected)) {
            if (!Array.isArray(actual)) return false;
            if (expected.length !== actual.length) return false;
            return expected.every((item, i) => this.isObjectMatch(actual[i], item));
        }
        for (const key in expected) {
            if (!Object.prototype.hasOwnProperty.call(expected, key)) continue;
            if (!Object.prototype.hasOwnProperty.call(actual, key)) return false;
            if (!this.isObjectMatch(actual[key], expected[key])) return false;
        }
        return true;
    }

    /**
     * Asserts that an object matches a subset of properties.
     * All properties in expected must exist and match in actual.
     * @param expected - The expected object pattern
     * @example
     * expect({a: 1, b: 2}).toMatchObject({a: 1});
     * expect({user: {name: 'John', age: 30}}).toMatchObject({user: {name: 'John'}});
     */
    toMatchObject(expected: Record<string, any>): void {
        if (typeof this.actual !== 'object' || this.actual === null) {
            throw new Error(`Actual value ${this.stringify(this.actual)} must be an object for toMatchObject`);
        }
        if (typeof expected !== 'object' || expected === null) {
            throw new Error(`Expected value ${this.stringify(expected)} must be an object for toMatchObject`);
        }
        const condition = this.isObjectMatch(this.actual, expected);
        this.check(
            condition,
            expected,
            `Expected %{actual} %{negation}to match object %{expected}`
        );
    }

    /**
     * Asserts that an array or string has a specific length.
     * @param expected - The expected length
     * @example
     * expect([1, 2, 3]).toHaveLength(3);
     * expect('hello').toHaveLength(5);
     */
    toHaveLength(expected: number): void {
        let actualLength: number | undefined;
        let hasLengthProperty = false;
        if (this.actual != null && typeof this.actual.length === 'number') {
            actualLength = this.actual.length;
            hasLengthProperty = true;
        }
        if (!hasLengthProperty) {
            throw new Error(`Actual value ${this.stringify(this.actual)} must have a 'length' property`);
        }
        // NOTE: We need the actualLength value in the message, so we can't entirely use escaped placeholders here.
        // We construct the string *before* calling check.
        const messageTpl = `Expected ${this.stringify(this.actual)} (length ${actualLength}) %{negation}to have length %{expected}`;
        this.check(
            actualLength === expected,
            expected,
            messageTpl // Pass the constructed template with placeholders for negation and expected
        );
    }

    /**
     * Asserts that an object has a specific property, optionally with a specific value.
     * @param propertyPath - The property path as a string or array of keys
     * @param value - Optional expected value for the property
     * @example
     * expect({name: 'John'}).toHaveProperty('name');
     * expect({user: {id: 1}}).toHaveProperty('user.id', 1);
     */
    toHaveProperty(propertyPath: string | (string | number)[], value?: any): void {
        const pathArray = Array.isArray(propertyPath) ? propertyPath : propertyPath.split('.');
        let current: any = this.actual;
        let exists = true;
        if (this.actual == null) {
            exists = false;
        } else {
            for (let i = 0; i < pathArray.length; i++) {
                const key = pathArray[i];
                const hasOwn = typeof current === 'object' && current !== null && Object.prototype.hasOwnProperty.call(current, key);
                const hasIndex = Array.isArray(current) && typeof key === 'number' && key >= 0 && key < current.length;
                const hasStringIndex = Array.isArray(current) && typeof key === 'string' && !isNaN(parseInt(key, 10)) && parseInt(key, 10) >= 0 && parseInt(key, 10) < current.length;
                if (!(hasOwn || hasIndex || hasStringIndex)) {
                    exists = false;
                    break;
                }
                current = current[key];
            }
        }
        const propertyPathStr = Array.isArray(propertyPath) ? propertyPath.map(String).join('.') : propertyPath;

        // Check existence first
        // NOTE: Need propertyPathStr in the message. Construct before calling check.
        const existenceMessageTpl = `Expected %{actual} %{negation}to have property '${propertyPathStr}'`;
        this.check(
            exists,
            propertyPathStr, // Expected here is the path string for the message
            existenceMessageTpl
        );

        // If a value was provided, check it
        if (arguments.length > 1 && exists !== this._isNegated) {
            // NOTE: Need propertyPathStr and the actual found value ('current') in the message. Construct before calling check.
            // The value for %{actual} placeholder will be the original object, not 'current'.
            const valueMessageTpl = `Expected property '${propertyPathStr}' of %{actual} %{negation}to have value %{expected} (but got ${this.stringify(current)})`;
            this.check(
                deepEqualAsymmetric(current, value),
                value, // Expected here is the value argument
                valueMessageTpl
            );
        }
    }

    /**
     * Asserts that a value is an instance of a specific constructor/class.
     * @param expectedConstructor - The constructor function or class to check against
     * @example
     * expect(new Date()).toBeInstanceOf(Date);
     * expect([]).toBeInstanceOf(Array);
     */
    toBeInstanceOf(expectedConstructor: Function): void {
        if (typeof expectedConstructor !== 'function') {
            throw new Error(`Expected constructor must be a function/class, but got ${this.stringify(expectedConstructor)}`);
        }
        const condition = this.actual instanceof expectedConstructor;
        const constructorName = expectedConstructor.name || '<anonymous constructor>';
        // NOTE: Need constructorName in the message. Construct before calling check.
        const messageTpl = `Expected %{actual} %{negation}to be an instance of ${constructorName}`;
        this.check(
            condition,
            constructorName, // Expected for message generation
            messageTpl
        );
    }


    /**
     * Asserts that a function throws an error when called.
     * @param errorMatcher - Optional matcher to specify the expected error (string, RegExp, Error instance, or Error constructor)
     * @example
     * expect(() => { throw new Error('oops'); }).toThrow();
     * expect(() => { throw new Error('oops'); }).toThrow('oops');
     */
    toThrow(errorMatcher?: string | RegExp | Error | Function): void {
        if (typeof this.actual !== 'function') {
            throw new Error(`Actual value ${this.stringify(this.actual)} must be a function to use toThrow`);
        }
        let thrownError: Error | null = null;
        let didThrow = false;
        try {
            this.actual();
        } catch (e) {
            didThrow = true;
            thrownError = e instanceof Error ? e : new Error(String(e));
        }

        // Check if it threw *something*
        this.check(
            didThrow,
            errorMatcher ?? '<any error>',
            // Use escaped placeholders
            `Expected function %{actual} %{negation}to throw an error`
        );

        // --- Detailed Matcher Check ---
        if (!this._isNegated && didThrow && errorMatcher) {
            // This part remains the same as it constructs a specific error message
            // *after* the main check, and doesn't use the general check/generateErrorMessage mechanism
            let match = false;
            let expectedDescription = '';
            if (typeof errorMatcher === 'string') {
                match = thrownError!.message.includes(errorMatcher);
                expectedDescription = `error message including "${errorMatcher}"`;
            } else if (errorMatcher instanceof RegExp) {
                match = errorMatcher.test(thrownError!.message);
                expectedDescription = `error message matching ${errorMatcher}`;
            } else if (errorMatcher instanceof Error) {
                match = thrownError!.message === errorMatcher.message && thrownError!.name === errorMatcher.name;
                expectedDescription = `error with message "${errorMatcher.message}" and name "${errorMatcher.name}"`;
            } else if (typeof errorMatcher === 'function' && (
                // More reliable way to check if a function is an Error constructor
                errorMatcher === Error ||
                errorMatcher.prototype instanceof Error ||
                /^(?:.*Error|.*Exception)$/.test(errorMatcher.name)
            )) {
                match = thrownError instanceof errorMatcher;
                expectedDescription = `error instance of ${errorMatcher.name || '<anonymous constructor>'}`;
            } else if (typeof errorMatcher === 'function') {
                try {
                    match = errorMatcher(thrownError);
                    expectedDescription = `error matching custom function "${errorMatcher.name || '<anonymous function>'}"`;
                    if (typeof match !== 'boolean') {
                        throw new Error(`Custom error matcher function must return a boolean, but returned ${this.stringify(match)}`);
                    }
                } catch (matchFnError: any) {
                    throw new Error(`Custom error matcher function threw an error during execution: ${matchFnError?.message ?? matchFnError}`);
                }
            } else {
                throw new Error(`Invalid error matcher type: ${this.stringify(errorMatcher)}. Use string, RegExp, Error instance, Error constructor, or a predicate function.`);
            }
            if (!match) {
                throw new Error(`Expected function ${this.stringify(this.actual)} to throw ${expectedDescription}, but it threw ${this.stringify(thrownError)} (message: "${thrownError?.message}")`);
            }
        }
    }

    /**
     * Asserts that a string matches a regular expression or contains a substring.
     * @param expected - A RegExp pattern or string to match against
     * @example
     * expect('hello world').toMatch(/world/);
     * expect('test@example.com').toMatch('example');
     */
    toMatch(expected: RegExp | string): void {
        if (typeof this.actual !== 'string') {
            // Throw a specific error if the actual value isn't a string
            throw new Error(this.generateErrorMessage(
                expected,
                `Actual value %{actual} must be a string to use toMatch, but received type ${getType(this.actual)}`
            ));
        }

        let condition: boolean;
        let messageTpl: string;

        if (expected instanceof RegExp) {
            condition = expected.test(this.actual);
            messageTpl = `Expected %{actual} %{negation}to match the regular expression %{expected}`;
        } else if (typeof expected === 'string') {
            condition = this.actual.includes(expected);
            messageTpl = `Expected %{actual} %{negation}to contain the substring %{expected}`;
        } else {
            // Should not happen with TypeScript, but good for robustness
            throw new Error('Expected value for toMatch must be a string or a RegExp');
        }

        this.check(condition, expected, messageTpl);
    }

    // ============ SPY ASSERTIONS ============

    /**
     * Asserts that a spy function has been called at least once.
     * @example
     * const spy = mock(() => {});
     * spy();
     * expect(spy).toHaveBeenCalled();
     */
    toHaveBeenCalled(): void {
        if (!isSpy(this.actual)) {
            throw new Error('toHaveBeenCalled can only be used on spies. Import @embedunit/spy to use spy assertions.');
        }
        const callCount = getCallCount(this.actual);
        this.check(
            callCount > 0,
            true,
            `Expected spy %{negation}to have been called`
        );
    }

    /** Alias for toHaveBeenCalled */
    toBeCalled(): void {
        this.toHaveBeenCalled();
    }

    /**
     * Asserts that a spy function has been called a specific number of times.
     * @param times - The expected number of calls
     * @example
     * const spy = mock(() => {});
     * spy(); spy();
     * expect(spy).toHaveBeenCalledTimes(2);
     */
    toHaveBeenCalledTimes(times: number): void {
        if (!isSpy(this.actual)) {
            throw new Error('toHaveBeenCalledTimes can only be used on spies. Import @embedunit/spy to use spy assertions.');
        }
        const callCount = getCallCount(this.actual);
        this.check(
            callCount === times,
            times,
            `Expected spy %{negation}to have been called ${times} time(s), but was called ${callCount} time(s)`
        );
    }

    /**
     * Asserts that a spy function has been called with specific arguments.
     * @param args - The expected arguments
     * @example
     * const spy = mock(() => {});
     * spy('hello', 123);
     * expect(spy).toHaveBeenCalledWith('hello', 123);
     */
    toHaveBeenCalledWith(...args: any[]): void {
        if (!isSpy(this.actual)) {
            throw new Error('toHaveBeenCalledWith can only be used on spies. Import @embedunit/spy to use spy assertions.');
        }
        const calls = getCalls(this.actual);
        const hasMatchingCall = calls.some(call =>
            args.length === call.args.length &&
            args.every((arg, i) => deepEqualAsymmetric(call.args[i], arg))
        );
        this.check(
            hasMatchingCall,
            args,
            `Expected spy %{negation}to have been called with ${this.stringify(args)}`
        );
    }

    /** Check if last spy call was with specific arguments */
    toHaveBeenLastCalledWith(...args: any[]): void {
        if (!isSpy(this.actual)) {
            throw new Error('toHaveBeenLastCalledWith can only be used on spies. Import @embedunit/spy to use spy assertions.');
        }
        const calls = getCalls(this.actual);
        const lastCall = calls[calls.length - 1];
        const matches = lastCall ? deepEqualAsymmetric(lastCall.args, args) : false;
        this.check(
            matches,
            args,
            `Expected spy %{negation}to have been last called with ${this.stringify(args)}`
        );
    }

    /** Check if spy returned specific value */
    toHaveReturned(): void {
        if (!isSpy(this.actual)) {
            throw new Error('toHaveReturned can only be used on spies. Import @embedunit/spy to use spy assertions.');
        }
        const calls = getCalls(this.actual);
        const hasReturned = calls.some(call => call.returnValue !== undefined);
        this.check(
            hasReturned,
            true,
            `Expected spy %{negation}to have returned successfully`
        );
    }

    /**
     * Asserts that a spy function has returned a specific value.
     * @param value - The expected return value
     * @example
     * const spy = mock(() => 'result');
     * spy();
     * expect(spy).toHaveReturnedWith('result');
     */
    toHaveReturnedWith(value: any): void {
        if (!isSpy(this.actual)) {
            throw new Error('toHaveReturnedWith can only be used on spies. Import @embedunit/spy to use spy assertions.');
        }
        const calls = getCalls(this.actual);
        const hasReturnedValue = calls.some(call => deepEqualAsymmetric(call.returnValue, value));
        this.check(
            hasReturnedValue,
            value,
            `Expected spy %{negation}to have returned ${this.stringify(value)}`
        );
    }

    /**
     * Asserts that a spy function was called with specific arguments at a specific call index.
     * @param nthCall - The call index (1-indexed, like Jest)
     * @param args - The expected arguments
     * @example
     * const spy = mock(() => {});
     * spy('first'); spy('second');
     * expect(spy).toHaveBeenNthCalledWith(1, 'first');
     * expect(spy).toHaveBeenNthCalledWith(2, 'second');
     */
    toHaveBeenNthCalledWith(nthCall: number, ...args: any[]): void {
        if (!isSpy(this.actual)) {
            throw new Error('toHaveBeenNthCalledWith can only be used on spies. Import @embedunit/spy to use spy assertions.');
        }
        if (typeof nthCall !== 'number' || nthCall < 1 || !Number.isInteger(nthCall)) {
            throw new Error(`nthCall must be a positive integer, but got ${this.stringify(nthCall)}`);
        }
        const calls = getCalls(this.actual);
        const callIndex = nthCall - 1; // Convert to 0-indexed
        const callExists = callIndex < calls.length;
        const nthCallData = callExists ? calls[callIndex] : undefined;
        const matches = callExists &&
            args.length === nthCallData!.args.length &&
            args.every((arg, i) => deepEqualAsymmetric(nthCallData!.args[i], arg));
        this.check(
            matches,
            args,
            `Expected spy %{negation}to have been called on call ${nthCall} with ${this.stringify(args)}`
        );
    }

    /**
     * Asserts that a spy function returned a specific value at a specific call index.
     * @param nthCall - The call index (1-indexed, like Jest)
     * @param value - The expected return value
     * @example
     * const spy = mock((x) => x * 2);
     * spy(1); spy(2);
     * expect(spy).toHaveNthReturnedWith(1, 2);
     * expect(spy).toHaveNthReturnedWith(2, 4);
     */
    toHaveNthReturnedWith(nthCall: number, value: any): void {
        if (!isSpy(this.actual)) {
            throw new Error('toHaveNthReturnedWith can only be used on spies. Import @embedunit/spy to use spy assertions.');
        }
        if (typeof nthCall !== 'number' || nthCall < 1 || !Number.isInteger(nthCall)) {
            throw new Error(`nthCall must be a positive integer, but got ${this.stringify(nthCall)}`);
        }
        const calls = getCalls(this.actual);
        const callIndex = nthCall - 1; // Convert to 0-indexed
        const nthCallData = callIndex < calls.length ? calls[callIndex] : undefined;
        const matches = nthCallData ? deepEqualAsymmetric(nthCallData.returnValue, value) : false;
        this.check(
            matches,
            value,
            `Expected spy %{negation}to have returned ${this.stringify(value)} on call ${nthCall}`
        );
    }

    /**
     * Asserts that a spy function has returned successfully a specific number of times.
     * @param times - The expected number of successful returns
     * @example
     * const spy = mock(() => 'result');
     * spy(); spy();
     * expect(spy).toHaveReturnedTimes(2);
     */
    toHaveReturnedTimes(times: number): void {
        if (!isSpy(this.actual)) {
            throw new Error('toHaveReturnedTimes can only be used on spies. Import @embedunit/spy to use spy assertions.');
        }
        if (typeof times !== 'number' || times < 0 || !Number.isInteger(times)) {
            throw new Error(`times must be a non-negative integer, but got ${this.stringify(times)}`);
        }
        const calls = getCalls(this.actual);
        // Count calls that returned successfully (have a returnValue defined)
        const returnCount = calls.filter(call => 'returnValue' in call).length;
        this.check(
            returnCount === times,
            times,
            `Expected spy %{negation}to have returned ${times} time(s), but returned ${returnCount} time(s)`
        );
    }

    /**
     * Asserts that the last call to a spy function returned a specific value.
     * @param value - The expected return value
     * @example
     * const spy = mock((x) => x * 2);
     * spy(1); spy(2);
     * expect(spy).toHaveLastReturnedWith(4);
     */
    toHaveLastReturnedWith(value: any): void {
        if (!isSpy(this.actual)) {
            throw new Error('toHaveLastReturnedWith can only be used on spies. Import @embedunit/spy to use spy assertions.');
        }
        const calls = getCalls(this.actual);
        const lastCall = calls[calls.length - 1];
        const matches = lastCall ? deepEqualAsymmetric(lastCall.returnValue, value) : false;
        this.check(
            matches,
            value,
            `Expected spy %{negation}to have last returned ${this.stringify(value)}`
        );
    }

    /**
     * Asserts that a number is approximately equal to another within a specified precision.
     * @param expected - The expected number
     * @param precision - The number of decimal places to consider (default: 2)
     * @example
     * expect(0.1 + 0.2).toBeCloseTo(0.3);
     * expect(3.14159).toBeCloseTo(3.14, 2);
     */
    toBeCloseTo(expected: number, precision: number = 2): void {
        if (typeof this.actual !== 'number' || typeof expected !== 'number') {
            throw new Error(`Both actual (${this.stringify(this.actual)}) and expected (${this.stringify(expected)}) must be numbers for toBeCloseTo`);
        }
        if (typeof precision !== 'number' || precision < 0) {
            throw new Error(`Precision must be a non-negative number, but got ${this.stringify(precision)}`);
        }

        const pass = Math.abs(this.actual - expected) < Math.pow(10, -precision) / 2;
        const messageTpl = `Expected %{actual} %{negation}to be close to %{expected} (precision: ${precision})`;

        this.check(
            pass,
            expected,
            messageTpl
        );
    }
}

// Factory function with optional custom message
export function expect(actual: any, customMessage?: string): Assertion {
    return new Assertion(actual, false, customMessage);
}

// Factory function for custom error formatting options
export function expectWithOptions(actual: any, options: ErrorFormatOptions, customMessage?: string): Assertion {
    return new Assertion(actual, false, customMessage, options);
}
