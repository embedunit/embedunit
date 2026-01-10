import { describe, it, resetRegistry } from '@embedunit/core';
import { runTests } from '@embedunit/core';
import { expect } from '../src';

describe('Minimal Error Format', () => {
    it('should return error as object with file/line even when verboseErrors is false', async () => {
        resetRegistry();

        describe('Test Suite', () => {
            it('failing test', () => {
                expect(true).toBe(false);
            });
        });

        // Run with verboseErrors: false (default)
        const result = await runTests({});

        expect(result.failures).toHaveLength(1);
        const failure = result.failures[0];

        // Error should be an object, not a string
        expect(typeof failure.error).toBe('object');
        expect(failure.error).not.toBe(null);

        // Should have essential fields
        expect(failure.error.message).toBeDefined();
        expect(failure.error.name).toBeDefined();
        // Name should be the original error type, not "EnhancedTestError"
        expect(failure.error.name).toBe('AssertionError');
        expect(failure.error.file).toBeDefined(); // Should have remapped file
        expect(failure.error.line).toBeDefined(); // Should have remapped line
        expect(failure.error.column).toBeDefined(); // Should have remapped column

        // Should NOT have verbose fields
        expect(failure.error.stack).toBeUndefined();
        expect(failure.error.context).toBeUndefined();
    });

    it('should include full details when verboseErrors is true', async () => {
        resetRegistry();

        describe('Test Suite', () => {
            it('failing test', () => {
                expect(true).toBe(false);
            });
        });

        // Run with verboseErrors: true
        const result = await runTests({ verboseErrors: true });

        expect(result.failures).toHaveLength(1);
        const failure = result.failures[0];

        // Should have all fields including verbose ones
        expect(failure.error.message).toBeDefined();
        expect(failure.error.name).toBeDefined();
        expect(failure.error.file).toBeDefined();
        expect(failure.error.line).toBeDefined();
        expect(failure.error.column).toBeDefined();
        expect(failure.error.stack).toBeDefined(); // Should have stack
        // context might be undefined if enhancedErrors is not enabled
    });

    it('should show remapped TypeScript file paths, not JS paths', async () => {
        resetRegistry();

        describe('Test Suite', () => {
            it('failing test', () => {
                expect(true).toBe(false);
            });
        });

        const result = await runTests({});

        expect(result.failures).toHaveLength(1);
        const failure = result.failures[0];

        // File should be a TypeScript file (remapped from source map)
        // This test file itself should be the source
        expect(failure.error.file).toMatch(/\.test\.ts$/);
        expect(failure.error.file).not.toMatch(/\.js$/);

        // Line number should be reasonable (near where expect() is called)
        expect(failure.error.line).toBeGreaterThan(0);
        expect(failure.error.line).toBeLessThan(100); // Reasonable range for this test file
    });
});
