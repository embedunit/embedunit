// ===== File: src/promiseAssertion.ts (or within assertion.ts) =====
// Assuming deepEqual, getType, stringifyValue are available (imported or defined above)
// Or if this is part of assertion.ts, they are already defined there.


import {stringifyValue} from "./assertion-utils";
import {deepEqual, getType} from "./deepEqual";
import {deepEqualAsymmetric} from "./asymmetric-matchers";
// Enhanced error formatting will be added later if needed
// import {createCustomError, formatAsyncError, ErrorFormatOptions} from "./error-format";

export class PromiseAssertion {
    private promise: Promise<any>;
    private _isNegated: boolean;
    private mode: 'resolves' | 'rejects';

    constructor(promise: Promise<any>, isNegated: boolean, mode: 'resolves' | 'rejects') {
        this.promise = promise;
        this._isNegated = isNegated;
        this.mode = mode;
    }

    // --- Negation ---
    get not(): PromiseAssertion {
        return new PromiseAssertion(this.promise, !this._isNegated, this.mode);
    }

    // --- Helpers ---
    private stringify(value: any): string {
        // Assuming stringifyValue is imported or available in the same file
        return stringifyValue(value);
    }

    private generateAsyncErrorMessage(expected: any, actual: any, messageTpl: string): string {
        const negation = this._isNegated ? 'not ' : '';
        const actualStr = this.stringify(actual);
        const expectedStr = messageTpl.includes('%{expected}') ? this.stringify(expected) : '';

        return messageTpl
            .replace('%{negation}', negation)
            .replace('%{actual}', actualStr)
            .replace('%{expected}', expectedStr);
    }

    /**
     * Matches the actual rejection reason against various expected matchers.
     * Used internally by .rejects assertions.
     */
    private matchRejection(actualReason: any, expected: any): boolean {
        if (typeof expected === 'string') {
            const message = actualReason instanceof Error ? actualReason.message : String(actualReason);
            return message.includes(expected);
        } else if (expected instanceof RegExp) {
            const message = actualReason instanceof Error ? actualReason.message : String(actualReason);
            return expected.test(message);
        } else if (typeof expected === 'function' && ( // Check for Error constructor
            expected === Error ||
            expected.prototype instanceof Error ||
            /^(?:.*Error|.*Exception)$/.test(expected.name) // Heuristic
        )) {
            return actualReason instanceof expected;
        } else if (expected instanceof Error) { // Check against specific Error instance
            // Compare name and message for practical instance matching
            return actualReason instanceof Error &&
                actualReason.name === expected.name &&
                actualReason.message === expected.message;
        } else {
            // Fallback: Check for deep equality for other types or non-error objects/primitives
            return deepEqual(actualReason, expected);
        }
    }

    /**
     * Internal helper to handle promise settlement and basic checks.
     * (Definition provided in the previous response - keep it here)
     */
    private async checkPromise(
        checker: (value: any) => boolean,
        expected: any,
        resolveMessageTpl: string,
        rejectMessageTpl: string,
        useMatchRejectionForRejects: boolean = false
    ): Promise<void> {
        // ... (Implementation of checkPromise as provided before)
        let settlement: { status: 'resolved', value: any } | { status: 'rejected', reason: any };
        try {
            const value = await this.promise;
            settlement = {status: 'resolved', value};
        } catch (reason) {
            settlement = {status: 'rejected', reason};
        }

        const expectingResolution = this.mode === 'resolves';
        let conditionMet = false;
        let actualValueForCheck: any;
        let finalMessageTpl: string;

        if (expectingResolution) {
            if (settlement.status === 'rejected') {
                if (!this._isNegated) {
                    throw new Error(`Expected promise to resolve, but it rejected with: ${this.stringify(settlement.reason)}`);
                } else {
                    return;
                }
            }
            actualValueForCheck = settlement.value;
            finalMessageTpl = resolveMessageTpl;
            conditionMet = checker(actualValueForCheck);
        } else { // expecting rejection
            if (settlement.status === 'resolved') {
                if (!this._isNegated) {
                    throw new Error(`Expected promise to reject, but it resolved with: ${this.stringify(settlement.value)}`);
                } else {
                    return;
                }
            }
            actualValueForCheck = settlement.reason;
            finalMessageTpl = rejectMessageTpl;
            conditionMet = useMatchRejectionForRejects
                ? this.matchRejection(actualValueForCheck, expected)
                : checker(actualValueForCheck);
        }

        if (this._isNegated ? conditionMet : !conditionMet) {
            throw new Error(this.generateAsyncErrorMessage(
                expected,
                actualValueForCheck,
                finalMessageTpl
            ));
        }
    }


