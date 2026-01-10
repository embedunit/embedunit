/**
 * Asymmetric matchers for flexible value matching in assertions.
 * These allow partial matching within toEqual, toHaveBeenCalledWith, etc.
 */

export const ASYMMETRIC_MATCHER_SYMBOL = Symbol.for('embedunit.asymmetricMatcher');

export interface AsymmetricMatcher {
    [ASYMMETRIC_MATCHER_SYMBOL]: true;
    asymmetricMatch(actual: any): boolean;
    toStringTag: string;
}

/**
 * Check if a value is an asymmetric matcher
 */
export function isAsymmetricMatcher(value: any): value is AsymmetricMatcher {
    return value !== null &&
        typeof value === 'object' &&
        value[ASYMMETRIC_MATCHER_SYMBOL] === true;
}

/**
 * Matches any value except null and undefined.
 * @example
 * expect({name: 'test'}).toEqual({name: anything()});
 */
export function anything(): AsymmetricMatcher {
    return {
        [ASYMMETRIC_MATCHER_SYMBOL]: true,
        asymmetricMatch: (actual: any) => actual !== null && actual !== undefined,
        toStringTag: 'anything()'
    };
}

/**
 * Matches any value that is an instance of the given constructor.
 * @param constructor - The constructor to check against
 * @example
 * expect({created: new Date()}).toEqual({created: any(Date)});
 */
export function any(constructor: Function): AsymmetricMatcher {
    const name = constructor.name || '<anonymous>';
    return {
        [ASYMMETRIC_MATCHER_SYMBOL]: true,
        asymmetricMatch: (actual: any) => {
            if (constructor === String) return typeof actual === 'string' || actual instanceof String;
            if (constructor === Number) return typeof actual === 'number' || actual instanceof Number;
            if (constructor === Boolean) return typeof actual === 'boolean' || actual instanceof Boolean;
            if (constructor === Function) return typeof actual === 'function';
            if (constructor === Object) return typeof actual === 'object' && actual !== null;
            if (constructor === Array) return Array.isArray(actual);
            return actual instanceof constructor;
        },
        toStringTag: `any(${name})`
    };
}

/**
 * Matches any string that contains the given substring.
 * @param substring - The substring to search for
 * @example
 * expect({message: 'Hello world'}).toEqual({message: stringContaining('world')});
 */
export function stringContaining(substring: string): AsymmetricMatcher {
    return {
        [ASYMMETRIC_MATCHER_SYMBOL]: true,
        asymmetricMatch: (actual: any) => typeof actual === 'string' && actual.includes(substring),
        toStringTag: `stringContaining('${substring}')`
    };
}

/**
 * Matches any string that matches the given pattern.
 * @param pattern - The regex pattern or string to match
 * @example
 * expect({email: 'test@example.com'}).toEqual({email: stringMatching(/@example/)});
 */
export function stringMatching(pattern: RegExp | string): AsymmetricMatcher {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    return {
        [ASYMMETRIC_MATCHER_SYMBOL]: true,
        asymmetricMatch: (actual: any) => typeof actual === 'string' && regex.test(actual),
        toStringTag: `stringMatching(${regex})`
    };
}

// Forward declaration for recursive use
let deepEqualAsymmetric: (actual: any, expected: any) => boolean;

/**
 * Matches any array that contains all the expected elements (in any order).
 * @param expected - The array of expected elements
 * @example
 * expect([1, 2, 3, 4]).toEqual(arrayContaining([2, 4]));
 */
export function arrayContaining(expected: any[]): AsymmetricMatcher {
    return {
        [ASYMMETRIC_MATCHER_SYMBOL]: true,
        asymmetricMatch: (actual: any) => {
            if (!Array.isArray(actual)) return false;
            return expected.every(item =>
                actual.some(actualItem => deepEqualAsymmetric(actualItem, item))
            );
        },
        toStringTag: `arrayContaining([...])`
    };
}

/**
 * Matches any object that contains the expected properties.
 * @param expected - The object with expected properties
 * @example
 * expect({name: 'test', age: 30}).toEqual(objectContaining({name: 'test'}));
 */
export function objectContaining(expected: Record<string, any>): AsymmetricMatcher {
    return {
        [ASYMMETRIC_MATCHER_SYMBOL]: true,
        asymmetricMatch: (actual: any) => {
            if (typeof actual !== 'object' || actual === null) return false;
            return Object.entries(expected).every(([key, value]) =>
                key in actual && deepEqualAsymmetric(actual[key], value)
            );
        },
        toStringTag: `objectContaining({...})`
    };
}

/**
 * Deep equality with asymmetric matcher support.
 * If expected is an asymmetric matcher, uses its asymmetricMatch method.
 */
deepEqualAsymmetric = function(actual: any, expected: any): boolean {
    // Check if expected is an asymmetric matcher
    if (isAsymmetricMatcher(expected)) {
        return expected.asymmetricMatch(actual);
    }

    // Standard equality checks
    if (actual === expected) return true;
    if (actual == null || expected == null) return actual === expected;

    const typeActual = typeof actual;
    const typeExpected = typeof expected;
    if (typeActual !== typeExpected) return false;

    // Handle Date
    if (actual instanceof Date && expected instanceof Date) {
        return actual.getTime() === expected.getTime();
    }

    // Handle RegExp
    if (actual instanceof RegExp && expected instanceof RegExp) {
        return actual.toString() === expected.toString();
    }

    // Handle arrays
    if (Array.isArray(actual) && Array.isArray(expected)) {
        if (actual.length !== expected.length) return false;
        for (let i = 0; i < actual.length; i++) {
            if (!deepEqualAsymmetric(actual[i], expected[i])) return false;
        }
        return true;
    }

    // Handle objects
    if (typeActual === 'object') {
        if (Object.getPrototypeOf(actual) !== Object.getPrototypeOf(expected)) return false;
        const keysActual = Object.keys(actual);
        const keysExpected = Object.keys(expected);
        if (keysActual.length !== keysExpected.length) return false;
        for (const key of keysExpected) {
            if (!Object.prototype.hasOwnProperty.call(actual, key)) return false;
            if (!deepEqualAsymmetric(actual[key], expected[key])) return false;
        }
        return true;
    }

    return false;
};

export { deepEqualAsymmetric };
