import { describe, it } from '@embedunit/core';
import { expect } from '../src';

describe('Advanced Promise Assertions', () => {
    describe('mixed sync and async assertions', () => {
        it('should support mixing sync assertions with async ones', async () => {
            const asyncCalculation = async (a: number, b: number): Promise<number> => {
                return new Promise(resolve => {
                    setTimeout(() => resolve(a + b), 10);
                });
            };

            // Regular synchronous assertions
            expect(5).toBe(5);
            expect([1, 2, 3]).toHaveLength(3);

            // Async assertions
            await expect(asyncCalculation(2, 3)).resolves.toBe(5);

            // More sync assertions
            expect('test').toMatch(/test/);

            // More async assertions
            await expect(asyncCalculation(10, 20)).resolves.toBe(30);
        });
    });

    describe('timing and delays', () => {
        it('should handle promises with various delays', async () => {
            const delayedResolve = (value: any, ms: number) => new Promise(resolve => setTimeout(() => resolve(value), ms));
            const delayedReject = (reason: any, ms: number) => new Promise((_, reject) => setTimeout(() => reject(reason), ms));

            // Fast promises
            await expect(delayedResolve('quick', 5)).resolves.toBe('quick');
            await expect(delayedReject('quick error', 5)).rejects.toBe('quick error');

            // Slower promises
            await expect(delayedResolve('slow', 100)).resolves.toBe('slow');
            await expect(delayedReject('slow error', 100)).rejects.toBe('slow error');
        });
    });

    describe('promise chains', () => {
        it('should test multi-step promise chains', async () => {
            // Create a multi-step promise chain
            const complexPromiseChain = Promise.resolve(5)
                .then(num => num * 2)
                .then(num => num + 10)
                .then(num => `Result: ${num}`);

            await expect(complexPromiseChain).resolves.toBe('Result: 20');
        });

        it('should test promise chains with rejections', async () => {
            // Create a chain that rejects
            const rejectingChain = Promise.resolve(10)
                .then(num => {
                    if (num === 10) throw new Error('Invalid value');
                    return num;
                })
                .catch(err => {
                    throw new Error(`Processed: ${err.message}`);
                });

            await expect(rejectingChain).rejects.toBeInstanceOf(Error);
            await expect(rejectingChain).rejects.toMatch('Processed: Invalid value');
        });
    });

    describe('async functions', () => {
        it('should test async functions directly', async () => {
            async function fetchData(id: number) {
                if (id <= 0) {
                    throw new Error('ID must be positive');
                }
                return { id, name: `Item ${id}` };
            }

            await expect(fetchData(1)).resolves.toEqual({ id: 1, name: 'Item 1' });
            await expect(fetchData(-1)).rejects.toMatch('ID must be positive');
        });
    });

    describe('error details', () => {
        it('should provide detailed error messages for rejected promises', async () => {
            // Create custom errors with properties
            class CustomError extends Error {
                constructor(
                    message: string,
                    public code: number,
                    public details: string
                ) {
                    super(message);
                    this.name = 'CustomError';
                }
            }

            const errorPromise = Promise.reject(new CustomError('Something went wrong', 500, 'Internal server error'));

            await expect(errorPromise).rejects.toBeInstanceOf(CustomError);
            await expect(errorPromise).rejects.toHaveProperty('code', 500);
            await expect(errorPromise).rejects.toHaveProperty('details', 'Internal server error');
        });
    });

    describe('nested promises', () => {
        it('should handle promises that resolve to promises', async () => {
            // Create a promise that resolves to another promise
            const nestedPromise = Promise.resolve(
                new Promise<string>(resolve => setTimeout(() => resolve('nested value'), 10))
            );

            // Should automatically unwrap the nested promise
            await expect(nestedPromise).resolves.toBe('nested value');
        });
    });

    describe('promises with arrays and objects', () => {
        it('should test promises that resolve to arrays', async () => {
            const arrayPromise = Promise.resolve([1, 2, 3, 4, 5]);

            await expect(arrayPromise).resolves.toHaveLength(5);
            await expect(arrayPromise).resolves.toContain(3);
            await expect(arrayPromise).resolves.not.toContain(10);
        });

        it('should test promises that resolve to complex objects', async () => {
            const complexObject = {
                id: 123,
                user: {
                    name: 'Test User',
                    roles: ['admin', 'editor']
                },
                metadata: {
                    created: new Date('2023-01-01'),
                    tags: ['important', 'featured']
                }
            };

            const objectPromise = Promise.resolve(complexObject);

            await expect(objectPromise).resolves.toHaveProperty('id', 123);
            await expect(objectPromise).resolves.toHaveProperty('user.name', 'Test User');
            await expect(objectPromise).resolves.toHaveProperty('user.roles');
            await expect(objectPromise).resolves.toHaveProperty('metadata.tags');
            await expect(objectPromise).resolves.not.toHaveProperty('missing');
        });
    });
});