    // --- ASYNCHRONOUS ASSERTIONS (Including added ones) ---

    async toBe(expected: any): Promise<void> {
        await this.checkPromise(
            (value) => value === expected,
            expected,
            `Expected promise to resolve with %{expected}, but it resolved with %{actual}`, // resolve msg
            `Expected promise to reject with %{expected}, but it rejected with %{actual}`, // reject msg
            true // Use matchRejection for .rejects.toBe()
        );
    }

    async toEqual(expected: any): Promise<void> {
        await this.checkPromise(
            (value) => deepEqualAsymmetric(value, expected),
            expected,
            `Expected promise to resolve with a value deeply equal to %{expected}, but got %{actual}`, // resolve msg
            `Expected promise to reject with a value deeply equal to %{expected}, but got %{actual}`, // reject msg
            true // Use matchRejection (which falls back to deepEqual) for .rejects.toEqual()
        );
    }

    async toStrictEqual(expected: any): Promise<void> {
        await this.checkPromise(
            (value) => deepEqualAsymmetric(value, expected),
            expected,
            `Expected promise to resolve with a value strictly equal to %{expected}, but got %{actual}`,
            `Expected promise to reject with a value strictly equal to %{expected}, but got %{actual}`,
            true
        );
    }

    async toBeTruthy(): Promise<void> {
        const underlyingPromise = this.promise; // Keep reference

        if (this.mode === 'rejects' && !this._isNegated) {
            // --- FIX Concept ---
            // Attach a no-op catch to the original promise before throwing
            underlyingPromise.catch(() => { /* Prevent unhandled rejection */
            });
            // Now throw the usage error
            throw new Error('Usage error: toBeTruthy() is not applicable for .rejects...');
            // --- End FIX Concept ---
        }

        await this.checkPromise(
            (value) => !!value,
            undefined, // No specific expected value for message
            `Expected promise to resolve with a truthy value, but got %{actual}`, // resolve msg
            `Expected promise %{negation}to reject with a truthy value, but got %{actual}`, // reject msg
            false // Apply simple truthiness check directly to rejection reason (used for .not.rejects.toBeTruthy)
        );
    }

    async toBeFalsy(): Promise<void> {
        const underlyingPromise = this.promise; // Get reference to the original promise

        // Explicitly throw if using .rejects.toBeFalsy() as it's often ambiguous.
        // Allow .not.rejects.toBeFalsy() (checks if reason is NOT falsy OR if it resolved).
        if (this.mode === 'rejects' && !this._isNegated) {
            // --- FIX START ---
            // Attach a no-op catch to prevent the original promise's rejection
            // from becoming unhandled when we throw the usage error.
            underlyingPromise.catch(() => { /* Consume potential rejection */
            });
            // Now throw the intended usage error.
            throw new Error('Usage error: toBeFalsy() is not applicable for .rejects. Use .rejects.toBeInstanceOf(Error), .rejects.toMatch(), or .rejects.toEqual() to check the rejection reason, or use .not.rejects.toBeTruthy() to assert the reason is falsy.');
            // --- FIX END ---
        }

        // If the usage was valid (e.g., .resolves.toBeFalsy() or .not.rejects.toBeFalsy()),
        // proceed with the actual check using checkPromise.
        await this.checkPromise(
            (value) => !value,
            undefined, // No specific expected value for message
            `Expected promise to resolve with a falsy value, but got %{actual}`, // resolve msg
            `Expected promise %{negation}to reject with a falsy value, but got %{actual}`, // reject msg
            false // Apply simple falsiness check directly to rejection reason (used for .not.rejects.toBeFalsy)
        );
    }

