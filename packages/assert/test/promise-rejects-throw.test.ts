import { describe, it } from '@embedunit/core';
import { expect } from '../src';

describe('Promise .rejects.toThrow() consistency', () => {
    describe('Basic rejection checking', () => {
        it('should pass when promise rejects with any error', async () => {
            const promise = Promise.reject(new Error('Something went wrong'));
            await expect(promise).rejects.toThrow();
        });

        it('should pass when promise rejects with non-Error value', async () => {
            const promise = Promise.reject('string rejection');
            await expect(promise).rejects.toThrow();
        });

        it('should fail when promise resolves', async () => {
            const promise = Promise.resolve('success');
            try {
                await expect(promise).rejects.toThrow();
                throw new Error('Should have thrown');
            } catch (error) {
                expect((error as Error).message).toContain('Expected promise to reject with an error, but it resolved with');
            }
        });
    });

    describe('String matching', () => {
        it('should match error message containing string', async () => {
            const promise = Promise.reject(new Error('Resource not found'));
            await expect(promise).rejects.toThrow('not found');
        });

        it('should fail when message does not contain string', async () => {
            const promise = Promise.reject(new Error('Resource not found'));
            try {
                await expect(promise).rejects.toThrow('missing');
                throw new Error('Should have thrown');
            } catch (error) {
                expect((error as Error).message).toContain('Expected promise to reject with an error containing "missing"');
            }
        });
    });

    describe('RegExp matching', () => {
        it('should match error message with regex', async () => {
            const promise = Promise.reject(new Error('Error code: 404'));
            await expect(promise).rejects.toThrow(/\d{3}/);
        });

        it('should fail when message does not match regex', async () => {
            const promise = Promise.reject(new Error('Error occurred'));
            try {
                await expect(promise).rejects.toThrow(/\d{3}/);
                throw new Error('Should have thrown');
            } catch (error) {
                expect((error as Error).message).toContain('Expected promise to reject with an error matching');
            }
        });
    });

    describe('Error constructor matching', () => {
        it('should match specific error type', async () => {
            const promise = Promise.reject(new TypeError('Type mismatch'));
            await expect(promise).rejects.toThrow(TypeError);
        });

        it('should match base Error type', async () => {
            const promise = Promise.reject(new Error('Generic error'));
            await expect(promise).rejects.toThrow(Error);
        });

        it('should fail when error is not instanceof expected', async () => {
            const promise = Promise.reject(new Error('Generic error'));
            try {
                await expect(promise).rejects.toThrow(TypeError);
                throw new Error('Should have thrown');
            } catch (error) {
                expect((error as Error).message).toContain('Expected promise to reject with an error instanceof TypeError');
            }
        });

        class CustomError extends Error {
            constructor(message: string) {
                super(message);
                this.name = 'CustomError';
            }
        }

        it('should match custom error types', async () => {
            const promise = Promise.reject(new CustomError('Custom problem'));
            await expect(promise).rejects.toThrow(CustomError);
        });
    });

    describe('Error instance matching', () => {
        it('should match specific error instance', async () => {
            const specificError = new Error('Specific message');
            const promise = Promise.reject(specificError);
            await expect(promise).rejects.toThrow(specificError);
        });

        it('should match by name and message', async () => {
            const expectedError = new TypeError('Type problem');
            const actualError = new TypeError('Type problem');
            const promise = Promise.reject(actualError);
            await expect(promise).rejects.toThrow(expectedError);
        });

        it('should fail when name or message differs', async () => {
            const expectedError = new TypeError('Expected message');
            const actualError = new TypeError('Different message');
            const promise = Promise.reject(actualError);
            try {
                await expect(promise).rejects.toThrow(expectedError);
                throw new Error('Should have thrown');
            } catch (error) {
                expect((error as Error).message).toContain('Expected promise to reject with an error TypeError: Expected message');
            }
        });
    });

    describe('Negation with .not', () => {
        it('should pass when promise resolves (not.rejects.toThrow)', async () => {
            const promise = Promise.resolve('success');
            await expect(promise).not.rejects.toThrow();
        });

        it('should fail when promise rejects (not.rejects.toThrow)', async () => {
            const promise = Promise.reject(new Error('Failed'));
            try {
                await expect(promise).not.rejects.toThrow();
                throw new Error('Should have thrown');
            } catch (error) {
                expect((error as Error).message).toContain('Expected promise not to reject');
            }
        });

        it('should pass when error does not match string', async () => {
            const promise = Promise.reject(new Error('Something else'));
            await expect(promise).not.rejects.toThrow('specific error');
        });

        it('should pass when error is not instanceof type', async () => {
            const promise = Promise.reject(new Error('Generic'));
            await expect(promise).not.rejects.toThrow(TypeError);
        });
    });

    describe('Edge cases', () => {
        it('should handle null rejection', async () => {
            const promise = Promise.reject(null);
            await expect(promise).rejects.toThrow();
        });

        it('should handle undefined rejection', async () => {
            const promise = Promise.reject(undefined);
            await expect(promise).rejects.toThrow();
        });

        it('should handle object rejection', async () => {
            const promise = Promise.reject({ code: 'ERROR', message: 'Failed' });
            await expect(promise).rejects.toThrow();
        });
    });

    describe('Usage errors', () => {
        it('should throw error when used with .resolves', async () => {
            const promise = Promise.resolve('value');
            try {
                await expect(promise).resolves.toThrow();
                throw new Error('Should have thrown');
            } catch (error) {
                expect((error as Error).message).toContain('toThrow() can only be used with .rejects, not .resolves');
            }
        });
    });

    describe('Consistency with sync .toThrow()', () => {
        it('should have similar behavior to sync toThrow', () => {
            // Sync version
            expect(() => { throw new Error('Sync error'); }).toThrow();
            expect(() => { throw new Error('Sync error'); }).toThrow('Sync');
            expect(() => { throw new Error('Sync error'); }).toThrow(/Sync/);
            expect(() => { throw new Error('Sync error'); }).toThrow(Error);
        });

        it('async should work the same way', async () => {
            // Async version - now consistent!
            await expect(Promise.reject(new Error('Async error'))).rejects.toThrow();
            await expect(Promise.reject(new Error('Async error'))).rejects.toThrow('Async');
            await expect(Promise.reject(new Error('Async error'))).rejects.toThrow(/Async/);
            await expect(Promise.reject(new Error('Async error'))).rejects.toThrow(Error);
        });
    });

    describe('Real-world example', () => {
        class ResourceService {
            async fetch(locator: string): Promise<any> {
                if (!locator) {
                    throw new Error('Locator is required');
                }
                if (locator === 'not-found') {
                    throw new Error('Resource not found');
                }
                if (locator === 'forbidden') {
                    throw new Error('Access forbidden');
                }
                return { id: 1, data: 'resource' };
            }
        }

        it('should check service rejection', async () => {
            const resourceService = new ResourceService();

            // Your exact syntax now works!
            await expect(resourceService.fetch('')).rejects.toThrow();
            await expect(resourceService.fetch('')).rejects.toThrow('Locator is required');
            await expect(resourceService.fetch('not-found')).rejects.toThrow(/not found/);
            await expect(resourceService.fetch('forbidden')).rejects.toThrow(Error);

            // Should not throw for valid input
            await expect(resourceService.fetch('valid')).resolves.toHaveProperty('id', 1);
        });
    });
});
