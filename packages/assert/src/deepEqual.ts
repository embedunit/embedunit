export function getType(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return 'array';
    return typeof value;
}

// Enhanced deep equality check
export function deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return a === b;
    const typeA = getType(a);
    const typeB = getType(b);
    if (typeA !== typeB) return false;
    if (a instanceof Date && b instanceof Date) {
        return a.getTime() === b.getTime();
    }
    if (a instanceof RegExp && b instanceof RegExp) {
        return a.toString() === b.toString();
    }
    if (typeA === 'array') {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (!deepEqual(a[i], b[i])) return false;
        }
        return true;
    }
    if (typeA === 'object') {
        if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        for (const key of keysA) {
            if (!Object.prototype.hasOwnProperty.call(b, key) || !deepEqual(a[key], b[key])) {
                return false;
            }
        }
        return true;
    }
    return false;
}

// Helper function to check if a value is a Promise-like (thenable)
export function isThenable(value: any): boolean {
    return value !== null &&
        typeof value === 'object' &&
        typeof value.then === 'function';
}