    // --- NEWLY ADDED / CONSISTENCY ---
    async toBeNull(): Promise<void> {
        await this.checkPromise(
            (value) => value === null,
            null,
            `Expected promise to resolve with null, but got %{actual}`,
            `Expected promise to reject with null, but got %{actual}`,
            true // Use matchRejection (falls back to deepEqual/=== which is correct for null)
        );
    }

    async toBeUndefined(): Promise<void> {
        await this.checkPromise(
            (value) => value === undefined,
            undefined,
            `Expected promise to resolve with undefined, but got %{actual}`,
            `Expected promise to reject with undefined, but got %{actual}`,
            true // Use matchRejection (falls back to deepEqual/=== which is correct for undefined)
        );
    }

    async toBeDefined(): Promise<void> {
        await this.checkPromise(
            (value) => value !== undefined,
            undefined, // Message implies 'not undefined'
            `Expected promise to resolve with a defined value, but got %{actual}`, // checks !== undefined
            `Expected promise %{negation}to reject with a defined value, but got %{actual}`, // checks !== undefined on reason
            false // Apply !== undefined directly
        );
    }

    async toBeNaN(): Promise<void> {
        await this.checkPromise(
            (value) => Number.isNaN(value),
            undefined,
            `Expected promise to resolve with NaN, but got %{actual}`,
            `Expected promise to reject with NaN, but got %{actual}`,
            false
        );
    }

    // --- Numeric Comparisons (Require explicit implementation due to type checks) ---

    private async checkNumericComparison(
        comparisonFn: (actual: number, expected: number) => boolean,
        expected: number,
        comparisonName: string // e.g., "greater than", "less than or equal to"
    ): Promise<void> {
        let settlement: { status: 'resolved', value: any } | { status: 'rejected', reason: any };
        try {
            settlement = {status: 'resolved', value: await this.promise};
        } catch (reason) {
            settlement = {status: 'rejected', reason};
        }

        const expectingResolution = this.mode === 'resolves';
        let targetValue: any; // Declare targetValue here

        // Handle settlement type mismatch and assign targetValue correctly
        if (expectingResolution) { // Mode is 'resolves'
            if (settlement.status === 'rejected') { // But it rejected
                if (!this._isNegated) throw new Error(`Expected promise to resolve, but it rejected with: ${this.stringify(settlement.reason)}`);
                else return; // .not.resolves + rejected = pass
            }
            // --- FIX 1: Assign value only when status is 'resolved' ---
            targetValue = settlement.value; // Type is narrowed here
        } else { // Mode is 'rejects'
            if (settlement.status === 'resolved') { // But it resolved
                if (!this._isNegated) throw new Error(`Expected promise to reject, but it resolved with: ${this.stringify(settlement.value)}`);
                else return; // .not.rejects + resolved = pass
            }
            // --- FIX 2: Assign reason only when status is 'rejected' (and fix typo) ---
            targetValue = settlement.reason; // Type is narrowed here & typo fixed
        }

        // --- REMOVE the original faulty line ---
        // targetValue = expectingResolution ? settlement.value : settlement.reason0;

        // Type check (now targetValue is correctly assigned and defined)
        if (typeof targetValue !== 'number' || typeof expected !== 'number') {
            const targetDesc = this.mode === 'resolves' ? 'resolved value' : 'rejection reason';
            throw new Error(`Both ${targetDesc} (${this.stringify(targetValue)}) and expected (${this.stringify(expected)}) must be numbers for ${comparisonName} comparison`);
        }

        // Perform comparison
        const condition = comparisonFn(targetValue, expected); // targetValue is guaranteed number here
        const targetDescMsg = this.mode === 'resolves' ? 'resolve' : 'reject';
        const messageTpl = `Expected promise to ${targetDescMsg} with a number ${comparisonName} %{expected}, but got %{actual}`;
        const notMessageTpl = `Expected promise not to ${targetDescMsg} with a number ${comparisonName} %{expected}, but it did`;

        // Throw if check fails (considering negation)
        if (this._isNegated ? condition : !condition) {
            throw new Error(this.generateAsyncErrorMessage(
                expected,
                targetValue, // Use the correctly assigned numeric value
                this._isNegated ? notMessageTpl : messageTpl
            ));
        }
    }


