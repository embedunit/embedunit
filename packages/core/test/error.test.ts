// packages/core/test/error.test.ts
import { describe, it, beforeAll, beforeEach, afterEach, afterAll, parseError } from '../src';
import { expect } from '@embedunit/assert';

describe('Error test suite', () => {
    // First suite hooks
    beforeAll(() => {
        // executionOrder.push('First Suite beforeAll');
        // firstSuiteHooksCalled.push('beforeAll');
        //
        // // Verify this hook was called
        // expect(firstSuiteHooksCalled).toContain('beforeAll');
        // // Verify second suite hooks haven't been called yet
        // expect(secondSuiteHooksCalled.length).toBe(0);
    });

    beforeEach(() => {
        // executionOrder.push('First Suite beforeEach');
        // firstSuiteHooksCalled.push('beforeEach');
        //
        // // Verify this hook was called
        // expect(firstSuiteHooksCalled).toContain('beforeEach');
    });

    afterEach(() => {
        // executionOrder.push('First Suite afterEach');
        // firstSuiteHooksCalled.push('afterEach');
        //
        // // Verify this hook was called
        // expect(firstSuiteHooksCalled).toContain('afterEach');
    });

    afterAll(() => {
        // executionOrder.push('First Suite afterAll');
        // firstSuiteHooksCalled.push('afterAll');
        //
        // // Verify this hook was called
        // expect(firstSuiteHooksCalled).toContain('afterAll');
    });

    it('should parse error correctly', async () => {
        let parsedError: any = null;
        try {
            throw new Error('Test-error');
        } catch (e) {
            parsedError = await parseError(e);
        }
        expect(parsedError.name).toBe('Error');
        expect(parsedError.message).toBe('Test-error');
        expect(parsedError.file).toContain('error.test.ts');
    });
});
