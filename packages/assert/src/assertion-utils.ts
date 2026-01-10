// ===== File: src/assertionUtils.ts (or place inside assertion.ts if preferred) =====

/**
 * Converts a value to a human-readable string representation for assertion messages.
 * Handles primitives, arrays, objects, dates, regexes, errors, functions,
 * circular references, and limits output depth/length for clarity.
 *
 * @param value - The value to stringify.
 * @returns A string representation of the value.
 */
export function stringifyValue(value: any): string {
    // Use a Set to track visited objects/arrays for circular reference detection
    const seen = new Set<any>();
    // Set a maximum depth to prevent excessive output / potential stack overflow
    const maxDepth = 4;
    // Set maximum elements/properties to display before truncating
    const maxElements = 10;
    const maxProps = 5;
    // Set maximum length for displayed strings
    const maxStringLength = 100;


    function _stringifyInternal(val: any, depth: number): string {
        // 1. Handle primitive types & special number values
        if (val === null) return 'null';
        if (val === undefined) return 'undefined';
        if (typeof val === 'string') {
            const escaped = val.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            // Limit long strings
            const truncated = escaped.length > maxStringLength
                ? escaped.substring(0, maxStringLength - 3) + '...'
                : escaped;
            return `'${truncated}'`;
        }
        if (typeof val === 'number') {
            if (isNaN(val)) return 'NaN';
            if (!isFinite(val)) return val > 0 ? 'Infinity' : '-Infinity';
            return String(val);
        }
        if (typeof val === 'boolean') return String(val);
        if (typeof val === 'bigint') return `${String(val)}n`;
        if (typeof val === 'symbol') return String(val);

        // 2. Handle complex types (Objects, Arrays, Functions, etc.)
        const type = typeof val;
        if (type === 'object' || type === 'function') {

            // 2a. Circular reference check
            if (seen.has(val)) {
                return '[Circular]';
            }

            // 2b. Max depth check
            if (depth <= 0) {
                if (Array.isArray(val)) return '[Array]';
                if (val instanceof Date) return `Date(...)`;
                if (val instanceof RegExp) return String(val); // RegExp is usually short
                if (val instanceof Error) return `[${val.name || 'Error'}]`;
                return '[Object]';
            }

            // 2c. Add to seen set before recursing
            seen.add(val);

            let result: string;

            // 2d. Specific object types
            if (val instanceof Date) {
                result = `Date(${val.toISOString()})`;
            } else if (val instanceof RegExp) {
                result = String(val);
            } else if (val instanceof Error) {
                // Include name and message for errors
                result = `${val.name || 'Error'}(${val.message ? stringifyValue(val.message) : ''})`; // Stringify message too
            } else if (Array.isArray(val)) {
                // Handle Arrays
                if (val.length === 0) {
                    result = '[]';
                } else {
                    const elements = val.slice(0, maxElements).map(el => _stringifyInternal(el, depth - 1));
                    if (val.length > maxElements) {
                        elements.push('...');
                    }
                    result = `[ ${elements.join(', ')} ]`;
                }
            } else if (type === 'function') {
                // Handle Functions
                result = `[Function${val.name ? ': ' + val.name : ''}]`;
            } else {
                // Handle Plain Objects (or other complex objects)
                let keys: string[];
                try {
                    keys = Object.keys(val);
                } catch { // Handle potential errors accessing keys (e.g., from proxies)
                    seen.delete(val); // Clean up seen set on error
                    return '[Object (keys inaccessible)]';
                }

                const constructorName = val?.constructor?.name;
                const prefix = (constructorName && constructorName !== 'Object') ? `${constructorName} ` : '';

                if (keys.length === 0) {
                    result = `${prefix}{}`;
                } else {
                    const properties = keys.slice(0, maxProps).map(key => {
                        // Ensure keys that aren't valid identifiers are quoted
                        const keyStr = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)
                            ? key
                            : stringifyValue(key); // Use stringifyValue for keys too

                        let valueStr: string;
                        try {
                            valueStr = _stringifyInternal(val[key], depth - 1);
                        } catch {
                            valueStr = '[Error accessing value]';
                        }
                        return `${keyStr}: ${valueStr}`;
                    });
                    if (keys.length > maxProps) {
                        properties.push('...');
                    }
                    result = `${prefix}{ ${properties.join(', ')} }`;
                }
            }

            // 2e. Remove from seen set after processing node
            seen.delete(val);
            return result;

        } else {
            // 3. Fallback for unknown types (should be rare)
            try {
                return String(val);
            } catch {
                return '[Unstringifiable value]';
            }
        }
    }

    // Start the recursion
    return _stringifyInternal(value, maxDepth);
}