    async toBeGreaterThan(expected: number): Promise<void> {
        await this.checkNumericComparison((a, e) => a > e, expected, 'greater than');
    }


    async toBeGreaterThanOrEqual(expected: number): Promise<void> {
        await this.checkNumericComparison((a, e) => a >= e, expected, 'greater than or equal to');
    }


    async toBeLessThan(expected: number): Promise<void> {
        await this.checkNumericComparison((a, e) => a < e, expected, 'less than');
    }


    async toBeLessThanOrEqual(expected: number): Promise<void> {
        await this.checkNumericComparison((a, e) => a <= e, expected, 'less than or equal to');
    }


    // --- Existing Collection/String/Property/Instance/Type/Match Assertions ---
    // (Keep the implementations for toContain, toContainEqual, toHaveLength,
    // toHaveProperty, toBeInstanceOf, toBeTypeOf, toMatch as they were finalized previously)

    async toContain(expected: any): Promise<void> {
        await this.checkPromise(
            (value) => {
                if (typeof value === 'string') {
                    return value.includes(String(expected));
                } else if (Array.isArray(value)) {
                    return value.includes(expected);
                } else {
                    throw new TypeError(`Value ${this.stringify(value)} must be an array or string for toContain`);
                }
            },
            expected,
            `Expected promise to resolve with a value containing %{expected}, but got %{actual}`,
            `Expected promise to reject with a value containing %{expected}, but got %{actual}`,
            false
        );
    }

    async toContainEqual(expected: any): Promise<void> {
        await this.checkPromise(
            (value) => {
                if (!Array.isArray(value)) {
                    throw new TypeError(`Value ${this.stringify(value)} must be an array for toContainEqual`);
                }
                return value.some(item => deepEqualAsymmetric(item, expected));
            },
            expected,
            `Expected promise to resolve with an array containing item deeply equal to %{expected}, but got %{actual}`,
            `Expected promise to reject with an array containing item deeply equal to %{expected}, but got %{actual}`,
            false
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

    async toMatchObject(expected: Record<string, any>): Promise<void> {
        if (typeof expected !== 'object' || expected === null) {
            throw new Error(`Expected value must be an object for toMatchObject`);
        }
        await this.checkPromise(
            (value) => {
                if (typeof value !== 'object' || value === null) {
                    throw new TypeError(`Value ${this.stringify(value)} must be an object for toMatchObject`);
                }
                return this.isObjectMatch(value, expected);
            },
            expected,
            `Expected promise to resolve with an object matching %{expected}, but got %{actual}`,
            `Expected promise to reject with an object matching %{expected}, but got %{actual}`,
            false
        );
    }

    async toHaveLength(expected: number): Promise<void> {
        // Explicit implementation block (as finalized before)
        let settlement: { status: 'resolved', value: any } | { status: 'rejected', reason: any };
        try {
            settlement = {status: 'resolved', value: await this.promise};
        } catch (reason) {
            settlement = {status: 'rejected', reason};
        }
        const expectingResolution = this.mode === 'resolves';
        let actualValue: any;
        if (expectingResolution) {
            if (settlement.status === 'rejected') {
                if (!this._isNegated) throw new Error(`Expected promise to resolve, but it rejected with: ${this.stringify(settlement.reason)}`);
                else return;
            }
            actualValue = settlement.value;
        } else {
            if (settlement.status === 'resolved') {
                if (!this._isNegated) throw new Error(`Expected promise to reject, but it resolved with: ${this.stringify(settlement.value)}`);
                else return;
            }
            actualValue = settlement.reason;
        }
        if (actualValue == null || typeof (actualValue as any).length !== 'number') {
            const target = expectingResolution ? 'resolved value' : 'rejection reason';
            throw new TypeError(`${target.charAt(0).toUpperCase() + target.slice(1)} ${this.stringify(actualValue)} must have a 'length' property for toHaveLength`);
        }
        const actualLength = (actualValue as any).length;
        const condition = actualLength === expected;
        const messageTpl = `Expected promise to ${this.mode === 'resolves' ? 'resolve' : 'reject'} with a value of length %{expected}, but got ${this.stringify(actualValue)} (length ${actualLength})`;
        const notMessageTpl = `Expected promise not to ${this.mode === 'resolves' ? 'resolve' : 'reject'} with a value of length %{expected}, but it did (length ${actualLength})`;
        if (this._isNegated ? condition : !condition) {
            throw new Error((this._isNegated ? notMessageTpl : messageTpl).replace('%{expected}', this.stringify(expected)));
        }
    }

    async toHaveProperty(propertyPath: string | (string | number)[], value?: any): Promise<void> {
        // Explicit implementation block (as finalized before)
        const pathArray = Array.isArray(propertyPath) ? propertyPath : propertyPath.split('.');
        const propertyPathStr = Array.isArray(propertyPath) ? propertyPath.map(String).join('.') : propertyPath;
        const checkValue = arguments.length > 1;
        let settlement: { status: 'resolved', value: any } | { status: 'rejected', reason: any };
        try {
            settlement = {status: 'resolved', value: await this.promise};
        } catch (reason) {
            settlement = {status: 'rejected', reason};
        }
        const expectingResolution = this.mode === 'resolves';
        let targetValue: any;
        if (expectingResolution) {
            if (settlement.status === 'rejected') {
                if (!this._isNegated) throw new Error(`Expected promise to resolve, but it rejected with: ${this.stringify(settlement.reason)}`);
                else return;
            }
            targetValue = settlement.value;
        } else {
            if (settlement.status === 'resolved') {
                if (!this._isNegated) throw new Error(`Expected promise to reject, but it resolved with: ${this.stringify(settlement.value)}`);
                else return;
            }
            targetValue = settlement.reason;
        }
        let current: any = targetValue;
        let exists = true;
        if (targetValue == null) {
            exists = false;
        } else {
            for (let i = 0; i < pathArray.length; i++) {
                const key = pathArray[i];
                const hasOwn = typeof current === 'object' && current !== null && Object.prototype.hasOwnProperty.call(current, key);
                const isArrayIndex = Array.isArray(current) && typeof key === 'number' && key >= 0 && key < current.length;
                const isStringArrayIndex = Array.isArray(current) && typeof key === 'string' && !isNaN(parseInt(key, 10)) && parseInt(key, 10) >= 0 && parseInt(key, 10) < current.length;
                if (!(hasOwn || isArrayIndex || isStringArrayIndex)) {
                    exists = false;
                    break;
                }
                current = current[key];
            }
        }
        const existsCondition = exists;
        const targetDesc = this.mode === 'resolves' ? 'resolved value' : 'rejection reason';
        const existenceMessageTpl = `Expected promise to ${this.mode === 'resolves' ? 'resolve' : 'reject'} with a value having property '${propertyPathStr}'`;
        const notExistenceMessageTpl = `Expected promise not to ${this.mode === 'resolves' ? 'resolve' : 'reject'} with a value having property '${propertyPathStr}'`;
        if (this._isNegated ? existsCondition : !existsCondition) {
            throw new Error((this._isNegated ? notExistenceMessageTpl : existenceMessageTpl) + `, but the ${targetDesc} was ${this.stringify(targetValue)}`);
        }
        if (checkValue && exists !== this._isNegated) {
            const valueCondition = deepEqualAsymmetric(current, value);
            const valueMessageTpl = `Expected property '${propertyPathStr}' of ${targetDesc} %{negation}to have value %{expected}, but got ${this.stringify(current)}`;
            if (this._isNegated ? valueCondition : !valueCondition) {
                throw new Error(valueMessageTpl.replace('%{negation}', this._isNegated ? 'not ' : '').replace('%{expected}', this.stringify(value)));
            }
        }
    }

    async toBeInstanceOf(expectedConstructor: Function): Promise<void> {
        if (typeof expectedConstructor !== 'function') {
            throw new Error(`Expected constructor must be a function/class, but got ${this.stringify(expectedConstructor)}`);
        }
        const constructorName = expectedConstructor.name || '<anonymous constructor>';
        await this.checkPromise(
            (value) => value instanceof expectedConstructor,
            expectedConstructor,
            `Expected promise to resolve with an instance of ${constructorName}, but got %{actual}`,
            `Expected promise to reject with an instance of ${constructorName}, but got %{actual}`,
            true // Use matchRejection for .rejects (checks instanceof)
        );
    }


    async toMatch(expected: RegExp | string): Promise<void> {
        if (!(expected instanceof RegExp || typeof expected === 'string')) {
            throw new Error('Expected value for toMatch must be a string or a RegExp');
        }
        await this.checkPromise(
            (value) => {
                const strToTest = this.mode === 'rejects' ? (value instanceof Error ? value.message : String(value)) : String(value);
                if (typeof strToTest !== 'string') {
                    const target = this.mode === 'resolves' ? 'Resolved value' : 'Rejection reason (or its message)';
                    throw new TypeError(`${target} must be a string or have a string representation to use toMatch, but got type ${getType(value)}`);
                }
                return expected instanceof RegExp ? expected.test(strToTest) : strToTest.includes(expected);
            },
            expected,
            `Expected promise to resolve with a string %{negation}matching %{expected}, but got %{actual}`,
            `Expected promise to reject with an error %{negation}matching %{expected}, but got %{actual}`,
            false
        );
    }

    /**
     * For .rejects mode: Asserts that a promise rejects with an error.
     * For .resolves mode: Not applicable, will throw usage error.
     *
     * @param errorMatcher - Optional. Can be:
     *   - string: Checks if error message contains this string
     *   - RegExp: Tests error message against this pattern
     *   - Error constructor: Checks if error is instanceof this constructor
     *   - Error instance: Checks if error has same name and message
     *   - undefined: Just checks that promise rejects with any error
     *
     * @example
     * await expect(promise).rejects.toThrow();
     * await expect(promise).rejects.toThrow('error message');
     * await expect(promise).rejects.toThrow(/pattern/);
     * await expect(promise).rejects.toThrow(TypeError);
     * await expect(promise).rejects.toThrow(new TypeError('specific'));
     */
    async toThrow(errorMatcher?: string | RegExp | Error | Function): Promise<void> {
        // toThrow only makes sense for .rejects mode
        if (this.mode === 'resolves') {
            throw new Error('toThrow() can only be used with .rejects, not .resolves. Use .rejects.toThrow() to check for promise rejection.');
        }

        // Get the promise settlement
        let settlement: { status: 'resolved', value: any } | { status: 'rejected', reason: any };
        try {
            settlement = { status: 'resolved', value: await this.promise };
        } catch (reason) {
            settlement = { status: 'rejected', reason };
        }

        // Check if promise rejected
        if (settlement.status === 'resolved') {
            if (!this._isNegated) {
                throw new Error(`Expected promise to reject with an error, but it resolved with: ${this.stringify(settlement.value)}`);
            } else {
                return; // .not.rejects.toThrow() with resolved promise passes
            }
        }

        const actualReason = settlement.reason;

        // If no matcher provided, just check that it rejected (already done above)
        if (errorMatcher === undefined) {
            if (this._isNegated) {
                throw new Error(`Expected promise not to reject, but it rejected with: ${this.stringify(actualReason)}`);
            }
            return;
        }

        // Check if the rejection matches the expected error
        const matches = this.matchRejection(actualReason, errorMatcher);

        if (this._isNegated ? matches : !matches) {
            let expectedDescription = '';
            if (typeof errorMatcher === 'string') {
                expectedDescription = `containing "${errorMatcher}"`;
            } else if (errorMatcher instanceof RegExp) {
                expectedDescription = `matching ${errorMatcher}`;
            } else if (typeof errorMatcher === 'function') {
                expectedDescription = `instanceof ${errorMatcher.name || '<anonymous>'}`;
            } else if (errorMatcher instanceof Error) {
                expectedDescription = `${errorMatcher.name}: ${errorMatcher.message}`;
            }

            const negation = this._isNegated ? 'not ' : '';
            throw new Error(
                `Expected promise ${negation}to reject with an error ${expectedDescription}, but got: ${this.stringify(actualReason)}`
            );
        }
    }

} // End of PromiseAssertion class
